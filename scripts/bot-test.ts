// PRUEBA del bot WhatsApp: máquina de estados, anti-ban, cola (memoria), scheduler.
// No requiere Redis, Supabase ni número real de WhatsApp.
// Ejecutar: npm run test:bot

import { AntiBanGuard } from "../prospecting/whatsapp/anti-ban";
import {
  classifyInbound,
  canTransition,
  transition,
} from "../prospecting/whatsapp/state-manager";
import {
  createOutboundQueue,
  type OutboundJobData,
} from "../prospecting/whatsapp/queue-service";
import {
  drainPendingNow,
  markStaleNoResponse,
  type SchedulerDeps,
} from "../prospecting/scheduler/scheduler";
import { getAntiBanConfig } from "../prospecting/config";

let failures = 0;
let passed = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failures++;
    console.error(`  ❌ ${label}`);
  }
}

class FakeBot {
  sent: Array<{ number: string; message: string }> = [];
  async sendText(number: string, message: string): Promise<boolean> {
    this.sent.push({ number, message });
    return true;
  }
}

// Guard "rápido": sin delay y en horario todo el día.
const FAST = {
  delay_min: 0,
  delay_max: 0,
  business_hours: { start: 0, end: 23, timezone: "UTC" },
};
// Guard de horario hábil (solo para probar la franja con fecha explícita).
const HOURS = {
  business_hours: { start: 9, end: 20, timezone: "UTC" },
};

async function main(): Promise<void> {
  console.log("=== Fase A: state machine ===");
  assert(canTransition("pending", "sent"), "pending → sent");
  assert(!canTransition("sent", "interested"), "sent → interested NO (vía responded)");
  assert(canTransition("responded", "interested"), "responded → interested");
  assert(canTransition("interested", "meeting"), "interested → meeting");
  assert(canTransition("meeting", "client"), "meeting → client");
  assert(canTransition("sent", "blacklist"), "sent → blacklist");
  assert(canTransition("sent", "no_response"), "sent → no_response");
  assert(canTransition("no_response", "sent"), "no_response → sent (reintento)");
  assert(!canTransition("blacklist", "sent"), "blacklist es terminal");
  assert(transition("pending", "sent").ok === true, "transition válida OK");
  assert(transition("sent", "interested").ok === false, "transition inválida falla");
  console.log();

  console.log("=== Fase B: classifyInbound ===");
  const kw = getAntiBanConfig().blacklist_keywords;
  assert(classifyInbound("sent", "no gracias, no me interesa", kw).action === "blacklist", "no gracias → blacklist");
  assert(classifyInbound("sent", "por favor stop", kw).action === "blacklist", "stop → blacklist");
  assert(classifyInbound("sent", "dame de baja", kw).action === "blacklist", "baja → blacklist");
  assert(classifyInbound("sent", "eliminar mi número", kw).action === "blacklist", "eliminar → blacklist");
  assert(classifyInbound("sent", "sí, quiero agendar una cita", kw).action === "interested", "agendar cita → interested");
  assert(classifyInbound("sent", "¿cuánto cobran?", kw).action === "faq", "pregunta → faq");
  assert(classifyInbound("sent", "buenos días, gracias", kw).action === "human_mode", "otro → human_mode");
  console.log();

  console.log("=== Fase C: anti-ban ===");
  const gh = new AntiBanGuard(HOURS);
  assert(gh.isBusinessHours(new Date("2026-08-05T12:00:00Z")) === true, "12:00 UTC dentro de horario");
  assert(gh.isBusinessHours(new Date("2026-08-05T23:00:00Z")) === false, "23:00 UTC fuera de horario");
  const gl = new AntiBanGuard({ ...FAST, daily_limit: 2 });
  assert(gl.canSend("+5212345").ok === true, "envío 1 OK");
  gl.recordSend("+5212345");
  assert(gl.canSend("+5212345").ok === true, "envío 2 OK");
  gl.recordSend("+5212345");
  const third = gl.canSend("+5212345");
  assert(third.ok === false && third.reason === "daily_limit_reached", "límite diario alcanzado");
  const gr = new AntiBanGuard({ delay_min: 30000, delay_max: 90000 });
  const d = gr.randomDelayMs();
  assert(d >= 30000 && d <= 90000, `delay aleatorio en [30k,90k] (${d})`);
  console.log();

  console.log("=== Fase D: cola (memoria) + envío ===");
  const bot = new FakeBot();
  const guard = new AntiBanGuard(FAST);
  const updates: Array<[string, string]> = [];
  const queue = createOutboundQueue({
    bot,
    guard,
    updateLeadStatus: async (id, st) => {
      updates.push([id, st]);
    },
  });
  await queue.add({ leadId: "lead-1", number: "+5212345", message: "Hola prueba" });
  assert(bot.sent.length === 1, "mensaje enviado");
  assert(bot.sent[0].message === "Hola prueba", "contenido correcto");
  assert(
    updates.some(([id, st]) => id === "lead-1" && st === "sent"),
    "estado del lead → sent"
  );
  assert(guard.sentToday("+5212345") === 1, "contador de envíos actualizado");
  await queue.close();
  console.log();

  console.log("=== Fase E: scheduler (horario hábil) ===");
  const sBot = new FakeBot();
  const sQueue = createOutboundQueue({ bot: sBot, guard: new AntiBanGuard(FAST) });
  const deps: SchedulerDeps = {
    queue: sQueue,
    guard: new AntiBanGuard(HOURS), // solo se usa para el chequeo de horario
    getPendingLeads: async () => [
      { id: "p1", name: "Café Central", category: "restaurant", location: "Puebla, México", phone: "+5211111" },
      { id: "p2", name: "Gimnasio Fit", category: "gym", location: "Guadalajara, México", phone: "+5222222" },
    ],
    company: "Agencia Web MX",
  };
  const r1 = await drainPendingNow(deps, 50, new Date("2026-08-05T12:00:00Z"));
  assert(r1.enqueued === 2 && r1.skippedOutsideHours === false, "drena 2 dentro de horario");
  assert(sBot.sent.length === 2, "2 mensajes encolados y enviados");
  const r2 = await drainPendingNow(deps, 50, new Date("2026-08-05T23:00:00Z"));
  assert(r2.skippedOutsideHours === true && r2.enqueued === 0, "fuera de horario no drena");
  const stale = await markStaleNoResponse({
    ...deps,
    getSentOlderThan: async () => ["s1", "s2"],
    updateLeadStatus: async (id, st) => {
      updates.push([id, st]);
    },
  });
  assert(stale === 2, "2 leads 'sent' → 'no_response'");
  await sQueue.close();
  console.log();

  console.log(`\nResumen: ${passed} OK · ${failures} FALLOS`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
