/**
 * AGENTE DE CIERRE / NEGOCIACIÓN (híbrido)
 *
 * Convierte a un lead interesado en un cliente que pagó su anticipo.
 * SISTEMA HÍBRIDO, mismas reglas de oro que el resto del bot:
 *
 *  - La MÁQUINA (determinista, 0 tokens) decide estado, táctica, descuentos
 *    y montos. `lib/quote-engine.ts` calcula el total; aquí SOLO se manipula
 *    la oferta con reglas (escalera de tácticas + piso de precio).
 *  - El LLM (DeepSeek) SOLO redacta el texto persuasivo del turno, con la
 *    táctica YA decidida por la máquina. NUNCA inventa precios, descuentos
 *    ni plazos (prohibido en el system prompt).
 *  - Si no hay DEEPSEEK_API_KEY, la chain falla, tarda (>9s) o el circuit
 *    breaker está abierto → `fallbackMessage` determinista (voz de consultor).
 *
 * Flujo de estados (patrón state-manager.ts):
 *   interested → cotizando → cotizado → negociando → anticipo_solicitado
 *   → anticipo_pagado → client   (+ no_response / blacklist)
 *
 * Escalera de tácticas (sube 1 nivel por rechazo, máx 5):
 *   1 reframe · 2 descuento · 3 meses · 4 quitar_servicios · 5 ultima_oferta
 *   - Una táctica por mensaje.
 *   - Nunca se baja del `piso_precio` (default 55% del base).
 *   - Cada movimiento se registra en el audit (`onAudit`).
 */

import { ChatOpenAI } from "@langchain/openai";
import { FewShotPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { AIMessage } from "@langchain/core/messages";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { PRECIOS, formatPesos } from "../../lib/quote-engine";
import { normalizeText, type LeadStatus } from "../whatsapp/state-manager";
import {
  getAntiBanConfig,
  getClosingConfig,
  getLlmDailyTokenBudget,
  type ClosingConfig,
} from "../config";
import { getDailyLlmTokens } from "../store/llm-usage-repo";

/**
 * VERSIÓN del system prompt del closer (negociación). Subirla al cambiar el
 * prompt para poder comparar/revertir mensajes entre versiones (el usuario
 * pidió versionarlo). Se inyecta en el prompt y se registra en el audit.
 */
export const NEGOTIATION_PROMPT_VERSION = "closer-v1.0.0";

// ─── Tipos de objeción y táctica ───────────────────────────────────

export type TacticType =
  | "reframe"
  | "descuento"
  | "meses"
  | "quitar_servicios"
  | "ultima_oferta";

export type ObjectionType =
  | "precio_caro"
  | "sin_presupuesto"
  | "quiero_pensarlo"
  | "no_me_decido"
  | "lo_hace_otro"
  | "no_confio"
  | "avisame_luego"
  | "pedir_cotizacion";

export type PlanMeses = 12 | 24 | 36;

// ─── Oferta (determinista) ─────────────────────────────────────────

export interface OfferServicio {
  id: string;
  nombre: string;
  precio: number;
  /** Los esenciales (base del proyecto) nunca se quitan. */
  esencial: boolean;
  removido: boolean;
}

export interface Offer {
  /** Total original del quote (viene de lib/quote-engine, quote_total). */
  precio_base: number;
  /** Total vigente: base − servicios removidos − descuentos, clamp al piso. */
  total_actual: number;
  descuento_acumulado: number;
  plan_activo: PlanMeses;
  planes: PlanMeses[];
  servicios: OfferServicio[];
  /** Nunca se cotiza debajo de esto (default 55% del base). */
  piso_precio: number;
}

export interface BuildOfferOpts {
  piso_fraccion?: number;
  plan_default?: PlanMeses;
  planes?: PlanMeses[];
  servicios?: Array<Omit<OfferServicio, "removido">>;
}

/** Servicios por defecto (add-ons/recortes), con precios del quote-engine. */
function defaultServicios(): Array<Omit<OfferServicio, "removido">> {
  return [
    { id: "desarrollo", nombre: "Desarrollo del sitio", precio: 0, esencial: true },
    { id: "dominio_hosting", nombre: "Dominio y hosting (1 año)", precio: PRECIOS.dominioHosting, esencial: false },
    { id: "branding", nombre: "Branding básico", precio: PRECIOS.branding, esencial: false },
    { id: "agenda", nombre: "Sistema de agenda / citas", precio: PRECIOS.agendaExtra, esencial: false },
  ];
}

/** Construye la oferta inicial a partir del total del quote. */
export function buildOffer(quote_total: number, opts: BuildOfferOpts = {}): Offer {
  const cfg = getClosingConfig();
  const base = Math.round(quote_total);
  const planes = [...(opts.planes ?? cfg.planes)].sort((a, b) => a - b);
  const deseado = opts.plan_default ?? cfg.plan_default;
  const plan = (planes.includes(deseado) ? deseado : planes[0]) as PlanMeses;
  const piso = Math.round(base * (opts.piso_fraccion ?? cfg.piso_fraccion));
  const servicios: OfferServicio[] = (opts.servicios ?? defaultServicios()).map(
    (s) => ({ ...s, removido: false })
  );
  return {
    precio_base: base,
    total_actual: base,
    descuento_acumulado: 0,
    plan_activo: plan,
    planes,
    servicios,
    piso_precio: piso,
  };
}

/** Suma de servicios ya removidos de la oferta. */
export function removidoTotal(offer: Offer): number {
  return offer.servicios
    .filter((s) => s.removido)
    .reduce((acc, s) => acc + s.precio, 0);
}

function computeTotal(o: Offer): number {
  return Math.max(o.piso_precio, o.precio_base - removidoTotal(o) - o.descuento_acumulado);
}

function nextPlan(current: PlanMeses, planes: PlanMeses[]): PlanMeses | null {
  const sorted = [...planes].sort((a, b) => a - b);
  return sorted.find((p) => p > current) ?? null;
}

export interface TacticOutcome {
  offer: Offer;
  /** Descripción de los movimientos (para el audit / mensaje). */
  changes: string[];
  /** ¿La oferta cambió numéricamente? (reframe = false). */
  applied: boolean;
}

/**
 * Aplica UNA táctica a la oferta (regla: una táctica por mensaje).
 * Nunca baja del piso. `reframe` no cambia números (solo valor).
 */
export function applyTactic(
  offer: Offer,
  tactic: TacticType,
  cfg: ClosingConfig = getClosingConfig()
): TacticOutcome {
  const o: Offer = {
    ...offer,
    servicios: offer.servicios.map((s) => ({ ...s })),
  };
  const changes: string[] = [];

  switch (tactic) {
    case "reframe":
      // Reencuadre de valor: sin cambio numérico.
      return { offer: o, changes, applied: false };

    case "descuento": {
      const maxBajable = Math.max(0, o.total_actual - o.piso_precio);
      if (maxBajable <= 0) return { offer: o, changes, applied: false };
      const monto = Math.round(o.total_actual * cfg.descuento_max_fraccion);
      const aplicado = Math.min(monto, maxBajable);
      o.descuento_acumulado += aplicado;
      changes.push(`descuento ${aplicado} MXN`);
      break;
    }

    case "meses": {
      // Más meses de financiamiento (p. ej. 24 → 36): baja la cuota.
      const next = nextPlan(o.plan_activo, cfg.planes);
      if (!next || next === o.plan_activo) return { offer: o, changes, applied: false };
      o.plan_activo = next;
      changes.push(`plan ${next} meses`);
      break;
    }

    case "quitar_servicios": {
      // Quita servicios no esenciales: los declinados o de MENOR valor primero.
      const candidato = o.servicios
        .filter((s) => !s.esencial && !s.removido)
        .sort((a, b) => a.precio - b.precio)[0];
      if (!candidato) return { offer: o, changes, applied: false };
      candidato.removido = true;
      changes.push(`sin ${candidato.nombre}`);
      break;
    }

    case "ultima_oferta": {
      // Combina 2-4 hasta el piso: quita lo no esencial + mejor plan + descuento.
      const mejores = [...cfg.planes].sort((a, b) => b - a);
      const mejorPlan = (mejores[0] ?? o.plan_activo) as PlanMeses;
      for (const s of o.servicios) {
        if (!s.esencial && !s.removido) {
          s.removido = true;
          changes.push(`sin ${s.nombre}`);
        }
      }
      if (o.plan_activo !== mejorPlan) {
        o.plan_activo = mejorPlan;
        changes.push(`plan ${mejorPlan} meses`);
      }
      const toFloor = Math.max(0, o.precio_base - removidoTotal(o) - o.piso_precio);
      const extra = toFloor - o.descuento_acumulado;
      if (extra > 0) {
        o.descuento_acumulado += extra;
        changes.push(`descuento ${extra} MXN`);
      }
      break;
    }
  }

  o.total_actual = computeTotal(o);
  return { offer: o, changes, applied: changes.length > 0 };
}

/** Línea de oferta determinista con las cifras exactas (la pone la máquina). */
export function offerLine(offer: Offer): string {
  const cuota = Math.round(offer.total_actual / offer.plan_activo);
  let line = `Total: ${formatPesos(offer.total_actual)} · ${offer.plan_activo} meses a ${formatPesos(cuota)}/mes`;
  if (offer.descuento_acumulado > 0) {
    line += ` · incluye ${formatPesos(offer.descuento_acumulado)} de ajuste`;
  }
  return line;
}

// ─── Persistencia de la oferta (entre turnos de negociación) ───────

/**
 * Serializa la oferta para guardarla en `client_quotes.quote_json.oferta`.
 * Así el siguiente turno reconstruye EXACTAMENTE el estado (servicios
 * removidos, plan, descuento, piso) sin depender de sumas aproximadas.
 */
export function persistOffer(offer: Offer): Record<string, unknown> {
  return {
    precio_base: offer.precio_base,
    total_actual: offer.total_actual,
    descuento_acumulado: offer.descuento_acumulado,
    plan_activo: offer.plan_activo,
    piso_precio: offer.piso_precio,
    planes: offer.planes,
    servicios: offer.servicios.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      precio: s.precio,
      esencial: s.esencial,
      removido: s.removido,
    })),
  };
}

