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
 * Recomienda bots según lo que el cliente YA dijo (reglas, 0 LLM):
 *  - citas/agenda → bot_citas
 *  - ecommerce o pagos → bot_ventas + bot_recomendador
 *  - chat/WhatsApp o atención → bot_atencion
 *  - categoría citas → bot_citas
 *  - siempre que haya presencia de contacto/leads → bot_leads
 *  - por defecto (cualquier landing/negocio) → bot_leads + bot_faq
 * Devuelve una lista acotada (máx 3) para no abrumar al cliente.
 */
export function detectarBotsRecomendados(ctx: ChatContext): BotSpec[] {
  const ids = new Set<string>();
  const cat = ctx.category ?? "landing";

  if (ctx.citas === true || cat === "citas") ids.add("bot_citas");
  if (ctx.pagos === true || cat === "ecommerce") {
    ids.add("bot_ventas");
    ids.add("bot_recomendador");
  }
  if (ctx.chat === true) ids.add("bot_atencion");
  if (ctx.dashboard === true || cat === "webapp") ids.add("bot_cotizacion");
  // Todo negocio que quiera captar clientes se beneficia del capturador de leads
  ids.add("bot_leads");
  // Negocios de servicio al público: FAQ siempre es buen gancho
  if (["restaurante", "estetica", "dentista", "mecanico", "tienda", "servicios_hogar"].includes(cat) || cat === "landing") {
    ids.add("bot_faq");
  }

  // Máx 3 recomendaciones para no abrumar
  const ordered = BOTS_CATALOG.filter((b) => ids.has(b.id)).slice(0, 3);
  return ordered.length ? ordered : [getBotById("bot_leads")!];
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
