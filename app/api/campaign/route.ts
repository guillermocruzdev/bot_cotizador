import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/prospecting-auth";
import { createOutboundQueue } from "@/prospecting/whatsapp/queue-service";
import { AntiBanGuard } from "@/prospecting/whatsapp/anti-ban";
import { generateMessage } from "@/prospecting/outreach/message-chain";
import { getLeadsByIds, createCampaign } from "@/prospecting/store/dashboard-repo";

// POST /api/campaign  { lead_ids, name?, category?, template? } → inicia la cola.
const bodySchema = z.object({
  lead_ids: z.array(z.string().uuid()).min(1).max(100),
  name: z.string().min(1).max(120).optional(),
  category: z.string().min(1).max(60).optional(),
  template: z.string().min(1).max(4000).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const leads = await getLeadsByIds(parsed.data.lead_ids);
    const items: Array<{ leadId: string; message: string }> = [];
    // TOKEN SAVER: un mensaje LLM por (categoría+ubicación), reutilizado para
    // todos los leads de esa combinación → 1-2 llamadas en vez de N.
    const msgCache = new Map<string, string>();
    for (const lead of leads) {
      if (!lead.phone) continue;
      const cat = parsed.data.category ?? lead.category ?? "retail";
      const cacheKey = `${cat}|${lead.location ?? ""}`;
      let message = msgCache.get(cacheKey);
      if (!message) {
        const msg = await generateMessage({
          name: lead.name,
          business: lead.name,
          category: cat,
          location: lead.location,
          company: process.env.WA_SENDER_NAME ?? "Agencia Web",
          benefit: undefined,
        });
        message = msg.message;
        msgCache.set(cacheKey, message);
      }
      items.push({ leadId: lead.id, message });
    }

    const campaignId = await createCampaign({
      name: parsed.data.name ?? `Campaña ${new Date().toISOString().slice(0, 10)}`,
      category: parsed.data.category ?? null,
      template: parsed.data.template ?? null,
      items,
    });

    // En serverless (API) solo se encola a Redis (requireRedis) → el worker
    // de Railway envía. Sin REDIS_URL → no-op y el scheduler retoma después.
    const queue = createOutboundQueue(
      { bot: { sendText: async () => false }, guard: new AntiBanGuard() },
      { requireRedis: true }
    );
    for (const item of items) {
      const lead = leads.find((l) => l.id === item.leadId);
      if (lead?.phone) {
        await queue.add({ leadId: item.leadId, number: lead.phone, message: item.message });
      }
    }
    await queue.close();

    return NextResponse.json({
      campaignId,
      enqueued: items.length,
      skipped: leads.length - items.length,
      note: process.env.REDIS_URL
        ? undefined
        : "sin REDIS_URL: no se envió nada; el worker (Railway) retomará los leads pending",
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
