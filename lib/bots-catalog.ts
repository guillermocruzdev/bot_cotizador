/**
 * CATÁLOGO DE BOTS CON LANGCHAIN (vibecoder · agencia)
 *
 * Asistentes inteligentes que se pueden VENDER como add-on a cualquier web
 * de la agencia. Todos corren sobre DeepSeek (LLM barato) vía LangChain.
 *
 * Estrategia de precio ACCESIBLE para captar clientes (MXN, IVA incluido):
 *  - Setup único (integración, entrenamiento con la info del negocio y
 *    diseño de la cadena) → lo que se suma a la cotización.
 *  - Cuota mensual (hosting del LLM DeepSeek + mantenimiento del bot) → se
 *    cobra como suscripción y nos da ingreso recurrente.
 *
 * Complejidad:
 *  - basica    → RAG simple / few-shot + memory (bot que responde).
 *  - media     → agente con herramientas (agendar, escalar, guardar).
 *  - avanzada  → agente con herramientas + estado + integración con pagos.
 *
 * El motor LLM SIEMPRE es DeepSeek (deepseek-chat) vía
 * ChatOpenAI(baseURL="https://api.deepseek.com") — costo por mensaje casi
 * nulo, lo que permite precios bajos de suscripción con buen margen.
 */

import type { ChatContext } from "@/lib/types";
import { detectarGiro } from "@/lib/industry-pricing";

// ─── Costos reales de DeepSeek (para el análisis de margen) ─────────
// deepseek-chat (V3) · jul-2026 · precios por 1M tokens
export const DEEPSEEK_COSTOS = {
  input_por_millon: 0.27, // USD por 1M tokens de entrada
  output_por_millon: 1.1, // USD por 1M tokens de salida
  proveedor: "DeepSeek (api.deepseek.com, modelo deepseek-chat)",
  tipo_cambio_mxn: 18, // aproximado para el análisis de margen
} as const;

export type BotComplejidad = "basica" | "media" | "avanzada";

export interface BotSpec {
  /** id único (se guarda en context.bots) */
  id: string;
  /** Nombre corto para UI/propuesta */
  nombre: string;
  /** Descripción para el cliente (lenguaje de dueño de negocio) */
  descripcion: string;
  /** Tipo de caso de uso: para agrupar */
  casoUso: string;
  /** Palabras clave para recomendar el bot según lo que diga el cliente */
  keywords: string[];
  /** Complejidad de la cadena LangChain */
  complejidad: BotComplejidad;
  /** Setup único (MXN, IVA incluido) — se suma a la cotización */
  precioSetup: number;
  /** Suscripción mensual (MXN) — DeepSeek hosting + mantenimiento */
  cuotaMensual: number;
  /** Giro(s) donde más rinde */
  girosRecomendados: string[];
  /** Resultado de negocio que el bot le da al dueño (para propuesta) */
  resultado: string;
  /** Funcionalidad en lenguaje humano (se agrega a la lista "Qué incluye") */
  funcionalidad: string;
  /** Arquitectura LangChain que Roo Code debe implementar */
  arquitecturaLangChain: string;
  /** System prompt base que define la personalidad/reglas del bot */
  systemPrompt: string;
  /** Integraciones típicas (API routes) */
  integraciones: string[];
}

