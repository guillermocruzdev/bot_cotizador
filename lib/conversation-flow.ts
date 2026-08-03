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
      `¡Hola! Soy ${BOT.name}, tu asistente de desarrollo web. No soy una máquina de formularios, prometido ${pickEmoji("saludo")}\n\n` +
      `Te voy a hacer unas preguntas para entender qué necesita tu negocio. No hay respuestas incorrectas: solo cuéntame de tu proyecto, y con eso te armo una propuesta a tu medida. ¿Listo?`,
    expectedResponseType: "text",
    nextNode: () => "discovery_business",
  },

  // ══════════ FASE 2: Descubrimiento ══════════
  discovery_business: {
    id: "discovery_business",
    type: "discovery",
    generateMessage: () =>
      `Cuéntame, ¿a qué se dedica tu negocio? ¿Tienes web actualmente o estamos empezando desde cero?`,
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
        ? `Vi que mencionaste ${signals.join(" y ")}, ¡lo anoto! `
        : "";
      return (
        `${randomReaction()} ${mention}Entonces me imagino que necesitas algo tipo: **${categoryName(ctx)}**. ¿Te suena?`
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
        `No te preocupes, es súper normal no saber exactamente qué necesitas. ${pickEmoji("idea")} Casi todo cae en una de estas:\n\n` +
        `${cats}\n\n` +
        `¿Cuál se acerca más a lo que tienes en mente? O cuéntame con tus palabras qué te gustaría lograr.`
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
      "A ver, cuéntame en una frase: ¿qué vendes u ofreces? Por ejemplo: 'doy clases de inglés', 'vendo ropa hecha a mano', 'tengo una estética'...",
    ],
    forwardNext: "discovery_confirm",
    extraHintAfterFirst: () =>
      "Te pongo un ejemplo: 'tengo un negocio de comida y quiero que la gente pida por internet'. Solo dime tu giro y qué te gustaría lograr, no necesitas más detalle.",
  }),

  // ══════════ FASE 2b: Alcance de páginas ══════════
  pages: {
    id: "pages",
    type: "discovery",
    generateMessage: (ctx) =>
      `Perfecto, un proyecto de **${categoryName(ctx)}**. ${pickEmoji("idea")} ¿Cuántas secciones o páginas imaginas? Por ejemplo: Inicio, Servicios, Contacto... ¿Algo sencillo de una sola página, o algo más completo?`,
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
      "Te ayudo: una página sencilla suele ser Inicio, Servicios y Contacto (todo en una sola página). Un sitio más completo tiene varias páginas separadas: Inicio, Nosotros, Servicios, Galería, Blog, Contacto. ¿Con cuál te sientes más cómodo?",
    ],
    forwardNext: "technical_auth",
  }),

  // ══════════ FASE 3: Detalles técnicos (disfrazados) ══════════
  technical_auth: makeBooleanNode({
    id: "technical_auth",
    type: "technical",
    message: (ctx) =>
      `${randomTransition()} Ahora, un detalle que cambia bastante la complejidad: ¿tus clientes van a crear cuentas? Como un login con correo o con Google. Si la respuesta es no, también está perfecto y simplifica todo.`,
    field: "autenticacion",
    next: "technical_db",
    clarifyId: "clarify_auth",
  }),

  clarify_auth: makeClarifyNode({
    originalId: "technical_auth",
    hints: [
      "Ejemplo: si tus clientes hacen pedidos y quieren ver su historial, sí necesitan cuenta. Si solo te contactan, no la necesitan. ¿Tus clientes van a 'entrar' a algo?",
    ],
    forwardNext: "technical_db",
  }),

  technical_db: makeBooleanNode({
    id: "technical_db",
    type: "technical",
    message: (ctx) =>
      `Otra cosa: ¿tus clientes van a dejar datos? Como registrarse, hacer pedidos o agendar algo. Si es así, necesitamos una base de datos que guarde esa información de forma segura.`,
    field: "baseDeDatos",
    next: "technical_payments",
    clarifyId: "clarify_db",
  }),

  clarify_db: makeClarifyNode({
    originalId: "technical_db",
    hints: [
      "En corto: ¿guardamos información de tus clientes (nombres, pedidos, citas) o la página solo muestra información? Si hay que guardar, sumamos una base de datos.",
    ],
    forwardNext: "technical_payments",
  }),

  technical_payments: makeBooleanNode({
    id: "technical_payments",
    type: "technical",
    message: (ctx) =>
      `¿La gente va a pagar directamente en la web, o prefieren contactarte por WhatsApp para los pagos? Esto define si integramos una pasarela de pagos (tarjeta, transferencia) o lo dejamos en el contacto directo.`,
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
      "Te pongo el ejemplo: si vendes cursos en línea y quieres cobrar con tarjeta automáticamente, necesitas pasarela. Si el cliente te deposita y te manda el comprobante, no la necesitas. ¿Cómo le haces hoy con tus ventas?",
    ],
    forwardNext: "technical_dashboard",
  }),

  technical_dashboard: makeBooleanNode({
    id: "technical_dashboard",
    type: "technical",
    message: (ctx) =>
      `¿Tú o tu equipo necesitan ver estadísticas o administrar algo desde una pantalla? Por ejemplo, ver pedidos, citas o clientes en un solo lugar. A esto le llamamos 'panel de control'.`,
    field: "dashboard",
    next: "technical_maps",
    clarifyId: "clarify_dashboard",
  }),

  clarify_dashboard: makeClarifyNode({
    originalId: "technical_dashboard",
    hints: [
      "Simple: ¿te gustaría 'entrar' a un lugar privado donde ves toda la información de tu negocio (pedidos, citas, clientes)? Si solo te llegan correos con las alertas, quizá no lo necesitas aún.",
    ],
    forwardNext: "technical_maps",
  }),

  technical_maps: makeBooleanNode({
    id: "technical_maps",
    type: "technical",
    message: () =>
      `¿Tienes sucursales, puntos de venta o una ubicación importante que mostrar? Podemos integrar un mapa para que la gente llegue fácil sin preguntar.`,
    field: "mapas",
    next: "technical_pdfs",
  }),

  technical_pdfs: makeBooleanNode({
    id: "technical_pdfs",
    type: "technical",
    message: () =>
      `¿Generas documentos para tus clientes, como cotizaciones, recibos o reportes? Si es así, podemos automatizarlos y que se descarguen solos.`,
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
      `¿Quieres que los clientes te escriban desde la web? Podemos agregar un chat en vivo o, más sencillo, un botón que los lleve directo a tu WhatsApp.`,
    field: "chat",
    next: "technical_bookings",
    clarifyId: "clarify_chat",
  }),

  clarify_chat: makeClarifyNode({
    originalId: "technical_chat",
    hints: [
      "¿Te gustaría que la gente te contacte sin salir de la página? Un botón flotante de WhatsApp es lo más común y funciona muy bien. ¿Te interesa algo así?",
    ],
    forwardNext: "technical_bookings",
  }),

  technical_bookings: makeBooleanNode({
    id: "technical_bookings",
    type: "technical",
    message: () =>
      `¿Tus clientes agendan horarios o citas? Por ejemplo, elegir día y hora para un servicio. Si no, no pasa nada, lo omitimos.`,
    field: "citas",
    next: "design",
    condition: (ctx) => ctx.category !== "citas",
  }),

  design: {
    id: "design",
    type: "technical",
    generateMessage: (ctx) =>
      `${randomTransition()} Una pregunta de estilo: ¿te gusta algo moderno con movimiento y animaciones, o prefieres algo más sobrio y directo? Ambos se ven profesionales, solo cambia la personalidad.`,
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
      `Otra cosa: ¿quieres que te encuentren en Google cuando busquen tu servicio? El SEO básico lo incluyo siempre, pero puedo profundizarlo para posicionarte mejor en tu zona.`,
    field: "seo",
    next: "technical_pwa",
  }),

  technical_pwa: makeBooleanNode({
    id: "technical_pwa",
    type: "technical",
    message: () =>
      `Y una curiosidad: ¿te gustaría que tu web se pueda instalar en el celular como una app? Es un extra que le da presencia en la pantalla de inicio de tus clientes.`,
    field: "pwa",
    next: "scope_content",
  }),

  // ══════════ FASE 4: Alcance y expectativas ══════════
  scope_content: makeBooleanNode({
    id: "scope_content",
    type: "technical",
    message: () =>
      `Ya casi terminamos con las preguntas técnicas. ¿Tienes ya el contenido listo? (textos, fotos, logo). Si no, no pasa nada: te ayudo a estructurarlo o te recomiendo cómo conseguirlo.`,
    field: "contenidoListo",
    next: "scope_reference",
    clarifyId: "clarify_content",
  }),

  clarify_content: makeClarifyNode({
    originalId: "scope_content",
    hints: [
      "Me refiero a las fotos de tu negocio, los textos de presentación y tu logo. Si no los tienes todos, también lo resolvemos: hay opciones de fotos profesionales y textos que yo te ayudo a redactar.",
    ],
    forwardNext: "scope_reference",
  }),

  scope_reference: {
    id: "scope_reference",
    type: "discovery",
    generateMessage: () =>
      `¿Hay alguna página o app que digas "quiero algo así"? Compárteme un link o descríbeme el estilo (colores, forma de mostrar las cosas). Me ayuda mucho a entender tus gustos.`,
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
      `¿Cuándo lo necesitas? Sin presión, solo para saber si hay que apretar el paso con la agenda. ${pickEmoji("interes")}`,
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
      "Es para dimensionar la agenda: ¿lo quieres para ya, para el próximo mes, o no hay prisa? Dime lo que se te ocurra, tipo 'para marzo' o 'lo antes posible'.",
    ],
    forwardNext: "budget",
  }),

  // ══════════ FASE 5: Presupuesto ══════════
  budget: {
    id: "budget",
    type: "budget",
    generateMessage: () =>
      `Última cosa, y lo digo con cuidado porque sé que es delicado ${pickEmoji("precio")}: ¿tienes un rango de inversión en mente? No es para cobrarte lo máximo, es para ajustar el alcance a lo que realmente necesitas y puedes pagar.`,
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
      "No necesitas un número exacto. Piensa en: 'algo básico para empezar', 'un proyecto completo', o un rango tipo '$15,000 - $25,000'. Con eso ajusto el alcance.",
    ],
    forwardNext: "contact_name",
  }),

  // ══════════ FASE 6: Contacto y cierre ══════════
  contact_name: {
    id: "contact_name",
    type: "closing",
    generateMessage: () =>
      `¡Ya casi terminamos, te lo prometo! ${pickEmoji("contacto")} ¿Cómo te llamas, o cuál es el nombre de tu negocio?`,
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
      if (isNoSé(response, ctx)) return "extra_comments";
      return "extra_comments";
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

  extra_comments: {
    id: "extra_comments",
    type: "closing",
    generateMessage: () =>
      `¡Perfecto! ${pickEmoji("confirmacion")} ¿Algo más que quieras contarme? Algún detalle que se me haya escapado. Si no, con lo que tengo ya te armo tu propuesta.`,
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
