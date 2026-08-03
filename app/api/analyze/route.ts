/**
 * POST /api/analyze
 *
 * Recibe la conversación completa y el contexto, llama a DeepSeek vía
 * OpenRouter (lado servidor) y devuelve la propuesta estructurada.
 * Si la IA no está configurada o falla, responde con una propuesta local.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeWithOpenRouter } from "@/lib/openrouter";
import type { AnalysisResult, ChatContext, ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const analyzeSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      timestamp: z.number(),
    })
  ),
  context: z.record(z.any()),
  botName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = analyzeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos inválidos: " + parsed.error.message },
        { status: 400 }
      );
    }

    const messages = parsed.data.messages as ChatMessage[];
    const context = parsed.data.context as unknown as ChatContext;
    const botName = parsed.data.botName || "Alex";

    // Guardado asíncrono en Supabase (no bloquea la respuesta)
    persistLead({ messages, context, botName }).catch(() => {
      /* noop: el guardado nunca debe romper la propuesta */
    });

    const { ok, result, fallback, error } = await analyzeWithOpenRouter({
      transcript: messages,
      context,
      botName,
    });

    const response: {
      ok: boolean;
      result?: AnalysisResult;
      fallback?: boolean;
      error?: string;
    } = { ok, result, fallback, error };

    return NextResponse.json(response, { status: ok ? 200 : 500 });
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

/** Intenta persistir el lead en Supabase (best-effort, nunca lanza) */
async function persistLead(opts: {
  messages: ChatMessage[];
  context: ChatContext;
  botName: string;
}) {
  const { supabaseAdmin } = await import("@/lib/supabase");
  if (!supabaseAdmin) return;

  const { context, messages } = opts;
  const transcript = messages
    .map((m) => `${m.role === "assistant" ? opts.botName : "Cliente"}: ${m.content}`)
    .join("\n");

  await supabaseAdmin.from("leads").insert({
    client_name: context.clientName ?? null,
    client_email: context.clientEmail ?? null,
    category: context.category ?? null,
    nivel: context.nivel ?? null,
    presupuesto: context.presupuesto ?? null,
    fecha_entrega: context.fechaEntrega ?? null,
    contexto: context as unknown as Record<string, unknown>,
    transcript,
  });
}
