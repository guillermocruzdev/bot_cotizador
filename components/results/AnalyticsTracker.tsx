"use client";

import { useEffect } from "react";
import { completeSession, startAnalyticsSession } from "@/lib/chat-analytics";
import { readPersistedResult } from "@/lib/chat-store";

/**
 * Tracker de conversión (UX analytics) montado en /results.
 * Al llegar la propuesta, marca la sesión del chat como completada con el
 * resultado (categoría, nivel, precio) — sin bloquear nada de la UI.
 */
export function AnalyticsTracker() {
  useEffect(() => {
    try {
      const persisted = readPersistedResult();
      const result = persisted?.result;
      startAnalyticsSession();
      completeSession({
        category: result?.categoria ?? null,
        nivel: result?.nivel ?? null,
        precio: result?.precio_min ?? null,
      });
    } catch {
      /* la analítica nunca debe romper la pantalla de resultados */
    }
  }, []);

  return null;
}
