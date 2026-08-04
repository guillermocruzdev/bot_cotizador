/**
 * PERSONALIDAD DEL BOT — "Alex"
 *
 * Este archivo define QUIÉN es el bot. No es un formulario disfrazado:
 * es un consultor digital amigable que escucha, comenta y guía.
 *
 * Reglas de oro:
 * - 1-2 emojis por mensaje como máximo.
 * - Nunca frases tipo "Pregunta 3 de 20".
 * - Siempre reaccionar a lo que el cliente dijo antes de preguntar lo nuevo.
 * - Si la respuesta es vaga, pedir clarificación (no avanzar mecánicamente).
 */

export const BOT = {
  name: "Alex",
  emoji: "🤖",
  tagline: "Consultor digital de desarrollo web",
  // Avatar: inicial del nombre sobre un gradiente
  avatarGradient: "from-blue-500 to-indigo-500",
};

// ─── Saludos ────────────────────────────────────────────────────────

export const GREETINGS = [
  `¡Hola! Soy ${BOT.name}, tu asistente de desarrollo web. No soy una máquina de formularios, prometido 😄`,
  `¡Qué gusto verte por aquí! Soy ${BOT.name} y voy a ayudarte a darle forma a tu proyecto web.`,
];

// ─── Frases de transición (20+ variaciones) ─────────────────────────
// Se eligen aleatoriamente para no repetir. Se insertan entre bloques
// temáticos de la conversación.

export const TRANSITIONS = [
  "Perfecto, sigamos con un detalle más...",
  "Genial, voy avanzando bien con tu proyecto.",
  "Ok, ya voy armando el rompecabezas.",
  "Bien, esto me ayuda a afinar el plan.",
  "Súper, cada respuesta me acerca a una propuesta más precisa.",
  "Excelente, con eso ya tengo más claridad.",
  "Muy bien, sigamos afinando detalles.",
  "Perfecto, eso es justo lo que necesitaba saber.",
  "Va muy bien la cosa, una pregunta más y seguimos.",
  "Me está quedando clara la foto completa.",
  "Bien, ya se va dibujando tu proyecto.",
  "Sigue así, con esto te voy armando algo a la medida.",
  "Ok, ya casi tengo todo lo que necesito.",
  "Buen dato, lo estoy tomando en cuenta.",
  "Genial, con eso redondeo el panorama.",
  "Voy bien, una cosita más y cerramos con broche.",
  "Perfecto, se nota que tienes las cosas claras.",
  "Bien, esto me sirve un montón para cotizar mejor.",
  "Ok, vamos avanzando de maravilla.",
  "Súper bien, sigamos con otra cosa.",
  "Excelente, ya tengo casi todo el contexto.",
  "Bien, vamos avanzando como debe ser.",
  "Muy bien, con eso me va quedando el panorama completo.",
  "Perfecto, cada cosa que me dices me ayuda a no venderte de más.",
  "Voy muy bien; esto se está armando con cabeza.",
  "Ok, con eso que me dices ya sé por dónde va el proyecto.",
];

// ─── Confirmaciones (respuesta a algo que el cliente dijo) ─────────

export const CONFIRMATIONS = [
  "¡Perfecto!",
  "¡Entendido!",
  "Me queda clarísimo.",
  "¡Excelente!",
  "¡Muy bien!",
  "Perfecto, anotado.",
  "¡Genial!",
  "De acuerdo, me queda claro.",
  "¡Súper!",
];

// ─── Reacciones positivas a comentarios del cliente ────────────────

export const REACTIONS = [
  "¡Eso suena interesante!",
  "Buena elección, eso te ahorra mucho tiempo.",
  "¡Qué buena idea!",
  "Eso es más común de lo que crees, y se resuelve muy bien.",
  "Me encanta cómo lo tienes pensado.",
  "Se nota que le has puesto atención a tu negocio.",
  "Eso le da un toque profesional a tu proyecto.",
  "Perfecto, ese detalle marca la diferencia.",
  "Suena a que ya sabes lo que quieres, eso acelera todo.",
  "Eso me gusta; se nota que le pones atención a tu negocio.",
  "Te felicito, pocos dueños tienen las cosas tan claras.",
  "Con eso, la página va a trabajar por ti, créeme.",
];

// ─── Frases de experiencia (el consultor senior) ───────────────────
// La voz del bot es la de un señor que lleva años hablando con dueños
// de negocio: seguro, honesto y sin rodeos técnicos.

export const EXPERIENCE = [
  "Llevo años haciendo esto y te soy honesto: los negocios que se toman en serio su presencia en internet, siempre ganan.",
  "He visto decenas de negocios como el tuyo; los que invierten bien en esto, lo recuperan con creces.",
  "Con los años aprendí que lo importante no es la página bonita, sino que te traiga clientes. En eso me enfoco.",
  "Te lo digo con la experiencia de muchos proyectos: lo que te voy a recomendar es lo que de verdad funciona.",
  "No te voy a vender humo; llevo suficiente tiempo para decirte qué te conviene y qué no.",
  "Ya sabes cómo es esto: el que no aparece en internet, para el cliente casi no existe. Por eso estamos aquí.",
];

