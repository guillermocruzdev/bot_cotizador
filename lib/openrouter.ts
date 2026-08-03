/**
 * Cliente de OpenRouter para llamar a DeepSeek (lado servidor).
 *
 * Solo se ejecuta en el servidor (API route). Nunca exponer OPENROUTER_API_KEY
 * al cliente.
 */

import type { AnalysisResult, ChatContext, ChatMessage } from "@/lib/types";
import { PRICING_CATALOG, getCategoryById } from "@/lib/pricing-catalog";
import type { Nivel } from "@/lib/pricing-catalog";
import { buildFallbackProposal } from "@/lib/pricing-catalog";
import { buildTechnicalPrompt } from "@/lib/prompt-builder";
import {
  ajustarPrecio,
  detectarGiro,
  generarExplicacionPrecio,
  generarValorNegocio,
  GIROS,
} from "@/lib/industry-pricing";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Modelo por defecto: DeepSeek Chat v3 (accesible vía OpenRouter)
export const DEFAULT_MODEL = "deepseek/deepseek-chat-v3-0324:free";
// Alternativas:
// "deepseek/deepseek-chat-v3-0324"
// "deepseek/deepseek-r1"

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices?: {
    message?: { content?: string };
  }[];
}

/** Convierte el chat en el formato de mensajes para OpenRouter */
function buildMessages(
  transcript: ChatMessage[],
  context: ChatContext,
  botName: string
): OpenRouterMessage[] {
  const conversationText = transcript
    .map((m) => `${m.role === "assistant" ? `${botName} (consultor)` : "Cliente"}: ${m.content}`)
    .join("\n");

  const catalogText = PRICING_CATALOG.map((cat) => {
    const features = cat.features.map((f) => `  - ${f.id}: ${f.labelCliente} (~$${f.precio.toLocaleString()} MXN)`).join("\n");
    return [
      `- Categoría: ${cat.id} — "${cat.nombreCliente}"`,
      `  Precios base: Básico $${cat.base.basico.toLocaleString()}, Profesional $${cat.base.profesional.toLocaleString()}, Avanzado $${cat.base.avanzado.toLocaleString()} MXN`,
      `  Tiempo: ${cat.tiempo.basico} / ${cat.tiempo.profesional} / ${cat.tiempo.avanzado}`,
      `  Características extra (se suman):\n${features}`,
    ].join("\n");
  }).join("\n\n");

  const girosText = GIROS.map(
    (g) =>
      `- ${g.nombre} | presupuesto típico: $${g.presupuesto[0].toLocaleString("es-MX")}–$${g.presupuesto[1].toLocaleString("es-MX")} MXN | ${g.pitch}`
  ).join("\n");

  const system = `Eres ${botName}, un consultor experto en desarrollo web en México. 
Analizas conversaciones con clientes potenciales y generas propuestas profesionales.

Estás analizando la conversación completa que tuvo un consultor digital con un cliente.
Tu trabajo es generar una propuesta realista, clara y en LENGUAJE HUMANO (no técnico) 
para que el cliente entienda perfectamente qué va a recibir.

CATÁLOGO DE PRECIOS (MXN):
${catalogText}

GIROS / INDUSTRIAS Y SU PRESUPUESTO TÍPICO (MXN):
${girosText}

INSTRUCCIONES:
1. Determina la categoría (landing, ecommerce, citas, webapp, blog, portafolio) y el nivel (basico/profesional/avanzado) basándote en la conversación.
2. Calcula un precio realista en MXN usando el catálogo como referencia (base + características que pidió el cliente).
3. Genera 'funcionalidades' en LENGUAJE HUMANO, describiendo cada cosa como se la explicarías a un cliente (ej: "Calendario donde el paciente elige día y hora").
4. Explica POR QUÉ ese precio en 2-3 líneas claras, referenciando el presupuesto típico del giro.
5. Recomienda un stack técnico moderno (Next.js, Tailwind, Supabase, etc.) como tags legibles.
6. Redacta 'entregables' que el cliente recibirá al finalizar.
7. Redacta 'recomendaciones' prácticas para el cliente.
8. Escribe en 'prompt_tecnico' solo un PLAN TÉCNICO RESUMIDO (máx. 600 palabras, en español): funcionalidades técnicas, stack, estructura de páginas, modelo de datos y notas de implementación. Es una referencia; el documento completo de entrega se genera por otra vía.

INSTRUCCIONES COMERCIALES (CRÍTICAS):
- Detecta el GIRO del negocio a partir de la conversación (abogado, dentista, mecánico, restaurante, clínica, estética, etc.) y usa su presupuesto típico.
- Ajusta el precio al presupuesto de ese giro: si el estimado técnico excede lo que el giro suele invertir, reduce el rango (alcance ajustado) y comunícalo con honestidad.
- El precio debe ser ATRACTIVO para cerrar venta: un rango cuyo mínimo se sienta alcanzable para ese negocio.
- Genera copy de VENTA (no técnico) para que el cliente sienta que la web es una inversión necesaria:
  - 'giro': nombre del giro (ej: "Consultorio dental").
  - 'punto_venta': por qué este negocio necesita la web (1-2 frases de valor).
  - 'dolor': el problema que la web resuelve.
  - 'beneficios': 2-4 beneficios de negocio concretos en lenguaje de dueño.
  - 'valor_negocio': párrafo que vende la web como inversión (no gasto), con el rango de precio.
  - 'costo_omision': qué pierde el cliente si no lo hace (con honestidad, sin presión agresiva).
  - 'cuota_mensual': redondea (precio_min / 24) para mostrar "desde $X al mes".
  - 'alcance_ajustado' (true/false) y 'mensaje_alcance' (texto honesto si ajustaste el alcance por presupuesto).

El campo 'categoria' debe ser legible para el cliente (ej: "Sistema de Citas para Consultorio Dental", "Tienda online de ropa artesanal").
El campo 'nivel' debe ser "Básico", "Profesional" o "Avanzado".
'tiempo_estimado' debe ser como "4-7 días de desarrollo".

Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto extra).`;

  const user = `CONVERSACIÓN COMPLETA:
${conversationText}

DATOS ESTRUCTURADOS EXTRAÍDOS:
${JSON.stringify(context, null, 2)}

Genera la propuesta JSON.`;

  return [
    { role: "system", content: system },
    ...transcript.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
    { role: "user", content: user },
  ];
}

