/**
 * Store global del chat (Zustand).
 *
 * Es la única fuente de verdad: mensajes, contexto, nodo actual y resultado.
 * El motor conversacional (ConversationEngine) usa estas acciones y se
 * encarga solo de los tiempos de "escritura" para que se sienta humano.
 */

"use client";

import { create } from "zustand";
import type { AnalysisResult, ChatContext, ChatMessage } from "@/lib/types";
import { createEmptyContext } from "@/lib/types";
import {
  DONE_NODE_ID,
  FLOW,
  START_NODE_ID,
  getNode,
  isDoneNode,
} from "@/lib/conversation-flow";
import { randomClosing } from "@/lib/personality";
import { delay, uid } from "@/lib/utils";

export const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || "Alex";

/** Habilita/deshabilita las preguntas con LLM (DeepSeek). "0" = solo determinista. */
export const LLM_CHAT_ENABLED = process.env.NEXT_PUBLIC_LLM_CHAT !== "0";

/**
 * Pide al servidor el mensaje del turno redactado por DeepSeek.
 * Si el LLM no está activo, falla o tarda demasiado → mensaje determinista.
 */
async function enhancedReply(opts: {
  nodeId: string;
  fallbackReply: string;
  messages: ChatMessage[];
  context: ChatContext;
}): Promise<string> {
  if (!LLM_CHAT_ENABLED) return opts.fallbackReply;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(9000),
      body: JSON.stringify({
        messages: opts.messages,
        context: opts.context,
        nodeId: opts.nodeId,
        fallbackReply: opts.fallbackReply,
        botName: BOT_NAME,
      }),
    });
    if (!res.ok) return opts.fallbackReply;
    const data = (await res.json()) as { ok?: boolean; reply?: string };
    const reply = data.reply?.trim();
    return reply && reply.length > 0 ? reply : opts.fallbackReply;
  } catch {
    return opts.fallbackReply;
  }
}

/**
 * Persistencia del resultado en sessionStorage para sobrevivir a la
 * navegación a /results (que hace un full reload). Sin esto, el store
 * de Zustand (en memoria) se pierde al cambiar de página.
 */
const STORAGE_KEY = "bot_cotizador:result";

interface PersistedPayload {
  result: AnalysisResult;
  context: ChatContext;
  messages: ChatMessage[];
}

function persistState(payload: PersistedPayload) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* noop */
  }
}

function clearPersistedState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** Lee el resultado persistido (usado por la pantalla de resultados) */
export function readPersistedResult(): PersistedPayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedPayload;
  } catch {
    return null;
  }
}

interface ChatState {
  // ── estado ──
  messages: ChatMessage[];
  context: ChatContext;
  currentNodeId: string;
  isTyping: boolean;
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  error: string | null;
  started: boolean;
  /** Incrementa en cada reset: invalida timers pendientes de la charla anterior */
  sessionId: number;

  // ── acciones ──
  startConversation: () => Promise<void>;
  sendUserMessage: (text: string) => Promise<void>;
  botSay: (content: string, options?: { delayMs?: number; force?: boolean }) => Promise<void>;
  finishAndNavigate: () => Promise<void>;
  reset: () => void;
}

