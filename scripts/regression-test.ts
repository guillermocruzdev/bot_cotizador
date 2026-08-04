/**
 * PRUEBA DE REGRESIÓN · Bot Cotizador (Alex)
 *
 * Valida los fixes de producción:
 *  A) normalizePhone + extractEmail + nodos de contacto (re-pregunta, datos limpios)
 *  B) classifyIntent (dontKnow de baja prioridad) + extractSignals con negación
 *     + extractBudgetAmount (rangos) + extractDeadline
 *  E) estructuraWeb y servicios normalizados
 *  F) Las 4 conversaciones de producción (clínica dental, yoga, barbería,
 *     restaurante) cierran en LANDING sin preguntas redundantes.
 *
 * Ejecutar: npm run test:regression  (o: npx tsx scripts/regression-test.ts)
 */

import { createEmptyContext, type ChatContext } from "../lib/types";
import {
  classifyIntent,
  extractBudgetAmount,
  extractDeadline,
  extractEmail,
  normalizePhone,
} from "../lib/personality";
import {
  DONE_NODE_ID,
  FLOW,
  START_NODE_ID,
  getNode,
} from "../lib/conversation-flow";
import { buildClientData, calculateQuote } from "../lib/quote-engine";
import {
  buildFallbackProposal,
  inferCategory,
  resolverCategoria,
} from "../lib/pricing-catalog";
import { filtrarPorDeclinados } from "../lib/industry-pricing";

let failures = 0;
let passed = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    passed += 1;
  } else {
    failures += 1;
    console.error(`  ✗ FALLO: ${label}`);
  }
}

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

/** Llama al onReceive de un nodo del flujo (onReceive es opcional en el tipo). */
function fireOnReceive(nodeId: string, response: string, ctx: ChatContext): void {
  FLOW[nodeId].onReceive?.(response, ctx);
}

// ─── FASE A · Teléfono / email limpios ─────────────────────────────

section("A1 · normalizePhone");
assert(
  normalizePhone("81 2345 6789, ese es mi WhatsApp") === "+52 81 2345 6789",
  'normalizePhone("81 2345 6789, ese es mi WhatsApp") → "+52 81 2345 6789"'
);
assert(normalizePhone("8341234567") === "+52 83 4123 4567", 'normalizePhone("8341234567") → "+52 83 4123 4567"');
assert(
  normalizePhone("+52 81 2345 6789") === "+52 81 2345 6789",
  "idempotente con +52 (mantiene)"
);
assert(
  normalizePhone("521 81 2345 6789") === "+52 1 81 2345 6789",
  "móvil legacy +521 se conserva"
);
assert(normalizePhone("no tengo") === null, "menos de 10 dígitos → null");
assert(normalizePhone("12345") === null, "corto → null");
assert(normalizePhone("") === null, "vacío → null");

section("A3 · extractEmail");
assert(extractEmail("no sé") === null, '"no sé" → null (no guarda basura)');
assert(extractEmail("mi correo es Laura@Clinica.com.mx") === "laura@clinica.com.mx", "tolera texto extra");
assert(extractEmail("correo@dominio") === null, "sin TLD válido → null");
assert(extractEmail("") === null, "vacío → null");

