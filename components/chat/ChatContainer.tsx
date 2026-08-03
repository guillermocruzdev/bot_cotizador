"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BOT_NAME,
  useChatStore,
  useMessages,
  useTyping,
} from "@/lib/chat-store";
import { BotAvatar } from "./BotAvatar";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { ConversationEngine } from "./ConversationEngine";
import { TypingIndicator } from "./TypingIndicator";

export function ChatContainer() {
  const messages = useMessages();
  const isTyping = useTyping();
  const isAnalyzing = useChatStore((s) => s.isAnalyzing);
  const sendUserMessage = useChatStore((s) => s.sendUserMessage);
  const reset = useChatStore((s) => s.reset);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll suave automático al nuevo mensaje
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping, isAnalyzing]);

  return (
    <ConversationEngine>
      <div className="flex h-dvh flex-col bg-[#fafafa]">
        {/* ── Header ── */}
        <header className="z-10 flex items-center gap-3 border-b bg-white/90 px-4 py-3 backdrop-blur">
          <BotAvatar />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{BOT_NAME}</p>
            <p className="flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {isAnalyzing ? "Analizando tu proyecto..." : "En línea · te responde en segundos"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={reset}
            title="Nueva conversación"
            aria-label="Nueva conversación"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </header>

        {/* ── Mensajes ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            <AnimatePresence>{isTyping && <TypingIndicator name={BOT_NAME} />}</AnimatePresence>

            {/* Overlay de análisis (cierre) */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mx-auto mt-4 flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-md ring-1 ring-gray-100"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">Estoy armando tu propuesta...</p>
                    <p className="text-xs text-muted-foreground">
                      Reviso lo que me contaste y ajusto precios y alcance.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Input ── */}
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput onSend={sendUserMessage} disabled={isAnalyzing} />
        </div>
      </div>
    </ConversationEngine>
  );
}