/** Extrae el JSON de la respuesta del modelo (tolera markdown) */
function parseModelJson(content: string): AnalysisResult | null {
  const trimmed = content.trim();
  // Quita cercos de markdown ```json ... ```
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1] : trimmed;
  try {
    const parsed = JSON.parse(jsonText) as Partial<AnalysisResult>;
    if (!parsed.categoria || !parsed.precio_min || !parsed.precio_max) return null;
    return parsed as AnalysisResult;
  } catch {
    return null;
  }
}

/**
 * Llama a DeepSeek vía OpenRouter y devuelve la propuesta.
 * Si falla o no hay API key, devuelve una propuesta de respaldo local.
 */
export async function analyzeWithOpenRouter(opts: {
  transcript: ChatMessage[];
  context: ChatContext;
  botName: string;
}): Promise<{ ok: boolean; result: AnalysisResult; fallback: boolean; error?: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Sin API key → respaldo local
  if (!apiKey) {
    const result = localFallback(opts);
    return { ok: true, result, fallback: true, error: "Sin OPENROUTER_API_KEY" };
  }

  try {
    const messages = buildMessages(opts.transcript, opts.context, opts.botName);

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://bot-cotizador.vercel.app",
        "X-Title": "Bot Cotizador",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const result = localFallback(opts);
      return { ok: true, result, fallback: true, error: `OpenRouter HTTP ${res.status}: ${body.slice(0, 300)}` };
    }

    const data = (await res.json()) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      const result = localFallback(opts);
      return { ok: true, result, fallback: true, error: "Respuesta vacía del modelo" };
    }

    const parsed = parseModelJson(content);
    if (!parsed) {
      const result = localFallback(opts);
      return { ok: true, result, fallback: true, error: "JSON inválido del modelo" };
    }

    // Ajuste de precio al presupuesto del giro + copy comercial de respaldo.
    // Garantiza que el precio quepa en lo que el giro suele invertir y que
    // los campos de venta siempre existan (aunque la IA los omita).
    const enriched = enrichCommercial(parsed, opts.context);

    // El prompt técnico se genera SIEMPRE de forma determinista (calidad
    // garantizada) usando el análisis de la IA como insumo enriquecido.
    const result: AnalysisResult = {
      ...enriched,
      clientName: opts.context.clientName ?? parsed.clientName ?? "",
      prompt_tecnico: buildAiPrompt(enriched, opts.context),
      meta: {
        modelo: DEFAULT_MODEL,
        generado_en: new Date().toISOString(),
      },
    };

    return {
      ok: true,
      result,
      fallback: false,
    };
  } catch (err) {
    const result = localFallback(opts);
    return {
      ok: true,
      result,
      fallback: true,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

/** Convierte la etiqueta de nivel de la IA al tipo interno */
function nivelFromLabel(label: string): Nivel {
  const l = (label ?? "").toLowerCase();
  if (l.includes("bás") || l.includes("bas")) return "basico";
  if (l.includes("avanz")) return "avanzado";
  return "profesional";
}

/**
 * Normaliza/ajusta el resultado de la IA a la estrategia de precios por giro:
 * - Clampa el precio al presupuesto típico del giro (con gancho + alcance ajustado).
 * - Rellena los campos comerciales (punto_venta, dolor, beneficios, valor, cuota, etc.)
 *   si la IA los omitió, usando los datos locales del giro.
 */
function enrichCommercial(result: AnalysisResult, context: ChatContext): AnalysisResult {
  const giro = detectarGiro(context.negocioDescripcion, context.category ?? "landing");
  const aj = ajustarPrecio(result.precio_min, result.precio_max, giro);

  return {
    ...result,
    precio_min: aj.precio_min,
    precio_max: aj.precio_max,
    cuota_mensual: aj.cuota_mensual,
    alcance_ajustado: aj.alcance_ajustado,
    mensaje_alcance: result.mensaje_alcance ?? aj.mensaje_alcance,
    giro: result.giro ?? giro.nombre,
    punto_venta: result.punto_venta ?? giro.pitch,
    dolor: result.dolor ?? giro.dolor,
    beneficios: result.beneficios?.length ? result.beneficios : giro.beneficios,
    valor_negocio: result.valor_negocio ?? generarValorNegocio(giro, aj.precio_min, aj.precio_max),
    costo_omision: result.costo_omision ?? giro.costo_omision,
    explicacion_precio:
      result.explicacion_precio ||
      generarExplicacionPrecio(giro, aj.precio_min, aj.precio_max, aj.alcance_ajustado),
  };
}

/**
 * Genera el prompt técnico profesional a partir del análisis de la IA.
 * El documento senior (brief técnico) se arma de forma determinista para
 * garantizar calidad y consistencia, tomando el alcance refinado por DeepSeek.
 */
function buildAiPrompt(result: AnalysisResult, context: ChatContext): string {
  const categoryId = context.category ?? "landing";
  const category = getCategoryById(categoryId) ?? PRICING_CATALOG[0];
  const nivel = nivelFromLabel(result.nivel ?? "Profesional");
  const giro = detectarGiro(context.negocioDescripcion, categoryId);
  const presupuesto_giro = `$${giro.presupuesto[0].toLocaleString("es-MX")}–$${giro.presupuesto[1].toLocaleString("es-MX")} MXN`;

  return buildTechnicalPrompt({
    clientName: context.clientName ?? result.clientName ?? "",
    businessDescription: context.negocioDescripcion,
    category,
    nivel,
    context,
    analysis: {
      categoria: result.categoria,
      nivelLabel: result.nivel ?? "Profesional",
      precio_min: result.precio_min,
      precio_max: result.precio_max,
      tiempo_estimado: result.tiempo_estimado,
      funcionalidades: result.funcionalidades ?? [],
      stack_tecnico: result.stack_tecnico ?? [],
      entregables: result.entregables ?? [],
      recomendaciones: result.recomendaciones ?? [],
      giro: result.giro ?? giro.nombre,
      punto_venta: result.punto_venta ?? giro.pitch,
      dolor: result.dolor ?? giro.dolor,
      beneficios: result.beneficios ?? giro.beneficios,
      valor_negocio: result.valor_negocio ?? "",
      costo_omision: result.costo_omision ?? giro.costo_omision,
      presupuesto_giro,
      cuota_mensual: result.cuota_mensual,
      alcance_ajustado: result.alcance_ajustado,
    },
  });
}

/** Genera una propuesta local sin IA (respaldo / desarrollo) */
function localFallback(opts: {
  transcript: ChatMessage[];
  context: ChatContext;
}): AnalysisResult {
  const ctx = opts.context;
  const categoryId = ctx.category ?? "landing";

  const activeFeatures: string[] = [];
  if (ctx.autenticacion) activeFeatures.push("autenticacion");
  if (ctx.pagos) activeFeatures.push("pagos");
  if (ctx.dashboard) activeFeatures.push("dashboard");
  if (ctx.mapas) activeFeatures.push("mapas");
  if (ctx.documentos) activeFeatures.push("documentos");
  if (ctx.chat) activeFeatures.push("chat");
  if (ctx.citas && categoryId !== "citas") activeFeatures.push("citas");
  if (ctx.animaciones) activeFeatures.push("animaciones");
  if (ctx.seo) activeFeatures.push("seo");
  if (ctx.pwa) activeFeatures.push("pwa");

  const result = buildFallbackProposal(
    categoryId,
    activeFeatures,
    ctx.clientName ?? "tu negocio",
    ctx
  );

  // Personaliza el nombre del cliente en la propuesta
  return {
    ...result,
    clientName: ctx.clientName ?? "",
    meta: {
      modelo: "fallback-local",
      generado_en: new Date().toISOString(),
    },
  };
}
