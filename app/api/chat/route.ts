/**
 * POST /api/chat
 *
 * Genera el mensaje del siguiente turno del bot con DeepSeek (vía OpenRouter).
 * Recibe el contexto + el nodo actual; devuelve el mensaje redactado por el
 * LLM (o el mensaje determinista de respaldo si no hay API key / hay error).
 *
 * El estado del chat (qué nodo sigue, validación, extracción) NO se decide
 * aquí: lo decide la máquina de estados determinista en el cliente. Esto
 * hace que el bot sea robusto y nunca se "pierda".
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { generateNextMessage } from "@/lib/chat-llm";
import type { ChatContext, ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const chatSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      timestamp: z.number(),
    })
  ),
  context: z.record(z.any()),
  nodeId: z.string(),
  fallbackReply: z.string(),
  botName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos inválidos: " + parsed.error.message },
        { status: 400 }
      );
    }

    const messages = parsed.data.messages as ChatMessage[];
    const context = parsed.data.context as unknown as ChatContext;
    const botName = parsed.data.botName || "Alex";

    const reply = await generateNextMessage({
      messages,
      context,
      nodeId: parsed.data.nodeId,
      fallbackReply: parsed.data.fallbackReply,
      botName,
    });

    return NextResponse.json({
      ok: true,
      reply,
      llm: reply !== parsed.data.fallbackReply,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error interno",
      },
      { status: 500 }
    );
  }
}
