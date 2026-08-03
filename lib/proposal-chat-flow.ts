/**
 * FASE 1 · ESQUEMA DEL CHATBOT DE DIAGNÓSTICO
 *
 * Define las preguntas obligatorias que el asistente hace al cliente ANTES
 * de generar la propuesta, con su validación de formato y el mapeo hacia
 * `ClientData` / la lógica de precios de `lib/quote-engine.ts`.
 *
 * Este esquema es la fuente de verdad para construir la entrevista.
 * (La app ya cuenta con un flujo conversacional natural en
 * `lib/conversation-flow.ts`; aquí está la versión estructurada y
 * validada que alimenta la cotización.)
 */

import type { ClientData, PresupuestoRango, TipoWeb } from "@/lib/quote-engine";
import { TELEFONO_REGEX } from "@/lib/quote-engine";

export type QuestionType = "text" | "select" | "boolean";

export interface ProposalQuestion {
  id: keyof ClientData;
  label: string;
  /** Ayuda / placeholder que se muestra al cliente */
  hint?: string;
  type: QuestionType;
  /** Obligatoria (bloquea la generación de la propuesta si falta) */
  required: boolean;
  /** Validación de formato para textos */
  validation?: RegExp;
  /** Validación para select / boolean */
  choices?: { label: string; value: string }[];
  /** Mensaje de error si la validación falla */
  errorMessage?: string;
}

export const PROPOSAL_CHAT_FLOW: ProposalQuestion[] = [
  {
    id: "nombre",
    label: "Nombre completo del cliente y giro del negocio",
    hint: "Ej: 'Laura Gómez, consultorio dental'",
    type: "text",
    required: true,
    validation: /^\s*\S.+/,
    errorMessage: "Cuéntame tu nombre (o el del negocio) y a qué te dedicas.",
  },
  {
    id: "telefono",
    label: "Teléfono / WhatsApp",
    hint: "Solo números, 10 a 12 dígitos (puede incluir +)",
    type: "text",
    required: true,
    validation: TELEFONO_REGEX,
    errorMessage: "Ese número no parece válido. Usa 10 a 12 dígitos, por ejemplo: 8341234567.",
  },
  {
    id: "ubicacion",
    label: "Ubicación física (ciudad / zona)",
    hint: "Ej: 'Madero, Tamaulipas'",
    type: "text",
    required: false,
    validation: /^\s*\S.+/,
  },
  {
    id: "tipoWeb",
    label: "Tipo de web requerida",
    type: "select",
    required: true,
    choices: [
      { label: "Landing page (1-3 secciones)", value: "landing" },
      { label: "Sitio corporativo (4-6 páginas)", value: "corporativo" },
      { label: "Web con agenda / citas (calendario)", value: "agenda" },
    ],
    errorMessage: "Elige una de las tres opciones de web.",
  },
  {
    id: "dominioHosting",
    label: "¿Necesita dominio + hosting?",
    type: "boolean",
    required: true,
    choices: [
      { label: "Sí, inclúyelo", value: "true" },
      { label: "No, ya lo tengo", value: "false" },
    ],
  },
  {
    id: "branding",
    label: "¿Necesita branding (logo / colores)?",
    type: "boolean",
    required: true,
    choices: [
      { label: "Sí, quiero logo y colores", value: "true" },
      { label: "No, ya tengo mi marca", value: "false" },
    ],
  },
  {
    id: "presupuesto",
    label: "Presupuesto aproximado",
    type: "select",
    required: false,
    choices: [
      { label: "Menos de $10,000 MXN", value: "<10k" },
      { label: "Entre $10,000 y $25,000 MXN", value: "10-25k" },
      { label: "Más de $25,000 MXN", value: ">25k" },
    ],
  },
];

// ─── Helpers de validación ─────────────────────────────────────────

/** Valida una respuesta contra una pregunta; devuelve true si es válida. */
export function validarRespuesta(question: ProposalQuestion, respuesta: string): boolean {
  const t = respuesta.trim();
  if (question.type === "boolean") {
    return t === "true" || t === "false";
  }
  if (question.type === "select") {
    return Boolean(question.choices?.some((c) => c.value === t));
  }
  // text
  if (question.required && !t) return false;
  return question.validation ? question.validation.test(t) : true;
}

/** Traduce la respuesta a un valor parcial de ClientData. */
export function respuestaToClientData(
  question: ProposalQuestion,
  respuesta: string
): Partial<ClientData> {
  const t = respuesta.trim();
  if (question.type === "boolean") {
    return { [question.id]: t === "true" } as Partial<ClientData>;
  }
  if (question.type === "select") {
    if (question.id === "tipoWeb") return { tipoWeb: t as TipoWeb };
    if (question.id === "presupuesto") return { presupuesto: t as PresupuestoRango };
  }
  return { [question.id]: t } as Partial<ClientData>;
}