section("A2/A3 · Nodos de contacto (re-pregunta, máx 2 intentos)");
{
  const ctx = createEmptyContext();
  fireOnReceive("contact_email", "no sé", ctx);
  assert(ctx.clientEmail === null, "contact_email 'no sé' NO guarda email");
  const next = FLOW.contact_email.nextNode("no sé", ctx);
  assert(next === "clarify_email", "contact_email 'no sé' re-pregunta (clarify_email)");
}
{
  const ctx = createEmptyContext();
  fireOnReceive("contact_email", "mi correo es laura@clinica.com", ctx);
  assert(ctx.clientEmail === "laura@clinica.com", "email válido se guarda limpio");
  assert(FLOW.contact_email.nextNode("mi correo es laura@clinica.com", ctx) === "contact_phone", "email válido avanza");
}
{
  const ctx = createEmptyContext();
  fireOnReceive("contact_phone", "81 2345 6789, ese es mi WhatsApp", ctx);
  assert(ctx.clientPhone === "+52 81 2345 6789", "teléfono se guarda LIMPIO (normalizado)");
  assert(FLOW.contact_phone.nextNode("81 2345 6789, ese es mi WhatsApp", ctx) === "extra_comments", "teléfono válido avanza");
}
{
  const ctx = createEmptyContext();
  fireOnReceive("contact_phone", "mi número es 81234", ctx);
  assert(ctx.clientPhone === null, "teléfono inválido → null");
  assert(FLOW.contact_phone.nextNode("mi número es 81234", ctx) === "clarify_phone", "teléfono inválido re-pregunta");
}
{
  const ctx = createEmptyContext();
  fireOnReceive("contact_phone", "no tengo teléfono", ctx);
  assert(ctx.clientPhone === null, "'no tengo teléfono' → null");
  assert(FLOW.contact_phone.nextNode("no tengo teléfono", ctx) === "extra_comments", "'no tengo teléfono' NO re-pregunta (avanza)");
}
{
  // Duda ≠ rechazo: "no sé, no me acuerdo del correo" debe RE-PREGUNTAR
  const ctx = createEmptyContext();
  fireOnReceive("contact_email", "no sé, no me acuerdo del correo", ctx);
  assert(ctx.clientEmail === null, "duda de email NO guarda");
  assert(FLOW.contact_email.nextNode("no sé, no me acuerdo del correo", ctx) === "clarify_email", "duda de email re-pregunta");
}
{
  // Rechazo claro: "no tengo correo" avanza sin forzar
  const ctx = createEmptyContext();
  fireOnReceive("contact_email", "no tengo correo", ctx);
  assert(FLOW.contact_email.nextNode("no tengo correo", ctx) === "contact_phone", "'no tengo correo' avanza");
}
{
  // Duda de teléfono → re-pregunta
  const ctx = createEmptyContext();
  fireOnReceive("contact_phone", "no sé mi teléfono", ctx);
  assert(FLOW.contact_phone.nextNode("no sé mi teléfono", ctx) === "clarify_phone", "duda de teléfono re-pregunta");
}

section("A5 · buildClientData con teléfono normalizado");
{
  const cd = buildClientData({ nombre: "X", giro: "y", telefono: "+52 81 2345 6789" });
  assert(cd.telefono === "+528123456789", 'teléfono "+52 81 2345 6789" → "+528123456789"');
  const cdNull = buildClientData({ nombre: "X", giro: "y", telefono: "nope" });
  assert(cdNull.telefono === null, "teléfono inválido → null en ClientData");
}

// ─── FASE B · Intención y señales ──────────────────────────────────

section("B1 · classifyIntent (dontKnow de baja prioridad)");
{
  const a = classifyIntent("No sé, pero sí quiero botón de WhatsApp");
  assert(a.yes === true && a.dontKnow === false, '"No sé, pero sí quiero botón de WhatsApp" → yes:true');
  const b = classifyIntent("No sé, no me decido");
  assert(b.dontKnow === true, '"No sé, no me decido" → dontKnow:true');
  const c = classifyIntent("No, no necesito reservar mesas");
  assert(c.no === true && c.dontKnow === false, '"No, no necesito reservar mesas" → no:true');
  assert(classifyIntent("sí").yes === true, '"sí" → yes');
  assert(classifyIntent("no sé").dontKnow === true, '"no sé" → dontKnow');
}

