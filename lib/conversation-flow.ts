/**
 * FLUJO CONVERSACIONAL — Árbol de decisión
 *
 * NO es una lista de preguntas. Es un grafo donde cada nodo:
 * - Genera un mensaje contextual (reacciona a lo que dijo el cliente)
 * - Decide a dónde ir según la respuesta (puede retroceder o ir a ejemplos)
 * - Guarda datos en el contexto (memoria de corto plazo)
 *
 * Si el cliente dice "no sé", el bot va a un nodo de clarificación con
 * ejemplos/empatía en vez de avanzar mecánicamente.
 */

import type {
  ChatContext,
  ConversationNode,
  ExpectedResponseType,
} from "@/lib/types";
import {
  BOT,
  classifyIntent,
  extractBudgetAmount,
  extractDeadline,
  extractEmail,
  extractName,
  extractSubject,
  normalizePhone,
  pickEmoji,
  randomClosing,
  randomEmpathy,
  randomExperience,
  randomReaction,
  randomTransition,
} from "@/lib/personality";
import { PRICING_CATALOG, getCategoryById, inferCategory } from "@/lib/pricing-catalog";
import { detectarBotsRecomendados, extraerBotsDeRespuesta } from "@/lib/bots-catalog";

export const START_NODE_ID = "greeting";

/** Nodo especial: cuando se llega aquí el bot cierra y genera la propuesta */
export const DONE_NODE_ID = "__DONE__";

/** Texto centinela: avanza sin almacenar nada */
export const SKIP = "__SKIP__";

// ─── Helpers ────────────────────────────────────────────────────────

function categoryName(ctx: ChatContext): string {
  const cat = getCategoryById(ctx.category ?? "landing");
  return cat?.nombreCliente ?? "una página para tu negocio";
}

function isNoSé(response: string, ctx: ChatContext): boolean {
  return classifyIntent(response).dontKnow;
}

/** Patrones de señales técnicas y el campo de contexto que activan */
const SIGNAL_PATTERNS: Array<{
  re: RegExp;
  field: "pagos" | "citas" | "dashboard" | "autenticacion" | "baseDeDatos";
}> = [
  { re: /(pagar|pago|pagos|comprar|vender|paypal|stripe|tarjeta|transferencia)/, field: "pagos" },
  { re: /(cita|citas|agendar|reservar|reserva|turno)/, field: "citas" },
  { re: /(panel|dashboard|administrar|admin|reportes|estad[íi]sticas)/, field: "dashboard" },
  { re: /(cuenta|cuentas|registrarse|registro|login|usuarios)/, field: "autenticacion" },
  { re: /(base de datos|guardar datos|guardamos)/, field: "baseDeDatos" },
];

/** Cláusula en la que aparece una coincidencia (hasta el último separador). */
function clauseBefore(t: string, matchIndex: number): string {
  if (matchIndex <= 0) return "";
  let start = -1;
  for (const sep of [",", ";", ".", "pero", "aunque"]) {
    const idx = t.lastIndexOf(sep, matchIndex - 1);
    if (idx > start) start = idx;
  }
  return t.slice(start + 1, matchIndex);
}

/**
 * ¿La palabra en `matchIndex` está precedida de negación en su cláusula?
 * Retrocede hasta el último separador de cláusula (coma, punto, punto y coma,
 * "pero", "aunque") y busca negaciones: "no ...", "sin ...", "no necesito ...",
 * y encadenadas con "ni" ("no quiero pagos, ni panel, ni cuentas").
 */
function isNegated(t: string, matchIndex: number): boolean {
  if (matchIndex <= 0) return false;
  return /(^|\s)(no|sin|nunca|jam[áa]s|nada de|no necesito|no quiero|no me interesa|no me gusta|no tengo|ni)\s+/i.test(
    clauseBefore(t, matchIndex)
  );
}

/**
 * ¿La cláusula es una DUDA ("no sé si quiero X", "no tengo idea si quiero X")
 * en vez de un rechazo claro? Una duda NO se interpreta como "no lo quiero":
 * el bot debe confirmar, no asumir que lo rechaza.
 */
function isDoubt(t: string, matchIndex: number): boolean {
  if (matchIndex <= 0) return false;
  return /(no s[ée]|no tengo idea|no estoy segur[oa]|no me decido|quien sabe|quién sabe|ni idea|no sé bien|no lo s[ée])/.test(
    clauseBefore(t, matchIndex)
  );
}

/**
 * Patrones de RECHAZO explícito (para extraer lo que el cliente NO quiere):
 * se usan SOLO con negación ("no quiero X", "sin X") y con keywords MÁS
 * específicas que las de activación. Ej: "no quiero pagar publicidad" NO pone
 * pagos=false (ahí "pagar" no es cobro en línea); "no quiero pagos en línea" SÍ.
 */
const NEGATIVE_SIGNAL_PATTERNS: Array<{
  re: RegExp;
  field: "pagos" | "citas" | "dashboard" | "autenticacion" | "baseDeDatos";
}> = [
  {
    re: /(pagos? en l[ií]nea|pagos? online|pago en l[ií]nea|cobrar? en l[ií]nea|cobros? en l[ií]nea|tarjeta|pasarela|checkout|stripe|paypal|venta en l[ií]nea|pagos? con tarjeta)/,
    field: "pagos",
  },
  { re: /(cita|citas|agendar|reserva|reservar|turno|agenda|agendan)/, field: "citas" },
  { re: /(panel|dashboard|reportes|estad[íi]sticas)/, field: "dashboard" },
  { re: /(cuenta|cuentas|registrarse|registro|login|usuarios)/, field: "autenticacion" },
  { re: /(base de datos|guardar datos|guardamos)/, field: "baseDeDatos" },
];

/**
 * Extrae señales técnicas de una respuesta larga (memoria de corto plazo),
 * CONSCIENTE DE NEGACIÓN:
 * - "Quiero que agenden citas" → citas=true (el cliente SÍ lo quiere → el nodo
 *   solo confirmará).
 * - "No necesito reservar mesas" → citas=false (el bot YA SABE que no lo
 *   quiere → el nodo se salta y no vuelve a preguntar).
 * - "No sé si quiero citas" → se deja en null (duda → se confirma después).
 */
function extractSignals(response: string, ctx: ChatContext): void {
  const t = response.toLowerCase();
  // 1) Activación (lo que el cliente SÍ menciona que quiere).
  for (const { re, field } of SIGNAL_PATTERNS) {
    if (ctx[field] !== null) continue;
    // Ojo: el flag "g" es OBLIGATORIO para que exec() avance lastIndex entre
    // coincidencias (sin él, exec siempre devuelve la misma y hay loop infinito).
    const rx = new RegExp(re.source, re.flags + "g");
    let m: RegExpExecArray | null;
    let activated = false;
    while ((m = rx.exec(t)) !== null) {
      if (!isNegated(t, m.index)) {
        activated = true;
        break;
      }
      if (m.index === rx.lastIndex) rx.lastIndex += 1; // evita loop infinito
    }
    if (activated) (ctx as unknown as Record<string, unknown>)[field] = true;
  }
  // 2) Rechazo explícito (lo que el cliente NO quiere): los nodos condicionales
  //    se saltarán esas preguntas. Una duda no cuenta como rechazo.
  for (const { re, field } of NEGATIVE_SIGNAL_PATTERNS) {
    if (ctx[field] !== null) continue;
    const rx = new RegExp(re.source, re.flags + "g");
    let m: RegExpExecArray | null;
    let rejected = false;
    while ((m = rx.exec(t)) !== null) {
      if (isNegated(t, m.index) && !isDoubt(t, m.index)) {
        rejected = true;
        break;
      }
      if (m.index === rx.lastIndex) rx.lastIndex += 1; // evita loop infinito
    }
    if (rejected) (ctx as unknown as Record<string, unknown>)[field] = false;
  }
}

