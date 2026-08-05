// GET /api/demo?type=dentista&location=Monterrey,%20México&count=10
// DEMO EN VIVO (SSE): busca negocios, genera mensaje y simula el envío por
// WhatsApp, emitiendo cada paso como evento para que la web lo muestre.
//
// - Búsqueda real (SerpAPI) si hay SERPAPI_API_KEY; si no, leads de ejemplo.
// - Mensaje con generateMessage (1 llamada LLM por categoría, memoizada).
// - Envío SIMULADO con delays cortos (sin Baileys/Redis): se marca "simulado".
import { runDiscovery } from "@/prospecting/ingest/search-agent";
import { generateMessage } from "@/prospecting/outreach/message-chain";
import { makeDemoLeads, type DemoLead } from "@/prospecting/demo-leads";
import type { LeadCandidate } from "@/prospecting/ingest/search-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface DemoLeadRow {
  name: string;
  phone: string | null;
  category: string | null;
  has_website: false;
}

function toRows(leads: LeadCandidate[] | DemoLead[]): DemoLeadRow[] {
  return leads.map((l) => ({
    name: l.name,
    phone: l.phone,
    category: l.category,
    has_website: false as const,
  }));
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const type = url.searchParams.get("type")?.trim() || "dentista";
  const location = url.searchParams.get("location")?.trim() || "Monterrey, México";
  const count = Math.min(10, Math.max(1, Number(url.searchParams.get("count") ?? 10)));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: string, data: unknown): void => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };
      try {
        emit("status", { text: `Buscando ${count} negocios de "${type}" en ${location}…` });

        let rows: DemoLeadRow[];
        let source = "demo";
        try {
          const result = await runDiscovery({
            business_type: type,
            location,
            max_results: count,
          });
          rows = toRows(result.leads);
          source = result.source;
          if (rows.length === 0) throw new Error("sin resultados");
        } catch {
          rows = toRows(makeDemoLeads(type, location, count));
          source = "demo";
          emit("status", {
            text: "Sin SERPAPI_API_KEY o búsqueda vacía → usando datos de ejemplo.",
          });
        }

        emit("search", { source, total: rows.length });
        for (const lead of rows) {
          emit("lead", lead);
        }

        // Generar mensajes: 1 llamada LLM por (categoría+ubicación), memoizada.
        // El mensaje del primer lead se REUTILIZA personalizando solo el nombre.
        const msgCache = new Map<string, { name: string; text: string }>();
        for (const lead of rows) {
          const cacheKey = `${lead.category ?? "retail"}|${location}`;
          let cached = msgCache.get(cacheKey);
          if (!cached) {
            const g = await generateMessage({
              name: lead.name,
              business: lead.name,
              category: lead.category ?? "retail",
              location,
              company: process.env.WA_SENDER_NAME ?? "Agencia Web",
            });
            cached = { name: lead.name, text: g.message };
            msgCache.set(cacheKey, cached);
          }
          // Reemplaza el nombre del primer lead por el del lead actual.
          const message = cached.text.replaceAll(cached.name, lead.name);
          emit("message", { name: lead.name, phone: lead.phone, text: message });

          // Envío simulado (sin Baileys/Redis en la demo): delays cortos.
          emit("send", { name: lead.name, phone: lead.phone, status: "sending" });
          await sleep(350 + Math.random() * 400);
          emit("send", { name: lead.name, phone: lead.phone, status: "sent" });
        }

        emit("done", {
          total: rows.length,
          llm_calls: msgCache.size,
          simulated: true,
          source,
        });
      } catch (err) {
        emit("error", { text: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
