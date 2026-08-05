// Máquina de estados del lead + clasificación de respuestas entrantes.

export const LEAD_STATUS = [
  "pending",
  "sent",
  "responded",
  "interested",
  "meeting",
  "client",
  "no_response",
  "blacklist",
] as const;

export type LeadStatus = (typeof LEAD_STATUS)[number];

// Transiciones válidas (diagrama de estados).
export const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  pending: ["sent", "no_response", "blacklist"],
  sent: ["responded", "no_response", "blacklist"],
  responded: ["interested", "blacklist"],
  interested: ["meeting", "blacklist"],
  meeting: ["client", "blacklist"],
  client: ["blacklist"],
  no_response: ["sent"], // reintento tras N días
  blacklist: [], // terminal
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function transition(
  from: LeadStatus,
  to: LeadStatus
): { ok: boolean; status: LeadStatus } {
  if (from === to) return { ok: true, status: from };
  if (!canTransition(from, to)) return { ok: false, status: from };
  return { ok: true, status: to };
}

// --- Clasificación de respuestas entrantes (inbound handler) ---
export type InboundAction =
  | "interested"
  | "blacklist"
  | "faq"
  | "human_mode"
  | "none";

export interface InboundDecision {
  action: InboundAction;
  /** Estado objetivo tras clasificar (el caller transiciona responded → este). */
  nextStatus: LeadStatus;
}

const MEETING_KEYWORDS = [
  "reunion",
  "reunir",
  "reunirnos",
  "agendar",
  "agenda",
  "cita",
  "junta",
  "meeting",
  "call",
  "llamar",
  "llamada",
  "zoom",
  "teams",
  "visita",
  "presupuesto",
  "cotizacion",
  "cotizar",
  "me interesa",
  "si quiero",
];

const QUESTION_MARKERS = [
  "?",
  "cuanto",
  "como",
  "cuando",
  "que es",
  "precio",
  "costo",
  "ejemplos",
  "funciona",
  "pueden",
];

export function normalizeText(text: string): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function hitAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(normalizeText(k)));
}

export function classifyInbound(
  current: LeadStatus,
  text: string,
  blacklistKeywords: string[]
): InboundDecision {
  const norm = normalizeText(text);
  if (!norm) return { action: "none", nextStatus: current };

  // 1) negativo → blacklist (stop a todo envío)
  if (hitAny(norm, blacklistKeywords)) {
    return { action: "blacklist", nextStatus: "blacklist" };
  }
  // 2) palabras de reunión/interés → interested
  if (hitAny(norm, MEETING_KEYWORDS)) {
    return { action: "interested", nextStatus: "interested" };
  }
  // 3) pregunta → FAQ (Chat 5); el estado se queda en responded
  if (hitAny(norm, QUESTION_MARKERS)) {
    return { action: "faq", nextStatus: "responded" };
  }
  // 4) resto → human_mode (un humano toma la conversación)
  return { action: "human_mode", nextStatus: "responded" };
}
