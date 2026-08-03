/**
 * CHAT CON LLM (DeepSeek vía OpenRouter)
 *
 * El bot usa una máquina de estados determinista (conversation-flow) como
 * esqueleto: validación, extracción de datos y saltos de nodos. Pero el
 * TEXTO de cada pregunta ahora lo redacta DeepSeek, adaptándolo al cliente
 * y al objetivo del turno (servicios, estructura de la web, etc.).
 *
 * Es un sistema HÍBRIDO a prueba de fallos:
 * - Si no hay OPENROUTER_API_KEY o la llamada falla, se usa el mensaje
 *   determinista (`fallbackReply`) — el bot sigue funcionando igual.
 * - El LLM solo pinta el mensaje; no decide el estado (eso lo hace el flujo).
 */

import type { ChatContext, ChatMessage } from "@/lib/types";
import { chatCompletion, getLlmProvider } from "@/lib/llm-client";

/**
 * Objetivo de cada turno: qué debe preguntar Alex en ese nodo.
 * Los nodos de clarificación (`clarify_*`) reutilizan el objetivo del nodo
 * base (se resuelve con `resolveGoal`).
 */
const TURN_GOALS: Record<string, string> = {
  discovery_business:
    "Pregunta de forma natural qué hace el negocio, a quién le vende y qué ofrece. Si todavía no lo ha dicho claro, indaga si TIENE SERVICIOS o productos que quiera mostrar.",
  discovery_confirm:
    "Confirma qué tipo de web le conviene con ejemplos sencillos (página de presentación, tienda online, citas, etc.) y deja que corrija si no coincide.",
  discovery_examples:
    "Da 1-2 ejemplos concretos de webs de negocios parecidos al suyo para que decida qué le gusta.",
  pages:
    "Define la ESTRUCTURA COMPLETA de la web con el cliente: ¿una sola página con secciones (Inicio, Servicios, Nosotros, Contacto) o varias páginas? Confirma qué secciones debe tener y cómo se va a armar bien la web completa.",
  technical_auth:
    "Pregunta si sus clientes necesitarán crearse una cuenta o registrarse, o si solo entrarán, verán la información y contactarán. Explícalo simple.",
  technical_db:
    "Pregunta si necesita guardar datos de clientes (nombres, pedidos, citas) o si la web solo mostrará información.",
  technical_payments:
    "Pregunta cómo cobra hoy (transferencia, tarjeta, WhatsApp) y si le convendría cobrar directo en la web.",
  technical_dashboard:
    "Pregunta si quiere un panel para ver pedidos, citas o clientes en un solo lugar, o si le basta con recibir avisos.",
  technical_maps:
    "Pregunta si la gente necesita encontrarlo físicamente (local o sucursales) para incluir un mapa.",
  technical_pdfs:
    "Pregunta si genera cotizaciones, recibos o reportes para sus clientes que quisiera automatizar.",
  technical_chat:
    "Pregunta si quiere que los clientes le escriban directo desde la web (por ejemplo un botón de WhatsApp).",
  technical_bookings:
    "Pregunta si sus clientes agendan citas eligiendo día y hora, y si quiere permitir agendar en línea.",
  design:
    "Pregunta el estilo visual que quiere transmitir: algo moderno con movimiento o algo sobrio y de confianza, y qué sensación debe dar la web.",
  technical_seo:
    "Pregunta si quiere aparecer en Google cuando alguien busque su servicio o negocio.",
  technical_pwa:
    "Pregunta si quiere que la web se sienta como una app instalable en el celular.",
  scope_content:
    "Pregunta si ya tiene fotos, textos y logo, o si necesita ayuda para crearlos.",
  scope_services:
    "Pregunta qué SERVICIOS ofrece el negocio y cómo quiere mostrarlos (lista con precios, descripciones, cuántos son). Si no ofrece servicios, pregunta qué es lo que más quiere destacar para que lo contacten.",
  scope_reference:
    "Pregunta si le gusta alguna página de referencia (de cualquier giro) para afinar el estilo.",
  scope_deadline:
    "Pregunta para cuándo necesita la web, sin presionar, para organizar la entrega.",
  budget:
    "Pregunta qué inversión tiene en mente, con tacto y sin presionar, para ajustar el alcance a su presupuesto.",
  contact_name: "Pide el nombre del cliente o de su negocio para dirigirle la propuesta.",
  contact_email: "Pide el correo electrónico para enviarle la propuesta cuando esté lista.",
  contact_phone: "Pide un teléfono o WhatsApp donde pueda localizarlo para la propuesta.",
  extra_comments:
    "Pregunta si quiere agregar algún detalle más antes de armar la propuesta.",
};

/** Resuelve el objetivo de un nodo (los clarify_* reusan el del nodo base). */
export function resolveGoal(nodeId: string): string {
  const base = nodeId.replace(/^clarify_/, "");
  return TURN_GOALS[base] ?? TURN_GOALS[base === nodeId ? nodeId : base] ?? "Haz una pregunta clara y útil para avanzar en la entrevista.";
}