export interface StoredQuoteForOffer {
  quote_json?: Record<string, unknown> | null;
  total?: number | null;
  descuento?: number | null;
  plan_meses?: number | null;
}

/**
 * Reconstruye la oferta desde lo persistido (quote_json.oferta) o, si no
 * hay, la construye del total del quote (buildOffer). SIEMPRE clamp al piso
 * (regla de oro: nunca debajo).
 */
export function restoreOffer(quote: StoredQuoteForOffer): Offer {
  const j = quote.quote_json ?? {};
  const saved = (j.oferta ?? null) as Partial<Offer> | null;
  const base = Math.round(Number(quote.total ?? j.quoteTotal ?? 0));
  const offer: Offer = buildOffer(base > 0 ? base : 0);

  if (saved && typeof saved.precio_base === "number" && saved.precio_base > 0) {
    offer.precio_base = Math.round(saved.precio_base);
    offer.piso_precio = Math.round(
      typeof saved.piso_precio === "number" ? saved.piso_precio : offer.piso_precio
    );
    offer.total_actual = Math.round(
      typeof saved.total_actual === "number" ? saved.total_actual : offer.total_actual
    );
    offer.descuento_acumulado = Math.round(
      typeof saved.descuento_acumulado === "number" ? saved.descuento_acumulado : 0
    );
    if (Array.isArray(saved.planes) && saved.planes.length) {
      offer.planes = [...saved.planes].sort((a, b) => a - b) as PlanMeses[];
    }
    if (saved.plan_activo && offer.planes.includes(saved.plan_activo as PlanMeses)) {
      offer.plan_activo = saved.plan_activo as PlanMeses;
    }
    if (Array.isArray(saved.servicios) && saved.servicios.length) {
      offer.servicios = (saved.servicios as Array<Partial<OfferServicio>>).map((s) => ({
        id: String(s.id ?? ""),
        nombre: String(s.nombre ?? ""),
        precio: Number(s.precio ?? 0),
        esencial: Boolean(s.esencial),
        removido: Boolean(s.removido),
      }));
    }
  } else {
    if (quote.descuento) offer.descuento_acumulado = Math.round(Number(quote.descuento));
    if (quote.plan_meses && offer.planes.includes(quote.plan_meses as PlanMeses)) {
      offer.plan_activo = quote.plan_meses as PlanMeses;
    }
  }

  // Regla de oro: nunca se cotiza debajo del piso.
  offer.total_actual = Math.max(
    offer.piso_precio,
    offer.precio_base - removidoTotal(offer) - offer.descuento_acumulado
  );
  return offer;
}

