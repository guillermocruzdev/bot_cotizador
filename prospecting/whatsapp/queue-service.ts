// Cola de envíos: BullMQ (Redis) con fallback en memoria si no hay REDIS_URL.
// El worker aplica anti-ban (horario + límite diario + delay) antes de enviar.
import { Queue, Worker, type Job } from "bullmq";
import { WhatsAppBot } from "./whatsapp-bot";
import { AntiBanGuard, sleep } from "./anti-ban";
import { transition, type LeadStatus } from "./state-manager";

export interface OutboundJobData {
  leadId: string;
  number: string;
  message: string;
  attempt?: number;
}

export interface QueueDeps {
  bot: Pick<WhatsAppBot, "sendText">;
  guard: AntiBanGuard;
  updateLeadStatus?: (leadId: string, status: LeadStatus) => Promise<void>;
  onSent?: (job: OutboundJobData) => void | Promise<void>;
}

export interface OutboundQueue {
  kind: "bullmq" | "memory" | "none";
  add(job: OutboundJobData): Promise<void>;
  close(): Promise<void>;
}

export interface OutboundQueueOptions {
  /** true → en API routes (serverless): solo encolar a Redis, nunca procesar local. */
  requireRedis?: boolean;
}

const QUEUE_NAME = "whatsapp-outbound";

export async function processOutbound(
  deps: QueueDeps,
  job: OutboundJobData
): Promise<void> {
  // 1) anti-ban: horario hábil + límite diario
  const check = deps.guard.canSend(job.number);
  if (!check.ok) {
    throw new Error(`anti-ban: ${check.reason ?? "denegado"}`);
  }
  // 2) delay aleatorio 30-90s (o el configurado)
  await sleep(deps.guard.randomDelayMs());
  // 3) envío
  const ok = await deps.bot.sendText(job.number, job.message);
  if (!ok) throw new Error("send failed");
  // 4) registrar + avanzar estado
  deps.guard.recordSend(job.number);
  const next = transition("pending", "sent");
  await deps.updateLeadStatus?.(job.leadId, next.status);
  await deps.onSent?.(job);
}

export function createOutboundQueue(
  deps: QueueDeps,
  opts: OutboundQueueOptions = {}
): OutboundQueue {
  if (process.env.REDIS_URL) return createBullOutboundQueue(deps);
  if (opts.requireRedis) return createNoopOutboundQueue();
  return createMemoryOutboundQueue(deps);
}

// --- BullMQ ---
function createBullOutboundQueue(deps: QueueDeps): OutboundQueue {
  const connection = parseRedisUrl(process.env.REDIS_URL ?? "redis://localhost:6379");
  const queue = new Queue(QUEUE_NAME, { connection });
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job<OutboundJobData>) => {
      await processOutbound(deps, job.data);
    },
    { connection, concurrency: 1 }
  );
  worker.on("failed", (job, failedReason) => {
    console.error(`[queue] job ${job?.id ?? "?"} falló: ${failedReason}`);
  });

  return {
    kind: "bullmq",
    add: async (job) => {
      await queue.add("send", job, { attempts: 1 });
    },
    close: async () => {
      await worker.close();
      await queue.close();
    },
  };
}

function parseRedisUrl(url: string): {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db?: number;
} {
  const u = new URL(url);
  const out: {
    host: string;
    port: number;
    password?: string;
    username?: string;
    db?: number;
  } = {
    host: u.hostname,
    port: Number(u.port || 6379),
  };
  if (u.password) out.password = u.password;
  if (u.username) out.username = u.username;
  if (u.pathname && u.pathname !== "/") out.db = Number(u.pathname.slice(1) || 0);
  return out;
}

// --- Fallback en memoria (sin Redis): procesa inmediatamente con anti-ban ---
function createMemoryOutboundQueue(deps: QueueDeps): OutboundQueue {
  return {
    kind: "memory",
    add: async (job) => {
      await processOutbound(deps, job);
    },
    close: async () => {},
  };
}

// --- No-op (sin Redis en un entorno serverless): no hace nada, el scheduler
//     del worker (Railway) retomará los leads 'pending' más tarde. ---
function createNoopOutboundQueue(): OutboundQueue {
  return {
    kind: "none",
    add: async () => {},
    close: async () => {},
  };
}
