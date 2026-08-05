// Scheduler node-cron: drena leads 'pending' solo en horario hábil
// y cierra como 'no_response' los enviados sin respuesta tras N días.
import cron from "node-cron";
import { AntiBanGuard } from "../whatsapp/anti-ban";
import { transition, type LeadStatus } from "../whatsapp/state-manager";
import type { OutboundQueue } from "../whatsapp/queue-service";
import { generateMessage } from "../outreach/message-chain";

export interface PendingLead {
  id: string;
  name: string;
  category: string | null;
  location: string;
  phone: string | null;
}

export interface SchedulerDeps {
  queue: OutboundQueue;
  guard: AntiBanGuard;
  getPendingLeads: (limit?: number) => Promise<PendingLead[]>;
  getSentOlderThan?: (days: number) => Promise<string[]>;
  updateLeadStatus?: (leadId: string, status: LeadStatus) => Promise<void>;
  company?: string;
}

export interface DrainResult {
  enqueued: number;
  skippedOutsideHours: boolean;
}

export async function drainPendingNow(
  deps: SchedulerDeps,
  batch = 50,
  now: Date = new Date()
): Promise<DrainResult> {
  if (!deps.guard.isBusinessHours(now)) {
    return { enqueued: 0, skippedOutsideHours: true };
  }
  const leads = await deps.getPendingLeads(batch);
  let enqueued = 0;
  // TOKEN SAVER: un solo mensaje LLM por (categoría+ubicación), reutilizado
  // para todos los leads de esa combinación. Sin LLM para duplicados.
  const msgCache = new Map<string, string>();
  for (const lead of leads) {
    if (!lead.phone) continue;
    const cacheKey = `${lead.category ?? "retail"}|${lead.location}`;
    let message = msgCache.get(cacheKey);
    if (!message) {
      const msg = await generateMessage({
        name: lead.name,
        business: lead.name,
        category: lead.category ?? "retail",
        location: lead.location,
        company: deps.company ?? process.env.WA_SENDER_NAME ?? "Agencia Web",
      });
      message = msg.message;
      msgCache.set(cacheKey, message);
    }
    await deps.queue.add({
      leadId: lead.id,
      number: lead.phone,
      message,
    });
    enqueued++;
  }
  return { enqueued, skippedOutsideHours: false };
}

export async function markStaleNoResponse(
  deps: SchedulerDeps,
  days = 3
): Promise<number> {
  if (!deps.getSentOlderThan || !deps.updateLeadStatus) return 0;
  const ids = await deps.getSentOlderThan(days);
  let closed = 0;
  for (const id of ids) {
    const t = transition("sent", "no_response");
    if (t.ok) {
      await deps.updateLeadStatus(id, t.status);
      closed++;
    }
  }
  return closed;
}

export function startScheduler(
  deps: SchedulerDeps,
  cronExpr = "*/15 * * * *",
  staleCronExpr = "0 8 * * *"
): {
  stop: () => void;
  drainNow: () => Promise<DrainResult>;
  markStaleNow: () => Promise<number>;
} {
  const drainTask = cron.schedule(cronExpr, () => {
    void drainPendingNow(deps);
  });
  const staleTask = cron.schedule(staleCronExpr, () => {
    void markStaleNoResponse(deps);
  });
  return {
    stop: () => {
      drainTask.stop();
      staleTask.stop();
    },
    drainNow: () => drainPendingNow(deps),
    markStaleNow: () => markStaleNoResponse(deps),
  };
}