// ─── Escalera de tácticas ──────────────────────────────────────────

const LADDER: TacticType[] = [
  "reframe",
  "descuento",
  "meses",
  "quitar_servicios",
  "ultima_oferta",
];

/** Nivel inicial según la objeción (las caras a precio empiezan más abajo). */
export function initialLevelForObjection(obj: ObjectionType | null): number {
  switch (obj) {
    case "precio_caro":
      return 2;
    case "sin_presupuesto":
      return 3;
    case "lo_hace_otro":
      return 4;
    case "quiero_pensarlo":
    case "no_me_decido":
    case "no_confio":
      return 1;
    case "avisame_luego":
    case "pedir_cotizacion":
      return 0; // no es una objeción: difiere/avanza, sin subir la escalera
    default:
      return 1;
  }
}

/** Táctica del nivel 1-5 de la escalera (clamped). */
export function tacticForLevel(level: number, cfg: ClosingConfig = getClosingConfig()): TacticType {
  const idx = Math.min(Math.max(level, 1), cfg.tacticas_max) - 1;
  return LADDER[idx] ?? LADDER[0];
}

// ─── Clasificación de objeciones (regex + señales, 0 tokens) ───────

function has(norm: string, re: RegExp): boolean {
  re.lastIndex = 0;
  return re.test(norm);
}

// Reglas en orden de prioridad (primera que coincide gana). `pedir_cotizacion`
// va al final: es una señal POSITIVA, solo aplica si no hay rechazo.
const OBJECTION_RULES: Array<{ type: ObjectionType; re: RegExp }> = [
  {
    type: "lo_hace_otro",
    re: /otro me (lo )?(hace|cobra)|mi (sobrino|hijo|primo|cuñad[oa]|amigo|conocido)|ya (lo )?(hace|tengo) (otro|con)|lo hace (mi|alguien)|mas barato (en|por) otro lado|otro (me )?cobra menos|ya tengo (quien|alguien)|un conocido me lo hace/,
  },
  {
    type: "precio_caro",
    re: /\bcaros?\b|\bcarisim[oa]s?\b|\bmuy (caro|costoso|alto)\b|\bcuesta mucho\b|\bdemasiado\b|\bse pasa\b|\bexcede\b|\bmucho dinero\b|\bsale caro\b|\best[aá] (bien )?alto\b/,
  },
  {
    type: "sin_presupuesto",
    re: /no (me )?alcanza|no tengo (presupuesto|dinero|plata|fondos|suficiente)|sin (presupuesto|dinero|plata)|no puedo (pagar|gastar|pagar eso)|no cuento con|apenas (me )?(alcanza|puedo)|se me va|no traigo|no tengo para/,
  },
  {
    type: "no_confio",
    re: /no confi[oa]|desconfi[oa]|me da desconfianza|me da (cosa|miedo)|no conozco|estafa|fraude|no me da seguridad|nunca he trabajado/,
  },
  {
    type: "quiero_pensarlo",
    re: /pensarl[oa]|lo pienso|voy a pensar|me lo pienso|quiero pensarl[oa]|dej[ae]me pensarl[oa]|lo consulto|habl[oa] con (mi|la|el|mis)|reflexionar|meditarl[oa]|verlo con calma/,
  },
  {
    type: "no_me_decido",
    re: /no me decido|estoy indecis[oa]|no estoy (segur[oa]|convencid[oa])|no se (si|que|aun|como|donde)|tengo (muchas )?dudas|aun no decido/,
  },
  {
    // "Avísame luego / te hablo después" → NO es una objeción al precio: es
    // una DIFERIMIENTO. No sube la escalera; se agenda un recordatorio.
    type: "avisame_luego",
    re: /avisa(me)? (luego|despues|mas tarde|en la (noche|tarde|manana))|(luego|despues|mas tarde|en un rato) (te )?(aviso|hablo|escribo)|te (aviso|hablo|escribo) (luego|despues|mas tarde)|en (unos|un par de) (dias|dias mas|momentos)|espera(me)? (un rato|un poco)|deja(me)? (lo )?(pensar|ver) y te (aviso|digo)|me avisas|te digo (despues|luego|mas tarde)|lo (reviso|veo) y te (aviso|digo)|contactame (luego|despues|mas tarde)/,
  },
  {
    type: "pedir_cotizacion",
    re: /cotizaci|cotizame|cotizarme|mand[ae]me? (la )?(cotizaci|propuesta)|envi[ae]me? (la )?(cotizaci|propuesta)|quiero (la |una )?(cotizaci|propuesta)|quiero saber|cuanto (cuesta|vale|es|sale)|cual es el precio|cual seria el precio|dame (el |un )?precio|pas[ae]me (la )?(propuesta|cotizaci)|me interesa|dame mas info|mas informacion|cuanto cobran/,
  },
];

/** Clasifica la respuesta entrante del cliente. */
export function classifyObjection(text: string): ObjectionType {
  const norm = normalizeText(text);
  if (!norm) return "no_me_decido";

  const rechazoFuerte = /no quiero|no me interesa|ya no|no necesito|no me gusta/.test(norm);
  for (const rule of OBJECTION_RULES) {
    if (rule.type === "pedir_cotizacion" && rechazoFuerte) continue;
    if (has(norm, rule.re)) return rule.type;
  }
  return "no_me_decido";
}

// ─── Señales positivas (aceptación / anticipo pagado) ──────────────

const ACCEPTANCE_WORDS = [
  "si", "sipi", "de acuerdo", "me parece bien", "esta bien", "ok", "okay",
  "dale", "adelante", "acepto", "confirmo", "cuenta conmigo", "trato hecho",
  "vamos", "hagamoslo", "arranca", "empieza", "me lanzo", "le entro",
  "perfecto", "excelente",
];

const NEGATION_GUARD = /(^|[^a-z])(no|nunca|jamas|tampoco|para nada)\b/;

