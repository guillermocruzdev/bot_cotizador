/**
 * POST /api/save
 *
 * Guarda la propuesta completa y los datos de contacto en Supabase.
 * Devuelve el id del registro creado.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const saveSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.union([z.string().email(), z.literal(""), z.string().min(3)]),
  context: z.record(z.any()),
  result: z.object({
    categoria: z.string(),
    nivel: z.string(),
    precio_min: z.number(),
    precio_max: z.number(),
    tiempo_estimado: z.string(),
  }),
  transcript: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = saveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos inválidos: " + parsed.error.message },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const { clientName, clientEmail, context, result, transcript } = parsed.data;

    const { data, error } = await supabaseAdmin
      .from("proposals")
      .insert({
        client_name: clientName,
        client_email: clientEmail || null,
        categoria: result.categoria,
        nivel: result.nivel,
        precio_min: result.precio_min,
        precio_max: result.precio_max,
        tiempo_estimado: result.tiempo_estimado,
        contexto: context as Record<string, unknown>,
        resultado: result,
        transcript,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id });
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