export function randomExperience(): string {
  return pickRandom(EXPERIENCE);
}

// ─── Empatía / manejo de respuestas vagas o negativas ──────────────

export const EMPATHY = [
  "Tranquilo, es más común de lo que parece.",
  "No te preocupes, para eso estoy aquí.",
  "Entiendo perfectamente, muchos clientes están igual al inicio.",
  "No hay presión, vamos a tu ritmo.",
  "Eso suena complicado, pero te aseguro que se resuelve.",
  "Sin problema, yo te oriento en esa parte.",
  "Relájate, no hay respuestas incorrectas aquí.",
];

// ─── Frases de cierre / pensando ───────────────────────────────────

export const CLOSINGS = [
  "¡Perfecto! Creo que ya tengo todo lo que necesito. Déjame unos segundos para armar tu propuesta... 🔍",
  "¡Listo! Ya con lo que me contaste me hago una idea muy clara. Estoy armando tu propuesta... ✨",
  "¡Genial! Creo que ya cubrimos todo. Déjame pensar un momento y te preparo algo a la medida... 💭",
];

// ─── Entrada a temas delicados (presupuesto) ───────────────────────

export const BUDGET_INTRO = [
  `Última cosa, y lo digo con cuidado porque sé que es delicado: ¿tienes un rango de inversión en mente? No es para cobrarte lo máximo, es para ajustar el alcance a lo que realmente necesitas y puedes pagar.`,
  `Ya casi terminamos. Una pregunta con tacto: ¿tienes pensado cuánto quieres invertir? Lo pregunto para dimensionar el proyecto a tu medida, no para inflar precios.`,
];

// ─── Emojis permitidos y su contexto ────────────────────────────────
// Cada emoji indica DÓNDE es natural usarlo.

export const EMOJIS = {
  saludo: ["👋", "😄", "😊"],
  interes: ["😮", "👀", "🤔"],
  confirmacion: ["✅", "👍", "✨"],
  idea: ["💡", "📌"],
  analisis: ["🔍", "💭", "🧠"],
  entrega: ["🚀", "📦", "🎯"],
  tecnologia: ["🖥️", "📱", "🌐"],
  precio: ["💰", "🤝"],
  contacto: ["💬", "📧", "📲"],
  cierre: ["🎉", "🌟", "🙌"],
} as const;

export type EmojiCategory = keyof typeof EMOJIS;

