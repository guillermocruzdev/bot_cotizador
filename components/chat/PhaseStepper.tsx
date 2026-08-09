"use client";

import { PHASES, getPhase } from "@/lib/conversation-flow";
import { useChatStore } from "@/lib/chat-store";

/**
 * Stepper de fases (UX/CxD): orienta al cliente sobre en qué etapa de la
 * entrevista va, SIN prometer un número de preguntas (el flujo es un grafo
 * con saltos, así que un conteo sería falso y frustrante).
 *
 * 5 segmentos: Negocio → Alcance → Presupuesto → Contacto → Propuesta.
 * Al llegar al análisis, la última fase ("Propuesta") queda activa.
 */
export function PhaseStepper() {
  const nodeId = useChatStore((s) => s.currentNodeId);
  const isAnalyzing = useChatStore((s) => s.isAnalyzing);
  const phase = isAnalyzing ? PHASES.length - 1 : getPhase(nodeId);

  return (
    <div className="border-b bg-white/60 px-4 py-1.5 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-start gap-2">
        {PHASES.map((p, i) => {
          const active = i <= phase;
          return (
            <div key={p.id} className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div
                className={`h-1 w-full rounded-full transition-colors ${
                  active ? "bg-primary" : "bg-gray-200"
                }`}
              />
              <span
                className={`truncate text-[10px] leading-tight ${
                  active ? "font-medium text-primary" : "text-gray-400"
                }`}
              >
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