/** Contexto compacto (solo lo que ya sabemos del cliente). */
function compactContext(context: ChatContext): string {
  const known: Record<string, unknown> = {};
  const keys: Array<keyof ChatContext> = [
    "clientName", "clientEmail", "clientPhone", "category", "nivel", "paginas",
    "autenticacion", "baseDeDatos", "pagos", "dashboard", "mapas", "documentos",
    "chat", "citas", "animaciones", "seo", "pwa", "contenidoListo", "servicios",
    "estructuraWeb", "presupuesto", "fechaEntrega", "referencia", "comentarios",
    "negocioDescripcion",
  ];
  for (const k of keys) {
    const v = context[k];
    if (v === null || v === undefined || v === "") continue;
    known[k] = v;
  }
  return Object.keys(known).length
    ? JSON.stringify(known, null, 2)
    : "(aún no hay datos)";
}

interface GenerateOpts {
  messages: ChatMessage[];
  context: ChatContext;
  nodeId: string;
  fallbackReply: string;
  botName: string;
}

const SYSTEM_PROMPT = (botName: string) =>
  `Eres ${botName}, un consultor senior de desarrollo web en México con 15 años de experiencia cerrando proyectos.
Formas parte de un sistema que entrevista a un cliente potencial para cotizarle una página web profesional.
Tu única tarea en ESTE turno es redactar el siguiente mensaje que el consultor le envía al cliente.

REGLAS DE ORO:
- Haz EXACTAMENTE UNA pregunta clara y concreta que ayude a CONSTRUIR MEJOR la web (alcance, servicios, estructura, contenido, presupuesto, contacto).
- Si el contexto ya contiene la respuesta, NO vuelvas a preguntar eso.
- Tono: consultor con experiencia, empático, natural, en español de México. Cero tecnicismos.
- Si el objetivo es sobre SERVICIOS: pregunta si tiene servicios que mostrar y cuáles (con ejemplos de su giro si los conoces).
- Si el objetivo es sobre la ESTRUCTURA de la web: propón la estructura completa (p. ej. Inicio, Servicios, Nosotros, Contacto) y confirma con el cliente.
- Máximo 2 emojis. Máximo 50 palabras. NO menciones precios salvo que el objetivo sea presupuesto.
- NO inventes datos del cliente. Usa ejemplos genéricos solo si ayudan.
- Escribe solo el mensaje: sin comillas, sin títulos, sin explicaciones.`;

function buildUserPrompt(opts: GenerateOpts): string {
  const transcript = opts.messages
    .map((m) => `${m.role === "assistant" ? `${opts.botName} (consultor)` : "Cliente"}: ${m.content}`)
    .join("\n")
    .slice(-6000);

  return `OBJETIVO DE ESTE TURNO (lo que debes preguntar):
${resolveGoal(opts.nodeId)}

MENSAJE DETERMINISTA DE REFERENCIA (sirve para respetar tono y longitud; puedes mejorarlo):
${opts.fallbackReply}

CONVERSACIÓN HASTA AHORA:
${transcript || "(inicio de la conversación)"}

LO QUE YA SABEMOS DEL CLIENTE (contexto estructurado):
${compactContext(opts.context)}

Escribe únicamente el mensaje que ${opts.botName} debe enviar AHORA (una sola pregunta).`;
}

/** Limpia la respuesta del modelo: quita cercos markdown y comillas. */
function cleanReply(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^```(?:text|json)?\s*/i, "").replace(/```$/i, "").trim();
  t = t.replace(/^["'“”]+/, "").replace(/["'“”]+$/, "").trim();
  t = t.replace(/\s+/g, " ").trim();
  // Si es demasiado larga, no es una "pregunta" razonable → descartar
  if (t.length < 8 || t.length > 400) return "";
  // No debe empezar con "claro," "Aquí tienes", etc.
  if (/^(claro|por supuesto|aquí tienes|aquí está|genial, te|ok, te|perfecto, te)/i.test(t)) return "";
  return t;
}

/**
 * Genera el mensaje del siguiente turno usando DeepSeek.
 * Devuelve `fallbackReply` si no hay API key, hay error o la respuesta es inválida.
 */
export async function generateNextMessage(opts: GenerateOpts): Promise<string> {
  if (!getLlmProvider()) return opts.fallbackReply;

  try {
    const completion = await chatCompletion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT(opts.botName) },
        { role: "user", content: buildUserPrompt(opts) },
      ],
      temperature: 0.8,
      max_tokens: 160,
    });

    if (!completion?.content) return opts.fallbackReply;
    const reply = cleanReply(completion.content);
    return reply || opts.fallbackReply;
  } catch {
    return opts.fallbackReply;
  }
}
