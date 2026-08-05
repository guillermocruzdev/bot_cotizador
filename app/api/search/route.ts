import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/prospecting-auth";
import { createDiscoveryQueue } from "@/prospecting/discovery-queue";

// POST /api/search  { type, location, max_results?, use_agent? } → encola en el worker.
// El worker (Railway) ejecuta runDiscovery + insert. Sin REDIS_URL → 503 claro.
const bodySchema = z.object({
  type: z.string().min(2).max(60),
  location: z.string().min(2).max(80),
  max_results: z.number().int().min(1).max(10).optional().default(5),
  use_agent: z.boolean().optional().default(false),
});

export async function POST(req: Request): Promise<NextResponse> {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const queue = createDiscoveryQueue({ requireRedis: true });
  if (queue.kind === "none") {
    return NextResponse.json(
      {
        error:
          "El worker (Railway) no está disponible: falta REDIS_URL. La búsqueda se ejecuta en el worker, no en Vercel.",
      },
      { status: 503 }
    );
  }

  try {
    await queue.add({
      business_type: parsed.data.type,
      location: parsed.data.location,
      max_results: parsed.data.max_results,
      use_agent: parsed.data.use_agent,
    });
    await queue.close();
    return NextResponse.json({
      queued: true,
      message: "Búsqueda en cola: el worker la procesará y los leads aparecerán en el dashboard.",
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