/** Señal de presupuesto: abre la captura de un monto en respuestas libres.
 * Evita capturar "en 3 meses" como dinero. Incluye verbos de intención de
 * dinero ("para marzo, tengo 10000") para que el monto dicho junto al plazo
 * no se pierda ni se vuelva a preguntar. */
const BUDGET_SIGNAL =
  /(presupuesto|inversi[oó]n|cobran|cobrar|cobro|cuesta|cueste|costo|costar|pesos?|\$|monto|gastar|gasto|alcanza|alcance|mil|k\b|rango|no m[áa]s|tengo|contaba|ando pensando|pensaba invertir|le puedo dar|tengo pensado)/i;

/**
 * Captura temprana de datos de contacto/negocio que el cliente suelte en
 * CUALQUIER respuesta (no solo en su nodo): nombre, email, presupuesto (con
 * guard de señal de dinero), plazo y teléfono. Solo se guarda si aún están
 * vacíos, y "no sé / no me acuerdo / ninguno" NO captura (los extractores ya
 * devuelven null). El nombre solo se toma con intro clara de presentación
 * ("soy/me llamo/mi nombre es...") para no guardar "Tengo una clínica..."
 * como nombre. El plazo NO usa extractSubject como respaldo: eso solo aplica
 * en el nodo scope_deadline donde el cliente responde la fecha a propósito.
 * El TELÉFONO NO se captura aquí: normalizePhone sobre una respuesta larga
 * mezclaría dígitos del presupuesto ("20 mil ... 81 2345 6789" → "+52 20 ..."),
 * así que se pide en su propio nodo contact_phone.
 */
function captureEarlyData(response: string, ctx: ChatContext): void {
  if (!ctx.clientName) {
    const intro = response
      .replace(
        /^(hola|buenas|buen d[ií]a|buenos d[ií]as|buenas tardes|buenas noches|qu[ée] tal|que tal)\s*[,:]?\s*/i,
        ""
      )
      .trim();
    if (
      /^(yo\s+soy|soy|me llamo|mi nombre es|mi negocio se llama|nos llamamos|somos|es)\b/i.test(
        intro
      )
    ) {
      ctx.clientName = extractName(response);
    }
  }
  if (!ctx.clientEmail) {
    const email = extractEmail(response);
    if (email) ctx.clientEmail = email;
  }
  if (ctx.presupuesto == null && BUDGET_SIGNAL.test(response)) {
    const amount = extractBudgetAmount(response);
    if (amount) ctx.presupuesto = amount;
  }
  if (ctx.fechaEntrega == null) {
    const d = extractDeadline(response);
    if (d) ctx.fechaEntrega = d;
  }
}

/** Detecta señales mencionadas en la respuesta para confirmarlas al cliente */
function mentionedSignals(response: string): string[] {
  const t = response.toLowerCase();
  const signals: string[] = [];
  if (/(cita|citas|agendar|reservar)/.test(t)) signals.push("lo de las citas");
  if (/(pagar|pago|pagos|comprar|vender)/.test(t)) signals.push("lo de los pagos");
  if (/(panel|dashboard|administrar)/.test(t)) signals.push("lo del panel para administrar");
  if (/(cuenta|cuentas|registrarse|login)/.test(t)) signals.push("lo de las cuentas de usuario");
  return signals;
}

/** Frases de ruido que NO son secciones de una web */
const SECTION_NOISE = new Set([
  "me gusta lo primero", "me gusta", "yo quiero", "quiero", "así como", "algo como",
  "tipo", "como", "una sola página", "una pagina", "una página", "simple", "sencillo",
  "solo", "sola", "algo corto", "algo", "así", "asi", "varias secciones", "varias",
  "más", "mas", "de ti", "de mi", "donde cuentes", "donde cuente", "cuentes",
  "que", "no sé", "no se", "ni idea", "la verdad", "pues", "bueno", "depende",
  "lo primero", "primero", "primera", "no", "nada", "completo", "directo",
]);

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Introductores de lista que anuncian las secciones (antes de ":" o como conector) */
const SECTION_LEAD_IN =
  /(una sola página|una pagina|una página sencilla|una pagina sencilla|de corrido|varias secciones|algo así como|algo como|así como|imagino|pienso|por ejemplo|tipo|quiero|me gusta)/i;

/** Verbo de intención al final del prefijo (antes de ":") que anuncia la lista.
 * "La página que sueño para mi negocio es: inicio, ..." → cortar tras los dos
 * puntos aunque no haya un lead-in conocido (el "es" es señal de que sigue la
 * enumeración). */
const INTENT_VERB_END =
  /(es|será|quiero|imagino|necesito|pienso|deseo|sueño con|me gustaría)\s*$/i;

/**
 * Descarta lo que está ANTES de la primera sección real.
 * La respuesta suele mezclar una opinión ("Algo minimalista con fotos grandes.
 * Pues imagino...") con la enumeración real. Las secciones empiezan:
 *  - tras los dos puntos de la lista ("...una sola página de corrido: inicio, ..."),
 *  - o tras un conector introductorio ("... Pues imagino inicio, ...",
 *    "..., algo así como Inicio, Menú, ...").
 * Solo se corta cuando hay una señal clara de que ahí empieza la enumeración,
 * para no recortar una respuesta que ya es solo una lista.
 */
function cutBeforeSections(s: string): string {
  // 1) La lista va tras los dos puntos y antes hay un introductor de lista
  //    conocido ("...una sola página de corrido: ...") o un verbo de intención
  //    al final del prefijo ("La página que sueño es: ...").
  const colon = s.lastIndexOf(":");
  if (
    colon >= 0 &&
    (SECTION_LEAD_IN.test(s.slice(0, colon)) || INTENT_VERB_END.test(s.slice(0, colon)))
  ) {
    const after = s.slice(colon + 1).trim();
    if (after) return after;
  }
  // 2) Sin ":", la lista va tras un conector introductorio en medio de la frase.
  const m = s.match(
    /(?:^|\s)(?:pues\s+)?(?:me\s+)?imagino\s+|(?:^|\s)pienso\s+|(?:^|\s)algo\s+as[ií]\s+como\s+/i
  );
  if (m && m.index !== undefined) {
    const after = s.slice(m.index + m[0].length).trim();
    if (after) return after;
  }
  return s;
}