section("B2 · extractSignals consciente de negación");
{
  const ctx = createEmptyContext();
  fireOnReceive("discovery_business", "No necesito reservar mesas en línea", ctx);
  assert(ctx.citas === null, '"No necesito reservar mesas en línea" → citas NO se activa');
}
{
  const ctx = createEmptyContext();
  fireOnReceive("discovery_business", "Quiero que mis clientes agenden citas", ctx);
  assert(ctx.citas === true, '"quiero que agenden citas" → citas SÍ se activa');
}
{
  const ctx = createEmptyContext();
  fireOnReceive("discovery_business", "No quiero un panel de administración", ctx);
  assert(ctx.dashboard === null, '"No quiero panel" → dashboard NO se activa');
}

section("B3 · extractBudgetAmount (rangos y normalización)");
assert(extractBudgetAmount("unos 8 o 10 mil pesos") === "8000 a 10000", '"unos 8 o 10 mil pesos" → "8000 a 10000"');
assert(extractBudgetAmount("20 mil") === "20000", '"20 mil" → "20000"');
assert(extractBudgetAmount("15k") === "15000", '"15k" → "15000"');
assert(extractBudgetAmount("$8,000 - $10,000") === "8000 a 10000", '"$8,000 - $10,000" → "8000 a 10000"');
assert(extractBudgetAmount("entre 10 y 15 mil") === "10000 a 15000", '"entre 10 y 15 mil" → "10000 a 15000"');
assert(extractBudgetAmount("no sé") === null, '"no sé" → null');

section("B4 · extractDeadline");
assert(extractDeadline("lo quiero para el próximo mes") === "para el próximo mes", '"para el próximo mes" se captura');
assert(
  extractDeadline("me urge, en unas 2 semanas") === "en unas 2 semanas",
  '"en unas 2 semanas" se captura (nuevo patrón)'
);
assert(extractDeadline("en 3 meses") === "en 3 meses", '"en 3 meses" se captura');

// ─── FASE E · Calidad de datos ─────────────────────────────────────

section("E1 · estructuraWeb limpia");
{
  const ctx = createEmptyContext();
  fireOnReceive("pages", "me gusta lo primero, una sola página, algo así como Inicio, Menú, Ubicación y Contacto", ctx);
  assert(
    ctx.estructuraWeb === "Inicio, Menú, Ubicación, Contacto",
    `estructuraWeb limpia → "Inicio, Menú, Ubicación, Contacto" (obtuve: ${ctx.estructuraWeb})`
  );
  const ctx2 = createEmptyContext();
  fireOnReceive("pages", "no sé", ctx2);
  assert(ctx2.estructuraWeb === null, "'no sé' no guarda estructura");
}

section("E2 · scope_services normalizado");
{
  const ctx = createEmptyContext();
  fireOnReceive("scope_services", "corte, barba y afeitado", ctx);
  assert(ctx.servicios === "corte, barba, afeitado", `servicios normalizados → "corte, barba, afeitado" (obtuve: ${ctx.servicios})`);
}

// ─── FASE F · 4 conversaciones de producción cierran en landing ────

function simulate(answers: string[]): { ctx: ChatContext; visited: string[]; used: number } {
  const ctx = createEmptyContext();
  let nodeId: string = START_NODE_ID;
  const visited: string[] = [];
  let used = 0;
  let guard = 0;
  while (nodeId !== DONE_NODE_ID && guard < 200) {
    guard += 1;
    const node = getNode(nodeId);
    if (!node) throw new Error(`Nodo inexistente: ${nodeId}`);
    if (node.type === "greeting") {
      nodeId = node.nextNode("", ctx); // passthrough
      continue;
    }
    if (used >= answers.length) throw new Error(`Faltaron respuestas; en nodo ${nodeId}`);
    const answer = answers[used];
    used += 1;
    node.onReceive?.(answer, ctx);
    nodeId = node.nextNode(answer, ctx);
    visited.push(nodeId);
    let g = 0;
    while (g < 40) {
      const target = getNode(nodeId);
      if (!target || !target.condition || target.condition(ctx)) break;
      nodeId = target.nextNode("", ctx);
      visited.push(nodeId);
      g += 1;
    }
  }
  if (nodeId !== DONE_NODE_ID) throw new Error(`No cerró; terminó en ${nodeId}`);
  return { ctx, visited, used };
}

