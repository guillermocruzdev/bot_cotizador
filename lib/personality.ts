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
];

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

  if (dontKnowWords.some((phrase) => text.includes(phrase))) {
    return { yes: false, no: false, dontKnow: true, text };
  }

  const yesCount = yesWords.filter((w) => words.includes(w) || text.includes(w)).length;
  const noCount = noWords.filter((w) => words.includes(w) || text.includes(w)).length;

  if (noCount > 0 && yesCount === 0) return { yes: false, no: true, dontKnow: false, text };
  if (yesCount > 0 && noCount === 0) return { yes: true, no: false, dontKnow: false, text };
  if (yesCount > 0 && noCount > 0) return { yes: false, no: false, dontKnow: false, text };

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
 * Detecta si la respuesta contiene una cifra monetaria (p.ej. "$20k", "30000 pesos")
 */
export function extractBudgetAmount(raw: string): string | null {
  const match = raw.match(/(?:\$|mxn|pesos)?\s*([\d,]+)\s*(k|mil|pesos|mxn)?/i);
  if (!match) return null;
  return `${match[1]}${match[2] ? " " + match[2].toLowerCase() : ""}`;
}

/**
 * Detecta si el usuario menciona una fecha ("para marzo", "la próxima semana", "en 2 meses")
 */
export function extractDeadline(raw: string): string | null {
  const lower = raw.toLowerCase();
  const patterns = [
    /para\s+(antes\s+de\s+)?(la próxima semana|la siguiente semana|este mes|el próximo mes|el mes que viene|ya|urgente|cuanto antes)/i,
    /para\s+(?:el\s+|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
    /en\s+\d+\s*(días|dias|semanas|meses)/i,
    /(antes\s+del?\s+\d+)/i,
  ];
  for (const p of patterns) {
    const m = lower.match(p);
    if (m) return m[0].trim();
  }
  return null;
}
