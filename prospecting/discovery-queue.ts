// Cola de discovery: procesa búsquedas de leads en el worker (Railway).
// /api/search (serverless) ENCOLA aquí; el worker ejecuta runDiscovery + insert.
// Fallback en memoria si no hay REDIS_URL (útil para tests / dev local).
import { Queue, Worker, type Job } from "bullmq";
import { runDiscovery, type DiscoveryResult } from "./ingest/search-agent";
import { batchInsertLeads } from "./store/leads-repo";
import { redisConnection } from "./redis";

export interface DiscoveryJobData {
  business_type: string;
  location: string;
  max_results: number;
  /** true → usar el agente LLM (LangChain). false/undefined → pipeline determinista. */
  use_agent?: boolean;
}

export interface DiscoveryQueue {
  kind: "bullmq" | "memory" | "none";
  add(job: DiscoveryJobData): Promise<void>;
  close(): Promise<void>;
}

export interface DiscoveryQueueOptions {
  /** true → en API routes (serverless): solo encolar a Redis, nunca procesar local. */
  requireRedis?: boolean;
}

const QUEUE_NAME = "discovery";

export async function processDiscoveryJob(job: DiscoveryJobData): Promise<DiscoveryResult> {
  const result = await runDiscovery(
    {
      business_type: job.business_type,
      location: job.location,
      max_results: job.max_results,
    },
    { use_agent: job.use_agent }
  );
  if (result.leads.length > 0) {
    await batchInsertLeads(result.leads, {
      location: job.location,
      source: "google_search",
    });
  }
  return result;
}

export function createDiscoveryQueue(
  opts: DiscoveryQueueOptions = {}
): DiscoveryQueue {
  if (process.env.REDIS_URL) return createBullDiscoveryQueue();
  if (opts.requireRedis) return createNoopDiscoveryQueue();
  return createMemoryDiscoveryQueue();
}

// --- BullMQ ---
function createBullDiscoveryQueue(): DiscoveryQueue {
  const connection = redisConnection();
  const queue = new Queue(QUEUE_NAME, { connection });
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job<DiscoveryJobData>) => {
      const result = await processDiscoveryJob(job.data);
      console.log(
        `[discovery] job ${job.id}: ${result.leads.length} leads (${result.source})`
      );
    },
    { connection, concurrency: 1 }
  );
  worker.on("failed", (job, failedReason) => {
    console.error(`[discovery] job ${job?.id ?? "?"} falló: ${failedReason}`);
  });

  return {
    kind: "bullmq",
    add: async (job) => {
      await queue.add("discover", job, { attempts: 1 });
    },
    close: async () => {
      await worker.close();
      await queue.close();
    },
  };
}

// --- Fallback en memoria (sin Redis): procesa inmediatamente ---
function createMemoryDiscoveryQueue(): DiscoveryQueue {
  return {
    kind: "memory",
    add: async (job) => {
      await processDiscoveryJob(job);
    },
    close: async () => {},
  };
}

// --- No-op (sin Redis en serverless): el worker (Railway) retomará luego ---
function createNoopDiscoveryQueue(): DiscoveryQueue {
  return {
    kind: "none",
    add: async () => {},
    close: async () => {},
  };
}
