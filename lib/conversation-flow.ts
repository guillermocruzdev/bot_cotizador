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
  extractSubject,
  pickEmoji,
  randomClosing,
  randomEmpathy,
  randomExperience,
  randomReaction,
  randomTransition,
} from "@/lib/personality";
import { PRICING_CATALOG, getCategoryById, inferCategory } from "@/lib/pricing-catalog";

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

/** Extrae señales técnicas de una respuesta larga (memoria de corto plazo) */
function extractSignals(response: string, ctx: ChatContext): void {
  const t = response.toLowerCase();
  if (/(pagar|pago|pagos|comprar|vender|paypal|stripe|tarjeta|transferencia)/.test(t) && ctx.pagos === null) {
    ctx.pagos = true;
  }
  if (/(cita|citas|agendar|reservar|reserva|turno)/.test(t) && ctx.citas === null) {
    ctx.citas = true;
  }
  if (/(panel|dashboard|administrar|admin|reportes|estad[íi]sticas)/.test(t) && ctx.dashboard === null) {
    ctx.dashboard = true;
  }
  if (/(cuenta|cuentas|registrarse|registro|login|usuarios)/.test(t) && ctx.autenticacion === null) {
    ctx.autenticacion = true;
  }
  if (/(base de datos|guardar datos|guardamos)/.test(t) && ctx.baseDeDatos === null) {
    ctx.baseDeDatos = true;
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

/** Fábrica de nodos de clarificación (cuando el cliente dice "no sé") */
function makeClarifyNode(opts: {
  originalId: string;
  hints: string[];
  forwardNext: string;
  extraHintAfterFirst?: (ctx: ChatContext) => string;
}): ConversationNode {
  return {
    id: `clarify_${opts.originalId}`,
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
        return `clarify_${opts.originalId}`;
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
    },
  },

  clarify_pages: makeClarifyNode({
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
    clarifyId: "clarify_auth",
  }),

  clarify_auth: makeClarifyNode({
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
    clarifyId: "clarify_db",
  }),

  clarify_db: makeClarifyNode({
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
      return !["landing", "portafolio", "blog"].includes(cat);
    },
    clarifyId: "clarify_payments",
  }),

  clarify_payments: makeClarifyNode({
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
    clarifyId: "clarify_dashboard",
  }),

  clarify_dashboard: makeClarifyNode({
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
    condition: (ctx) => ctx.category !== "citas",
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
    next: "scope_content",
  }),

  // ══════════ FASE 4: Alcance y expectativas ══════════
  scope_content: makeBooleanNode({
    id: "scope_content",
    type: "technical",
    message: () =>
      `Ya casi termino con las preguntas. Una que siempre hago: ¿tienes ya las fotos y los textos de tu negocio? Si no, no te preocupes: yo te ayudo a estructurarlos, y hay opciones para que se vea profesional aunque partamos de cero.`,
    field: "contenidoListo",
    next: "scope_reference",
    clarifyId: "clarify_content",
  }),

  clarify_content: makeClarifyNode({
    originalId: "scope_content",
    hints: [
      "Me refiero a las fotos de tu negocio, los textos de presentación y tu logo. Si no los tienes todos, también lo resolvemos: hay opciones de fotos profesionales y yo te ayudo a redactar los textos.",
    ],
    forwardNext: "scope_reference",
  }),

  scope_reference: {
    id: "scope_reference",
    type: "discovery",
    generateMessage: () =>
      `¿Hay alguna página que te guste, de la que digas "quiero algo así"? No importa si es de otro giro; dime qué te gusta de ella y con eso afino el estilo a tu gusto.`,
    expectedResponseType: "url",
    nextNode: (response, ctx) => {
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
    },
  },

  scope_deadline: {
    id: "scope_deadline",
    type: "technical",
    generateMessage: () =>
      `¿Para cuándo lo necesitas de verdad? No es para presionarte: es para saber si hay que apurar o podemos ir con calma y hacerlo bien. ${pickEmoji("interes")}`,
    expectedResponseType: "text",
    nextNode: (response, ctx) => {
      if (isNoSé(response, ctx)) return "clarify_deadline";
      return "budget";
    },
    onReceive: (response, ctx) => {
      ctx.fechaEntrega = extractDeadline(response) ?? extractSubject(response);
    },
  },

  clarify_deadline: makeClarifyNode({
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
    nextNode: (response, ctx) => {
      if (isNoSé(response, ctx)) return "clarify_budget";
      return "contact_name";
    },
    onReceive: (response, ctx) => {
      const amount = extractBudgetAmount(response);
      ctx.presupuesto = amount ?? extractSubject(response);
    },
  },

  clarify_budget: makeClarifyNode({
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
    nextNode: (response, ctx) => {
      if (isNoSé(response, ctx)) return "contact_email";
      return "contact_email";
    },
    onReceive: (response, ctx) => {
      ctx.clientName = extractSubject(response);
    },
  },

  contact_email: {
    id: "contact_email",
    type: "closing",
    generateMessage: (ctx) =>
      `¡Gracias${ctx.clientName ? `, ${ctx.clientName.split(" ")[0]}` : ""}! Y un correo para enviarte la propuesta cuando esté lista, ¿cuál es? ${pickEmoji("contacto")}`,
    expectedResponseType: "url",
    nextNode: (response, ctx) => {
      if (isNoSé(response, ctx)) return "contact_phone";
      return "contact_phone";
    },
    onReceive: (response, ctx) => {
      const emailMatch = response.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      if (emailMatch) {
        ctx.clientEmail = emailMatch[0];
        // Si incluyó un nombre junto al correo y aún no tenemos, lo tomamos
        if (!ctx.clientName) {
          ctx.clientName = extractSubject(response.replace(emailMatch[0], "")).replace(/[,.]$/g, "") || null;
        }
      } else {
        ctx.clientEmail = response.trim();
      }
    },
  },

  contact_phone: {
    id: "contact_phone",
    type: "closing",
    generateMessage: (ctx) =>
      `Y para cualquier detalle rápido, ¿un teléfono o WhatsApp donde pueda localizarte? Lo pongo en la propuesta para que me contactes sin fricción cuando quieras avanzar. ${pickEmoji("contacto")}`,
    expectedResponseType: "text",
    nextNode: (response, ctx) => {
      if (isNoSé(response, ctx)) return "extra_comments";
      return "extra_comments";
    },
    onReceive: (response, ctx) => {
      const t = response.toLowerCase();
      if (/(no|ninguno|no tengo|no doy)/.test(t)) {
        ctx.clientPhone = null;
      } else {
        ctx.clientPhone = extractSubject(response);
      }
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