/**
 * Extrae una lista limpia de secciones de una respuesta libre.
 * "me gusta lo primero, una sola página, algo así como Inicio, Menú, Ubicación y Contacto"
 * → "Inicio, Menú, Ubicación, Contacto"
 * "Sí, así una sola página: inicio, mis servicios, la ubicación con el mapa y el contacto. Con eso me conformo"
 * → "Inicio, Mis servicios, Ubicación con el mapa, Contacto"
 */
function extractSections(raw: string): string | null {
  const t = raw.replace(/[.,;:!?¿¡]+$/g, "").trim();
  if (!t) return null;

  // Quitar prefijos de opinión/vacilación
  let cleaned = t
    .replace(/^(yo\s+)?(me gusta|quiero|me encantaría|así como|algo como|tipo|como|as[ií])\s+/i, "")
    .replace(/^(lo primero|la primera|primero|primera)\s*[,:]?\s*/i, "")
    .replace(/^(lo que quiero es|lo que busco es|lo que necesito es)\s+/i, "");

  // Prefijos de afirmación/muletilla: "sí,", "bueno,", "pues,", "la verdad,", "ok,", "claro,"...
  // y el "así" que queda tras ellos ("Sí, así una sola página:..." → "así una sola página:...").
  cleaned = cleaned
    .replace(
      /^((s[ií]|bueno|pues|la verdad|ver[aá]s|mira|ok|okay|claro|perfecto|excelente|de acuerdo)\s*[,:]?\s*)+/i,
      ""
    )
    .replace(/^as[ií]\s*[,:]?\s*/i, "");

  // Descarta lo que está ANTES de la primera sección real: si la respuesta
  // mezcla la estructura con una opinión previa ("algo minimalista con fotos
  // grandes. Pues imagino..."), las secciones empiezan tras los dos puntos o
  // tras un conector introductorio; todo lo anterior es relleno.
  cleaned = cutBeforeSections(cleaned);

  // Relleno de cierre "así de sencillo/simple/fácil": se retira ANTES de
  // quitar "sencillo"/"simple" sueltos (si no, "así de sencillo" quedaba
  // como "así de" → sección basura "Así de").
  cleaned = cleaned
    .replace(/[.,;:]?\s*as[ií] de (sencillo|simple|f[áa]cil|directo|f[áa]cil de usar)\s*$/i, "")
    .replace(/\s+as[ií] de (sencillo|simple|f[áa]cil)\s+/gi, " ")
    .replace(/[.,;:]?\s*as[ií] de\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Frases de estructura que NO son secciones: "una sola página", "de corrido"...
  // "una sola página: inicio" → ": inicio" → "inicio"
  cleaned = cleaned
    .replace(
      /\b(una sola página|una pagina|una página sencilla|una pagina sencilla|una página simple|una pagina simple|simple|sencillo|de corrido|varias secciones)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[\s:,]+/, "");

  // Relleno final de conformidad: "con eso me conformo", "con eso me basta"...
  // El ":" también puede CERRAR la lista en vez de abrirla ("inicio, servicios
  // y contacto: con eso me basta") → el texto tras un ":" no introductor es
  // relleno final de la misma familia (Tarea A2).
  cleaned = cleaned.replace(
    /[.,;:]\s*(con eso me conformo|con eso me basta|con eso me doy por bien servido|con eso la hago|con eso me arreglo|nada m[áa]s|eso es todo|ya con eso|algo as[ií]|nada complicado|m[áa]s o menos)\s*$/i,
    ""
  );

  const parts = cleaned
    .split(/,|;|\n| y | e /i)
    .map((p) => p.trim())
    .filter(Boolean);

  const sections: string[] = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (
      /^(no s[ée]|ni idea|nada|una sola página|una pagina|una página|simple|sencillo|solo|sola|algo corto|depende|no|lo primero|primero|primera)$/.test(
        lower
      )
    ) {
      continue;
    }
    // "algo así como X" / "así como X" → tomar X
    let p = part.replace(/^(algo\s+)?as[ií]\s+como\s+/i, "").trim();
    p = p.replace(/^(la|el|los|las|una|un|unos|unas|lo|secci[oó]n)\s+/i, "").trim();
    p = p.replace(/[.,;:!?¿¡]+$/g, "").trim();
    if (!p || p.length < 2) continue;
    if (SECTION_NOISE.has(p.toLowerCase())) continue;
    sections.push(capitalize(p));
  }

  return sections.length ? sections.join(", ") : null;
}

/**
 * Normaliza una lista de servicios: divide por comas/puntos/saltos/"y", quita
 * artículos iniciales y devuelve un string limpio (compatible con prompt-builder).
 */
function normalizeServices(raw: string): string | null {
  const t = raw.replace(/[.,;:]+$/g, "").trim();
  if (!t || /^(no s[ée]|ni idea|no|nada)$/i.test(t)) return null;
  const items = t
    .split(/,|;|\n|\.| y | e /i)
    .map((s) => s.replace(/^(la|el|los|las|una|un|unos|unas|lo)\s+/i, "").trim())
    .filter((s) => s.length > 0);
  return items.length ? items.join(", ") : null;
}

/**
 * ¿El cliente está DECLINANDO dar el dato de contacto (en vez de dar uno
 * inválido o dudar)? Un "no tengo/no doy correo/teléfono" avanza sin forzar;
 * una duda ("no sé", "no me acuerdo") o un dato inválido re-pregunta.
 */
function isDecliningContact(raw: string): boolean {
  const t = raw.toLowerCase().trim();
  if (/(no s[ée]|no se|no me acuerdo|no recuerdo|ni idea)/.test(t)) return false;
  if (
    /^(no|nop|nope|ninguno|ninguna|no gracias|no tengo|no doy|no quiero|no me interesa|no manejo|no uso)\b/.test(
      t
    )
  ) {
    return true;
  }
  if (
    /(no tengo|no doy|no quiero|no me interesa|no manejo|no uso)\s+(?:correo|email|mail|tel[ée]fono|celular|whatsapp|n[uú]mero|dato)/i.test(
      t
    )
  ) {
    return true;
  }
  return false;
}

/** Fábrica de nodos "sí / no" con clarificación integrada */
function makeBooleanNode(opts: {
  id: string;
  type: ConversationNode["type"];
  message: (ctx: ChatContext) => string;
  field: keyof ChatContext;
  next: string;
  condition?: (ctx: ChatContext) => boolean;
  clarifyId?: string;
}): ConversationNode {
  return {
    id: opts.id,
    type: opts.type,
    generateMessage: opts.message,
    expectedResponseType: "boolean",
    condition: opts.condition,
    nextNode: (response, ctx) => {
      // Respuesta vacía = salto por condición (skip): ir directo al siguiente,
      // NO a la clarificación (si no, "" se interpreta como "no sé").
      if (!response || !response.trim()) return opts.next;
      const intent = classifyIntent(response);
      if (intent.dontKnow) {
        // Ya lo intentó varias veces → avanza sin forzar
        if (ctx.noSeContador >= 2) {
          ctx.noSeContador = 0;
          return opts.next;
        }
        return opts.clarifyId ?? opts.next;
      }
      return opts.next;
    },
    onReceive: (response, ctx) => {
      const intent = classifyIntent(response);
      (ctx as unknown as Record<string, unknown>)[opts.field] = intent.yes
        ? true
        : intent.no
          ? false
          : null;
    },
  };
}

