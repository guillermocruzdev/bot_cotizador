/**
 * POST /api/contact
 *
 * Recibe el formulario de contacto de la vitrina Nexora (FASE 7).
 *  - Valida con zod (whitelist estricta de campos).
 *  - Rate-limit simple por IP (en memoria).
 *  - Sin servicio de correo configurado → buffer en memoria + log, y
 *    responde ok para que el cliente vea la confirmación. El envío real por
 *    email se puede cablear aquí con un proveedor (Resend/SMTP) en FASE 8/12,
 *    y el pipeline a prospect_leads (WhatsApp) llega en FASE 14.
 *
 * GET /api/contact → resumen de lo capturado en memoria (debug local).
 */

import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contactSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Escribe un correo válido")
    .max(120),
  whatsapp: z.string().trim().max(20).optional().default(""),
  tipoWeb: z.string().trim().max(60).optional().default(""),
  mensaje: z.string().trim().min(5, "Cuéntanos un poco más").max(2000),
});

// Fallback en memoria (sin proveedor de correo/Supabase).
const memoryMessages: Array<Record<string, unknown>> = [];
const MEMORY_MAX = 100;

// Rate-limit simple: máximo 10 envíos por IP en 60s.
const rateBuckets = new Map<string, number[]>();
const RATE_MAX = 10;
const RATE_WINDOW_MS = 60_000;

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : "local").trim() || "local";
}

function allowSend(ip: string): boolean {
  const now = Date.now();
  const bucket = (rateBuckets.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (bucket.length >= RATE_MAX) {
    rateBuckets.set(ip, bucket);
    return false;
  }
  bucket.push(now);
  rateBuckets.set(ip, bucket);
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    if (!allowSend(ip)) {
      return NextResponse.json(
        { ok: false, error: "Demasiados intentos. Espera un momento y vuelve a intentar." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { nombre, email, whatsapp, tipoWeb, mensaje } = parsed.data;
    const record = {
      nombre,
      email,
      whatsapp,
      tipoWeb,
      mensaje,
      ts: new Date().toISOString(),
    };

    // TODO FASE 8/12: enviar por email (Resend/SMTP) si hay proveedor.
    // TODO FASE 14: upsert en prospect_leads (pipeline WhatsApp) vía /api/lead-capture.
    memoryMessages.push(record);
    if (memoryMessages.length > MEMORY_MAX) memoryMessages.shift();

    console.log(
      `[contacto] ${nombre} <${email}> · tipo: ${tipoWeb || "—"} · WhatsApp: ${whatsapp || "—"} · ${mensaje.slice(0, 60)}…`
    );

    return NextResponse.json({ ok: true, recibido: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No pudimos recibir tu mensaje. Inténtalo de nuevo o escríbenos por WhatsApp." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    count: memoryMessages.length,
    messages: memoryMessages,
  });
}