/** ¿El cliente acepta la oferta / la propuesta? (conservador: nunca avanza de más). */
export function isAcceptance(text: string): boolean {
  const norm = normalizeText(text);
  if (!norm) return false;
  if (NEGATION_GUARD.test(norm)) return false;
  return ACCEPTANCE_WORDS.some((w) => has(norm, new RegExp(`\\b${w}\\b`)));
}

const PAID_PATTERNS = [
  /ya (lo )?pagu[ée]/, /hice el pago/, /transfer[ií]/, /deposit[ée]/, /ya deposit/,
  /pagad[oa]/, /listo el pago/, /mande (el|mi) (pago|anticipo)/, /pagu[ée] el anticipo/,
  /ya abon[ée]/, /hice la transferencia/, /te mand[ée] el pago/, /confirmo el pago/,
  /ya esta pagado/, /queda(ron)? pagad[oa]s?/,
];

/** ¿El cliente confirma que ya pagó el anticipo? */
export function isAdvancePaid(text: string): boolean {
  const norm = normalizeText(text);
  if (!norm) return false;
  return PAID_PATTERNS.some((re) => has(norm, re));
}

// ─── Señales de "habla con un humano" (queja / reclamo / frustración) ──

const HUMAN_MODE_PATTERNS = [
  /con (un|una|el|la) (humano|asesor|persona|agente|representante)/,
  /habla(r)? (con|me) (un|una|con el|con la) (humano|asesor|persona|agente)/,
  /quiero hablar con alguien/,
  /no quiero (hablar|tratar|seguir) con (un )?(bot|robot|maquina|chatbot)/,
  /no me gusta hablar con (un )?(bot|robot|maquina)/,
  /queja|reclamo|estoy molesto|estoy enojad[oa]|me siento (estafad[oa]|engañad[oa]|defraudad[oa])/,
  /quiero quejarme|esto es (una estafa|un fraude)|me est[áa]n (estafando|timando)/,
  /dame (tu|su) (número|telefono|celular)/,
  /ll[aá]mame|ll[aá]mame (por telefono|porfavor|por favor)/,
  /habla(r)? (con|a) (tu|su|el|la) (jefe|dueño|dueña|supervisor|gerente)/,
  /quiero hablar con el (dueño|dueña|jefe|supervisor|gerente)/,
];

/**
 * ¿El cliente quiere un humano (queja, reclamo, frustración)? Si sí, el
 * worker pasa la conversación a modo humano y avisa al dueño (regla 5).
 */
export function isHumanModeRequest(text: string): boolean {
  const norm = normalizeText(text);
  if (!norm) return false;
  return HUMAN_MODE_PATTERNS.some((re) => has(norm, re));
}

// ─── Decisión de máquina (estado + táctica) ────────────────────────

export interface DecideNextInput {
  estado: LeadStatus;
  objecion: ObjectionType | null;
  nivel: number;
  acceptance: boolean;
  paid: boolean;
  cfg?: ClosingConfig;
}

export interface DecideNextOutput {
  estado: LeadStatus;
  tactic: TacticType | null;
  nivel: number;
}

/**
 * La MÁQUINA decide el siguiente estado y la táctica (el LLM no opina).
 * - Objeción → se abre/continúa la negociación y sube la escalera.
 * - Aceptación → se pide el anticipo (o se confirma si ya se pidió).
 * - Pago confirmado → anticipo_pagado → cliente.
 * - Pedir cotización → avanza hacia cotizado (reentrega la propuesta).
 */
export function decideNext(inp: DecideNextInput): DecideNextOutput {
  const { estado, objecion, nivel } = inp;

  if (inp.paid) {
    return { estado: "anticipo_pagado", tactic: null, nivel };
  }

  switch (estado) {
    case "interested":
    case "cotizando": {
      if (inp.acceptance || objecion === "pedir_cotizacion") {
        return { estado: estado === "interested" ? "cotizando" : "cotizado", tactic: null, nivel };
      }
      // Sin señal clara aún: seguimos armando y entregamos la cotización.
      return { estado: estado === "interested" ? "cotizando" : "cotizado", tactic: null, nivel };
    }

    case "cotizado": {
      if (inp.acceptance) {
        return { estado: "anticipo_solicitado", tactic: null, nivel };
      }
      if (objecion === "pedir_cotizacion") {
        return { estado: "cotizado", tactic: null, nivel }; // reentrega la propuesta
      }
      if (objecion === "avisame_luego") {
        return { estado: "cotizado", tactic: null, nivel }; // difiere: recordatorio
      }
      const lvl = Math.max(1, initialLevelForObjection(objecion));
      return { estado: "negociando", tactic: tacticForLevel(lvl), nivel: lvl };
    }

    case "negociando": {
      if (inp.acceptance) {
        return { estado: "anticipo_solicitado", tactic: null, nivel };
      }
      if (objecion === "pedir_cotizacion") {
        return { estado: "cotizado", tactic: null, nivel };
      }
      if (objecion === "avisame_luego") {
        return { estado: "negociando", tactic: null, nivel }; // no sube la escalera
      }
      const next = Math.min(nivel + 1, getClosingConfig().tacticas_max);
      return { estado: "negociando", tactic: tacticForLevel(next), nivel: next };
    }

    case "anticipo_solicitado": {
      if (inp.acceptance) {
        return { estado: "anticipo_solicitado", tactic: null, nivel }; // re-confirma el anticipo
      }
      if (objecion === "avisame_luego") {
        return { estado: "anticipo_solicitado", tactic: null, nivel }; // recordatorio
      }
      // Rechazo del anticipo → vuelve a negociar (sube la escalera).
      const next = Math.min(nivel + 1, getClosingConfig().tacticas_max);
      return { estado: "negociando", tactic: tacticForLevel(next), nivel: next };
    }

    case "anticipo_pagado":
      return { estado: "client", tactic: null, nivel };

    default:
      return { estado, tactic: null, nivel };
  }
}

// ─── Mensajes deterministas (fallback, 0 tokens) ───────────────────

export interface NegotiationDraftInput {
  /** Para registrar el consumo de tokens por lead (llm_usage). */
  leadId?: string;
  leadName: string;
  giro: string;
  categoria: string;
  estado: LeadStatus;
  objecion: ObjectionType | null;
  tactic: TacticType | null;
  offer: Offer;
  historial_resumido: string;
}