/** Fábrica de nodos de clarificación (cuando el cliente dice "no sé").
 *  IMPORTANTE: `id` es la CLAVE con la que el nodo queda registrado en FLOW
 *  (p. ej. "clarify_db"). El self-loop ("no sé" repetido) debe regresar ESA
 *  clave y no `clarify_${originalId}`: el original es "technical_db" pero el
 *  nodo vive bajo "clarify_db", así que regresar "clarify_technical_db" hacía
 *  que el chat buscara un nodo inexistente y se congelara. */
function makeClarifyNode(opts: {
  /** Clave con la que el nodo queda registrado en FLOW (ej. "clarify_db") */
  id: string;
  originalId: string;
  hints: string[];
  forwardNext: string;
  extraHintAfterFirst?: (ctx: ChatContext) => string;
}): ConversationNode {
  return {
    id: opts.id,
    type: "clarification",
    generateMessage: (ctx) => {
      const first = randomEmpathy();
      if (ctx.noSeContador >= 1 && opts.extraHintAfterFirst) {
        return `${first} ${opts.extraHintAfterFirst(ctx)}`;
      }
      const hint = opts.hints[Math.min(ctx.noSeContador, opts.hints.length - 1)];
      return `${first} ${hint}`;
    },
    expectedResponseType: "text",
    nextNode: (response, ctx) => {
      const original = FLOW[opts.originalId];
      const intent = classifyIntent(response);
      if (intent.dontKnow) {
        ctx.noSeContador += 1;
        if (ctx.noSeContador >= 2) {
          ctx.noSeContador = 0;
          return opts.forwardNext;
        }
        return opts.id;
      }
      ctx.noSeContador = 0;
      original.onReceive?.(response, ctx);
      return original.nextNode(response, ctx);
    },
  };
}

// ─── El grafo de nodos ──────────────────────────────────────────────

