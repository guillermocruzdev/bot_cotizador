import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyInbound } from "@/prospecting/whatsapp/state-manager";
import { getLeadByPhone, updateLeadStatus } from "@/prospecting/store/leads-repo";
import { addMessage } from "@/prospecting/store/dashboard-repo";
import { getAntiBanConfig } from "@/prospecting/config";

// POST /api/webhook  { number, text, direction?, leadId? } → inbound de WhatsApp.
// - direction "inbound" (default): clasifica y actualiza el estado del lead.
// - direction "outbound": registra un mensaje del agente (reply manual del chat).
const bodySchema = z.object({
  number: z.string().min(5).max(20),
  text: z.string().min(1).max(4000),
  direction: z.enum(["inbound", "outbound"]).optional().default("inbound"),
  leadId: z.string().uuid().optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.headers.get("x-webhook-token") !== secret) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { number, text, direction, leadId } = parsed.data;
  const lead = leadId ? { id: leadId } : await getLeadByPhone(number);
  if (!lead) {
    return NextResponse.json({ action: "unknown", leadId: null });
  }

  await addMessage(lead.id, direction, text);

  if (direction === "inbound") {
    const decision = classifyInbound(
      "responded",
      text,
      getAntiBanConfig().blacklist_keywords
    );
    if (decision.action !== "none") {
      await updateLeadStatus(lead.id, decision.nextStatus);
    }
    return NextResponse.json({ action: decision.action, status: decision.nextStatus, leadId: lead.id });
  }

  return NextResponse.json({ action: "recorded", status: "responded", leadId: lead.id });
}