/** Convierte el transcript completo a texto (para el prompt de la IA) */
function transcriptToText(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === "assistant" ? BOT_NAME : "Cliente"}: ${m.content}`)
    .join("\n");
}

export const useChatStore = create<ChatState>((set, get) => {
  /** Evita doble arranque (StrictMode) */
  let booting = false;
  let analyzing = false;

  const botSay = async (
    content: string,
    options?: { delayMs?: number; force?: boolean }
  ) => {
    const delayMs = options?.delayMs ?? 900 + Math.random() * 900;
    const sid = get().sessionId;
    set({ isTyping: true });
    await delay(delayMs);
    // Si hubo un reset mientras "escribía", descartamos el mensaje.
    if (get().sessionId !== sid) return;
    const msg: ChatMessage = {
      id: uid("bot"),
      role: "assistant",
      content,
      timestamp: Date.now(),
    };
    set((s) => ({ isTyping: false, messages: [...s.messages, msg] }));
  };

  const startConversation = async () => {
    if (get().started || booting) return;
    booting = true;
    set({ started: true, currentNodeId: START_NODE_ID });
    const node = getNode(START_NODE_ID);
    if (node) {
      await botSay(node.generateMessage(get().context), { force: true });
    }
    booting = false;
  };

  const finishAndNavigate = async () => {
    if (analyzing) return;
    analyzing = true;
    set({ isAnalyzing: true, error: null });

    const { messages, context } = get();
    // Actualiza el transcript en el contexto
    const finalContext: ChatContext = { ...context, transcript: transcriptToText(messages) };

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          context: finalContext,
          botName: BOT_NAME,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        result?: AnalysisResult;
        error?: string;
        fallback?: boolean;
      };

      if (!data.ok || !data.result) {
        throw new Error(data.error ?? "No se pudo generar la propuesta");
      }

      set({ result: data.result, isAnalyzing: false });
      analyzing = false;
      // Persiste para sobrevivir al full reload de /results
      persistState({ result: data.result, context: finalContext, messages });
      // Navega a la pantalla de resultados
      window.location.href = "/results";
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Error desconocido",
        isAnalyzing: false,
      });
      analyzing = false;
    }
  };

  const sendUserMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || get().isAnalyzing) return;

    // 1. Agregar el mensaje del usuario
    const userMsg: ChatMessage = {
      id: uid("user"),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, userMsg] }));

    // 2. Procesar con el nodo actual
    let currentId = get().currentNodeId;
    let node = getNode(currentId);
    if (!node) return;

    const nextCtx: ChatContext = { ...get().context };

    // ── Passthrough del saludo ───────────────────────────────
    // El saludo NO consume la primera respuesta. Si el usuario dice
    // solo "listo/sí/dale", avanzamos a la primera pregunta. Si responde
    // algo sustancial (ej. "soy dentista y quiero citas online"), esa
    // respuesta se procesa como la respuesta a la primera pregunta.
    if (node.type === "greeting") {
      const forwardId = node.nextNode("", nextCtx);
      const t = text.trim();
      const isReady =
        t.length <= 12 &&
        /^(s[ií]|listo|dale|ok|okay|claro|adelante|vamos|va|sip|sep|simon|listo|d[áa]le)$/i.test(
          t
        );
      if (isReady) {
        const forward = getNode(forwardId);
        set({ currentNodeId: forwardId });
        if (forward) {
          const fallback = forward.generateMessage(nextCtx);
          set({ isTyping: true });
          const reply = await enhancedReply({
            nodeId: forward.id,
            fallbackReply: fallback,
            messages: get().messages,
            context: nextCtx,
          });
          await botSay(reply, { delayMs: 500 });
        }
        return;
      }
      currentId = forwardId;
      node = getNode(currentId) as NonNullable<typeof node>;
    }

    // 3. Side effects del nodo + avanzar
    node.onReceive?.(text, nextCtx);

    let nextId = node.nextNode(text, nextCtx);

    // 3b. Saltar nodos cuya condición no se cumple
    // (p.ej. no preguntar por citas si la categoría ya es "citas").
    let guard = 0;
    while (guard < 40) {
      const target = getNode(nextId);
      if (!target || !target.condition || target.condition(nextCtx)) break;
      nextId = target.nextNode("", nextCtx);
      guard++;
    }

    set({ context: nextCtx, currentNodeId: nextId });

    // 3c. ¿Terminó? Mostrar cierre y analizar
    if (isDoneNode(nextId)) {
      await botSay(randomClosing());
      await delay(600);
      await get().finishAndNavigate();
      return;
    }

    // Nodo "closing": muestra su mensaje y arranca el análisis
    if (nextId === "closing") {
      const closingNode = getNode(nextId);
      if (closingNode) {
        const fallback = closingNode.generateMessage(nextCtx);
        set({ isTyping: true });
        const reply = await enhancedReply({
          nodeId: closingNode.id,
          fallbackReply: fallback,
          messages: get().messages,
          context: nextCtx,
        });
        await botSay(reply, { delayMs: 400 });
        await delay(500);
        await get().finishAndNavigate();
        return;
      }
    }

    // 4. Generar el siguiente mensaje del bot (LLM si está disponible)
    const next = getNode(nextId);
    if (next) {
      const fallback = next.generateMessage(nextCtx);
      set({ isTyping: true });
      const reply = await enhancedReply({
        nodeId: next.id,
        fallbackReply: fallback,
        messages: get().messages,
        context: nextCtx,
      });
      await botSay(reply, { delayMs: 500 });
    }
  };

  const reset = () => {
    clearPersistedState();
    set({
      messages: [],
      context: createEmptyContext(),
      currentNodeId: START_NODE_ID,
      isTyping: false,
      isAnalyzing: false,
      result: null,
      error: null,
      started: false,
      // Invalida timers de la charla anterior
      sessionId: get().sessionId + 1,
    });
    // Reinicia la charla (el bot vuelve a saludar)
    setTimeout(() => get().startConversation(), 120);
  };

  return {
    messages: [],
    context: createEmptyContext(),
    currentNodeId: START_NODE_ID,
    isTyping: false,
    isAnalyzing: false,
    result: null,
    error: null,
    started: false,
    sessionId: 0,
    startConversation,
    sendUserMessage,
    botSay,
    finishAndNavigate,
    reset,
  };
});

/** Selector de contexto para componentes (evita re-renders innecesarios) */
export function useMessages() {
  return useChatStore((s) => s.messages);
}

export function useTyping() {
  return useChatStore((s) => s.isTyping);
}

export function useAnalyzing() {
  return useChatStore((s) => s.isAnalyzing);
}