export const FLOW: Record<string, ConversationNode> = {
  // ══════════ FASE 1: Saludo ══════════
  greeting: {
    id: "greeting",
    type: "greeting",
    generateMessage: () =>
      `¡Qué gusto tenerte por aquí! Soy ${BOT.name}, el consultor que te va a ayudar a que tu negocio crezca por internet. ${pickEmoji("saludo")}\n\n` +
      `Antes de hablar de precios, quiero entender bien tu negocio: qué haces, a quién le vendes y qué te gustaría lograr. No hay respuestas incorrectas; solo cuéntame con confianza, como si estuvieras platicando con alguien que ya ha visto muchos negocios como el tuyo. ¿Empezamos?`,
    expectedResponseType: "text",
    nextNode: () => "discovery_business",
  },

  // ══════════ FASE 2: Descubrimiento ══════════
  discovery_business: {
    id: "discovery_business",
    type: "discovery",
    generateMessage: () =>
      `Cuéntame, ¿qué hace tu negocio hoy? Y si puedes, dime también qué es lo que más te urge lograr con tu página: más clientes, vender más, o simplemente que te tomen más en serio. Eso me ayuda a no venderte de más.`,
    expectedResponseType: "text",
    nextNode: (response, ctx) => {
      if (isNoSé(response, ctx)) return "clarify_discovery_business";
      return "discovery_confirm";
    },
    onReceive: (response, ctx) => {
      ctx.negocioDescripcion = extractSubject(response);
      ctx.category = inferCategory(response);
      extractSignals(response, ctx);
      // Si el cliente RECHAZÓ las citas explícitamente ("no quiero citas en
      // línea"), la categoría no puede ser "citas": inferCategory cuenta las
      // keywords ("clínica", "citas en línea") aunque estén negadas. Baja a
      // landing para que el flujo no pregunte PWA/referencia de más ni cobre
      // como sistema de citas.
      if (ctx.category === "citas" && ctx.citas === false) {
        ctx.category = "landing";
      }
      captureEarlyData(response, ctx);
    },
  },

  discovery_confirm: {
    id: "discovery_confirm",
    type: "discovery",
    generateMessage: (ctx) => {
      const signals = mentionedSignals(ctx.negocioDescripcion ?? "");
      const mention = signals.length
        ? `Vi que mencionaste ${signals.join(" y ")}, anotado. `
        : "";
      return (
        `${randomExperience()} ${mention}Entonces, por lo que me cuentas, lo que te conviene es algo tipo **${categoryName(ctx)}**. ¿Me equivoco?`
      );
    },
    expectedResponseType: "boolean",
    nextNode: (response, ctx) => {
      const intent = classifyIntent(response);
      if (intent.yes) return "pages";
      // "no" o "no sé" → mostrar ejemplos para afinar la categoría
      return "discovery_examples";
    },
    onReceive: (response, ctx) => {
      const intent = classifyIntent(response);
      if (intent.no) {
        // Deja que discovery_examples re-infiera
        ctx.category = null;
      }
      captureEarlyData(response, ctx);
    },
  },

  discovery_examples: {
    id: "discovery_examples",
    type: "clarification",
    generateMessage: () => {
      const cats = PRICING_CATALOG.map((c) => `• ${c.nombreCliente}`).join("\n");
      return (
        `Tranquilo, esto es más común de lo que crees: casi ningún dueño llega sabiendo exactamente qué necesita. ${pickEmoji("idea")} En mi experiencia, casi todo cae en una de estas:\n\n` +
        `${cats}\n\n` +
        `¿Cuál se parece más a lo que quieres lograr? O cuéntame con tus palabras qué te gustaría que pasara cuando la gente entre a tu página.`
      );
    },
    expectedResponseType: "text",
    nextNode: (response, ctx) => {
      const intent = classifyIntent(response);
      if (intent.dontKnow) {
        ctx.noSeContador += 1;
        if (ctx.noSeContador >= 2) {
          ctx.noSeContador = 0;
          ctx.category = ctx.category ?? "landing";
          return "pages";
        }
        return "discovery_examples";
      }
      ctx.noSeContador = 0;
      const inferred = inferCategory(response);
      ctx.category = inferred;
      return "pages";
    },
  },

  clarify_discovery_business: makeClarifyNode({
    id: "clarify_discovery_business",
    originalId: "discovery_business",
    hints: [
      "A ver, hagámoslo fácil: en una frase, ¿qué le ofreces a tu cliente? Por ejemplo: 'doy clases de inglés', 'vendo ropa hecha a mano', 'tengo una estética'...",
    ],
    forwardNext: "discovery_confirm",
    extraHintAfterFirst: () =>
      "Te doy un ejemplo como los que veo seguido: 'tengo un negocio de comida y quiero que la gente pida por internet'. Solo dime tu giro y qué te gustaría lograr; no necesitas más detalle.",
  }),

  // ══════════ FASE 2b: Alcance de páginas ══════════
  pages: {
    id: "pages",
    type: "discovery",
    generateMessage: (ctx) =>
      `Perfecto, entonces vamos por un proyecto de **${categoryName(ctx)}**. ${pickEmoji("idea")} Otra cosa: ¿cómo imaginas que la gente recorra tu página? ¿Algo corto y directo, o con varias secciones donde cuentes más de ti? Por ejemplo: Inicio, Servicios, Contacto...`,
    expectedResponseType: "number",
    nextNode: (response, ctx) => {
      if (isNoSé(response, ctx)) return "clarify_pages";
      return "technical_auth";
    },
    onReceive: (response, ctx) => {
      const num = response.match(/\d+/);
      const t = response.toLowerCase();
      if (num) {
        ctx.paginas = Math.min(parseInt(num[0], 10), 30);
      } else if (/(una sola|una página|sencillo|simple|1 )/.test(t)) {
        ctx.paginas = 1;
      } else if (/(varias|más de|completo)/.test(t)) {
        ctx.paginas = 5;
      } else {
        ctx.paginas = 3;
      }
      // Guarda la estructura/secciones LIMPIA que describió el cliente
      // ("me gusta lo primero, una sola página, Inicio, Menú..." → "Inicio, Menú").
      const sections = extractSections(response);
      if (sections) {
        ctx.estructuraWeb = sections;
      }
      captureEarlyData(response, ctx);
    },
  },

  clarify_pages: makeClarifyNode({
    id: "clarify_pages",
    originalId: "pages",
    hints: [
      "Te ayudo con lo que he visto: una página sencilla suele ser Inicio, Servicios y Contacto (todo en una sola página). Una más completa tiene varias secciones: Inicio, Nosotros, Servicios, Galería, Contacto. ¿Con cuál te sientes más cómodo?",
    ],
    forwardNext: "technical_auth",
  }),

  // ══════════ FASE 3: Detalles técnicos (disfrazados) ══════════
  technical_auth: makeBooleanNode({
    id: "technical_auth",
    type: "technical",
    message: (ctx) =>
      `${randomTransition()} Ahora, algo que define mucho el proyecto: ¿tus clientes van a "registrarse" en tu página, o solo van a entrar, ver tu información y contactarte? Muchos negocios no necesitan cuentas; con que te contacten, basta.`,
    field: "autenticacion",
    next: "technical_db",
    // Si el cliente ya dijo que no quiere cuentas/registro, no volver a preguntar.
    condition: (ctx) => ctx.autenticacion !== false,
    clarifyId: "clarify_auth",
  }),

  clarify_auth: makeClarifyNode({
    id: "clarify_auth",
    originalId: "technical_auth",
    hints: [
      "Mira, ejemplo simple: si tus clientes van a entrar a revisar algo (su historial, sus pedidos), sí necesitan cuenta. Si solo van a verte y escribirte, no. ¿Tus clientes van a 'entrar' a algo?",
    ],
    forwardNext: "technical_db",
  }),

  technical_db: makeBooleanNode({
    id: "technical_db",
    type: "technical",
    message: (ctx) =>
      `Y dime: ¿hay algo que te gustaría guardar de tus clientes? Como sus datos, sus pedidos o sus citas. Si sí, lo hacemos bien guardado y en orden; si solo es mostrar información, también está perfecto.`,
    field: "baseDeDatos",
    next: "technical_payments",
    // Si el cliente ya dijo que no guarda datos, no volver a preguntar.
    condition: (ctx) => ctx.baseDeDatos !== false,
    clarifyId: "clarify_db",
  }),

  clarify_db: makeClarifyNode({
    id: "clarify_db",
    originalId: "technical_db",
    hints: [
      "En corto: ¿la página solo muestra tu información, o también necesita guardar cosas de tus clientes (nombres, pedidos, citas)? Si hay que guardar, se hace bien y seguro.",
    ],
    forwardNext: "technical_payments",
  }),

  technical_payments: makeBooleanNode({
    id: "technical_payments",
    type: "technical",
    message: (ctx) =>
      `Otra cosa que me interesa saber: ¿cómo te pagan hoy tus clientes? ¿Te transfieren, te depositan, o mejor te buscan por WhatsApp? Con eso te digo si te conviene cobrar directo en la página o no.`,
    field: "pagos",
    next: "technical_dashboard",
    condition: (ctx) => {
      const cat = ctx.category ?? "landing";
      // No se pregunta en landings y tampoco si el cliente ya dijo que NO quiere
      // pagos en línea ("no quiero pagos en línea" en su descripción).
      return !["landing", "portafolio", "blog"].includes(cat) && ctx.pagos !== false;
    },
    clarifyId: "clarify_payments",
  }),

  clarify_payments: makeClarifyNode({
    id: "clarify_payments",
    originalId: "technical_payments",
    hints: [
      "Te doy un ejemplo de los que veo: si vendes cursos en línea y quieres cobrar con tarjeta automáticamente, conviene cobrar en la página. Si tu cliente te deposita y te manda el comprobante, no hace falta. ¿Cómo le haces hoy con tus ventas?",
    ],
    forwardNext: "technical_dashboard",
  }),

  technical_dashboard: makeBooleanNode({
    id: "technical_dashboard",
    type: "technical",
    message: (ctx) =>
      `¿Te gustaría tener todo tu negocio en una sola pantalla? Como ver tus pedidos, tus citas o tus clientes sin andar buscando en mil lugares. Eso, créeme, te ahorra un buen tiempo cada semana.`,
    field: "dashboard",
    next: "technical_maps",
    // Si el cliente ya dijo que no quiere panel, no volver a preguntar.
    condition: (ctx) => ctx.dashboard !== false,
    clarifyId: "clarify_dashboard",
  }),

  clarify_dashboard: makeClarifyNode({
    id: "clarify_dashboard",
    originalId: "technical_dashboard",
    hints: [
      "En simple: ¿te gustaría entrar a un lugar privado y ver todo tu negocio en orden (pedidos, citas, clientes)? Si con que te llegue un correo con las alertas te basta, quizá aún no lo necesitas.",
    ],
    forwardNext: "technical_maps",
  }),

  technical_maps: makeBooleanNode({
    id: "technical_maps",
    type: "technical",
    message: () =>
      `¿La gente necesita encontrarte físicamente? Si tienes un local o varias sucursales, te pongo un mapa para que lleguen sin perderse ni andar preguntando.`,
    field: "mapas",
    next: "technical_pdfs",
  }),

  technical_pdfs: makeBooleanNode({
    id: "technical_pdfs",
    type: "technical",
    message: () =>
      `¿Sueles entregar cotizaciones, recibos o reportes a tus clientes? Si es así, podemos hacer que se generen solos y se vean profesionales, sin que tú pierdas tiempo armándolos.`,
    field: "documentos",
    next: "technical_chat",
    condition: (ctx) =>
      ctx.category === "webapp" ||
      ctx.category === "ecommerce" ||
      ctx.dashboard === true,
  }),

  technical_chat: makeBooleanNode({
    id: "technical_chat",
    type: "technical",
    message: () =>
      `¿Quieres que tus clientes te escriban directo desde tu página? Un botón de WhatsApp bien puesto hace maravillas: la gente hoy prefiere escribir que llamar.`,
    field: "chat",
    next: "technical_bookings",
    clarifyId: "clarify_chat",
  }),

  clarify_chat: makeClarifyNode({
    id: "clarify_chat",
    originalId: "technical_chat",
    hints: [
      "¿Te gustaría que la gente te contacte sin salir de tu página? Un botón flotante de WhatsApp es lo más usado y funciona muy bien. ¿Te interesa algo así?",
    ],
    forwardNext: "technical_bookings",
  }),

  technical_bookings: makeBooleanNode({
    id: "technical_bookings",
    type: "technical",
    message: () =>
      `¿Tus clientes agendan contigo? Por ejemplo, eligen día y hora para un servicio. Si es así, eso lo resolvemos muy bien. Si no, lo omitimos y listo, sin complicarte.`,
    field: "citas",
    next: "design",
    // Solo se pregunta si AÚN NO SABEMOS si agenda: si el cliente ya dijo que
    // SÍ quiere citas ("quiero que agenden cita en línea") o que NO, no se
    // vuelve a preguntar (mismo patrón que los demás booleanos técnicos).
    condition: (ctx) => ctx.category !== "citas" && ctx.citas == null,
  }),

  design: {
    id: "design",
    type: "technical",
    generateMessage: (ctx) =>
      `${randomTransition()} Por último, en el estilo: ¿cómo quieres que tu negocio "se sienta" cuando te visiten? ¿Algo moderno y con movimiento, o algo sobrio y de confianza? Los dos venden; solo quiero que sea tu cara.`,
    expectedResponseType: "text",
    nextNode: (response, ctx) => {
      if (isNoSé(response, ctx)) return "technical_seo";
      return "technical_seo";
    },
    onReceive: (response, ctx) => {
      const t = response.toLowerCase();
      ctx.animaciones =
        /(moderno|moderna|animaciones|movimiento|din[aá]mico|bonito|wow|impresionar|efectos|dark|oscuro)/.test(t) &&
        !/(sobrio|sobria|simple|sencillo|directo|minimalista|cl[aá]sico)/.test(t)
          ? true
          : /(sobrio|sobria|simple|sencillo|directo|minimalista|cl[aá]sico)/.test(t)
            ? false
            : null;
    },
  },

  technical_seo: makeBooleanNode({
    id: "technical_seo",
    type: "technical",
    message: () =>
      `¿Te gustaría que te encuentren en Google cuando alguien busque tu servicio, sin depender de pagar publicidad? Eso se logra bien si lo hacemos desde el inicio, y te lo dejo incluido.`,
    field: "seo",
    next: "technical_pwa",
  }),

  technical_pwa: makeBooleanNode({
    id: "technical_pwa",
    type: "technical",
    message: () =>
      `Y una última comodidad: ¿te gustaría que tus clientes puedan tener tu página "a la mano" en su celular, como si fuera una app? Es un detalle que suma presencia.`,
    field: "pwa",
    next: "technical_bots",
    // Para landing/portafolio/blog la PWA (instalable como app) es poco
    // relevante: se salta y ahorra un turno del discovery.
    condition: (ctx) =>
      !["landing", "portafolio", "blog"].includes(ctx.category ?? "landing"),
  }),

  // ══════════ FASE 3.5: Bots de LangChain (asistentes inteligentes) ══════════
  // Se ofrece un asistente IA (bot) entrenado con la info del negocio. El bot
  // es un add-on que se agrega a la cotización, a la propuesta y al prompt
  // técnico. `extraerBotsDeRespuesta` decide qué bots eligió el cliente
  // (reglas deterministas, 0 LLM): "ninguno" → bots vacío.
  technical_bots: {
    id: "technical_bots",
    type: "technical",
    generateMessage: (ctx) => {
      const rec = detectarBotsRecomendados(ctx);
      const lista = rec
        .map((b) => `• **${b.nombre}**: ${b.descripcion}`)
        .join("\n");
      return (
        `${randomExperience()} Una cosa más que suma muchísimo hoy: un **asistente inteligente (bot)** que atiende a tus clientes por ti — responde dudas de día y de noche, agenda citas o hasta arma cotizaciones. ${pickEmoji("idea")} Por lo que me contaste, te recomendaría:\n\n` +
        `${lista}\n\n` +
        `¿Quieres que te incluya alguno en tu propuesta? Dime cuál (por ejemplo "el de citas"), o si prefieres "ninguno".`
      );
    },
    expectedResponseType: "text",
    nextNode: (response, ctx) => {
      // Respuesta vacía = salto por condición (skip): ir al siguiente.
      if (!response || !response.trim()) return "scope_content";
      if (isNoSé(response, ctx)) return "clarify_bots";
      return "scope_content";
    },
    onReceive: (response, ctx) => {
      ctx.bots = extraerBotsDeRespuesta(response, ctx);
      captureEarlyData(response, ctx);
    },
  },

  clarify_bots: makeClarifyNode({
    id: "clarify_bots",
    originalId: "technical_bots",
    hints: [
      "Te explico simple: un bot es como tener a alguien de tu equipo contestando 24/7 en tu página. Por ejemplo, el de preguntas frecuentes responde horarios y precios, y el de citas agenda por ti. ¿Cuál te llamaría más la atención?",
    ],
    forwardNext: "scope_content",
  }),

  // ══════════ FASE 4: Alcance y expectativas ══════════
  scope_content: makeBooleanNode({
    id: "scope_content",
    type: "technical",
    message: () =>
      `Ya casi termino con las preguntas. Una que siempre hago: ¿tienes ya las fotos y los textos de tu negocio? Si no, no te preocupes: yo te ayudo a estructurarlos, y hay opciones para que se vea profesional aunque partamos de cero.`,
    field: "contenidoListo",
    next: "scope_services",
    // Si ya sabemos si el contenido está listo, no volver a preguntar.
    condition: (ctx) => ctx.contenidoListo == null,
    clarifyId: "clarify_content",
  }),

  clarify_content: makeClarifyNode({
    id: "clarify_content",
    originalId: "scope_content",
    hints: [
      "Me refiero a las fotos de tu negocio, los textos de presentación y tu logo. Si no los tienes todos, también lo resolvemos: hay opciones de fotos profesionales y yo te ayudo a redactar los textos.",
    ],
    forwardNext: "scope_services",
  }),

  // ══════════ SERVICIOS: qué ofrece el negocio y cómo mostrarlo ══════════
  scope_services: {
    id: "scope_services",
    type: "discovery",
    generateMessage: (ctx) =>
      `Hablemos de lo que vende: ¿tu negocio ofrece servicios que quieras mostrar en la web? Si sí, dime cuáles (y si quieres, cuántos y si tienen precio). Si no ofreces servicios, dime qué es lo que más quieres destacar para que la gente te contacte. ${pickEmoji("idea")}`,
    expectedResponseType: "text",
    // Si el cliente ya dio los servicios en otra respuesta, no volver a preguntar.
    condition: (ctx) => ctx.servicios == null,
    nextNode: (response, ctx) => {
      // Respuesta vacía = salto por condición (skip): ir al siguiente, no a la clarificación.
      if (!response || !response.trim()) return "scope_reference";
      if (isNoSé(response, ctx)) return "clarify_services";
      return "scope_reference";
    },
    onReceive: (response, ctx) => {
      // Normaliza la lista: "corte, barba y afeitado" → "corte, barba, afeitado".
      ctx.servicios = normalizeServices(response);
      captureEarlyData(response, ctx);
    },
  },

  clarify_services: makeClarifyNode({
    id: "clarify_services",
    originalId: "scope_services",
    hints: [
      "Te pongo ejemplos para que sea fácil: si eres una clínica sería 'limpieza dental, ortodoncia, blanqueamiento'. Si eres una estética, 'corte, color, manicure'. Solo dime qué ofreces y con eso armamos la sección de servicios. Si no tienes servicios, también está bien: dime qué quieres que la gente sepa de ti.",
    ],
    forwardNext: "scope_reference",
  }),

  scope_reference: {
    id: "scope_reference",
    type: "discovery",
    generateMessage: () =>
      `¿Hay alguna página que te guste, de la que digas "quiero algo así"? No importa si es de otro giro; dime qué te gusta de ella y con eso afino el estilo a tu gusto.`,
    expectedResponseType: "url",
    // Para landing/portafolio/blog la página de referencia es poco relevante
    // (el estilo lo cubre el nodo design): se salta y ahorra un turno.
    condition: (ctx) =>
      !["landing", "portafolio", "blog"].includes(ctx.category ?? "landing"),
    nextNode: (response, ctx) => {
      // Respuesta vacía = salto por condición (skip): ir al siguiente, no a la clarificación.
      if (!response || !response.trim()) return "scope_deadline";
      if (isNoSé(response, ctx)) return "scope_deadline";
      const t = response.toLowerCase();
      if (/(ninguna|no|nada|no tengo)/.test(t)) return "scope_deadline";
      return "scope_deadline";
    },
    onReceive: (response, ctx) => {
      const t = response.toLowerCase();
      if (/(ninguna|no|nada|no tengo)/.test(t)) {
        ctx.referencia = null;
      } else {
        ctx.referencia = extractSubject(response);
      }
      captureEarlyData(response, ctx);
    },
  },

  scope_deadline: {
    id: "scope_deadline",
    type: "technical",
    generateMessage: () =>
      `¿Para cuándo lo necesitas de verdad? No es para presionarte: es para saber si hay que apurar o podemos ir con calma y hacerlo bien. ${pickEmoji("interes")}`,
    expectedResponseType: "text",
    // Si el cliente ya dio la fecha en otra respuesta, no volver a preguntar.
    condition: (ctx) => ctx.fechaEntrega == null,
    nextNode: (response, ctx) => {
      // Respuesta vacía = salto por condición (skip): ir al siguiente, no a la clarificación.
      if (!response || !response.trim()) return "budget";
      if (isNoSé(response, ctx)) return "clarify_deadline";
      return "budget";
    },
    onReceive: (response, ctx) => {
      // "no sé" no debe guardarse como fecha de entrega (queda null y el
      // nodo de clarificación avanza; si no, la propuesta decía "para: no sé").
      ctx.fechaEntrega =
        extractDeadline(response) ??
        (isNoSé(response, ctx) ? null : extractSubject(response));
      // Si el cliente ya soltó su monto aquí (ej. "para el próximo mes... y de
      // presupuesto unos 10 mil pesos" o "para marzo, tengo 10000"), capturarlo
      // para no re-preguntar. Solo si hay señal de presupuesto (verbos de dinero
      // incluidos): evita capturar "en 3 meses" como monto.
      if (ctx.presupuesto == null && BUDGET_SIGNAL.test(response)) {
        const amount = extractBudgetAmount(response);
        if (amount) ctx.presupuesto = amount;
      }
      captureEarlyData(response, ctx);
    },
  },

  clarify_deadline: makeClarifyNode({
    id: "clarify_deadline",
    originalId: "scope_deadline",
    hints: [
      "Es solo para organizar la agenda: ¿lo quieres para ya, para el próximo mes, o no hay prisa? Dime algo como 'para marzo' o 'lo antes posible'.",
    ],
    forwardNext: "budget",
  }),

  // ══════════ FASE 5: Presupuesto ══════════
  budget: {
    id: "budget",
    type: "budget",
    generateMessage: () =>
      `Ahora sí, la pregunta que a todos les da un poco de pena, y con razón. ${pickEmoji("precio")} ¿Qué inversión tienes en mente para esto? No te lo pregunto para cobrarte de más: al contrario, es para armarte algo que quepa en tu bolsillo y que de verdad te funcione. Con los años aprendí que lo peor es venderle a alguien algo que no pueda sostener.`,
    expectedResponseType: "text",
    // Si el cliente ya dio su monto (p. ej. al responder el plazo), no re-preguntar.
    condition: (ctx) => ctx.presupuesto == null,
    nextNode: (response, ctx) => {
      // Respuesta vacía = salto por condición (skip): ir directo al siguiente,
      // igual que los nodos booleanos, para no caer en la clarificación.
      if (!response || !response.trim()) return "contact_name";
      // Si ya dio un monto/rango, avanzamos aunque la frase diga
      // "no sé cuánto cobran" (la duda es retórica si ya dio un número).
      if (extractBudgetAmount(response)) return "contact_name";
      if (isNoSé(response, ctx)) return "clarify_budget";
      return "contact_name";
    },
    onReceive: (response, ctx) => {
      const amount = extractBudgetAmount(response);
      // No guardar frases de duda como presupuesto
      ctx.presupuesto = amount ?? (isNoSé(response, ctx) ? null : extractSubject(response));
    },
  },

  clarify_budget: makeClarifyNode({
    id: "clarify_budget",
    originalId: "budget",
    hints: [
      "No necesitas un número exacto. Piensa en algo como: 'lo básico para empezar', 'un proyecto completo', o un rango tipo '$15,000 - $25,000'. Con eso ajusto el alcance y no te vendo de más.",
    ],
    forwardNext: "contact_name",
  }),

  // ══════════ FASE 6: Contacto y cierre ══════════
  contact_name: {
    id: "contact_name",
    type: "closing",
    generateMessage: () =>
      `Perfecto, con esto ya tengo muy claro tu proyecto. ${pickEmoji("contacto")} ¿Me dices cómo te llamas, o el nombre de tu negocio, para dirigirte la propuesta?`,
    expectedResponseType: "text",
    // Si el cliente ya dio su nombre en la descripción, no volver a preguntar.
    condition: (ctx) => ctx.clientName == null,
    nextNode: (response, ctx) => {
      // Respuesta vacía = salto por condición (skip): ir al siguiente, no a la clarificación.
      if (!response || !response.trim()) return "contact_email";
      if (isNoSé(response, ctx)) return "contact_email";
      return "contact_email";
    },
    onReceive: (response, ctx) => {
      ctx.clientName = extractName(response);
      captureEarlyData(response, ctx);
    },
  },

  contact_email: {
    id: "contact_email",
    type: "closing",
    generateMessage: (ctx) =>
      `¡Gracias${ctx.clientName ? `, ${ctx.clientName.split(" ")[0]}` : ""}! Y un correo para enviarte la propuesta cuando esté lista, ¿cuál es? ${pickEmoji("contacto")}`,
    expectedResponseType: "url",
    // Si el cliente ya dio su correo en otra respuesta, no volver a preguntar.
    condition: (ctx) => ctx.clientEmail == null,
    nextNode: (response, ctx) => {
      // Rechazo claro ("no tengo/no doy correo") → avanzar sin email (no forzar)
      if (isDecliningContact(response) && !/@/.test(response)) {
        ctx.emailIntentos = 0;
        return "contact_phone";
      }
      // Email inválido → re-preguntar (máx 2 intentos), sin guardar basura
      if (ctx.clientEmail === null) {
        if (ctx.emailIntentos >= 2) {
          ctx.emailIntentos = 0;
          return "contact_phone";
        }
        ctx.emailIntentos += 1;
        return "clarify_email";
      }
      ctx.emailIntentos = 0;
      return "contact_phone";
    },
    onReceive: (response, ctx) => {
      const email = extractEmail(response);
      if (email) {
        ctx.clientEmail = email;
        // Si incluyó un nombre junto al correo y aún no tenemos, lo tomamos
        if (!ctx.clientName) {
          ctx.clientName = extractName(response.replace(email, "")) || null;
        }
      } else {
        // NO guardar basura: "no sé", un texto, un correo incompleto...
        ctx.clientEmail = null;
      }
    },
  },

  clarify_email: {
    id: "clarify_email",
    type: "clarification",
    generateMessage: () =>
      `Sin problema, a veces se escapa un dedo. Un correo se ve así: nombre@tucorreo.com. ¿Me lo escribes? Lo necesito para enviarte la propuesta cuando esté lista. ${pickEmoji("contacto")}`,
    expectedResponseType: "text",
    nextNode: (response, ctx) => {
      const email = extractEmail(response);
      if (email) {
        ctx.clientEmail = email;
        ctx.emailIntentos = 0;
        return "contact_phone";
      }
      if (isDecliningContact(response) && !/@/.test(response)) {
        ctx.emailIntentos = 0;
        return "contact_phone";
      }
      if (ctx.emailIntentos >= 2) {
        ctx.emailIntentos = 0;
        ctx.clientEmail = null;
        return "contact_phone";
      }
      ctx.emailIntentos += 1;
      return "clarify_email";
    },
    onReceive: (response, ctx) => {
      ctx.clientEmail = extractEmail(response);
    },
  },

  contact_phone: {
    id: "contact_phone",
    type: "closing",
    generateMessage: (ctx) =>
      `Y para cualquier detalle rápido, ¿un teléfono o WhatsApp donde pueda localizarte? Lo pongo en la propuesta para que me contactes sin fricción cuando quieras avanzar. ${pickEmoji("contacto")}`,
    expectedResponseType: "text",
    // Si el cliente ya dio su teléfono en otra respuesta, no volver a preguntar.
    condition: (ctx) => ctx.clientPhone == null,
    nextNode: (response, ctx) => {
      // Rechazo claro ("no tengo/no doy teléfono") → avanzar sin teléfono (no forzar)
      if (isDecliningContact(response) && !/\d/.test(response)) {
        ctx.phoneIntentos = 0;
        return "extra_comments";
      }
      // Teléfono inválido (menos de 10 dígitos) → re-preguntar (máx 2 intentos)
      if (ctx.clientPhone === null) {
        if (ctx.phoneIntentos >= 2) {
          ctx.phoneIntentos = 0;
          return "extra_comments";
        }
        ctx.phoneIntentos += 1;
        return "clarify_phone";
      }
      ctx.phoneIntentos = 0;
      return "extra_comments";
    },
    onReceive: (response, ctx) => {
      const t = response.toLowerCase();
      const explicitNo = /(no tengo|no doy|ninguno|no)/.test(t) && !/\d/.test(response);
      // Guarda el número LIMPIO (normalizado), nunca la frase completa.
      ctx.clientPhone = explicitNo ? null : normalizePhone(response);
    },
  },

  clarify_phone: {
    id: "clarify_phone",
    type: "clarification",
    generateMessage: () =>
      `Con gusto te lo anoto como salga: ¿un teléfono o WhatsApp de 10 dígitos, tipo 81 2345 6789? Solo los números, para que te lleguen los datos de la propuesta sin errores. ${pickEmoji("contacto")}`,
    expectedResponseType: "text",
    nextNode: (response, ctx) => {
      if (isDecliningContact(response) && !/\d/.test(response)) {
        ctx.clientPhone = null;
        ctx.phoneIntentos = 0;
        return "extra_comments";
      }
      const phone = normalizePhone(response);
      if (phone === null) {
        if (ctx.phoneIntentos >= 2) {
          ctx.phoneIntentos = 0;
          ctx.clientPhone = null;
          return "extra_comments";
        }
        ctx.phoneIntentos += 1;
        return "clarify_phone";
      }
      ctx.clientPhone = phone;
      ctx.phoneIntentos = 0;
      return "extra_comments";
    },
    onReceive: (response, ctx) => {
      ctx.clientPhone = normalizePhone(response);
    },
  },

  extra_comments: {
    id: "extra_comments",
    type: "closing",
    generateMessage: () =>
      `Muy bien. ${pickEmoji("confirmacion")} ¿Hay algo más que quieras contarme? Algún detalle que se me haya escapado o algo que te traiga preocupado. Si no, con lo que tengo ya te armo tu propuesta.`,
    expectedResponseType: "text",
    nextNode: () => DONE_NODE_ID,
    onReceive: (response, ctx) => {
      const t = response.toLowerCase();
      if (/(no|nada|eso es todo|eso seria todo|ya|no gracias|listo)/.test(t) && t.length < 30) {
        ctx.comentarios = null;
      } else {
        ctx.comentarios = response.trim();
      }
    },
  },

  closing: {
    id: "closing",
    type: "closing",
    generateMessage: () => randomClosing(),
    expectedResponseType: "text",
    nextNode: () => DONE_NODE_ID,
  },
};

// Registro auxiliar de tipos para asegurar completitud
export type NodeId = keyof typeof FLOW;

// ─── API pública del flujo ──────────────────────────────────────────

export function getNode(id: string): ConversationNode | undefined {
  return FLOW[id];
}

export function isDoneNode(id: string): boolean {
  return id === DONE_NODE_ID;
}

/** Normaliza expectedResponseType (usado por la UI para el input) */
export function getExpectedType(id: string): ExpectedResponseType {
  return FLOW[id]?.expectedResponseType ?? "text";
}

/** ¿El nodo actual es de cierre (previo a generar la propuesta)? */
export function isClosingNode(id: string): boolean {
  return FLOW[id]?.type === "closing";
}