export const BOTS_CATALOG: BotSpec[] = [
  {
    id: "bot_faq",
    nombre: "Bot de preguntas frecuentes",
    descripcion:
      "Responde al instante las dudas más comunes de tus clientes: horarios, precios, ubicación, cómo contratar. Entrenado con la información de tu negocio.",
    casoUso: "dudas",
    keywords: ["preguntas", "dudas", "faq", "responder", "información", "informacion", "horarios", "precios"],
    complejidad: "basica",
    precioSetup: 3500,
    cuotaMensual: 199,
    girosRecomendados: ["restaurante", "estetica", "dentista", "mecanico", "tienda", "servicios_hogar"],
    resultado:
      "Responder dudas 24/7 sin que tú pierdas tiempo, y no dejar a ningún cliente esperando una respuesta.",
    funcionalidad:
      "Asistente que responde al instante las preguntas frecuentes de tus clientes (horarios, precios, ubicación).",
    arquitecturaLangChain:
      "RAG ligero: embeddings + vectorstore (o índice en memoria) con la info del negocio + ChatPromptTemplate + memoria de conversación corta (ConversationBufferWindowMemory). Fallback a mensaje 'no sé, te conecto con alguien'.",
    systemPrompt:
      "Eres un asistente amable y directo del negocio. Respondes SOLO con la información que tienes en la base de conocimiento (horarios, precios, ubicación, servicios). Si no sabes algo, lo dices claro y ofreces pasar el chat a WhatsApp.",
    integraciones: ["POST /api/bots/faq — responde desde la KB", "POST /api/bots/faq/feedback"],
  },
  {
    id: "bot_atencion",
    nombre: "Bot de atención al cliente",
    descripcion:
      "Atiende a tus clientes como un equipo de soporte: resuelve dudas, registra quejas y peticiones, y escala a un humano cuando hace falta.",
    casoUso: "atencion",
    keywords: ["atencion", "atención", "soporte", "apoyo", "quejas", "reclamos", "ayuda", "servicio"],
    complejidad: "media",
    precioSetup: 5900,
    cuotaMensual: 299,
    girosRecomendados: ["ecommerce", "tienda", "servicios_hogar", "gym"],
    resultado:
      "Un equipo de soporte que nunca duerme: resuelve dudas comunes y solo escala contigo lo importante.",
    funcionalidad:
      "Bot de atención al cliente que resuelve dudas, registra peticiones y escala a un humano por WhatsApp cuando hace falta.",
    arquitecturaLangChain:
      "Agente con herramientas (createToolCallingAgent): tool 'responder_desde_kb' (RAG), tool 'crear_ticket', tool 'escalar_humano' (deep link WhatsApp) + memoria conversacional por sesión. Decisiones de escalamiento con reglas (keywords de urgencia).",
    systemPrompt:
      "Eres el agente de atención al cliente. Resuelves dudas y problemas comunes con amabilidad. Si el cliente está molesto, menciona urgencia o pide algo que no puedes, escálalo a un humano y dile que alguien le escribirá pronto.",
    integraciones: ["POST /api/bots/ticket — guarda el caso", "Webhook a WhatsApp del dueño en escalamientos"],
  },
  {
    id: "bot_citas",
    nombre: "Bot de citas y agenda",
    descripcion:
      "Tus clientes agendan día y hora por su cuenta, reciben confirmación y recordatorios. Tú solo ves tu agenda llena.",
    casoUso: "citas",
    keywords: ["citas", "agendar", "agenda", "reservar", "reserva", "turno", "horario", "cita"],
    complejidad: "media",
    precioSetup: 5900,
    cuotaMensual: 299,
    girosRecomendados: ["dentista", "medico", "estetica", "barberia", "spa", "consultor"],
    resultado:
      "Agendar citas 24/7 sin llamadas de por medio, con confirmaciones y recordatorios que reducen las inasistencias.",
    funcionalidad:
      "Bot que agenda citas día y hora por su cuenta, con confirmación y recordatorio automáticos.",
    arquitecturaLangChain:
      "Agente con herramientas (createToolCallingAgent): tool 'ver_disponibilidad', tool 'reservar_cita', tool 'cancelar_cita' + memoria. Las fechas se validan contra Supabase (appointments/availability). Output estructurado con StructuredOutputParser.",
    systemPrompt:
      "Eres el asistente de agenda del negocio. Ayudas a elegir día y hora de las citas disponibles, confirmas la cita y guardas nombre y teléfono. Nunca inventes horarios: usa la herramienta de disponibilidad.",
    integraciones: ["GET /api/bots/citas/disponibilidad", "POST /api/bots/citas/reservar", "POST /api/bots/citas/recordatorio"],
  },
  {
    id: "bot_ventas",
    nombre: "Bot de ventas y cierre",
    descripcion:
      "Cualifica visitantes, responde objeciones, arma una cotización y empuja a cerrar la venta. Tu mejor vendedor, disponible siempre.",
    casoUso: "ventas",
    keywords: ["vender", "ventas", "cotizacion", "cotización", "cerrar", "clientes nuevos", "prospectos", "comprar"],
    complejidad: "avanzada",
    precioSetup: 8500,
    cuotaMensual: 449,
    girosRecomendados: ["consultor", "inmobiliaria", "constructor", "abogado", "webapp"],
    resultado:
      "Convertir visitas en clientes: cualifica, responde objeciones y cierra citas o ventas sin depender de tu horario.",
    funcionalidad:
      "Bot de ventas que cualifica visitantes, responde objeciones y genera una cotización lista para cerrar.",
    arquitecturaLangChain:
      "Agente de ventas con herramientas: tool 'generar_cotizacion' (motor de precios del negocio), tool 'agendar_seguimiento', tool 'whatsapp_cierre' + few-shot examples de objeciones y MemorySaver. Redacta con StructuredOutputParser para guardar el lead en Supabase.",
    systemPrompt:
      "Eres el vendedor estrella del negocio. Hablas con confianza, escuchas la necesidad, recomiendas la opción correcta, respondes objeciones con calma y buscas dejar una cita o una cotización. Nunca prometas precios que no vienen de la herramienta de cotización.",
    integraciones: ["POST /api/bots/ventas/cotizar", "POST /api/bots/ventas/lead", "POST /api/bots/ventas/seguimiento"],
  },
  {
    id: "bot_promos",
    nombre: "Bot de promociones y ofertas",
    descripcion:
      "Informa a tus clientes de las promociones, descuentos y cupones vigentes, y les dice cómo aprovecharlos.",
    casoUso: "promociones",
    keywords: ["promo", "promos", "promociones", "ofertas", "descuento", "cupon", "cupón", "rebajas", "2x1"],
    complejidad: "basica",
    precioSetup: 3500,
    cuotaMensual: 199,
    girosRecomendados: ["restaurante", "estetica", "gym", "tienda", "ecommerce"],
    resultado:
      "Que tus clientes siempre sepan qué promoción tienen vigente, y que las ofertas muevan más visitas a tu negocio.",
    funcionalidad:
      "Bot que informa promociones, descuentos y cupones vigentes y cómo aprovecharlos.",
    arquitecturaLangChain:
      "RAG ligero sobre un catálogo de promociones (JSON/Supabase) + ChatPromptTemplate + memoria. Puede emitir un cupón con output estructurado validado.",
    systemPrompt:
      "Eres el asistente de promociones. Compartes SOLO ofertas vigentes del catálogo, explicas cómo usarlas (código, condiciones) y, si no hay promoción, lo dices con honestidad y ofreces ayuda.",
    integraciones: ["GET /api/bots/promos — promociones vigentes", "POST /api/bots/promos/cupon"],
  },
  {
    id: "bot_leads",
    nombre: "Bot capturador de clientes (leads)",
    descripcion:
      "Chatea con cada visitante, captura su nombre, contacto y lo que busca, y lo guarda para que tú lo contactes.",
    casoUso: "leads",
    keywords: ["contacto", "contactar", "leads", "clientes", "formulario", "dejar datos", "presupuesto", "más información"],
    complejidad: "basica",
    precioSetup: 3500,
    cuotaMensual: 199,
    girosRecomendados: ["landing", "tienda", "mecanico", "servicios_hogar", "constructor"],
    resultado:
      "Nunca más perder un visitante: cada conversación valiosa queda capturada con datos y lista para tu seguimiento.",
    funcionalidad:
      "Bot que conversa con cada visitante y captura nombre, contacto y qué busca, guardándolo para tu seguimiento.",
    arquitecturaLangChain:
      "Cadena conversacional con StructuredOutputParser (name, phone, email, interest, score) que guarda el lead en Supabase (prospect_leads) y agenda una tarea. Escala a WhatsApp si el interés es alto.",
    systemPrompt:
      "Eres el recepcionista digital. Saludas, haces 2-3 preguntas amables (qué busca, cómo se llama, cómo contactarlo) y capturas los datos. Si el visitante muestra interés, ofreces que un asesor le escriba.",
    integraciones: ["POST /api/bots/leads — guarda lead en Supabase", "POST /api/bots/leads/whatsapp"],
  },
  {
    id: "bot_dudas",
    nombre: "Bot de dudas sobre productos y servicios",
    descripcion:
      "Responde a detalle sobre tus productos o servicios: qué incluyen, garantías, formas de pago, tiempos de entrega.",
    casoUso: "dudas",
    keywords: ["productos", "servicios", "garantia", "garantía", "envio", "envío", "entrega", "incluye", "formas de pago"],
    complejidad: "media",
    precioSetup: 5900,
    cuotaMensual: 299,
    girosRecomendados: ["ecommerce", "tienda", "mecanico", "consultor"],
    resultado:
      "Responder dudas a detalle de tus productos y servicios en segundos, y cerrar más ventas sin fricción.",
    funcionalidad:
      "Bot que responde a detalle sobre productos y servicios: qué incluyen, garantías, envíos y formas de pago.",
    arquitecturaLangChain:
      "RAG con ficha de cada producto/servicio (embeddings en Supabase pgvector o vectorstore) + ChatPromptTemplate con few-shot de preguntas típicas + memoria de sesión.",
    systemPrompt:
      "Eres un experto en los productos y servicios del negocio. Respondes con base SOLO en las fichas disponibles (incluye, garantía, envío, pagos). Si no hay ficha, lo dices y ofreces pasar a un asesor.",
    integraciones: ["POST /api/bots/dudas — responde con RAG sobre el catálogo"],
  },
  {
    id: "bot_recomendador",
    nombre: "Bot recomendador",
    descripcion:
      "Le pregunta al cliente qué necesita y le recomienda el producto o servicio ideal, como un vendedor experto.",
    casoUso: "ventas",
    keywords: ["recomendar", "recomendación", "cuál me conviene", "cuál me recomiendas", "qué me conviene", "ideal"],
    complejidad: "media",
    precioSetup: 5900,
    cuotaMensual: 299,
    girosRecomendados: ["ecommerce", "tienda", "gym", "estetica", "consultor"],
    resultado:
      "Que cada cliente encuentre exactamente lo que necesita, subiendo el ticket promedio de cada venta.",
    funcionalidad:
      "Bot que hace preguntas guiadas y recomienda el producto o servicio ideal para cada cliente.",
    arquitecturaLangChain:
      "Cadena de recomendación: extrae la necesidad con StructuredOutputParser, busca en el catálogo (vector similarity) y genera la recomendación con few-shot + memoria. Guarda la recomendación para seguimiento.",
    systemPrompt:
      "Eres un vendedor experto en recomendaciones. Haz 2-3 preguntas para entender la necesidad, luego recomienda 1-2 opciones concretas del catálogo explicando POR QUÉ encajan. No inventes productos.",
    integraciones: ["POST /api/bots/recomendador — busca en el catálogo"],
  },
  {
    id: "bot_cotizacion",
    nombre: "Bot de cotización rápida",
    descripcion:
      "Tus clientes reciben una cotización de tus servicios en minutos, sin esperar a que tú la armes a mano.",
    casoUso: "ventas",
    keywords: ["cotizacion", "cotización", "cuánto cuesta", "cuanto cuesta", "presupuesto", "precio", "tarifa"],
    complejidad: "avanzada",
    precioSetup: 8500,
    cuotaMensual: 449,
    girosRecomendados: ["consultor", "constructor", "mecanico", "servicios_hogar", "abogado"],
    resultado:
      "Cotizar en minutos y en el momento exacto en que el cliente está interesado, sin que tú pierdas tiempo.",
    funcionalidad:
      "Bot que arma cotizaciones de tus servicios en minutos capturando lo que el cliente necesita.",
    arquitecturaLangChain:
      "Agente con herramientas: tool 'calcular_cotizacion' (motor de precios), tool 'capturar_datos', tool 'enviar_whatsapp' + memoria. Salida JSON con StructuredOutputParser y persistencia en client_quotes.",
    systemPrompt:
      "Eres el cotizador del negocio. Pides la información mínima necesaria, calculas la cotización con la herramienta oficial (NUNCA inventes precios) y la presentas clara, ofreciendo enviarla por WhatsApp o correo.",
    integraciones: ["POST /api/bots/cotizacion/calcular", "POST /api/bots/cotizacion/enviar"],
  },
  {
    id: "bot_feedback",
    nombre: "Bot de encuestas y retroalimentación",
    descripcion:
      "Pide opiniones a tus clientes después de la compra o la visita, y junta reseñas y calificaciones para ti.",
    casoUso: "feedback",
    keywords: ["opinion", "opinión", "encuesta", "reseña", "resena", "calificación", "calificacion", "satisfacción", "satisfaccion", "recomendar a otros"],
    complejidad: "basica",
    precioSetup: 3500,
    cuotaMensual: 199,
    girosRecomendados: ["restaurante", "estetica", "dentista", "gym", "ecommerce"],
    resultado:
      "Opiniones reales de tus clientes y reseñas que mejoran tu reputación, sin perseguirlos a mano.",
    funcionalidad:
      "Bot que pide la opinión de tus clientes y junta calificaciones y reseñas para tu negocio.",
    arquitecturaLangChain:
      "Cadena de encuesta: saludo + 2-3 preguntas con StructuredOutputParser (rating, comentario, permiso de publicar). Guarda en Supabase y dispara la publicación en Google Reviews/redes si el cliente autoriza.",
    systemPrompt:
      "Eres el asistente de opiniones. Pides con amabilidad y brevedad la calificación y un comentario. Agradeces siempre y, si la reseña es positiva y el cliente lo permite, ofreces ayudarle a publicarla.",
    integraciones: ["POST /api/bots/feedback — guarda opinión", "POST /api/bots/feedback/publicar"],
  },
  {
    id: "bot_membresias",
    nombre: "Bot de membresías y suscripciones",
    descripcion:
      "Tus clientes se dan de alta, consultan su estado y renuevan su membresía o suscripción sin llamadas.",
    casoUso: "suscripciones",
    keywords: ["membresia", "membresía", "suscripcion", "suscripción", "mensualidad", "renovar", "plan", "gimnasio", "curso"],
    complejidad: "avanzada",
    precioSetup: 8500,
    cuotaMensual: 449,
    girosRecomendados: ["gym", "academia", "consultor", "curso", "webapp"],
    resultado:
      "Membresías y suscripciones que se venden, renuevan y gestionan solas, generando ingreso recurrente.",
    funcionalidad:
      "Bot que da de alta, consulta y renueva membresías o suscripciones, con pagos y recordatorios.",
    arquitecturaLangChain:
      "Agente con herramientas: tool 'ver_planes', tool 'crear_membresia', tool 'consultar_estado', tool 'renovar' (con Stripe) + memoria por usuario. Auth con Supabase y RLS.",
    systemPrompt:
      "Eres el gestor de membresías. Ayudas a elegir plan, das de alta, consultas estados y procesas renovaciones con la herramienta de pagos. Nunca inventes planes ni cobros.",
    integraciones: ["GET /api/bots/membresias/planes", "POST /api/bots/membresias/crear", "POST /api/bots/membresias/renovar"],
  },
  {
    id: "bot_multilingue",
    nombre: "Bot multilingüe",
    descripcion:
      "Atiende a tus clientes en el idioma que prefieran: español, inglés y más, sin que tú cambies nada.",
    casoUso: "internacional",
    keywords: ["inglés", "ingles", "english", "idioma", "turistas", "extranjeros", "internacional", "multilingue", "bilingue"],
    complejidad: "media",
    precioSetup: 5900,
    cuotaMensual: 299,
    girosRecomendados: ["restaurante", "estetica", "inmobiliaria", "turismo", "hotel"],
    resultado:
      "Atender clientes de otros idiomas y no perder ventas por el idioma, en mercados turísticos o fronterizos.",
    funcionalidad:
      "Bot que atiende a tus clientes en español, inglés u otro idioma, detectándolo automáticamente.",
    arquitecturaLangChain:
      "Detector de idioma (langdetect o clasificación con DeepSeek) + ChatPromptTemplate con el system prompt traducido al idioma detectado + RAG sobre la KB (con respuestas en el idioma del cliente).",
    systemPrompt:
      "Eres el asistente del negocio y respondes SIEMPRE en el mismo idioma en que te escribe el cliente. Mantienes el tono amable y la información exacta de la base de conocimiento.",
    integraciones: ["POST /api/bots/multilingue — responde en el idioma detectado"],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

/** Busca un bot por id */
export function getBotById(id: string): BotSpec | undefined {
  return BOTS_CATALOG.find((b) => b.id === id);
}

/**
 * FASE 6 · Cross-sell de bots por giro (fuente: docs/MERCADO_PAGINAS_VIBECODER.md §6.5).
 * Matriz giro → bots recomendados (máx 3). El ORDEN de la matriz manda (prioridad):
 * si el giro detectado tiene escalera, esos bots van primero y los de las reglas
 * generales que no estén en ella se anexan al final (el tope de 3 los corta). Esto
 * evita que bot_faq/bot_cotizacion genéricos desplacen a los bots de mayor valor.
 */
const GIRO_CROSS_SELL: Record<string, string[]> = {
  // Giro id (lib/industry-pricing.ts GIROS) → bots de mayor valor para ese giro
  restaurante: ["bot_faq", "bot_citas", "bot_recomendador"], // Menú QR → Reservas
  estetica: ["bot_citas", "bot_leads", "bot_faq"], // Landing → Citas
  medico: ["bot_citas", "bot_faq", "bot_ventas"], // Citas → Telemedicina
  dentista: ["bot_citas", "bot_faq", "bot_ventas"], // Citas → Telemedicina
  gym: ["bot_membresias", "bot_leads", "bot_faq"], // Landing → Membresías
  tienda: ["bot_dudas", "bot_ventas", "bot_leads"], // Landing → Ecommerce
  inmobiliaria: ["bot_ventas", "bot_leads", "bot_faq"], // Portal → leads por prop
  consultor: ["bot_membresias", "bot_ventas", "bot_leads"], // Landing → Cursos
  mecanico: ["bot_faq", "bot_leads", "bot_cotizacion"], // Tarjeta → Landing
  servicios_hogar: ["bot_faq", "bot_leads", "bot_cotizacion"], // Tarjeta → Landing
};

/**
 * FASE 6 · Línea de escalera de producto para el nodo technical_bots: tras ofrecer
 * los bots, sugiere el siguiente producto de la escalera del giro (cross-sell de
 * PRODUCTO, no un bot). null si el giro no tiene escalera definida.
 */
const GIRO_ESCALERA: Record<string, string> = {
  restaurante:
    "Y si te interesa, en vez de solo el menú podemos agregar que tus clientes aparten mesa o hagan reservas directo desde tu página.",
  estetica:
    "Y si luego quieres, además de la página podemos conectar las citas en línea para que agenden sin llamadas.",
  medico:
    "Y si luego quieres, podemos llevar tus citas un paso más allá con consultas por videollamada (telemedicina).",
  dentista:
    "Y si luego quieres, podemos llevar tus citas un paso más allá con consultas por videollamada (telemedicina).",
  gym: "Y si luego quieres, en lugar de solo la página podemos vender tus membresías con cobro recurrente y un área para tus miembros.",
  tienda:
    "Y si luego quieres, en vez de solo la página podemos abrir tu tienda en línea para vender con carrito y pagos.",
  inmobiliaria:
    "Y si luego quieres, en lugar de solo mostrar las propiedades podemos captar leads por cada propiedad con un panel de publicación.",
  consultor:
    "Y si luego quieres, en lugar de solo tu página podemos vender tus cursos o sesiones en línea.",
  mecanico:
    "Y si luego quieres, en vez de solo tu tarjeta podemos hacerte una página completa para que te encuentren en Google.",
  servicios_hogar:
    "Y si luego quieres, en vez de solo tu tarjeta podemos hacerte una página completa para que te encuentren en Google.",
};

/**
 * Línea de escalera de producto para el giro detectado (FASE 6). Usa la misma
 * detección de giro que la matriz de bots. null si el giro no está en la escalera.
 */
export function sugerirEscaleraProducto(ctx: ChatContext): string | null {
  const cat = ctx.category ?? "landing";
  const giroId = detectarGiro(ctx.negocioDescripcion, cat).id;
  // Object.hasOwn: los objetos planos heredan de Object.prototype; sin el guard,
  // un giro id como "constructor" devolvería Object.prototype.constructor.
  return Object.hasOwn(GIRO_ESCALERA, giroId) ? GIRO_ESCALERA[giroId] : null;
}

/**
 * Recomienda bots según lo que el cliente YA dijo (reglas, 0 LLM):
 *  - citas/agenda → bot_citas
 *  - ecommerce o pagos → bot_ventas + bot_recomendador
 *  - chat/WhatsApp o atención → bot_atencion
 *  - categoría citas → bot_citas
 *  - siempre que haya presencia de contacto/leads → bot_leads
 *  - por defecto (cualquier landing/negocio) → bot_leads + bot_faq
 *  - FASE 6: si el giro tiene matriz (GIRO_CROSS_SELL), su orden manda y las
 *    reglas generales se anexan al final (tope de 3).
 * Devuelve una lista acotada (máx 3) para no abrumar al cliente.
 */
export function detectarBotsRecomendados(ctx: ChatContext): BotSpec[] {
  const ids = new Set<string>();
  const cat = ctx.category ?? "landing";
  const giroId = detectarGiro(ctx.negocioDescripcion, cat).id;
  // Object.hasOwn: ver comentario en sugerirEscaleraProducto (giro "constructor").
  const escalera = Object.hasOwn(GIRO_CROSS_SELL, giroId) ? GIRO_CROSS_SELL[giroId] : [];

  if (ctx.citas === true || cat === "citas") ids.add("bot_citas");
  if (ctx.pagos === true || cat === "ecommerce") {
    ids.add("bot_ventas");
    ids.add("bot_recomendador");
  }
  if (ctx.chat === true) ids.add("bot_atencion");
  if (ctx.dashboard === true || cat === "webapp") ids.add("bot_cotizacion");
  // Nivel 4 · Plataformas por vertical (señales pasivas en conversation-flow):
  // cada vertical recomienda su bot de valor. Con el tope de 3, el bot_leads de
  // la regla general y el bot_faq/cotizacion que correspondan se conservan; la
  // vertical aporta el bot clave (ventas, membresías o citas). La FASE 6 afina
  // por giro (GIRO_CROSS_SELL) con prioridad sobre estas reglas generales.
  if (ctx.inmobiliaria === true) {
    ids.add("bot_ventas");
    ids.add("bot_leads");
  }
  if (ctx.membresias === true) {
    ids.add("bot_membresias");
    ids.add("bot_leads");
  }
  if (ctx.cursos === true) {
    ids.add("bot_membresias");
    ids.add("bot_ventas");
  }
  if (ctx.telemedicina === true) {
    ids.add("bot_citas");
    ids.add("bot_faq");
  }
  if (ctx.directorio === true) {
    ids.add("bot_faq");
    ids.add("bot_leads");
  }
  // Todo negocio que quiera captar clientes se beneficia del capturador de leads
  ids.add("bot_leads");
  // Negocios de servicio al público: FAQ siempre es buen gancho.
  // OJO: `cat` aquí es la CATEGORÍA (landing/ecommerce/citas/webapp/blog/portafolio
  // + las de entrada: menu_digital/tarjeta_digital/link_in_bio/cotizador),
  // no el giro. Se añade FAQ a citas (salón/dentista/estética: horarios y dudas
  // constantes) y a los productos de entrada (FAQ es el bot natural de un menú/
  // tarjeta/link-in-bio; para cotizador el FAQ acompaña — el bot_cotizacion NO se
  // recomienda como add-on porque ES el producto que se está vendiendo). Para
  // ecommerce NO: con el tope de 3 recomendaciones, el FAQ desplazaría a
  // bot_recomendador/bot_ventas, que aportan más valor a una tienda en línea.
  if (
    cat === "landing" ||
    cat === "citas" ||
    cat === "menu_digital" ||
    cat === "tarjeta_digital" ||
    cat === "link_in_bio" ||
    cat === "cotizador"
  ) {
    ids.add("bot_faq");
  }

  // FASE 6 · Orden final: si el giro tiene matriz, su orden manda (prioridad) y
  // el resto de las reglas se anexa al final; si no, se respeta el orden del
  // catálogo. Siempre con el tope de 3. Regla 1c: para la categoría "cotizador"
  // nunca se recomienda bot_cotizacion como add-on (ES el producto que se vende).
  let orden: string[];
  if (escalera.length) {
    orden = [...escalera];
    // Array.from: el tsconfig usa target < es2015 (no iterar Sets con for...of).
    for (const id of Array.from(ids)) if (!orden.includes(id)) orden.push(id);
  } else {
    orden = BOTS_CATALOG.filter((b) => ids.has(b.id)).map((b) => b.id);
  }
  if (cat === "cotizador") orden = orden.filter((id) => id !== "bot_cotizacion");

  // Nivel 4 · La vertical manda sobre la matriz del giro cuando el giro no
  // coincide con su bot de valor (caso real: un directorio cae en el giro
  // "tienda", cuya matriz es de comercio → bot_dudas/bot_ventas, pero la
  // vertical directorio quiere bot_faq + bot_leads). Anteponemos los bots
  // clave de la vertical activa para que el tope de 3 los conserve.
  if (ctx.directorio === true) {
    const lead = ["bot_faq", "bot_leads"];
    orden = [...lead, ...orden.filter((id) => !lead.includes(id))];
  }

  const finalIds = orden.slice(0, 3);
  const recomendados = finalIds
    .map((id) => getBotById(id))
    .filter((b): b is BotSpec => Boolean(b));
  return recomendados.length ? recomendados : [getBotById("bot_leads")!];
}

/** Total de setup (MXN) de los bots seleccionados — se suma a la cotización */
export function totalBotsSetup(botIds: string[]): number {
  return botIds.reduce((acc, id) => acc + (getBotById(id)?.precioSetup ?? 0), 0);
}

/** Total de la suscripción mensual (MXN) de los bots seleccionados */
export function totalBotsMensual(botIds: string[]): number {
  return botIds.reduce((acc, id) => acc + (getBotById(id)?.cuotaMensual ?? 0), 0);
}

/** Info mínima para el resultado de la propuesta (AnalysisResult.bots) */
export interface BotInfoResultado {
  id: string;
  nombre: string;
  descripcion: string;
  resultado: string;
  funcionalidad: string;
  precio: number;
  cuota_mensual: number;
}

/** Convierte una lista de ids en el array que se persiste en el resultado */
export function botsParaResultado(botIds: string[]): BotInfoResultado[] {
  return botIds
    .map((id) => getBotById(id))
    .filter((b): b is BotSpec => Boolean(b))
    .map((b) => ({
      id: b.id,
      nombre: b.nombre,
      descripcion: b.descripcion,
      resultado: b.resultado,
      funcionalidad: b.funcionalidad,
      precio: b.precioSetup,
      cuota_mensual: b.cuotaMensual,
    }));
}

/**
 * Extrae los bots que el cliente quiere de una respuesta libre
 * ("sí, quiero el de citas y el de preguntas", "el de ventas").
 * Reglas deterministas (0 LLM): si menciona una keyword de algún bot, lo
 * agrega; si dice que no o nada → lista vacía; si dice "sí" sin más →
 * usa las recomendaciones por defecto.
 */
export function extraerBotsDeRespuesta(
  response: string,
  ctx: ChatContext
): string[] {
  const t = response.toLowerCase();
  // Rechazo: "no", "nada", "no me interesa", "no quiero"
  if (/^(no|nop|nope|nada|no gracias|no me interesa|no quiero|no hace falta|sin bots|no, gracias)\b/.test(t.trim()) || /(no quiero|no me interesa|no me hace falta|sin bots|no necesito)\s/.test(t)) {
    return [];
  }

  const elegidos = new Set<string>();
  for (const bot of BOTS_CATALOG) {
    if (bot.keywords.some((kw) => t.includes(kw))) elegidos.add(bot.id);
  }

  // "sí" genérico sin especificar → recomendaciones del contexto
  if (elegidos.size === 0) {
    if (/(sí|si|claro|me interesa|me gustaría|adelante|dale|ok|bueno)/.test(t)) {
      return detectarBotsRecomendados(ctx).map((b) => b.id);
    }
    return [];
  }
  return Array.from(elegidos);
}