function resumeHistorial(historial: string[]): string {
  const recientes = historial.slice(-6);
  return recientes.join(" · ").slice(0, 600) || "(conversación nueva)";
}

/**
 * Plantilla determinista por (estado, táctica). Voz de consultor senior.
 * Las cifras SIEMPRE vienen de la oferta (la máquina), nunca del LLM.
 */
export function fallbackMessage(
  estado: LeadStatus,
  offer: Offer,
  ctx: NegotiationDraftInput
): string {
  const total = formatPesos(offer.total_actual);
  const cuota = formatPesos(Math.round(offer.total_actual / offer.plan_activo));
  const anticipo = formatPesos(Math.round(offer.total_actual / 2));
  const meses = offer.plan_activo;
  const ajuste = formatPesos(offer.descuento_acumulado);
  const nombre = ctx.leadName || "amigo";

  // "Avísame luego / te hablo después": mensaje de diferimiento (NO una
  // objeción al precio). La máquina agenda un recordatorio aparte.
  if (ctx.objecion === "avisame_luego") {
    return `${nombre}, sin problema. Tómate tu tiempo y cuando estés listo me avisas: te aparto tu lugar para que no se pierda el espacio. Si quieres, en unos días te recuerdo.`;
  }

  switch (estado) {
    case "cotizando":
      return `Perfecto ${nombre}, en unos minutos te tengo la cotización a la medida. Déjame afinar los últimos detalles y te la paso.`;
    case "cotizado":
      return `${nombre}, aquí está tu propuesta lista. El total es ${total} (IVA incluido), con ${meses} meses a ${cuota}/mes si lo prefieres. Revisa con calma y dime si le entramos.`;
    case "anticipo_solicitado":
      return `¡Me da mucho gusto, ${nombre}! Para apartar tu lugar y arrancar de inmediato solo necesito el 50% de anticipo: ${anticipo}. El resto lo liquidas al entregar tu web. ¿Te parece bien?`;
    case "anticipo_pagado":
      return `¡Recibido el anticipo, ${nombre}! Con eso arranco hoy mismo. En los próximos días vas viendo tu proyecto avanzar, y quedamos en comunicación.`;
    case "client":
      return `¡Bienvenido ${nombre}! Ya eres parte del equipo. Vamos a hacer algo que te dé orgullo.`;
    case "blacklist":
      return `Entendido, ${nombre}. No te vuelvo a molestar. Si algún día lo necesitas, aquí estoy.`;
    case "negociando":
      return negotiationFallback(offer, ctx);
    default:
      return `${nombre}, te voy a ayudar con eso. ¿Me cuentas qué te preocupa para encontrar la mejor forma de hacerlo?`;
  }
}

function negotiationFallback(offer: Offer, ctx: NegotiationDraftInput): string {
  const total = formatPesos(offer.total_actual);
  const cuota = formatPesos(Math.round(offer.total_actual / offer.plan_activo));
  const meses = offer.plan_activo;
  const ajuste = formatPesos(offer.descuento_acumulado);
  const nombre = ctx.leadName || "amigo";

  switch (ctx.tactic) {
    case "descuento":
      if (offer.descuento_acumulado <= 0) {
        return `Entiendo tu punto, ${nombre}. Es el mejor precio que puedo dejarte con la misma calidad: ${total}. Si me dices qué te preocupa, buscamos cómo acomodarlo.`;
      }
      return `Por esta ocasión y porque veo que el proyecto es bueno, te lo dejo con un ajuste de ${ajuste}: el total queda en ${total}, con la misma calidad. Es lo más que puedo bajar sin afectar el resultado.`;
    case "meses":
      return `Para que no te pegue tan fuerte, lo repartimos en ${meses} meses: te queda en ${cuota}/mes. Así arrancamos hoy y el pago se te hace fácil.`;
    case "quitar_servicios":
      return `Te propongo quitar lo que no es indispensable para que baje el total a ${total}. Te quedas con lo esencial para que tu página funcione y te genere clientes.`;
    case "ultima_oferta":
      return `Esta es mi última oferta, ${nombre}: ${total}, en ${meses} meses a ${cuota}/mes, con todo lo esencial incluido. Es lo mínimo con lo que puedo trabajar sin bajar la calidad. Si te funciona, lo apartamos hoy con el 50% de anticipo.`;
    case "reframe":
    default:
      return `Entiendo tu punto, ${nombre}. Míralo así: cada mes sin tu página es un cliente que no te encuentra. No es un gasto, es lo que te cuesta no tenerlo. Y trabajas con 15 días de garantía y 2 rondas de revisión incluidas, sin sorpresas.`;
  }
}

// ─── Chain LLM (DeepSeek) — solo redacta texto ─────────────────────

const NEGOTIATION_PARSER = StructuredOutputParser.fromZodSchema(
  z.object({
    message: z.string(),
    tactic: z.enum([
      "reframe",
      "descuento",
      "meses",
      "quitar_servicios",
      "ultima_oferta",
    ]),
  })
);

export interface DraftOutput {
  message: string;
  tactic: TacticType;
}

/** Parsea la salida JSON con el parser estructurado (nunca validación manual). */
export async function parseDraftOutput(raw: string): Promise<DraftOutput | null> {
  try {
    const parsed = await NEGOTIATION_PARSER.parse(raw);
    const tactic = parsed.tactic as TacticType;
    const valid = [
      "reframe",
      "descuento",
      "meses",
      "quitar_servicios",
      "ultima_oferta",
    ].includes(tactic);
    if (!valid) return null;
    const message = String(parsed.message ?? "").trim();
    if (!message) return null;
    return { message, tactic };
  } catch {
    return null;
  }
}

// Few-shot: 3 ejemplos estáticos que alinean el tono. La táctica SIEMPRE la
// decide la máquina; el LLM solo redacta acorde a ella.
const NEGOTIATION_EXAMPLES = [
  {
    objecion: "precio_caro",
    tactic: "reframe",
    mensaje:
      "Entiendo, la inversión se ve grande de golpe. Pero piénsalo así: cada mes sin tu página es un cliente que no te encuentra. Y con 15 días de garantía y 2 rondas de revisión incluidas, no arriesgas nada.",
  },
  {
    objecion: "sin_presupuesto",
    tactic: "meses",
    mensaje:
      "Para que no te pegue tan fuerte, lo repartimos en más meses: te queda una cuota muy cómoda al mes. Así arrancamos hoy y no descuadras tu flujo.",
  },
  {
    objecion: "lo_hace_otro",
    tactic: "quitar_servicios",
    mensaje:
      "Entiendo que te ofrezcan menos. Lo que propongo es quitarte lo que no es indispensable para que baje el total, quedándote solo con lo esencial que te trae clientes.",
  },
];

