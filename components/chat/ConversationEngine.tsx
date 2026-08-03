"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useChatStore } from "@/lib/chat-store";

/**
 * Enciende la conversación al montar el chat (saludo inicial del bot).
 * Es idempotente: el store evita arrancar dos veces (StrictMode).
 */
export function ConversationEngine({ children }: { children: ReactNode }) {
  const startConversation = useChatStore((s) => s.startConversation);

  useEffect(() => {
    startConversation();
  }, [startConversation]);

  return <>{children}</>;
}
