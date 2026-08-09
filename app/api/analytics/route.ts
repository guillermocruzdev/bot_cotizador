/**
 * POST /api/analytics
 *
 * Recibe eventos del chat (UX analytics) y los persiste:
 *  - Con Supabase configurado → tabla chat_events + upsert chat_sessions.
 *  - Sin Supabase → buffer en memoria (máx N sesiones) + GET para depurar.
 *
 * GET /api/analytics → resumen de lo capturado en memoria (debug local).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventSchema = z.object({
  event: z.string().min(1).max(40),
  nodeId: z.string().max(60).optional(),
  ts: z.number().optional(),
  payload: z.record(z.any()).optional(),
});

const sessionSchema = z.object({
  startedAt: z.number().optional(),
  lastNodeId: z.string().nullable().optional(),
  nodeCount: z.number().int().min(0).optional(),
  questionCount: z.number().int().min(0).optional(),
  noSeCount: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
  category: z.string().nullable().optional(),
  nivel: z.string().nullable().optional(),
  precio: z.number().nullable().optional(),
  fallback: z.boolean().nullable().optional(),
  referrer: z.string().optional(),
});

const bodySchema = z.object({
  sessionId: z.string().min(1).max(80),
  events: z.array(eventSchema).max(200),
  session: sessionSchema.optional(),
});

// Fallback en memoria (sin Supabase): guarda lo último para depurar vía GET.
const memorySessions = new Map<
  string,
  { events: Array<Record<string, unknown>>; session?: Record<string, unknown> }
>();
const MEMORY_MAX = 500;

function setIfDefined(
  row: Record<string, unknown>,
  key: string,
  value: unknown
): void {
  if (value !== undefined) row[key] = value as never;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.message },
        { status: 400 }
      );
    }
    const { sessionId, events, session } = parsed.data;

    if (!supabaseAdmin) {
      const bucket = memorySessions.get(sessionId) ?? { events: [] };
      bucket.events.push(
        ...events.map((e) => ({ ...e, ts: e.ts ?? Date.now() }))
      );
      if (bucket.events.length > 200) {
        bucket.events.splice(0, bucket.events.length - 200);
      }
      if (session) {
        bucket.session = session as unknown as Record<string, unknown>;
      }
      memorySessions.set(sessionId, bucket);
      while (memorySessions.size > MEMORY_MAX) {
        const k = memorySessions.keys().next().value as string;
        memorySessions.delete(k);
      }
      console.log(
        `[analytics] ${sessionId} · ${events.length} eventos · ${
          session ? "con resumen de sesión" : "parcial"
        }`
      );
      return NextResponse.json({ ok: true, stored: events.length, persisted: false });
    }

    // 1) Upsert de la sesión (solo cuando el cliente manda el resumen).
    if (session) {
      const row: Record<string, unknown> = { session_id: sessionId };
      setIfDefined(row, "started_at", session.startedAt ? new Date(session.startedAt).toISOString() : undefined);
      setIfDefined(row, "last_node", session.lastNodeId);
      setIfDefined(row, "node_count", session.nodeCount ?? 0);
      setIfDefined(row, "question_count", session.questionCount ?? 0);
      setIfDefined(row, "no_se_count", session.noSeCount ?? 0);
      setIfDefined(row, "completed", session.completed ?? false);
      setIfDefined(row, "category", session.category);
      setIfDefined(row, "nivel", session.nivel);
      setIfDefined(row, "precio_min", session.precio);
      setIfDefined(row, "fallback", session.fallback);
      setIfDefined(row, "referrer", session.referrer);
      setIfDefined(row, "updated_at", new Date().toISOString());
      if (session.completed) setIfDefined(row, "ended_at", new Date().toISOString());

      const { data: existing } = await supabaseAdmin
        .from("chat_sessions")
        .select("session_id")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin.from("chat_sessions").update(row).eq("session_id", sessionId);
      } else {
        await supabaseAdmin.from("chat_sessions").insert(row);
      }
    }

    // 2) Eventos individuales.
    if (events.length) {
      const rows = events.map((e) => {
        const r: Record<string, unknown> = {
          session_id: sessionId,
          event: e.event,
          node_id: e.nodeId ?? null,
          payload: e.payload ?? null,
        };
        if (e.ts) r.ts = new Date(e.ts).toISOString();
        return r;
      });
      await supabaseAdmin.from("chat_events").insert(rows);
    }

    return NextResponse.json({ ok: true, stored: events.length, persisted: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 }
    );
  }
}

/** Debug: resumen de las sesiones capturadas en memoria (sin Supabase). */
export async function GET() {
  const sessions = Array.from(memorySessions.entries())
    .map(([sessionId, b]) => ({
      sessionId,
      events: b.events.length,
      session: b.session,
    }))
    .slice(-50);
  return NextResponse.json({
    persisted: Boolean(supabaseAdmin),
    totalSessions: memorySessions.size,
    sessions,
  });
}