const EXAMPLE_PROMPT = new PromptTemplate({
  template:
    "Objeción: {objecion}\n" +
    "Táctica (YA decidida por la máquina, aplícala tal cual): {tactic}\n" +
    "Mensaje de ejemplo: {mensaje}",
  inputVariables: ["objecion", "tactic", "mensaje"],
});

const NEGOTIATION_PREFIX =
  `[PROMPT v${NEGOTIATION_PROMPT_VERSION} — no cambies esta versión]\n` +
  "Eres un consultor senior de desarrollo web en México con 15 años cerrando proyectos. " +
  "Tu ÚNICA tarea es redactar el mensaje que el consultor le envía al cliente que está NEGOCIANDO el precio de su página web.\n" +
  "La MÁQUINA ya decidió la táctica y el estado del cliente. Tú SOLO redactas el texto persuasivo alineado a esa táctica; NO decides ni cambias la táctica.\n\n" +
  "REGLAS DE ORO (NO VIOLAR):\n" +
  "- NO inventes, prometas ni menciones cifras, precios, descuentos ni cuotas mensuales. La cifra exacta la agrega el sistema automáticamente.\n" +
  "- NUNCA ofrezcas descuentos ni bajes de lo que la máquina decidió.\n" +
  "- NO prometas fechas de entrega ni plazos.\n" +
  "- Aplica SOLO la táctica que te pasan; una táctica por mensaje.\n" +
  "- Tono: consultor con experiencia, honesto, empático, en español de México, sin tecnicismos. Máximo 2 emojis. Máximo 50 palabras.\n" +
  "- Escribe solo el mensaje: sin comillas, sin títulos, sin explicaciones.";

const NEGOTIATION_SUFFIX =
  "DATOS DEL CLIENTE (contexto compacto):\n" +
  "{contexto}\n\n" +
  "TÁCTICA YA DECIDIDA POR LA MÁQUINA (aplícala, no la cambies): {tactic}\n\n" +
  "Instrucción extra (si viene, corríge el JSON): {retry}\n\n" +
  "Escribe el mensaje del consultor:\n" +
  "{format_instructions}";

const negotiationPrompt = new FewShotPromptTemplate({
  examples: NEGOTIATION_EXAMPLES,
  examplePrompt: EXAMPLE_PROMPT,
  prefix: NEGOTIATION_PREFIX,
  suffix: NEGOTIATION_SUFFIX,
  exampleSeparator: "\n\n",
  inputVariables: ["contexto", "tactic", "retry", "format_instructions"],
});

// DeepSeek: temp 0.7, max_tokens 200, baseURL leído en TIEMPO DE LLAMADA.
function buildNegotiationModel(): ChatOpenAI {
  return new ChatOpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY ?? "missing",
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    configuration: {
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    },
    temperature: 0.7,
    maxTokens: 200,
  });
}

let chainInstance: ReturnType<typeof buildNegotiationChain> | undefined;

/** Builder memoizado (const de módulo leería el env viejo → 401). */
export function getNegotiationChain(): ReturnType<typeof buildNegotiationChain> {
  if (!chainInstance) chainInstance = buildNegotiationChain();
  return chainInstance;
}

function buildNegotiationChain() {
  return negotiationPrompt.pipe(buildNegotiationModel()).pipe(NEGOTIATION_PARSER);
}

// ─── Invocación directa del modelo (para auditar tokens) ──────────

