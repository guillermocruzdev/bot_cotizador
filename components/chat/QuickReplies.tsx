"use client";

import { motion } from "framer-motion";
import { quickRepliesFor } from "@/lib/conversation-flow";
import { useChatStore } from "@/lib/chat-store";

/**
 * Quick replies (CxD): sugerencias tap-ables del nodo actual.
 *
 * Reducen la fricción de teclear en decisiones sí/no/estilo/estructura sin
 * convertir la charla en formulario: en nodos sensibles (presupuesto,
 * contacto) no hay chips, se deja texto libre. Al tocar un chip se envía
 * su valor como si el cliente lo hubiera escrito → la máquina de estados
 * determinista lo procesa igual (0 cambios en el flujo).
 */
export function QuickReplies() {
  const nodeId = useChatStore((s) => s.currentNodeId);
  const context = useChatStore((s) => s.context);
  const isTyping = useChatStore((s) => s.isTyping);
  const isAnalyzing = useChatStore((s) => s.isAnalyzing);
  const send = useChatStore((s) => s.sendUserMessage);

  // Mientras el bot "escribe" o analiza, no mostramos sugerencias.
  if (isTyping || isAnalyzing) return null;

  const replies = quickRepliesFor(nodeId, context);
  if (!replies.length) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-2 px-4 pb-2">
      {replies.map((r) => (
        <motion.button
          key={r.value}
          type="button"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => send(r.value)}
          className="rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-[13px] font-medium text-primary transition hover:bg-primary/10 active:scale-95"
        >
          {r.label}
        </motion.button>
      ))}
    </div>
  );
}