/** Elige un emoji de una categoría (para no repetir el mismo siempre) */
export function pickEmoji(category: EmojiCategory): string {
  const pool = EMOJIS[category];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Helpers para elegir frases aleatorias ─────────────────────────

export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomTransition(): string {
  return pickRandom(TRANSITIONS);
}

export function randomConfirmation(): string {
  return pickRandom(CONFIRMATIONS);
}

export function randomReaction(): string {
  return pickRandom(REACTIONS);
}

export function randomEmpathy(): string {
  return pickRandom(EMPATHY);
}

export function randomClosing(): string {
  return pickRandom(CLOSINGS);
}

export function randomBudgetIntro(): string {
  return pickRandom(BUDGET_INTRO);
}

// ─── Detección de intención (léxico ligero, sin IA) ────────────────
// Se usa para el flujo conversacional en el cliente. La IA/DeepSeek
// solo se invoca al final para generar la propuesta completa.

const STOPWORDS = new Set([
  "el", "la", "los", "las", "de", "del", "un", "una", "unos", "unas",
  "y", "o", "u", "a", "al", "en", "con", "por", "para", "que", "mi",
  "tu", "su", "nuestro", "esta", "este", "esto", "pero", "si", "no",
  "es", "son", "hay", "como", "mas", "más", "menos", "tengo", "quiero",
  "necesito", "me", "te", "se", "lo", "le", "ya", "bien", "ok", "sí",
]);

export interface Intent {
  yes: boolean;
  no: boolean;
  dontKnow: boolean;
  text: string;
}

/**
 * Clasifica una respuesta corta como sí / no / no sé / texto libre.
 * Es ligero y determinista; suficiente para decisiones rápidas en el chat.
 */
export function classifyIntent(raw: string): Intent {
  const text = raw.toLowerCase().trim();
  const words = text.split(/[\s,.;:!?¿¡()]+/).filter((w) => w.length > 1);

  const yesWords = [
    "sí", "si", "claro", "exacto", "correcto", "afirmativo", "obvio",
    "por supuesto", "simon", "simón", "dale", "ok", "okay", "sep",
    "ajá", "aja", "ya", "sipi", "así es", "eso", "justo", "bueno",
  ];
  const noWords = [
    "no", "nop", "nope", "negativo", "para nada", "nada", "jamás",
    "jamas", "tampoco", "ni", "nunca",
  ];
  const dontKnowWords = [
    "no sé", "no se", "nose", "no tengo idea", "ni idea", "no lo sé",
    "no lo se", "no sé bien", "no estoy seguro", "no estoy segura",
    "quien sabe", "quién sabe", "no me decido", "no decido",
  ];

  // "no sé" es DUDA, no una negación real. Se retira del texto antes de
  // contar señales para que una respuesta sustancial con sí/no claro (aunque
  // contenga "no sé") gane sobre la duda.
  let reduced = text;
  for (const phrase of dontKnowWords) {
    reduced = reduced.split(phrase).join(" ");
  }
  const reducedWords = reduced.split(/[\s,.;:!?¿¡()]+/).filter((w) => w.length > 1);

  // Palabras completas (no subcadenas): evita que "necesito" cuente como "si",
  // "suficiente" como "si" o "clínica" como "ni". Las frases (con espacio) sí van como subcadena.
  const hasSignal = (phrase: string): boolean =>
    phrase.includes(" ") ? reduced.includes(phrase) : reducedWords.includes(phrase);
  const yesCount = yesWords.filter(hasSignal).length;
  const noCount = noWords.filter(hasSignal).length;

  // Señales claras de SÍ o NO en una respuesta sustancial tienen prioridad
  // sobre cualquier duda contenida.
  if (noCount > 0 && yesCount === 0) return { yes: false, no: true, dontKnow: false, text };
  if (yesCount > 0 && noCount === 0) return { yes: true, no: false, dontKnow: false, text };
  if (yesCount > 0 && noCount > 0) return { yes: false, no: false, dontKnow: false, text };

  // Sin señal clara: solo entonces cuenta la duda o la vaguedad.
  if (dontKnowWords.some((phrase) => text.includes(phrase))) {
    return { yes: false, no: false, dontKnow: true, text };
  }

  // Respuesta vacía o solo conectores → no sé
  if (words.filter((w) => !STOPWORDS.has(w)).length === 0) {
    return { yes: false, no: false, dontKnow: true, text };
  }

  return { yes: false, no: false, dontKnow: false, text };
}

/**
 * Devuelve el texto "sustantivo" de la respuesta para referenciarlo
 * después: "déjame ver, es una tienda de ropa" → "una tienda de ropa".
 */
export function extractSubject(raw: string): string {
  return raw.trim().replace(/^(déjame ver|déjame pensar|pues|bueno|verás|mira|es que|se trata de)\s*/i, "").trim();
}

/**
 * Extrae el NOMBRE del cliente (o de su negocio) de la respuesta.
 *
 * Maneja los formatos comunes de presentación y evita el bug clásico de
 * tomar la primera palabra ("Soy Laura..." → debe ser "Laura", no "Soy").
 *
 *   "Soy Laura, de la Clínica Dental Sonrisa, en Querétaro" → "Laura"
 *   "Mi nombre es Juan"                                      → "Juan"
 *   "Soy de la panadería La Espiga"                          → "Panadería La Espiga"
 *   "Clínica Dental Sonrisa"                                 → "Clínica Dental Sonrisa"
 */
export function extractName(raw: string): string | null {
  let t = (raw ?? "").trim();
  if (!t) return null;

  // 1) Prefijos de presentación personal
  t = t.replace(
    /^(yo\s+soy|soy|me llamo|mi nombre es|mi negocio se llama|nos llamamos|somos|es)\s+/i,
    ""
  );
  // 2) Prefijos de saludo
  t = t.replace(
    /^(hola|buenas|buen día|buenos días|buenas tardes|buenas noches|qué tal|que tal)\s*[,:.]?\s*/i,
    ""
  );
  // 3) "de la / del / de " inicial (cuando solo da el negocio: "de la panadería X")
  t = t.replace(/^(de la|del|de)\s+/i, "");

  // 4) Tomar la primera parte antes de contexto: " de ", " en ", o coma.
  //    "Soy Laura, de la Clínica..." → "Laura"
  //    "Soy de la panadería La Espiga" → "Panadería La Espiga" (sin "de"/","/"en")
  const first = t.split(/\s+(?:de|en)\s+|,/)[0].trim();

  // 5) Limpiar signos de puntuación finales y capitalizar la primera letra
  const name = first.replace(/[,.:;!?¿¡]+$/g, "").trim();

  // Ignorar respuestas vacías o genéricas
  if (name.length < 2) return null;
  if (/^(no|nada|ninguno|no sé|no se|nose)$/i.test(name)) return null;

  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Convierte una cifra + multiplicador a número: "8"→8, "10 mil"→10000, "15k"→15000 */
function budgetToNumber(num: string, mult: string | undefined): number {
  let s = num.trim();
  // Coma como separador de miles ("8,000" → 8000); si no, es decimal ("8,5" → 8.5)
  if (/,\d{3}$/.test(s)) {
    s = s.replace(/,/g, "");
  } else {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  if (Number.isNaN(n)) return 0;
  const m = mult === "mil" || mult === "k" ? 1000 : 1;
  return Math.round(n * m);
}

/**
 * Detecta y NORMALIZA una cifra monetaria (p.ej. "20 mil" → "20000",
 * "15k" → "15000", "unos 8 o 10 mil pesos" → "8000 a 10000").
 * Devuelve el texto limpio (sin "$", "pesos", ni la frase completa).
 */
export function extractBudgetAmount(raw: string): string | null {
  if (!raw) return null;
  const t = raw.toLowerCase().replace(/[$]/g, "").trim();

  // Rango: "8 o 10 mil", "8 mil a 10 mil", "$8,000 - $10,000", "entre 10 y 15 mil"
  // El multiplicador (k/mil) del segundo número aplica a ambos en "8 o 10 mil".
  const range = t.match(
    /(\d+(?:[.,]\d+)?)\s*(k|mil)?\s*(?:o|a|al|hasta|entre|y|-|–|~|más o menos)\s*(\d+(?:[.,]\d+)?)\s*(k|mil)?/
  );
  if (range) {
    const lo = budgetToNumber(range[1], range[2] ?? range[4]);
    const hi = budgetToNumber(range[3], range[4]);
    if (lo > 0 && hi > 0 && hi >= lo) {
      return lo === hi ? String(lo) : `${lo} a ${hi}`;
    }
  }

  // Valor único: "20 mil" → 20000, "15k" → 15000, "$8,500" → 8500
  const single = t.match(/(\d+(?:[.,]\d+)?)\s*(k|mil)?/);
  if (single) {
    const v = budgetToNumber(single[1], single[2]);
    if (v > 0) return String(v);
  }
  return null;
}

/**
 * Detecta si el usuario menciona una fecha ("para marzo", "la próxima semana",
 * "en 2 meses", "en unas 3 semanas", "para el próximo mes"). Devuelve solo
 * la frase de fecha, nunca la oración completa.
 */
export function extractDeadline(raw: string): string | null {
  const lower = raw.toLowerCase();
  const patterns = [
    /para\s+(antes\s+de\s+)?(la próxima semana|la siguiente semana|este mes|el próximo mes|el mes que viene|ya|urgente|cuanto antes)/i,
    /para\s+(?:el\s+|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
    /en\s+unas?\s+\d+\s*(d[ií]as|semanas|meses)/i,
    /en\s+\d+\s*(d[ií]as|semanas|meses)/i,
    /(antes\s+del?\s+\d+)/i,
  ];
  for (const p of patterns) {
    const m = lower.match(p);
    if (m) return m[0].trim();
  }
  return null;
}

/**
 * Normaliza un teléfono/WhatsApp mexicano a formato legible E.164:
 * - Tolera espacios, guiones, paréntesis y "+" (solo extrae dígitos).
 * - 10 dígitos → antepone +52: "81 2345 6789" → "+52 81 2345 6789".
 * - Si ya trae +52/+521 se conserva (incluido el 1 móvil legacy).
 * - Devuelve null si hay menos de 10 dígitos (para re-preguntar).
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;

  let prefix = "+52";
  let national = digits;
  if (digits.startsWith("521") && digits.length >= 13) {
    // Móvil legacy: +52 1 + 10 dígitos → conservar el 1
    prefix = "+52 1";
    national = digits.slice(3);
  } else if (digits.startsWith("52") && digits.length >= 12) {
    // Ya trae código de país +52 + 10 dígitos
    national = digits.slice(2);
  } else if (digits.startsWith("1") && digits.length === 11) {
    // Móvil mexicano con 1 inicial (1 + 10 locales)
    national = digits.slice(1);
  }

  if (national.length > 10) national = national.slice(0, 10);
  if (national.length < 10) return null;

  // Formato legible: +52 <área 2> <4> <4>
  return `${prefix} ${national.slice(0, 2)} ${national.slice(2, 6)} ${national.slice(6, 10)}`;
}

/** Regex estricta de correo (con TLD de al menos 2 letras) */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Extrae un correo válido de una respuesta libre (tolera texto extra:
 * "mi correo es laura@clinica.com" → "laura@clinica.com").
 * Devuelve null si no hay un correo válido (para re-preguntar).
 */
export function extractEmail(raw: string): string | null {
  if (!raw) return null;
  const match = raw.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (!match) return null;
  const candidate = match[0];
  if (!EMAIL_REGEX.test(candidate)) return null;
  return candidate.toLowerCase();
}