export interface NegotiationModelResult {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface NegotiationModelVars {
  contexto: string;
  tactic: TacticType;
  retry: string;
  format_instructions: string;
}

/** Inyectable en tests: mock del modelo real (0 HTTP) para capturar usage. */
export type NegotiationModelInvoker = (
  vars: NegotiationModelVars
) => Promise<NegotiationModelResult>;

export function getLlmModelName(): string {
  return process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
}

/**
 * Invoca el modelo DeepSeek directamente (sin pipe al parser) para poder
 * leer `usage_metadata` (tokens de entrada/salida) y medir los ms. El
 * contenido se parsea después con `parseDraftOutput` (nunca validación
 * manual). Prompt formateado a mano: el parser estructurado se aplica sobre
 * el texto de salida, no en el pipe.
 */
async function invokeNegotiationModel(
  vars: NegotiationModelVars
): Promise<NegotiationModelResult> {
  const model = buildNegotiationModel();
  const formatted = await negotiationPrompt.format(vars);
  const aiMsg = await model.invoke(formatted);
  const usage = (aiMsg as AIMessage).usage_metadata as
    | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    | undefined;
  const content =
    typeof aiMsg.content === "string"
      ? aiMsg.content
      : Array.isArray(aiMsg.content)
        ? aiMsg.content
            .map((c) => (typeof c === "string" ? c : (c as { text?: string }).text ?? ""))
            .join("")
        : String(aiMsg.content ?? "");
  const promptTokens = usage?.prompt_tokens ?? 0;
  const completionTokens = usage?.completion_tokens ?? 0;
  return {
    content,
    model: getLlmModelName(),
    usage: {
      promptTokens,
      completionTokens,
      totalTokens:
        usage?.total_tokens ?? (promptTokens + completionTokens || 0),
    },
  };
}

// ─── Memoización por (categoría + táctica) ─────────────────────────

interface CachedDraft {
  name: string;
  message: string;
}

const DRAFT_CACHE_MAX = 100;
const draftCache = new Map<string, CachedDraft>();

export function draftCacheKey(categoria: string, tactic: TacticType): string {
  return `${categoria}|${tactic}`;
}

export function getCachedDraft(key: string): CachedDraft | undefined {
  return draftCache.get(key);
}

export function setCachedDraft(key: string, name: string, message: string): void {
  if (draftCache.size >= DRAFT_CACHE_MAX && !draftCache.has(key)) {
    const oldest = draftCache.keys().next().value;
    if (oldest !== undefined) draftCache.delete(oldest);
  }
  draftCache.set(key, { name, message });
}

export function clearDraftCache(): void {
  draftCache.clear();
}

// ─── Circuit breaker (patrón lib/chat-llm.ts) ──────────────────────

let consecutiveFailures = 0;
const OPEN_THRESHOLD = 2;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 min determinista
let openedAt = 0;

function isNegotiationCircuitOpen(): boolean {
  if (openedAt === 0) return false;
  if (Date.now() - openedAt < COOLDOWN_MS) return true;
  openedAt = 0;
  consecutiveFailures = 0;
  return false;
}

function reportNegotiationSuccess(): void {
  consecutiveFailures = 0;
  openedAt = 0;
}

function reportNegotiationFailure(): void {
  consecutiveFailures += 1;
  if (consecutiveFailures >= OPEN_THRESHOLD && openedAt === 0) {
    openedAt = Date.now();
  }
}

// ─── Draft con LLM (con timeout 9s + retry de parseo) ──────────────

const TIMEOUT_MS = 9000;
const NUMERIC_TACTICS: TacticType[] = [
  "descuento",
  "meses",
  "quitar_servicios",
  "ultima_oferta",
];

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function cleanDraft(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^```(?:text|json)?\s*/i, "").replace(/```$/i, "").trim();
  t = t.replace(/^["'“”]+/, "").replace(/["'“”]+$/, "").trim();
  t = t.replace(/\s+/g, " ").trim();
  if (t.length < 8 || t.length > 400) return "";
  return t;
}

function appendOfferLine(message: string, offer: Offer, tactic: TacticType): string {
  if (!NUMERIC_TACTICS.includes(tactic)) return message;
  return `${message}\n\n${offerLine(offer)}`;
}

/** Contexto compacto (≤600 tokens aprox., cap 2000 chars). */
export function buildCompactContext(input: NegotiationDraftInput): string {
  const obj = {
    giro: input.giro,
    categoria: input.categoria,
    total: input.offer.total_actual,
    plan: input.offer.plan_activo,
    estado: input.estado,
    objecion: input.objecion,
    historial_resumido: input.historial_resumido,
  };
  const s = JSON.stringify(obj);
  return s.length > 2000 ? s.slice(0, 2000) : s;
}

/**
 * Redacta el mensaje de la táctica con DeepSeek. La máquina pasa la táctica
 * YA decidida. Memoiza por (categoría+táctica) y reutiliza con replaceAll del
 * nombre del lead. Devuelve null si no hay key, falla, parsea mal (tras 1
 * reintento), el circuit breaker está abierto o se superó el presupuesto
 * diario de tokens → el caller usa fallbackMessage (determinista, 0 LLM).
 *
 * AUDITORÍA DE TOKENS: cada llamada real se mide (ms) y se reporta vía
 * `onUsage` con modelo + tokens de entrada/salida (para `llm_usage`).
 */
async function draftWithLlm(
  input: NegotiationDraftInput,
  opts: {
    modelInvoke?: NegotiationModelInvoker;
    onUsage?: (record: LlmUsageRecord) => void;
  } = {}
): Promise<string | null> {
  const tactic = input.tactic;
  if (!tactic) return null;

  const key = draftCacheKey(input.categoria, tactic);
  const cached = getCachedDraft(key);
  if (cached) {
    return appendOfferLine(
      cached.message.replaceAll(cached.name, input.leadName),
      input.offer,
      tactic
    );
  }

  if (!process.env.DEEPSEEK_API_KEY) return null;
  if (isNegotiationCircuitOpen()) return null;
  // Guardrail de presupuesto diario de tokens (config.ts LLM_DAILY_TOKEN_BUDGET):
  // al superarlo, el closer cae 100% al mensaje determinista.
  if ((await getDailyLlmTokens()) >= getLlmDailyTokenBudget()) {
    console.warn(
      `[negotiation] presupuesto LLM diario superado (${await getDailyLlmTokens()} tokens) → fallback determinista`
    );
    return null;
  }

  const vars = {
    contexto: buildCompactContext(input),
    tactic,
    retry: "",
    format_instructions: NEGOTIATION_PARSER.getFormatInstructions(),
  };
  const invoke = opts.modelInvoke ?? invokeNegotiationModel;

  let result: NegotiationModelResult;
  const start = Date.now();
  try {
    result = await withTimeout(invoke(vars), TIMEOUT_MS);
  } catch (err) {
    // 1 reintento con el error del parser, luego fallback.
    const parserError = err instanceof Error ? err.message : String(err);
    try {
      result = await withTimeout(
        invoke({ ...vars, retry: `Corrige el JSON: ${parserError.slice(0, 300)}` }),
        TIMEOUT_MS
      );
    } catch (err2) {
      console.warn(`[negotiation] LLM falló → fallback: ${(err2 as Error).message}`);
      reportNegotiationFailure();
      return null;
    }
  }
  const ms = Date.now() - start;

  const parsed = await parseDraftOutput(result.content);
  if (!parsed) {
    reportNegotiationFailure();
    return null;
  }

  // La máquina es autoridad sobre la táctica: si el LLM se desvía, se ignora.
  if (parsed.tactic !== tactic) {
    console.warn(`[negotiation] táctica LLM (${parsed.tactic}) ≠ máquina (${tactic}); se usa la de la máquina`);
  }

  const message = cleanDraft(String(parsed.message ?? ""));
  if (!message) {
    reportNegotiationFailure();
    return null;
  }

  setCachedDraft(key, input.leadName, message);
  reportNegotiationSuccess();

  // Auditoría de la llamada: modelo + tokens + ms por mensaje (llm_usage).
  const promptTokens = result.usage?.promptTokens ?? 0;
  const completionTokens = result.usage?.completionTokens ?? 0;
  opts.onUsage?.({
    leadId: input.leadId ?? "desconocido",
    modelo: result.model,
    promptTokens,
    completionTokens,
    totalTokens: result.usage?.totalTokens ?? (promptTokens + completionTokens || 0),
    ms,
    tactic,
    cacheHit: false,
  });

  return appendOfferLine(message, input.offer, tactic);
}

// ─── Orquestador ───────────────────────────────────────────────────

export interface AuditEntry {
  leadId: string;
  fecha: string;
  estado: LeadStatus;
  objecion: ObjectionType | null;
  tactic: TacticType | null;
  nivel: number;
  cambios: string[];
  total: number;
  mensaje: string;
}

/** Auditoría de consumo LLM por mensaje (llm_usage). */
export interface LlmUsageRecord {
  leadId: string;
  modelo: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** ms que tardó la llamada (solo ruta real; 0 si es draft inyectado). */
  ms: number;
  tactic: TacticType | null;
  /** true → se sirvió del caché de plantillas (0 tokens). */
  cacheHit: boolean;
}

export interface NegotiateReplyOpts {
  leadId: string;
  leadName: string;
  giro: string;
  categoria: string;
  estado: LeadStatus;
  offer: Offer;
  input: string;
  /** Nivel actual de la escalera (default 1). */
  nivel?: number;
  /** Resumen de los últimos mensajes del cliente (compacto). */
  historial?: string[];
  /**
   * Inyectable para pruebas (mock a nivel de función, 0 HTTP).
   * Devuelve el mensaje completo, o null para usar fallbackMessage.
   */
  draft?: (input: NegotiationDraftInput) => Promise<string | null>;
  /**
   * Inyectable (tests): mock del modelo real para capturar usage sin HTTP.
   * Devuelve el contenido crudo + tokens. Default = invokeNegotiationModel.
   */
  modelInvoke?: NegotiationModelInvoker;
  onAudit?: (entry: AuditEntry) => void;
  /**
   * Se dispara cada vez que el mensaje se redactó con LLM (ruta real con
   * tokens/ms reales, o draft inyectado con 0). El handler lo enruta a
   * `llm_usage` para la métrica "tokens por lead".
   */
  onUsage?: (record: LlmUsageRecord) => void;
}

export interface NegotiationOutcome {
  estado: LeadStatus;
  tactic: TacticType | null;
  nivel: number;
  offer: Offer;
  message: string;
  changes: string[];
  usedLlm: boolean;
  /** Objeción clasificada del input del cliente (para recordatorios/human mode). */
  objecion: ObjectionType | null;
}

function buildDraftInput(
  opts: NegotiateReplyOpts,
  estado: LeadStatus,
  objecion: ObjectionType | null,
  tactic: TacticType | null,
  offer: Offer,
  historial: string[]
): NegotiationDraftInput {
  return {
    leadId: opts.leadId,
    leadName: opts.leadName,
    giro: opts.giro,
    categoria: opts.categoria,
    estado,
    objecion,
    tactic,
    offer,
    historial_resumido: resumeHistorial(historial),
  };
}

/**
 * Procesa la respuesta del cliente durante el cierre.
 * La máquina decide estado y táctica; el LLM (si aplica) solo redacta.
 */
export async function negotiateReply(
  opts: NegotiateReplyOpts
): Promise<NegotiationOutcome> {
  const { input, leadId, estado, offer, onAudit } = opts;
  const cfg = getClosingConfig();
  const norm = normalizeText(input);

  // Rechazo duro → blacklist (anti-ban, terminal).
  if (norm && getAntiBanConfig().blacklist_keywords.some((k) => norm.includes(normalizeText(k)))) {
    const ctx = buildDraftInput(opts, "blacklist", null, null, offer, opts.historial ?? []);
    const message = fallbackMessage("blacklist", offer, ctx);
    onAudit?.({
      leadId,
      fecha: new Date().toISOString(),
      estado: "blacklist",
      objecion: null,
      tactic: null,
      nivel: 0,
      cambios: [],
      total: offer.total_actual,
      mensaje: message,
    });
    return {
      estado: "blacklist",
      tactic: null,
      nivel: 0,
      offer,
      message,
      changes: [],
      usedLlm: false,
      objecion: null,
    };
  }

  const obj = classifyObjection(input);
  const acceptance = isAcceptance(input);
  const paid = isAdvancePaid(input);
  const decision = decideNext({
    estado,
    objecion: obj,
    nivel: opts.nivel ?? 1,
    acceptance,
    paid,
    cfg,
  });

  // Aplicar la táctica decidida (si la hay). Una táctica por mensaje.
  let newOffer = offer;
  let changes: string[] = [];
  let draftTactic: TacticType | null = null;
  if (decision.tactic) {
    const outcome = applyTactic(offer, decision.tactic, cfg);
    newOffer = outcome.offer;
    changes = outcome.changes;
    // Si una táctica numérica no pudo aplicarse (piso alcanzado), el mensaje
    // no debe prometer descuentos/plazos que no ocurrieron → se reencuadra.
    const claimable =
      decision.tactic === "reframe" ||
      decision.tactic === "ultima_oferta" ||
      outcome.applied;
    draftTactic = claimable ? decision.tactic : "reframe";
  }

  const draftInput = buildDraftInput(
    opts,
    decision.estado,
    obj,
    draftTactic,
    newOffer,
    opts.historial ?? []
  );

  let message: string | null = null;
  let usedLlm = false;
  if (draftTactic) {
    if (opts.draft) {
      // Test double (0 HTTP): simula la redacción LLM. Se audita con tokens 0
      // (no se puede medir el consumo real de un mock), solo para el wiring.
      const start = Date.now();
      message = await opts.draft(draftInput);
      if (message) {
        opts.onUsage?.({
          leadId,
          modelo: getLlmModelName(),
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          ms: Date.now() - start,
          tactic: draftTactic,
          cacheHit: false,
        });
      }
    } else {
      message = await draftWithLlm(draftInput, {
        modelInvoke: opts.modelInvoke,
        onUsage: opts.onUsage,
      });
    }
    usedLlm = message !== null;
  }
  if (!message) {
    message = fallbackMessage(decision.estado, newOffer, draftInput);
  }

  onAudit?.({
    leadId,
    fecha: new Date().toISOString(),
    estado: decision.estado,
    objecion: obj,
    tactic: decision.tactic,
    nivel: decision.nivel,
    cambios: changes,
    total: newOffer.total_actual,
    mensaje: message,
  });

  return {
    estado: decision.estado,
    tactic: decision.tactic,
    nivel: decision.nivel,
    offer: newOffer,
    message,
    changes,
    usedLlm,
    objecion: obj,
  };
}
