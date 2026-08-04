"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
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
  const error = useChatStore((s) => s.error);
  const sendUserMessage = useChatStore((s) => s.sendUserMessage);
  const reset = useChatStore((s) => s.reset);
  const retryAnalyze = useChatStore((s) => s.retryAnalyze);
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

            {/* Error al generar la propuesta → Reintentar / Nueva conversación */}
            <AnimatePresence>
              {error && !isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mx-auto mt-4 w-full rounded-2xl bg-red-50 px-5 py-4 ring-1 ring-red-200"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <div className="min-w-0 text-sm text-red-800">
                      <p className="font-medium">
                        No pude armar tu propuesta en este intento.
                      </p>
                      <p className="mt-0.5 text-xs text-red-600">
                        No se perdió nada de lo que me contaste. Puedes intentarlo de
                        nuevo o empezar una conversación nueva.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={retryAnalyze}>
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      Reintentar
                    </Button>
                    <Button size="sm" variant="outline" onClick={reset}>
                      Nueva conversación
                    </Button>
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
