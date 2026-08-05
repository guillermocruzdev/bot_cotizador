// Arranque del worker de prospección (bot + cola + scheduler).
// Útil para Docker o ejecución directa: npx tsx prospecting/worker-entry.ts
import { WhatsAppBot } from "./whatsapp/whatsapp-bot";
import { AntiBanGuard } from "./whatsapp/anti-ban";
import { createOutboundQueue } from "./whatsapp/queue-service";
import { createDiscoveryQueue } from "./discovery-queue";
import { startScheduler } from "./scheduler/scheduler";
import { transition } from "./whatsapp/state-manager";
import {
  getLeadByPhone,
  listPendingLeads,
  listSentOlderThan,
  logSend,
  updateLeadStatus,
} from "./store/leads-repo";

async function main(): Promise<void> {
  const guard = new AntiBanGuard();
  const bot = new WhatsAppBot(
    process.env.BAILEYS_SESSION_DIR ?? "prospecting/.baileys"
  );

  const queue = createOutboundQueue({
    bot,
    guard,
    updateLeadStatus,
    onSent: async (job) => {
      await logSend(job);
    },
  });

  // Cola de discovery: /api/search (Vercel) encola aquí, el worker ejecuta.
  const discoveryQueue = createDiscoveryQueue();

  await bot.connect({
    onStatus: (s, reason) =>
      console.log(`[wa] ${s}${reason ? ` (${reason})` : ""}`),
    onQr: () => console.log("[wa] escanea el QR para vincular el número"),
    onInbound: async (msg, decision, current) => {
      const lead = await getLeadByPhone(msg.number);
      const leadId = lead?.id;

      if (decision.action === "blacklist") {
        if (leadId) await updateLeadStatus(leadId, "blacklist");
        bot.setHumanMode(msg.number, false);
        console.log(`[wa] blacklist: ${msg.number}`);
        return;
      }
      if (decision.action === "interested") {
        if (leadId) {
          const first = transition(current, "responded");
          const base = first.ok ? first.status : current;
          const second = transition(base, "interested");
          if (second.ok) await updateLeadStatus(leadId, second.status);
        }
        bot.setHumanMode(msg.number, false);
        console.log(`[wa] interesado: ${msg.number}`);
        return;
      }
      if (decision.action === "faq") {
        // FAQ chain → Chat 5 (pendiente). Por ahora pasa a modo humano.
        bot.setHumanMode(msg.number, true);
        console.log(`[wa] FAQ (Chat 5 pendiente): ${msg.number}`);
        return;
      }
      // human_mode
      bot.setHumanMode(msg.number, true);
      console.log(`[wa] human_mode: ${msg.number}`);
    },
  });

  const scheduler = startScheduler({
    queue,
    guard,
    getPendingLeads: listPendingLeads,
    getSentOlderThan: listSentOlderThan,
    updateLeadStatus,
    company: process.env.WA_SENDER_NAME,
  });

  const shutdown = async (): Promise<void> => {
    scheduler.stop();
    await queue.close();
    await discoveryQueue.close();
    await bot.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  console.log(
    `[worker] en línea. Cola: ${queue.kind === "bullmq" ? "BullMQ (Redis)" : "memoria"} · discovery: ${discoveryQueue.kind}`
  );
  void scheduler.drainNow(); // primer drenado al arrancar
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