/** Verifica que la conversación cerró en landing sin redundancia. */
function checkLanding(name: string, answers: string[]): void {
  try {
    const { ctx, visited, used } = simulate(answers);
    assert(ctx.category === "landing", `[${name}] categoría landing (obtuve: ${ctx.category})`);
    assert(ctx.clientEmail !== null && ctx.clientEmail.includes("@"), `[${name}] email limpio guardado`);
    assert(ctx.clientPhone !== null && /^\+52 \d{2} \d{4} \d{4}$/.test(ctx.clientPhone), `[${name}] teléfono limpio guardado (${ctx.clientPhone})`);

    // Sin preguntas redundantes: cada nodo no-clarify se visita una sola vez
    // y ningún nodo de clarificación se repite más de 2 veces.
    const counts = new Map<string, number>();
    for (const id of visited) counts.set(id, (counts.get(id) ?? 0) + 1);
    const dups = Array.from(counts.entries()).filter(([, n]) => n > 1);
    const redundantes = dups.filter(([id]) => !id.startsWith("clarify_"));
    const clarifyExcesivos = dups.filter(([id, n]) => id.startsWith("clarify_") && n > 2);
    assert(redundantes.length === 0, `[${name}] sin preguntas redundantes ${JSON.stringify(redundantes)}`);
    assert(clarifyExcesivos.length === 0, `[${name}] sin ciclos de clarificación ${JSON.stringify(clarifyExcesivos)}`);
    assert(used === answers.length, `[${name}] todas las respuestas se consumieron (${used}/${answers.length})`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ FALLO [${name}]: ${err instanceof Error ? err.message : String(err)}`);
  }
}

section("F · 4 conversaciones de producción cierran en LANDING");
checkLanding("Clínica dental", [
  "Tengo una clínica dental y quiero una página de presentación con información de mis servicios y datos de contacto",
  "sí",
  "Inicio, Servicios, Ubicación y Contacto",
  "no", // cuentas
  "no", // base de datos
  "no", // panel
  "sí", // mapa
  "sí", // WhatsApp
  "no", // citas (no agenda en línea)
  "moderno", // diseño
  "sí", // SEO
  "no", // PWA
  "sí", // contenido listo
  "limpieza dental, ortodoncia y blanqueamiento", // servicios
  "no tengo", // referencia
  "para el próximo mes", // fecha
  "unos 20 mil", // presupuesto
  "Soy Laura", // nombre
  "laura@clinica.com", // email
  "81 2345 6789, ese es mi WhatsApp", // teléfono
  "nada, gracias", // comentarios
]);

checkLanding("Yoga", [
  "Doy clases de yoga, quiero una página sencilla con información de mis clases y cómo contactarme",
  "sí",
  "Inicio, Clases, Horarios y Contacto",
  "no",
  "no",
  "no",
  "sí",
  "sí",
  "no",
  "sobrio",
  "sí",
  "no",
  "no",
  "clases grupales, clases privadas y retiros",
  "no tengo referencia",
  "para ya",
  "15k",
  "Me llamo Andrea",
  "andrea@yoga.com",
  "81 9999 8888",
  "todo bien",
]);

checkLanding("Barbería (Diego)", [
  "Tengo una barbería y quiero que la gente me encuentre en Google y me escriba por WhatsApp",
  "sí",
  "Inicio, Servicios, Galería, Ubicación y Contacto",
  "no",
  "no",
  "no",
  "sí",
  "sí",
  "no",
  "moderno",
  "sí",
  "no",
  "sí",
  "corte, barba, afeitado y cejas",
  "ninguna",
  "lo antes posible",
  "unos 12 mil",
  "Soy Diego",
  "diego@barberia.com",
  "8123456789",
  "no",
]);

checkLanding("Restaurante (Carmen)", [
  "Tengo un restaurante en Puebla, quiero una página para mostrar mi menú, mi ubicación y que me contacten por WhatsApp",
  "sí",
  "Inicio, Menú, Nosotros, Ubicación y Contacto",
  "no",
  "no",
  "no",
  "sí",
  "sí",
  "no",
  "moderno y cálido",
  "sí",
  "no",
  "no",
  "comida casera, desayunos y comida corrida",
  "no tengo",
  "para el próximo mes",
  "entre 10 y 15 mil",
  "Carmen",
  "carmen@restaurante.com.mx",
  "222 333 4455",
  "nada más",
]);

// Tienda de ropa que pide una LANDING básica: antes se clasificaba como
// ecommerce y la propuesta salía en $20,300 (precio de webapp). Ahora debe
// cerrar en landing (con pagos/pdfs SALTADOS por ser landing) y el total
// determinista debe ser el de landing ($12,760).
checkLanding("Tienda de ropa (María)", [
  "Tengo una tienda de ropa en Guadalajara y quiero una página sencilla para que la gente me encuentre por internet. Algo básico, no muy caro",
  "sí",
  "Una sola página de corrido, con inicio, catálogo y contacto",
  "no", // cuentas
  "no", // base de datos
  "no", // panel
  "no", // mapa
  "sí", // WhatsApp
  "no", // citas
  "moderno pero sencillo", // diseño
  "sí", // SEO
  "no", // PWA
  "tengo algunas fotos pero no muy profesionales", // contenido
  "unas 30 prendas con su precio y descripción", // servicios/catálogo
  "no tengo", // referencia
  "en unas 3 semanas", // fecha
  "unos 6 o 7 mil pesos", // presupuesto
  "Me llamo María y mi tienda se llama Moda GDL", // nombre
  "maria.moda@gmail.com", // email
  "33 1234 5678", // teléfono
  "no, con eso es suficiente", // comentarios
]);

// ─── FASE G · Coherencia de precio (landing básica vs tienda online) ──

section("G · Categoría y precio coherentes (tienda de ropa ≠ tienda online)");
{
  // Una tienda de ropa que pide una página sencilla NO es ecommerce.
  assert(
    inferCategory(
      "Tengo una tienda de ropa en Guadalajara y quiero una página sencilla para que la gente me encuentre"
    ) === "landing",
    "tienda de ropa + página sencilla → landing (no ecommerce)"
  );
  // Venta en línea real SÍ es ecommerce.
  assert(
    inferCategory(
      "Quiero una tienda online con carrito, pagos y envíos para vender mi ropa por internet"
    ) === "ecommerce",
    "venta en línea con carrito/pagos → ecommerce"
  );
  assert(
    inferCategory("Tengo una tienda de ropa y quiero vender por internet con carrito") ===
      "ecommerce",
    "tienda + vender por internet → ecommerce"
  );
}
{
  // Presupuesto con "no sé cuánto cobran" + monto: NO re-pregunta y guarda
  // el monto real (antes se perdía y se guardaba la siguiente respuesta).
  const ctx = createEmptyContext();
  const resp =
    "Pues la verdad no sé cuánto cobran, yo pensaba en unos 6 o 7 mil pesos";
  fireOnReceive("budget", resp, ctx);
  assert(
    ctx.presupuesto === "6000 a 7000",
    `presupuesto capturado pese al "no sé" (${ctx.presupuesto})`
  );
  assert(
    FLOW.budget.nextNode(resp, ctx) === "contact_name",
    "con monto avanza (no re-pregunta el presupuesto)"
  );
}
{
  // Resolver: ecommerce sin pagos → landing (no cobrar $20,300 por una landing).
  const ctx = createEmptyContext();
  ctx.category = "ecommerce";
  ctx.pagos = false;
  assert(resolverCategoria(ctx) === "landing", "ecommerce + pagos=false → landing");
  ctx.pagos = true;
  assert(resolverCategoria(ctx) === "ecommerce", "ecommerce + pagos=true → ecommerce");
  // webapp sin panel/db/login → landing
  const ctx2 = createEmptyContext();
  ctx2.category = "webapp";
  ctx2.dashboard = false;
  ctx2.baseDeDatos = false;
  ctx2.autenticacion = false;
  assert(resolverCategoria(ctx2) === "landing", "webapp sin panel/db/login → landing");
}
{
  // filtrarPorDeclinados: quita mapa y base de datos si el cliente los declinó.
  const ctx = createEmptyContext();
  ctx.mapas = false;
  ctx.baseDeDatos = false;
  const res = filtrarPorDeclinados(
    {
      funcionalidades: [
        "Página única con catálogo",
        "Alta en Google Maps y Google My Business para que te ubiquen en el mapa",
      ],
      entregables: ["Botón de WhatsApp", "Alta en Google My Business para el mapa"],
      stack_tecnico: ["Next.js", "Supabase (para catálogo simple)", "Tailwind CSS"],
      recomendaciones: [],
    },
    ctx
  );
  assert(
    !res.funcionalidades!.some((f) => /mapa|my business/i.test(f)),
    "funcionalidades sin promesas de mapa cuando mapas=false"
  );
  assert(
    !res.entregables!.some((e) => /mapa|my business/i.test(e)),
    "entregables sin Google Maps cuando mapas=false"
  );
  assert(
    !res.stack_tecnico!.some((s) => /supabase/i.test(s)),
    "stack sin Supabase cuando baseDeDatos=false"
  );
  assert(res.funcionalidades!.length === 1, "solo queda la funcionalidad limpia");
}
{
  // Precio determinista coherente: landing + dominio/hosting → $12,760.
  const total = calculateQuote(
    buildClientData({
      nombre: "María",
      giro: "Tienda / comercio local",
      tipoWeb: "landing",
      dominioHosting: true,
      branding: false,
    })
  ).total;
  assert(total === 12760, `landing + dominio/hosting → $12,760 (obtuve ${total})`);
  assert(
    Math.round(total / 24) === 532,
    `cuota UI = total/24 → $532/mes (obtuve ${Math.round(total / 24)})`
  );
}
{
  // Propuesta de respaldo (fallback) coherente para María: landing sin mapa
  // ni Supabase, aunque el texto mencione "tienda de ropa".
  const ctx = createEmptyContext();
  ctx.clientName = "María";
  ctx.negocioDescripcion =
    "Tengo una tienda de ropa en Guadalajara y quiero una página sencilla para que la gente me encuentre por internet. Algo básico, no muy caro";
  ctx.category = inferCategory(ctx.negocioDescripcion);
  ctx.pagos = false;
  ctx.mapas = false;
  ctx.baseDeDatos = false;
  ctx.dashboard = false;
  ctx.autenticacion = false;
  ctx.presupuesto = "6000 a 7000";
  const propuesta = buildFallbackProposal(ctx.category!, [], "María", ctx);
  assert(ctx.category === "landing", "María (tienda de ropa sencilla) resuelve a landing");
  assert(
    /presentación|landing/i.test(propuesta.categoria),
    `categoría de propuesta es de presentación (${propuesta.categoria})`
  );
  assert(
    !propuesta.funcionalidades.some((f) => /mapa|my business/i.test(f)),
    "funcionalidades sin mapa cuando mapas=false"
  );
  assert(
    !propuesta.stack_tecnico.some((s) => /supabase/i.test(s)),
    "stack sin Supabase cuando baseDeDatos=false"
  );
}

// ─── Resumen ───────────────────────────────────────────────────────

console.log(`\n${"-".repeat(60)}`);
console.log(`Resultado: ${passed} OK · ${failures} FALLO${failures === 1 ? "" : "S"}`);
if (failures > 0) {
  console.error("\nLa prueba de regresión NO pasó.");
  process.exit(1);
}
console.log("La prueba de regresión pasó ✅");
