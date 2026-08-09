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

import { createEmptyContext, normalizarArraysResultado, type ChatContext, type AnalysisResult } from "../lib/types";
import {
  classifyIntent,
  detectTrato,
  extractBudgetAmount,
  extractDeadline,
  extractEmail,
  normalizePhone,
  toUsted,
} from "../lib/personality";
import {
  DONE_NODE_ID,
  FLOW,
  START_NODE_ID,
  getNode,
} from "../lib/conversation-flow";
import { buildClientData, calculateQuote, calcularTotalDeterminista, derivarTipoWeb } from "../lib/quote-engine";
import {
  detectarBotsRecomendados,
  extraerBotsDeRespuesta,
  getBotById,
  sugerirEscaleraProducto,
  totalBotsMensual,
  totalBotsSetup,
} from "../lib/bots-catalog";
import {
  buildFallbackProposal,
  estimatePrice,
  inferCategory,
  inferNivel,
  resolverCategoria,
} from "../lib/pricing-catalog";
import { filtrarPorDeclinados, adaptarCopyGiro, detectarGiro } from "../lib/industry-pricing";

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

section('B1b · classificaIntent: "no" con palabras ambiguas (eso/ya/claro/justo)');
{
  // "eso" en "eso no lo quiero" es PRONOMBRE, no confirmación → debe ser no:true
  // (antes caía en la rama ambigua yes+no → no:false → citas quedaba en null y
  // la propuesta prometía "agenda de citas" que el cliente declinó).
  assert(
    classifyIntent("No, no, eso no lo quiero. La gente me llama o me escribe y yo les aparto su lugar por teléfono").no === true,
    '"No, no, eso no lo quiero…" → no:true'
  );
  assert(classifyIntent("No, no, eso no lo quiero").no === true, '"No, no, eso no lo quiero" → no:true');
  assert(classifyIntent("no, no, no quiero eso").no === true, '"no, no, no quiero eso" → no:true');
  assert(classifyIntent("no, ya no me interesa").no === true, '"no, ya no me interesa" → no:true');
  assert(classifyIntent("no, claro que no").no === true, '"no, claro que no" → no:true');
  // Sin negación, "eso" SÍ es confirmación
  assert(classifyIntent("eso").yes === true, '"eso" solo → yes:true');
  assert(
    classifyIntent("Sí, ese botón del WhatsApp es justo lo que quiero").yes === true,
    '"Sí, … justo lo que quiero" → yes:true'
  );
}

section("B2 · extractSignals consciente de negación");
{
  // Rechazo explícito → citas=false: el bot YA SABE que no las quiere y no
  // volverá a preguntarlas (antes quedaba null = "desconocido" y preguntaba).
  const ctx = createEmptyContext();
  fireOnReceive("discovery_business", "No necesito reservar mesas en línea", ctx);
  assert(ctx.citas === false, '"No necesito reservar mesas en línea" → citas=false (rechazo conocido)');
}
{
  const ctx = createEmptyContext();
  fireOnReceive("discovery_business", "Quiero que mis clientes agenden citas", ctx);
  assert(ctx.citas === true, '"quiero que agenden citas" → citas SÍ se activa');
}
{
  const ctx = createEmptyContext();
  fireOnReceive("discovery_business", "No quiero un panel de administración", ctx);
  assert(ctx.dashboard === false, '"No quiero panel" → dashboard=false (rechazo conocido)');
}
{
  // Duda ≠ rechazo: "no sé si quiero X" se deja en null → el bot confirma después.
  const ctx = createEmptyContext();
  fireOnReceive("discovery_business", "No sé si quiero que agenden citas en línea", ctx);
  assert(ctx.citas === null, '"No sé si quiero citas" → null (duda, no rechazo)');
}
{
  // "no quiero pagar publicidad" NO debe marcar pagos=false ("pagar" suelto no
  // es cobro en línea; evita degradar un ecommerce real a landing por error).
  const ctx = createEmptyContext();
  fireOnReceive(
    "discovery_business",
    "Quiero una tienda online con carrito, pero no quiero pagar publicidad",
    ctx
  );
  assert(ctx.pagos === null, '"no quiero pagar publicidad" → pagos sigue null');
}
{
  // Rechazo claro de pagos en línea → pagos=false.
  const ctx = createEmptyContext();
  fireOnReceive("discovery_business", "No quiero pagos en línea, mejor que me contacten por WhatsApp", ctx);
  assert(ctx.pagos === false, '"no quiero pagos en línea" → pagos=false');
}
{
  // Rechazos encadenados con "ni": "no quiero pagos, ni panel, ni cuentas".
  const ctx = createEmptyContext();
  fireOnReceive(
    "discovery_business",
    "No quiero pagos en línea, ni panel de administración, ni cuentas para pacientes",
    ctx
  );
  assert(ctx.pagos === false, '"ni panel/ni cuentas": pagos=false');
  assert(ctx.dashboard === false, '"ni panel/ni cuentas": dashboard=false');
  assert(ctx.autenticacion === false, '"ni panel/ni cuentas": autenticacion=false');
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
{
  // Redacción natural con prefijo de afirmación y relleno final: debe quedar
  // SOLO la lista de secciones, sin "Sí, así" ni "Con eso me conformo".
  const ctx = createEmptyContext();
  fireOnReceive(
    "pages",
    "Sí, así una sola página: inicio, mis servicios, la ubicación con el mapa y el contacto. Con eso me conformo",
    ctx
  );
  assert(
    ctx.estructuraWeb === "Inicio, Mis servicios, Ubicación con el mapa, Contacto",
    `estructuraWeb limpia con prefijo/relleno → "Inicio, Mis servicios, Ubicación con el mapa, Contacto" (obtuve: ${ctx.estructuraWeb})`
  );
}

// ─── FASE E1b · extractSections descarta lo que está ANTES de la 1ª sección ──
// Bug: una respuesta que mezcla la estructura con una opinión previa
// ("La primera, algo minimalista con fotos grandes. Pues imagino una sola
// página de corrido: inicio, ...") dejaba el prefijo como sección basura.
// Ahora se toma la lista desde la primera sección real, ignorando el prefijo.

section("E1b · estructuraWeb sin residuo antes de la primera sección");
{
  // Ejemplo problemático real: debe quedarse SOLO con las 4 secciones reales.
  const ctx = createEmptyContext();
  fireOnReceive(
    "pages",
    "La primera, algo minimalista con fotos grandes. Pues imagino una sola página de corrido: inicio, mis productos, cómo llegar y el contacto.",
    ctx
  );
  assert(
    ctx.estructuraWeb === "Inicio, Mis productos, Cómo llegar, Contacto",
    `sin residuo antes de la 1ª sección → "Inicio, Mis productos, Cómo llegar, Contacto" (obtuve: ${ctx.estructuraWeb})`
  );
}
{
  // FASE E1 sigue igual (caso sin ":"): la estructura limpia se conserva.
  const ctx = createEmptyContext();
  fireOnReceive(
    "pages",
    "me gusta lo primero, una sola página, algo así como Inicio, Menú, Ubicación y Contacto",
    ctx
  );
  assert(
    ctx.estructuraWeb === "Inicio, Menú, Ubicación, Contacto",
    `E1 intacto → "Inicio, Menú, Ubicación, Contacto" (obtuve: ${ctx.estructuraWeb})`
  );
}
{
  // FASE K sigue igual: prefijo de afirmación y relleno final sin residuos.
  const ctx = createEmptyContext();
  fireOnReceive(
    "pages",
    "Sí, así una sola página: inicio, mis servicios, la ubicación con el mapa y el contacto. Con eso me conformo",
    ctx
  );
  assert(
    ctx.estructuraWeb === "Inicio, Mis servicios, Ubicación con el mapa, Contacto",
    `FASE K intacta → "Inicio, Mis servicios, Ubicación con el mapa, Contacto" (obtuve: ${ctx.estructuraWeb})`
  );
}

section("E2 · scope_services normalizado");
{
  const ctx = createEmptyContext();
  fireOnReceive("scope_services", "corte, barba y afeitado", ctx);
  assert(ctx.servicios === "corte, barba, afeitado", `servicios normalizados → "corte, barba, afeitado" (obtuve: ${ctx.servicios})`);
}

// ─── FASE F · 4 conversaciones de producción cierran en landing ────

function simulate(answers: string[]): {
  ctx: ChatContext;
  visited: string[];
  used: number;
  /** Nodos donde SÍ se consumió una respuesta (los saltados no aparecen) */
  asked: string[];
} {
  const ctx = createEmptyContext();
  let nodeId: string = START_NODE_ID;
  const visited: string[] = [];
  const asked: string[] = [];
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
    asked.push(nodeId);
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
  return { ctx, visited, used, asked };
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
  "Quiero el botón de WhatsApp y que me encuentren en Google. No necesito panel ni citas en línea", // bundle (mapa ya inferido por "Ubicación")
  "moderno", // diseño
  "el de preguntas frecuentes, por favor", // bots (LangChain): FAQ
  // PWA, referencia, cuentas y BD: se SALTAN para landing (Tarea C)
  "sí", // contenido listo
  "limpieza dental, ortodoncia y blanqueamiento", // servicios
  "para el próximo mes, y de presupuesto unos 20 mil", // fecha + presupuesto (budget fusionado)
  "Soy Laura, laura@clinica.com, 81 2345 6789", // nombre + correo + WhatsApp (contacto fusionado)
  "nada, gracias", // comentarios
]);

checkLanding("Yoga", [
  "Doy clases de yoga, quiero una página sencilla con información de mis clases y cómo contactarme",
  "sí",
  "Inicio, Clases, Horarios y Contacto",
  "Sí quiero el mapa, el botón de WhatsApp y que me encuentren en Google, pero no el panel ni las citas", // bundle
  "sobrio", // diseño
  "ninguno", // bots (LangChain): sin asistentes IA
  // PWA, referencia, cuentas y BD: se SALTAN para landing (Tarea C)
  "no", // contenido
  "clases grupales, clases privadas y retiros", // servicios
  "para ya, y de presupuesto unos 15 mil", // fecha + presupuesto (budget fusionado)
  "Me llamo Andrea, andrea@yoga.com, 81 9999 8888", // contacto fusionado
  "todo bien", // comentarios
]);

checkLanding("Barbería (Diego)", [
  "Tengo una barbería y quiero que la gente me encuentre en Google y me escriba por WhatsApp",
  "sí",
  "Inicio, Servicios, Galería, Ubicación y Contacto",
  "No necesito panel ni citas en línea", // bundle (chat/seo/mapa ya inferidos en la descripción y secciones)
  "moderno", // diseño
  "ninguno", // bots (LangChain): sin asistentes IA
  // PWA, referencia, cuentas y BD: se SALTAN para landing (Tarea C)
  "sí", // contenido
  "corte, barba, afeitado y cejas", // servicios
  "lo antes posible, y de presupuesto unos 12 mil", // fecha + presupuesto (budget fusionado)
  "Soy Diego, diego@barberia.com, 8123456789", // contacto fusionado
  "no", // comentarios
]);

checkLanding("Restaurante (Carmen)", [
  "Tengo un restaurante en Puebla, quiero una página para mostrar mi menú, mi ubicación y que me contacten por WhatsApp",
  "sí",
  "Inicio, Menú, Nosotros, Ubicación y Contacto",
  "Quiero que me encuentren en Google. No necesito panel ni agendo citas", // bundle (mapa/WhatsApp ya inferidos)
  "moderno y cálido", // diseño
  "el de promociones", // bots (LangChain): promos
  // PWA, referencia, cuentas y BD: se SALTAN para landing (Tarea C)
  "no", // contenido
  "comida casera, desayunos y comida corrida", // servicios
  "para el próximo mes, y entre 10 y 15 mil", // fecha + presupuesto (budget fusionado)
  "Carmen, carmen@restaurante.com.mx, 222 333 4455", // contacto fusionado
  "nada más", // comentarios
]);

// Tienda de ropa que pide una LANDING básica: antes se clasificaba como
// ecommerce y la propuesta salía en $20,300 (precio de webapp). Ahora debe
// cerrar en landing (con pagos/pdfs SALTADOS por ser landing) y el total
// determinista debe ser el de landing ($12,760).
checkLanding("Tienda de ropa (María)", [
  "Tengo una tienda de ropa en Guadalajara y quiero una página sencilla para que la gente me encuentre por internet. Algo básico, no muy caro",
  "sí",
  "Una sola página de corrido, con inicio, catálogo y contacto",
  "Sí quiero el botón de WhatsApp y que me encuentren en Google, pero no el panel, ni el mapa, ni las citas", // bundle
  "moderno pero sencillo", // diseño
  "ninguno", // bots (LangChain): sin asistentes IA
  // PWA, referencia, cuentas y BD: se SALTAN para landing (Tarea C)
  "tengo algunas fotos pero no muy profesionales", // contenido
  "unas 30 prendas con su precio y descripción", // servicios/catálogo
  "en unas 3 semanas, y de presupuesto unos 6 o 7 mil pesos", // fecha + presupuesto (budget fusionado)
  "Me llamo María y mi tienda se llama Moda GDL, maria.moda@gmail.com, 33 1234 5678", // contacto fusionado
  "no, con eso es suficiente", // comentarios
]);

// Taller mecánico que declina CITAS (con "eso" como pronombre: "eso no lo
// quiero"). Antes el "no" no se detectaba → ctx.citas=null → el copy prometía
// "agenda de citas" que el cliente rechazó. Ahora debe cerrar en landing con
// citas=false y el copy neutro.
const TALLER_RICARDO_ANSWERS = [
  "Pues mire, yo tengo un taller mecánico aquí en Toluca, el Taller El Toro. La gente me busca mucho por el teléfono y por el WhatsApp, pero cuando buscan en Google no salgo. Quiero una página bien sencilla, algo básico, para que me encuentren y me hablen. No quiero nada muy caro",
  "sí, sí, así está bien. Algo sencillo, como le digo",
  "Sí, así una sola página: inicio, mis servicios, la ubicación con el mapa y el contacto. Con eso me conformo",
  "No, no necesito ningún panel. Con que me lleguen las llamadas y los mensajes del WhatsApp, con eso me basta. Y no, no quiero citas en línea, la gente me llama o me escribe y yo les aparto su lugar por teléfono", // bundle (mapa/chat/SEO ya inferidos de la descripción y secciones)
  "Pues algo sobrio, de confianza, que se vea serio. Nada de muchas cosas con movimiento ni nada muy elegante, ¿eh?", // diseño
  "Ninguno, la verdad, con la página me basta", // bots (LangChain): sin asistentes IA
  // PWA, referencia, cuentas y BD: se SALTAN para landing (Tarea C)
  "Pues tengo unas fotos del taller que saqué con mi celular, pero no son muy profesionales. El logo del Toro lo tengo pero está medio sencillo. Si me ayuda con los textos, mejor", // contenido
  "Pues le ofrezco a la gente cambio de aceite, frenos, afinación y también el escaneo de la computadora del carro. Sin precios mejor, porque cada coche es distinto; con una breve descripción de cada uno está bien", // servicios
  "Pues no hay mucha prisa, la verdad. Cuando se pueda, con calma, no le urge. Y mire, la verdad yo pensaba en unos 5 o 6 mil pesos, no más. ¿Cree que con eso alcance para algo bien hecho?", // fecha + presupuesto (budget fusionado)
  "Me llamo Ricardo Mendoza, ricardo.tallertoro@gmail.com, 722 123 4567, y el negocio se llama Taller El Toro", // contacto fusionado
  "No, ya con eso es todo, muchas gracias", // comentarios
];
checkLanding("Taller (Ricardo)", TALLER_RICARDO_ANSWERS);

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
    FLOW.budget.nextNode(resp, ctx) === "clarify_budget",
    "con monto pero sin fecha → clarify_budget pide la fecha (no repite el monto)"
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

// ─── FASE H · El copy respeta funciones que el cliente DECLINÓ ─────
// (bug: "eso no lo quiero" daba citas=null → el copy del taller mecánico
// prometía "agenda de citas" que el cliente rechazó).

section("H · Copy sin prometer lo declinado (taller mecánico, citas=false)");
{
  // El "no" con "eso" como pronombre registra el rechazo real de citas.
  const ctx = createEmptyContext();
  fireOnReceive(
    "technical_bookings",
    "No, no, eso no lo quiero. La gente me llama o me escribe y yo les aparto su lugar por teléfono",
    ctx
  );
  assert(ctx.citas === false, "technical_bookings: 'eso no lo quiero' → citas=false (antes null)");
}
{
  // Con citas=false el copy del giro mecánico (que prometía "agenda de citas")
  // cae al neutro: pitch, beneficios y costo_omision sin mencionar citas.
  const ctx = createEmptyContext();
  ctx.citas = false;
  const giro = detectarGiro("tengo un taller mecánico en Toluca", "landing");
  const copy = adaptarCopyGiro(giro, ctx);
  assert(giro.nombre.includes("Taller"), "giro detectado: Taller mecánico / automotriz");
  assert(!/agenda|citas/i.test(copy.pitch), "pitch sin prometer citas cuando citas=false");
  assert(
    !copy.beneficios.some((b) => /agenda|citas/i.test(b)),
    "beneficios sin citas cuando citas=false"
  );
  assert(!/agenda|citas/i.test(copy.costo_omision), "costo_omision sin citas cuando citas=false");
}
{
  // Conversación completa de Ricardo: landing, citas=false y la propuesta
  // fallback usa copy NEUTRO (nunca promete "agenda de citas").
  const { ctx } = simulate(TALLER_RICARDO_ANSWERS);
  assert(ctx.category === "landing", "[Taller Ricardo] categoría landing");
  assert(ctx.citas === false, "[Taller Ricardo] citas=false tras la conversación");
  const prop = buildFallbackProposal(ctx.category!, [], "Ricardo Mendoza", ctx);
  const copyTexto = [
    prop.punto_venta,
    prop.dolor,
    ...(prop.beneficios ?? []),
    prop.costo_omision,
  ].join(" ");
  assert(
    !/agenda|citas/i.test(copyTexto),
    "[Taller Ricardo] propuesta fallback sin prometer citas en el copy"
  );
  assert(
    !prop.stack_tecnico.some((s) => /supabase/i.test(s)),
    "[Taller Ricardo] stack sin Supabase (landing básica)"
  );
}

// ─── FASE I · No repreguntar lo que el cliente ya rechazó ──────────
// Si el cliente dice desde su descripción "no quiero pagos en línea, ni panel,
// ni cuentas", el bot NO debe volver a preguntarlas: solo confirma lo que SÍ
// quiere (citas en línea, mapa, WhatsApp) y pregunta lo que aún no se sabe.

section("I · No repreguntar lo que ya rechazó en la descripción");
{
  const { ctx, asked } = simulate([
    "Tengo una clínica dental y quiero que mis pacientes agenden citas en línea, pero NO quiero pagos en línea, ni panel de administración, ni cuentas para pacientes",
    "sí, así es", // discovery_confirm
    "Inicio, Servicios, Ubicación y Contacto, una sola página", // pages
    "No, no necesito guardar datos de mis pacientes. Sí quiero que me escriban por WhatsApp y que me encuentren en Google, pero no la app instalable", // bundle (mapa ya inferido por "Ubicación")
    "moderno pero de confianza", // design
    "ninguno", // bots (LangChain): sin asistentes IA
    "sí, ya tengo fotos de la clínica", // scope_content
    "limpieza dental, ortodoncia y blanqueamiento", // scope_services
    "ninguna referencia", // scope_reference
    "para el próximo mes, y de presupuesto unos 20 mil", // budget (fecha + monto)
    "Soy la Dra. Laura, laura@clinica.com, 81 2345 6789", // contacto fusionado
    "no, gracias", // extra_comments
  ]);
  assert(ctx.category === "citas", "[Clínica] categoría citas");
  assert(ctx.citas === true, "[Clínica] citas=true (lo quiere, se confirma)");
  assert(ctx.pagos === false, "[Clínica] pagos=false (lo rechazó en la descripción)");
  assert(ctx.dashboard === false, "[Clínica] dashboard=false");
  assert(ctx.autenticacion === false, "[Clínica] autenticacion=false");
  // El bundle consolida: ninguna función técnica se pregunta de una por una.
  const noPreguntadas = [
    "technical_auth", "technical_payments", "technical_dashboard", "technical_pdfs",
    "technical_bookings", "technical_db", "technical_maps", "technical_chat",
    "technical_seo", "technical_pwa",
  ];
  const preguntadas = noPreguntadas.filter((id) => asked.includes(id));
  assert(
    preguntadas.length === 0,
    `[Clínica] el bundle consolida las funciones (preguntó de una por una: ${preguntadas.join(", ") || "ninguna"})`
  );
  // Sí se pregunta el bundle y deja resueltos db/mapa/chat/SEO/PWA.
  assert(asked.includes("technical_bundle"), "[Clínica] el bundle consolidado SÍ se pregunta");
  assert(ctx.baseDeDatos === false, "[Clínica] baseDeDatos=false (del bundle)");
  assert(
    ctx.chat === true && ctx.seo === true && ctx.pwa === false,
    "[Clínica] chat/SEO/PWA resueltos por el bundle"
  );
  assert(ctx.mapas === true, "[Clínica] mapas=true (inferido por 'Ubicación')");
}

// ─── FASE J · La propuesta siempre trae arrays (el LLM puede omitirlos) ──
// Si DeepSeek regresa un JSON sin stack_tecnico/funcionalidades/entregables/
// recomendaciones, la UI (TechStackTags/FeatureList) hacía .map() sobre
// undefined y TUMBABA toda la página /results.

section("J · Arrays garantizados en el resultado (no rompe /results)");
{
  const r = normalizarArraysResultado({
    categoria: "X",
    precio_min: 1,
    precio_max: 2,
  } as Partial<AnalysisResult>);
  assert(Array.isArray(r.stack_tecnico), "stack_tecnico garantizado como array");
  assert(Array.isArray(r.funcionalidades), "funcionalidades garantizado como array");
  assert(Array.isArray(r.entregables), "entregables garantizado como array");
  assert(Array.isArray(r.recomendaciones), "recomendaciones garantizado como array");
  assert((r.stack_tecnico as string[]).length === 0, "stack vacío en lugar de undefined");
  // No pisa arrays ya presentes:
  const r2 = normalizarArraysResultado({
    categoria: "X",
    precio_min: 1,
    precio_max: 2,
    stack_tecnico: ["Next.js", "Tailwind"],
  } as Partial<AnalysisResult>);
  assert(Array.isArray(r2.stack_tecnico) && (r2.stack_tecnico as string[]).length === 2, "conserva arrays ya presentes");
}

// ─── FASE K · Confirmación con lista de rechazos (Carlos) ──────────
// Bug: un "Sí, así es… nada de vender por internet ni nada de eso" daba
// {yes:false} (ambigüedad por "nada"/"ni"), discovery_confirm mandaba al
// cliente a discovery_examples y TODO el flujo corría un nodo desfasado:
// la estructura quedaba como basura, chat=false (aunque quería WhatsApp),
// y seo/citas/pwa/dashboard en null. La confirmación inequívoca debe ganar
// cuando la negación solo viene de una lista ("nada/ni/tampoco").

section("K · Confirmación con lista de rechazos (Carlos)");
{
  assert(
    classifyIntent(
      "Sí, sí, así es. Algo sencillo que se vea bien y donde la gente pueda ver mis fotos y me pueda contactar. Nada de andar vendiendo por internet ni nada de eso"
    ).yes === true,
    '"Sí, así es… nada de X ni Y" → yes:true (lista de rechazos no anula la confirmación)'
  );
  assert(
    classifyIntent("Sí, sí, así es. Nada de andar vendiendo por internet.").yes === true,
    '"Sí, así es. Nada de X." → yes:true'
  );
  // Un "no" fuerte SÍ rompe la confirmación (sigue siendo ambigua).
  const amb = classifyIntent("Sí, pero no quiero vender por internet");
  assert(amb.yes === false && amb.no === false, '"Sí, pero no quiero X" → ambigua (no falso sí)');
}
{
  // Conversación completa de Carlos (tienda de ropa, landing) SIN desfase:
  // discovery_confirm debe ir a pages, y cada señal debe quedar limpia.
  const { ctx } = simulate([
    "Hola, tengo una tienda de ropa en Guadalajara y quiero una página sencilla para que la gente me encuentre por internet. Algo básico, no muy caro",
    "Sí, sí, así es. Algo sencillo que se vea bien y donde la gente pueda ver mis fotos y me pueda contactar. Nada de andar vendiendo por internet ni nada de eso",
    "Una sola página de corrido: inicio, mis productos, cómo llegar y el contacto",
    "No, no quiero ningún panel, con que me escriban por WhatsApp me basta. No necesito citas en línea, pero sí que me encuentren en Google cuando busquen tienda de ropa", // bundle (mapa ya inferido por "cómo llegar")
    "Algo moderno pero sobrio, con fotos grandes y que se vea limpio", // design
    "ninguno", // bots (LangChain): sin asistentes IA
    // PWA, referencia, cuentas y BD: se SALTAN para landing (Tarea C)
    "Tengo fotos de mi mercancía y el logo, pero los textos me ayudarías tú", // scope_content
    "Camisas de vestir, pantalones de mezclilla y trajes para caballero", // scope_services
    "Lo quiero para el próximo mes, y de presupuesto unos 10 mil pesos, no más de eso", // budget (fecha + monto)
    "Me llamo Carlos, mi correo es carlos.tijeradeoro@gmail.com y mi WhatsApp es 33 1234 5678; la tienda se llama La Tijera de Oro", // contacto fusionado
    "No, con eso es todo", // extra_comments
  ]);
  assert(ctx.category === "landing", "[Carlos] categoría landing");
  assert(ctx.chat === true, "[Carlos] chat=true (sí quiere WhatsApp)");
  assert(ctx.citas === false, "[Carlos] citas=false (declinó citas en línea)");
  assert(ctx.seo === true, "[Carlos] seo=true (sí quiere Google)");
  // Para landing, cuentas y BD ya no se preguntan: quedan null (sin cuentas/BD).
  assert(ctx.baseDeDatos === null, "[Carlos] baseDeDatos=null (no se preguntó para landing)");
  assert(ctx.dashboard === false, "[Carlos] dashboard=false (no quiere panel)");
  assert(ctx.autenticacion === null, "[Carlos] autenticacion=null (no se preguntó para landing)");
  assert(ctx.mapas === true, "[Carlos] mapas=true (sí quiere el mapa)");
  assert(ctx.pwa === null, "[Carlos] pwa se SALTÓ (ya no se pregunta para landing)");
  assert(ctx.paginas === 1, "[Carlos] paginas=1 (una sola página)");
  assert(
    /inicio.*productos.*c[oó]mo llegar.*contacto/i.test(ctx.estructuraWeb ?? ""),
    `[Carlos] estructuraWeb con secciones limpias (${ctx.estructuraWeb})`
  );
  assert(
    /camisas.*pantalones.*trajes/i.test(ctx.servicios ?? ""),
    `[Carlos] servicios con la lista de ropa (${ctx.servicios})`
  );
  assert(ctx.clientName === "Carlos", `[Carlos] nombre limpio (${ctx.clientName})`);
  assert(ctx.clientEmail === "carlos.tijeradeoro@gmail.com", "[Carlos] email limpio");
  assert(ctx.clientPhone === "+52 33 1234 5678", "[Carlos] teléfono limpio +52");
  assert(ctx.presupuesto === "10000", `[Carlos] presupuesto 10000 (${ctx.presupuesto})`);
}

// ─── FASE P2 · Plazo + presupuesto en un solo turno (no re-preguntar) ──
// Antes eran scope_deadline y budget (dos preguntas separadas). Ahora se
// fusionan: si el cliente menciona fecha y monto juntos, budget captura ambos
// y avanza; si solo da uno, clarify_budget afina el que falta (máx 2).

section("P2 · Plazo + presupuesto en un solo turno (budget fusionado)");
{
  // Fecha + monto juntos: se capturan ambos y budget avanza directo a contacto.
  const ctx = createEmptyContext();
  const resp =
    "Para mediados del próximo mes está bien. Y de presupuesto, la verdad no sé cuánto cobran, pero yo pensaba en unos 10 mil pesos, no más.";
  fireOnReceive("budget", resp, ctx);
  assert(
    ctx.presupuesto === "10000",
    `[P2] monto capturado junto al plazo → 10000 (obtuve: ${ctx.presupuesto})`
  );
  assert(ctx.fechaEntrega !== null, `[P2] fechaEntrega también se captura (${ctx.fechaEntrega})`);
  // Con fecha + monto, avanza a contacto aunque haya un "no sé" retórico.
  assert(
    FLOW.budget.nextNode(resp, ctx) === "contact_name",
    "[P2] con fecha + monto → contact_name (no re-pregunta)"
  );
  assert(
    FLOW.budget.condition?.(ctx) === false,
    "[P2] budget.condition = false (nada pendiente)"
  );
  assert(
    FLOW.budget.nextNode("", ctx) === "contact_name",
    "[P2] skip de budget → contact_name"
  );
}
{
  // Fecha SIN monto → clarify_budget pide el monto que falta.
  const ctx = createEmptyContext();
  fireOnReceive("budget", "Lo quiero para el próximo mes", ctx);
  assert(ctx.presupuesto === null, "[P2] plazo sin monto → presupuesto sigue null");
  assert(ctx.fechaEntrega !== null, "[P2] la fecha sí se captura");
  assert(
    FLOW.budget.nextNode("Lo quiero para el próximo mes", ctx) === "clarify_budget",
    "[P2] solo dio la fecha → clarify_budget pide el monto"
  );
}
{
  // Flujo completo con monto en el plazo: budget se salta y el flujo llega a
  // contact_name sin re-preguntar (asked = nodos donde SÍ se consumió respuesta).
  const { ctx, asked } = simulate([
    "Doy clases de yoga, quiero una página sencilla con información de mis clases y cómo contactarme",
    "sí",
    "Inicio, Clases, Horarios y Contacto",
    "Sí quiero el mapa, el botón de WhatsApp y que me encuentren en Google, pero no el panel ni las citas", // bundle
    "sobrio", // diseño
    "ninguno", // bots (LangChain): sin asistentes IA
    "no", // contenido
    "clases grupales, clases privadas y retiros", // servicios
    "para ya, y de presupuesto unos 15 mil pesos", // budget (fecha + monto en uno)
    "Me llamo Andrea, andrea@yoga.com, 81 9999 8888", // contacto fusionado
    "todo bien", // comentarios
  ]);
  assert(
    ctx.presupuesto === "15000",
    `[P2-flujo] presupuesto capturado junto al plazo (${ctx.presupuesto})`
  );
  assert(
    asked.includes("budget") && !asked.includes("clarify_budget"),
    "[P2-flujo] budget SÍ se pregunta (fusionado) y no re-pregunta (sin clarify)"
  );
  assert(asked.includes("contact_name"), "[P2-flujo] el flujo llegó a contact_name");
  assert(ctx.fechaEntrega !== null, "[P2-flujo] fechaEntrega también capturada");
}
{
  // Flujo completo SIN monto en el plazo: budget SÍ se pregunta y avanza.
  const { ctx, asked } = simulate([
    "Doy clases de yoga, quiero una página sencilla con información de mis clases y cómo contactarme",
    "sí",
    "Inicio, Clases, Horarios y Contacto",
    "Sí quiero el mapa, el botón de WhatsApp y que me encuentren en Google, pero no el panel ni las citas", // bundle
    "sobrio", // diseño
    "ninguno", // bots (LangChain): sin asistentes IA
    "no", // contenido
    "clases grupales, clases privadas y retiros", // servicios
    "para ya", // budget: solo fecha
    "unos 15 mil", // clarify_budget: el monto que faltaba
    "Me llamo Andrea, andrea@yoga.com, 81 9999 8888", // contacto fusionado
    "todo bien", // comentarios
  ]);
  assert(
    ctx.presupuesto === "15000",
    `[P2-flujo] presupuesto capturado en la clarificación (${ctx.presupuesto})`
  );
  assert(asked.includes("budget"), "[P2-flujo] budget SÍ se preguntó");
  assert(
    asked.includes("clarify_budget"),
    "[P2-flujo] clarify_budget pidió el monto que faltaba"
  );
}

// ─── FASE E1c · extractSections: introductor libre y ":" que cierra la lista ──
// A1: "La página que sueño para mi negocio es: inicio, servicios y contacto"
//     dejaba el prefijo como sección. Ahora corta tras el ":" si el prefijo
//     termina en verbo de intención ("es/será/quiero/imagino/...").
// A2: "inicio, servicios y contacto: con eso me basta" colaba el texto tras el
//     ":" no introductor. Ahora ese relleno final se descarta.

section("E1c · extractSections: introductor libre y ':' que cierra la lista");
{
  const ctx = createEmptyContext();
  fireOnReceive(
    "pages",
    "La página que sueño para mi negocio es: inicio, servicios y contacto",
    ctx
  );
  assert(
    ctx.estructuraWeb === "Inicio, Servicios, Contacto",
    `A1 → "Inicio, Servicios, Contacto" (obtuve: ${ctx.estructuraWeb})`
  );
}
{
  const ctx = createEmptyContext();
  fireOnReceive("pages", "inicio, servicios y contacto: con eso me basta", ctx);
  assert(
    ctx.estructuraWeb === "Inicio, Servicios, Contacto",
    `A2 → "Inicio, Servicios, Contacto" (obtuve: ${ctx.estructuraWeb})`
  );
}
{
  // E1b intacto: lead-in clásico sigue limpiando el prefijo de opinión.
  const ctx = createEmptyContext();
  fireOnReceive(
    "pages",
    "La primera, algo minimalista con fotos grandes. Pues imagino una sola página de corrido: inicio, mis productos, cómo llegar y el contacto.",
    ctx
  );
  assert(
    ctx.estructuraWeb === "Inicio, Mis productos, Cómo llegar, Contacto",
    `E1b intacto → "Inicio, Mis productos, Cómo llegar, Contacto" (obtuve: ${ctx.estructuraWeb})`
  );
}

// ─── FASE P2b · Presupuesto con verbos de dinero (junto al plazo) ──
// B1: "para marzo, tengo 10000" (sin "pesos"/"mil") debe capturar "10000".
// B2: "en 3 meses" / "para el próximo mes, en unas 3 semanas" NO capturan nada.

section("P2b · verbos de dinero capturan el monto junto al plazo");
{
  const ctx = createEmptyContext();
  fireOnReceive("budget", "para marzo, tengo 10000", ctx);
  assert(
    ctx.presupuesto === "10000",
    `[B1] "para marzo, tengo 10000" → presupuesto 10000 (obtuve: ${ctx.presupuesto})`
  );
  assert(ctx.fechaEntrega === "para marzo", `[B1] fecha capturada (${ctx.fechaEntrega})`);
  assert(FLOW.budget.condition?.(ctx) === false, "[B1] budget se salta (monto ya capturado)");
  assert(
    FLOW.budget.nextNode("para marzo, tengo 10000", ctx) === "contact_name",
    "[B1] con ambos datos → contact_name"
  );
}
{
  const ctx = createEmptyContext();
  fireOnReceive("budget", "en 3 meses", ctx);
  assert(
    ctx.presupuesto === null,
    `[B2] "en 3 meses" → presupuesto null (obtuve: ${ctx.presupuesto})`
  );
  assert(FLOW.budget.condition?.(ctx) === true, "[B2] budget sí se pregunta (falta monto)");
}
{
  const ctx = createEmptyContext();
  fireOnReceive("budget", "para el próximo mes, en unas 3 semanas", ctx);
  assert(
    ctx.presupuesto === null,
    `[B2] "para el próximo mes, en unas 3 semanas" → presupuesto null (obtuve: ${ctx.presupuesto})`
  );
  assert(ctx.fechaEntrega !== null, "[B2] la fecha sí se captura");
  // Conversación F de María intacta: "en unas 3 semanas" no captura presupuesto.
  const ctxM = createEmptyContext();
  fireOnReceive("budget", "en unas 3 semanas", ctxM);
  assert(ctxM.presupuesto === null, "[B2-María] 'en unas 3 semanas' no captura presupuesto");
}

// ─── FASE C · Nodos poco relevantes se saltan por categoría ─────────
// Para landing/portafolio/blog: technical_pwa (app instalable), scope_reference
// (página de referencia) y technical_pdfs ya se saltan → discovery más corto.

section("C · nodos poco relevantes se saltan para landing");
{
  const ctx = createEmptyContext();
  ctx.category = "landing";
  assert(FLOW.technical_pwa.condition?.(ctx) === false, "[C] technical_pwa.condition=false para landing");
  assert(FLOW.scope_reference.condition?.(ctx) === false, "[C] scope_reference.condition=false para landing");
  assert(FLOW.technical_pdfs.condition?.(ctx) === false, "[C] technical_pdfs.condition=false para landing");
  ctx.category = "ecommerce";
  assert(FLOW.technical_pwa.condition?.(ctx) === true, "[C] technical_pwa.condition=true para ecommerce");
  assert(FLOW.scope_reference.condition?.(ctx) === true, "[C] scope_reference.condition=true para ecommerce");
  ctx.category = "citas";
  assert(FLOW.technical_pwa.condition?.(ctx) === true, "[C] technical_pwa.condition=true para citas");
}
{
  // Flujo real de landing: los nodos saltados NO aparecen en asked[].
  const { ctx, asked } = simulate([
    "Doy clases de yoga, quiero una página sencilla con información de mis clases y cómo contactarme",
    "sí",
    "Inicio, Clases, Horarios y Contacto",
    "Sí quiero el mapa, el botón de WhatsApp y que me encuentren en Google, pero no el panel ni las citas", // bundle
    "sobrio", // diseño
    "ninguno", // bots (LangChain): sin asistentes IA
    "no", // contenido
    "clases grupales, clases privadas y retiros", // servicios
    "para ya, y de presupuesto unos 15 mil", // budget (fecha + monto)
    "Me llamo Andrea, andrea@yoga.com, 81 9999 8888", // contacto fusionado
    "todo bien", // comentarios
  ]);
  assert(ctx.category === "landing", "[C] yoga → landing");
  assert(!asked.includes("technical_pwa"), "[C] technical_pwa NO se pregunta para landing");
  assert(!asked.includes("scope_reference"), "[C] scope_reference NO se pregunta para landing");
  assert(!asked.includes("technical_pdfs"), "[C] technical_pdfs NO se pregunta para landing");
  // Consolidación: cuentas y BD tampoco se preguntan para landing.
  assert(!asked.includes("technical_auth"), "[C] technical_auth NO se pregunta para landing");
  assert(!asked.includes("technical_db"), "[C] technical_db NO se pregunta para landing");
}

// ─── FASE D · No preguntar lo que ya sabe (captura temprana) ───────
// Datos que el cliente suelta en CUALQUIER respuesta quedan capturados y el
// nodo se salta por condition (mismo patrón que budget en P2).

section("D · captura temprana en discovery_business");
{
  // Ejemplo del enunciado: nombre + presupuesto + plazo dichos de entrada.
  const ctx = createEmptyContext();
  fireOnReceive(
    "discovery_business",
    "Soy Laura, tengo una clínica dental, quiero que agenden citas en línea, para marzo y tengo unos 20 mil",
    ctx
  );
  assert(ctx.clientName === "Laura", `[D] nombre capturado (${ctx.clientName})`);
  assert(ctx.presupuesto === "20000", `[D] presupuesto capturado (${ctx.presupuesto})`);
  assert(ctx.fechaEntrega === "para marzo", `[D] fechaEntrega capturada (${ctx.fechaEntrega})`);
  assert(ctx.citas === true, "[D] señal de citas capturada");
  assert(FLOW.budget.condition?.(ctx) === false, "[D] budget se salta (fecha + monto capturados)");
  assert(FLOW.contact_name.condition?.(ctx) === false, "[D] contact_name se salta");
  // El skip con respuesta vacía va al siguiente (no cae en clarificación).
  assert(FLOW.budget.nextNode("", ctx) === "contact_name", "[D] skip de budget → contact_name");
  assert(FLOW.contact_name.nextNode("", ctx) === "contact_email", "[D] skip de contact_name → contact_email");
}
{
  // "no sé / no me acuerdo / ninguno" NO captura (FASE G y A3 respetadas).
  const ctx = createEmptyContext();
  fireOnReceive("discovery_business", "no sé, no me acuerdo, no tengo nada de eso", ctx);
  assert(ctx.clientName === null, "[D] 'no sé' no captura nombre");
  assert(ctx.presupuesto === null, "[D] 'no sé' no captura presupuesto");
  assert(ctx.fechaEntrega === null, "[D] 'no sé' no captura fecha");
  // "Tengo una clínica..." NO debe quedar como nombre (sin intro de presentación).
  const ctx2 = createEmptyContext();
  fireOnReceive(
    "discovery_business",
    "Tengo una clínica dental y quiero una página de presentación",
    ctx2
  );
  assert(ctx2.clientName === null, "[D] 'Tengo una clínica...' no se guarda como nombre");
}

// ─── FASE D/E · Flujo completo autollenado: nada se re-pregunta ──
// El formulario/propuesta se autollena con TODO lo capturado en el contexto
// (Tarea E): nombre, email, teléfono, presupuesto, servicios, estructura, fecha.

section("D/E · flujo completo autollenado (nada se re-pregunta)");
{
  const { ctx, asked } = simulate([
    "Soy Laura, tengo una clínica dental, quiero una página de presentación con mis servicios y contacto. Para marzo, y tengo unos 20 mil. Mi correo es laura@clinica.com y mi teléfono es 81 2345 6789",
    "sí, así es",
    "Inicio, Servicios, Contacto",
    "Sí quiero el mapa, el botón de WhatsApp y que me encuentren en Google, pero no el panel ni las citas", // bundle
    "moderno", // diseño
    "ninguno", // bots (LangChain): sin asistentes IA
    "sí", // contenido
    "limpieza dental y consultas", // servicios
    "81 2345 6789", // contact_phone (nombre/email/budget/fecha ya capturados)
    "no, gracias", // comentarios
  ]);
  // Todos los campos quedan poblados sin que el cliente repita nada.
  assert(ctx.clientName === "Laura", `[D/E] nombre (${ctx.clientName})`);
  assert(ctx.clientEmail === "laura@clinica.com", `[D/E] email (${ctx.clientEmail})`);
  assert(ctx.clientPhone === "+52 81 2345 6789", `[D/E] teléfono (${ctx.clientPhone})`);
  assert(ctx.presupuesto === "20000", `[D/E] presupuesto (${ctx.presupuesto})`);
  assert(ctx.fechaEntrega === "para marzo", `[D/E] fecha (${ctx.fechaEntrega})`);
  assert(ctx.category === "landing", "[D/E] categoría landing");
  assert(ctx.estructuraWeb === "Inicio, Servicios, Contacto", `[D/E] estructura (${ctx.estructuraWeb})`);
  assert(ctx.servicios === "limpieza dental, consultas", `[D/E] servicios (${ctx.servicios})`);
  assert(ctx.paginas === 3, `[D/E] paginas (${ctx.paginas})`);
  // Los nodos con dato ya capturado NO se vuelven a preguntar.
  for (const id of ["budget", "contact_name", "contact_email"]) {
    assert(!asked.includes(id), `[D/E] ${id} NO se pregunta (dato ya capturado)`);
  }
  // El teléfono no se captura temprano (normalizePhone mezclaría dígitos del
  // presupuesto) → se pide en su nodo, una sola vez.
  assert(
    asked.includes("contact_phone"),
    "[D/E] contact_phone SÍ se pregunta (no se dio teléfono temprano)"
  );
  // Tarea C: pwa/reference/pdfs saltados para landing.
  for (const id of ["technical_pwa", "scope_reference", "technical_pdfs"]) {
    assert(!asked.includes(id), `[C/D] ${id} NO se pregunta para landing`);
  }
  // Tarea E: la propuesta se deriva del contexto sin que el cliente repita datos.
  const clientData = buildClientData({
    nombre: ctx.clientName || "",
    giro: "clínica dental",
    telefono: ctx.clientPhone,
    tipoWeb: derivarTipoWeb(resolverCategoria(ctx) ?? "landing", ctx.paginas),
    dominioHosting: true,
    branding: false,
  });
  assert(clientData.nombre === "Laura", "[E] ClientData.nombre autocompletado");
  assert(clientData.telefono === "+528123456789", "[E] ClientData.telefono autocompletado");
  const quote = calculateQuote(clientData);
  assert(
    quote.total === 12760,
    `[E] total determinista desde el contexto → $12,760 (obtuve ${quote.total})`
  );
  assert(resolverCategoria(ctx) === "landing", "[E] resolverCategoria → landing");
}

// ─── FASE QA · Bugs detectados en la revisión QA de las 10 personas ──

section("QA1 · clarificación sin nodos colgados (no congela el chat)");
{
  // BUG: makeClarifyNode generaba su self-loop como "clarify_technical_db"
  // (derivado de originalId) pero el nodo vive bajo "clarify_db" → el bot
  // buscaba un nodo inexistente y el chat se congelaba con "no sé" repetido.
  // Ahora el self-loop regresa la clave real ("clarify_db").
  const ctx = createEmptyContext();
  let node = "technical_db";
  node = FLOW.technical_db.nextNode("no sé", ctx);
  assert(node === "clarify_db", "technical_db 'no sé' → clarify_db (existe)");
  assert(FLOW[node] !== undefined, "clarify_db existe en FLOW (no se congela)");
  node = FLOW[node].nextNode("no sé", ctx);
  assert(node === "clarify_db", "clarify_db 'no sé' otra vez → clarify_db (mismo id)");
  assert(FLOW[node] !== undefined, "el self-loop apunta a un nodo existente");
  node = FLOW[node].nextNode("no sé", ctx);
  assert(node === "technical_payments", "tras 2 'no sé' en clarify_db avanza a technical_payments");
  assert(FLOW[node] !== undefined, "technical_payments existe");
}
{
  // Misma garantía para todos los clarify_* técnicos: su self-loop nunca debe
  // apuntar a un id derivado de originalId que no existe como clave.
  const selfLoops = [
    ["technical_auth", "clarify_auth"],
    ["technical_db", "clarify_db"],
    ["technical_payments", "clarify_payments"],
    ["technical_dashboard", "clarify_dashboard"],
    ["technical_chat", "clarify_chat"],
    ["scope_content", "clarify_content"],
    ["scope_services", "clarify_services"],
    ["budget", "clarify_budget"],
  ] as const;
  for (const [, clarifyId] of selfLoops) {
    assert(FLOW[clarifyId] !== undefined, `${clarifyId} registrado en FLOW`);
    const ctxC = createEmptyContext();
    const nodeC = FLOW[clarifyId].nextNode("no sé", ctxC);
    assert(
      nodeC === clarifyId || FLOW[nodeC] !== undefined,
      `${clarifyId} self-loop no apunta a un nodo inexistente (→ ${nodeC})`
    );
  }
}
{
  // Flujo completo "no sé crónico": NO congela y avanza (clarify máx 2 veces).
  const ctx = createEmptyContext();
  let node = "technical_db";
  node = FLOW[node].nextNode("no sé", ctx); // clarify_db
  node = FLOW[node].nextNode("no sé", ctx); // clarify_db
  node = FLOW[node].nextNode("no sé", ctx); // forwardNext
  assert(node === "technical_payments", "no sé crónico en db → avanza a technical_payments");
}

section("QA2 · extractName sin arrastrar la frase completa");
{
  const ctx = createEmptyContext();
  fireOnReceive("contact_name", "Soy Ana y tengo una estética. Quiero una página para mostrar mis servicios", ctx);
  assert(ctx.clientName === "Ana", `"Soy Ana y tengo una estética…" → nombre "Ana" (obtuve: ${ctx.clientName})`);
  const ctx2 = createEmptyContext();
  fireOnReceive("contact_name", "Me llamo María y mi tienda se llama Moda GDL", ctx2);
  assert(ctx2.clientName === "María", `"Me llamo María y mi tienda…" → "María" (obtuve: ${ctx2.clientName})`);
  // Sin romper los casos previos:
  const ctx3 = createEmptyContext();
  fireOnReceive("contact_name", "Me llamo Carlos, y la tienda se llama La Tijera de Oro", ctx3);
  assert(ctx3.clientName === "Carlos", `"Me llamo Carlos, …" → "Carlos" (obtuve: ${ctx3.clientName})`);
  const ctx4 = createEmptyContext();
  fireOnReceive("contact_name", "Mi negocio se llama Taller El Toro", ctx4);
  assert(ctx4.clientName === "Taller El Toro", `"Mi negocio se llama Taller El Toro" → "Taller El Toro" (obtuve: ${ctx4.clientName})`);
}

section("QA3 · extractSections sin 'así de sencillo' como sección");
{
  const ctx = createEmptyContext();
  fireOnReceive("pages", "Una sola página: inicio, mis productos y el contacto, así de sencillo", ctx);
  assert(
    ctx.estructuraWeb === "Inicio, Mis productos, Contacto",
    `"…el contacto, así de sencillo" → "Inicio, Mis productos, Contacto" (obtuve: ${ctx.estructuraWeb})`
  );
  const ctx2 = createEmptyContext();
  fireOnReceive("pages", "Una sola página: inicio, mis productos y el contacto así de sencillo", ctx2);
  assert(
    ctx2.estructuraWeb === "Inicio, Mis productos, Contacto",
    `sin coma antes de "así de sencillo" también se limpia (obtuve: ${ctx2.estructuraWeb})`
  );
}

section("QA4 · categoría 'citas' respeta el rechazo explícito");
{
  // "…no quiero citas en línea" → inferCategory devuelve "citas" por las
  // keywords ("clínica", "citas"), pero el cliente las RECHAZÓ → landing.
  const ctx = createEmptyContext();
  fireOnReceive(
    "discovery_business",
    "Soy la Dra. Laura, tengo una clínica dental. Quiero una landing page de una sola página. No quiero pagos en línea, ni panel, ni cuentas, ni citas en línea",
    ctx
  );
  assert(ctx.category === "landing", `clínica + "ni citas en línea" → landing (obtuve: ${ctx.category})`);
  assert(ctx.citas === false, "[QA4] citas=false (rechazo conocido)");
  assert(resolverCategoria(ctx) === "landing", "[QA4] resolverCategoria → landing");
  // Si SÍ las quiere, se mantiene "citas".
  const ctx2 = createEmptyContext();
  fireOnReceive(
    "discovery_business",
    "Tengo una clínica dental y quiero que mis pacientes agenden citas en línea",
    ctx2
  );
  assert(ctx2.category === "citas", `clínica + "quiero agendar citas" → citas (obtuve: ${ctx2.category})`);
  assert(resolverCategoria(ctx2) === "citas", "[QA4] resolverCategoria mantiene citas cuando citas=true");
}

section("QA5 · no repreguntar citas que ya pidió (technical_bookings se salta)");
{
  // Persona 1: la clínica pide citas en su descripción → technical_bookings
  // NO debe volver a preguntar (antes se confirmaba y descuadraba el flujo).
  const { ctx, asked } = simulate([
    "Soy la Dra. Laura de la Clínica Dental La Sonrisa. Quiero una página para presentar mis servicios y que mis pacientes puedan pedir cita. No quiero pagos en línea, ni panel de administración, ni cuentas para pacientes",
    "sí, así es",
    "Inicio, Servicios, Cómo llegar y Contacto, una sola página",
    "Sí quiero el mapa, que me escriban por WhatsApp y que me encuentren en Google", // bundle (citas/pagos/panel/cuentas ya conocidos)
    "moderno pero de confianza",
    "ninguno", // bots (LangChain): sin asistentes IA
    // PWA, referencia, cuentas y BD: se SALTAN para landing
    "sí, ya tengo fotos",
    "limpieza dental, ortodoncia y blanqueamiento",
    "para el próximo mes, y de presupuesto unos 10 mil pesos", // budget (fecha + monto)
    "laura.sonrisa@gmail.com", // contact_email (el nombre ya se capturó temprano)
    "81 2345 6789", // contact_phone
    "no, gracias",
  ]);
  assert(ctx.category === "landing", "[QA5] clínica con citas → landing");
  assert(ctx.citas === true, "[QA5] citas=true (lo pidió en la descripción)");
  assert(
    !asked.includes("technical_bookings"),
    "[QA5] technical_bookings NO se pregunta (citas ya conocidas)"
  );
  // La propuesta fallback menciona el apartado de agenda (citas=true).
  const prop = buildFallbackProposal(ctx.category!, [], "Laura", ctx);
  assert(
    prop.funcionalidades.some((f) => /cita|agend/i.test(f)),
    "[QA5] propuesta landing menciona el apartado de agenda (citas=true)"
  );
  assert(
    !prop.funcionalidades.some((f) => /pago|panel/i.test(f)),
    "[QA5] la propuesta no promete pagos ni panel"
  );
}

section("QA6 · cliente que ya lo dijo todo: no repreguntar lo rechazado");
{
  const { ctx, asked } = simulate([
    "Soy la Dra. Laura, tengo una clínica dental. Quiero una landing page de una sola página con Inicio, Servicios y Contacto, con botón de WhatsApp y mapa. No quiero pagos en línea, ni panel, ni cuentas, ni citas en línea. Para marzo, y tengo unos 20 mil. Mi correo es laura@clinica.com y mi teléfono es 81 2345 6789",
    "sí, así es",
    "una sola página, Inicio, Servicios y Contacto",
    "sí, que me encuentren en Google", // bundle (solo faltaba SEO)
    "moderno",
    "ninguno", // bots (LangChain): sin asistentes IA
    // PWA, referencia, cuentas, BD y dashboard: se SALTAN para landing
    "sí, tengo fotos",
    "limpieza dental y ortodoncia",
    "81 2345 6789",
    "no, gracias",
  ]);
  assert(ctx.category === "landing", "[QA6] categoría landing (rechazo de citas respetado)");
  for (const id of [
    "technical_auth",
    "technical_payments",
    "technical_dashboard",
    "technical_bookings",
    "technical_pwa",
    "technical_maps",
    "technical_chat",
    "technical_seo",
    "scope_reference",
    "budget",
    "contact_name",
    "contact_email",
  ]) {
    assert(!asked.includes(id), `[QA6] ${id} NO se pregunta (ya respondido/rechazado o saltado)`);
  }
  assert(asked.includes("technical_bundle"), "[QA6] el bundle consolidado SÍ se pregunta");
  assert(ctx.clientName === "La Dra. Laura", `[QA6] nombre capturado temprano (${ctx.clientName})`);
  assert(ctx.presupuesto === "20000", `[QA6] presupuesto capturado (${ctx.presupuesto})`);
  assert(asked.includes("contact_phone"), "[QA6] teléfono se pide en su nodo (una vez)");
}

section("QA7 · budget no guarda 'no sé' como fecha");
{
  const ctx = createEmptyContext();
  fireOnReceive("budget", "no sé", ctx);
  assert(ctx.fechaEntrega === null, `[QA7] "no sé" en plazo → fecha null (obtuve: ${ctx.fechaEntrega})`);
  const ctx2 = createEmptyContext();
  fireOnReceive("budget", "para el próximo mes", ctx2);
  assert(ctx2.fechaEntrega === "para el próximo mes", "[QA7] fecha normal sigue capturándose");
}

section("QA8 · Tratamiento (cliente que habla de usted)");
{
  assert(detectTrato("Mire, ¿usted me puede ayudar con eso?") === "usted", '[QA8] "¿usted…?" → usted');
  assert(detectTrato("oye, ¿tú me ayudas?") === "tu", '[QA8] "¿tú…?" → tu');
  assert(detectTrato("Hola, quiero una página sencilla") === null, "[QA8] neutro → null");
  // toUsted convierte un mensaje determinista de "tú" a "usted" sin mezclar.
  const disc = toUsted(
    "Cuéntame, ¿qué hace tu negocio hoy? Y si puedes, dime también qué es lo que más te urge lograr con tu página."
  );
  assert(/cu[ée]nteme/.test(disc), `[QA8] "cuéntame" → "cuénteme" (${disc})`);
  assert(/su negocio/.test(disc), `[QA8] "tu negocio" → "su negocio" (${disc})`);
  assert(/d[íi]game/.test(disc), `[QA8] "dime" → "dígame" (${disc})`);
  assert(/le urge/.test(disc), `[QA8] "te urge" → "le urge" (${disc})`);
  assert(!/\btu\b|\bdime\b|\bcu[ée]ntame\b/.test(disc), "[QA8] sin residuos de tuteo");
  // "sin que tú pierdas" → "sin que usted pierda"
  const t = toUsted("podemos hacer que se generen solos, sin que tú pierdas tiempo armándolos");
  assert(/sin que usted pierda tiempo/.test(t), `[QA8] "tú pierdas" → "usted pierda" (${t})`);
  // Presupuesto: no promete ni mezcla.
  const b = toUsted(
    "No te lo pregunto para cobrarte de más: es para armarte algo que quepa en tu bolsillo"
  );
  assert(/No se lo pregunto para cobrarle de más/.test(b), `[QA8] presupuesto usted (${b})`);
  assert(/armarle algo que quepa en su bolsillo/.test(b), `[QA8] presupuesto usted 2 (${b})`);
  // No rompe un correo con "tu" dentro ("nombre@tucorreo.com").
  const email = toUsted("Un correo se ve así: nombre@tucorreo.com. ¿Me lo escribes?");
  assert(/nombre@tucorreo\.com/.test(email), `[QA8] correo intacto (${email})`);
  assert(/Me lo escribe/.test(email), `[QA8] "escribes" → "escribe" (${email})`);
}

// ─── FASE BOTS · Asistentes IA con LangChain (add-on) ──────────────
// El bot ofrece asistentes inteligentes (lib/bots-catalog.ts) que se suman a
// la cotización, a la propuesta y al prompt técnico. Se detectan por reglas
// (0 LLM) y se confirman en el nodo technical_bots.

section("BOTS · detección y selección de asistentes IA");
{
  // Recomendaciones según lo que dijo el cliente (reglas, 0 LLM).
  const ctxCitas = createEmptyContext();
  ctxCitas.category = "citas";
  ctxCitas.citas = true;
  const recCitas = detectarBotsRecomendados(ctxCitas);
  assert(recCitas.some((b) => b.id === "bot_citas"), "[BOTS] citas → recomienda bot_citas");

  const ctxEcom = createEmptyContext();
  ctxEcom.category = "ecommerce";
  ctxEcom.pagos = true;
  const recEcom = detectarBotsRecomendados(ctxEcom);
  assert(recEcom.some((b) => b.id === "bot_ventas"), "[BOTS] ecommerce+pagos → recomienda bot_ventas");
  assert(
    recEcom.some((b) => b.id === "bot_recomendador"),
    "[BOTS] ecommerce → recomienda bot_recomendador"
  );

  const ctxLanding = createEmptyContext();
  ctxLanding.category = "landing";
  const recLanding = detectarBotsRecomendados(ctxLanding);
  assert(recLanding.some((b) => b.id === "bot_leads"), "[BOTS] landing → recomienda bot_leads");
  assert(recLanding.some((b) => b.id === "bot_faq"), "[BOTS] landing → recomienda bot_faq");
  assert(recLanding.length <= 3, "[BOTS] máximo 3 recomendaciones (no abruma)");
}
{
  // Extracción desde una respuesta libre.
  const ctx = createEmptyContext();
  ctx.category = "landing";
  assert(
    extraerBotsDeRespuesta("el de citas y el de preguntas frecuentes", ctx)
      .sort()
      .join(",") === "bot_citas,bot_faq",
    "[BOTS] 'el de citas y el de preguntas frecuentes' → bot_citas + bot_faq"
  );
  assert(extraerBotsDeRespuesta("ninguno", ctx).length === 0, "[BOTS] 'ninguno' → sin bots");
  assert(extraerBotsDeRespuesta("no, gracias", ctx).length === 0, "[BOTS] 'no, gracias' → sin bots");
  assert(extraerBotsDeRespuesta("sí", ctx).length > 0, "[BOTS] 'sí' genérico → recomendaciones");
}
{
  // Precios accesibles: setup y mensualidad (DeepSeek hosting).
  const ids = ["bot_faq", "bot_citas"];
  assert(totalBotsSetup(ids) === 3500 + 5900, `[BOTS] setup total (${totalBotsSetup(ids)})`);
  assert(
    totalBotsMensual(ids) === 199 + 299,
    `[BOTS] cuota mensual total (${totalBotsMensual(ids)})`
  );
  assert(getBotById("bot_faq")?.precioSetup === 3500, "[BOTS] FAQ setup accesible $3,500");
  assert(getBotById("bot_ventas")?.precioSetup === 8500, "[BOTS] ventas setup $8,500");
}
{
  // Flujo completo con bots: se capturan en ctx.bots y el precio del fallback
  // incluye el setup de los bots (precio exacto coherente con la UI).
  const { ctx } = simulate([
    "Tengo una clínica dental y quiero una página de presentación. Quiero que mis pacientes agenden citas en línea, y me gustaría un bot que responda dudas frecuentes",
    "sí, así es",
    "Inicio, Servicios y Contacto",
    "No necesito cuentas, ni base de datos, ni pagos en línea, ni panel. Sí quiero el mapa, el botón de WhatsApp y que me encuentren en Google, pero no la app instalable", // bundle (citas ya conocidas por la categoría)
    "moderno", // diseño
    "el de citas y el de preguntas frecuentes", // bots (LangChain)
    "sí", // contenido
    "limpieza dental, ortodoncia y blanqueamiento", // servicios
    "ninguna referencia", // referencia
    "para el próximo mes, y de presupuesto unos 20 mil", // budget (fecha + monto)
    "Soy Laura, laura@clinica.com, 81 2345 6789", // contacto fusionado
    "nada, gracias", // comentarios
  ]);
  assert(ctx.bots.includes("bot_citas"), `[BOTS] citas elegido (${ctx.bots})`);
  assert(ctx.bots.includes("bot_faq"), `[BOTS] faq elegido (${ctx.bots})`);

  const prop = buildFallbackProposal(ctx.category ?? "landing", [], "Laura", ctx);
  assert((prop.bots?.length ?? 0) === 2, "[BOTS] la propuesta trae los 2 bots");
  assert((prop.bots_total ?? 0) === 9400, `[BOTS] bots_total en la propuesta (${prop.bots_total})`);
  assert(
    prop.funcionalidades.some((f) => /asistente|bot/i.test(f)),
    "[BOTS] la propuesta menciona los asistentes en 'qué incluye'"
  );
  assert(
    prop.stack_tecnico.includes("LangChain") && prop.stack_tecnico.includes("DeepSeek"),
    "[BOTS] el stack incluye LangChain + DeepSeek"
  );
  // El precio exacto del fallback incluye el setup de los bots.
  assert(
    prop.precio_min >= 9400,
    `[BOTS] el precio incluye el setup de los bots (${prop.precio_min})`
  );
}
{
  // calcularTotalDeterminista suma los bots al total exacto (mismo número que la UI).
  const base =
    calcularTotalDeterminista({
      giro: "consultorio dental",
      clientName: "Laura",
      clientPhone: null,
      negocioDescripcion: "clínica dental",
      category: "landing",
      paginas: 1,
    }) ?? 0;
  const conBots =
    calcularTotalDeterminista({
      giro: "consultorio dental",
      clientName: "Laura",
      clientPhone: null,
      negocioDescripcion: "clínica dental",
      category: "landing",
      paginas: 1,
      bots: ["bot_faq"],
    }) ?? 0;
  assert(
    conBots === base + 3500,
    `[BOTS] total determinista + bot_faq = base + 3500 (${base} → ${conBots})`
  );
}

// ─── FASE 6 · Cross-sell de bots por giro ─────────────────────────
// Matriz giro → bots recomendados (docs/MERCADO_PAGINAS_VIBECODER.md §6.5):
// el bot detecta el giro por la descripción (detectarGiro) y recomienda los bots
// de mayor valor para ese giro (máx 3), sin que bot_faq/bot_cotizacion genéricos
// desplacen a los bots clave (regla aprendida en memoria).

section("FASE 6 · Cross-sell de bots por giro");
{
  const casos: Array<{ nombre: string; desc: string; category: string; esperados: string[] }> = [
    { nombre: "restaurante", desc: "Tengo un restaurante y quiero un menú con código QR para que escaneen y vean mi carta", category: "menu_digital", esperados: ["bot_faq", "bot_citas", "bot_recomendador"] },
    { nombre: "estética/barbería", desc: "Tengo una estética y quiero que mis clientes agenden citas en línea", category: "citas", esperados: ["bot_citas", "bot_leads", "bot_faq"] },
    { nombre: "clínica/consultorio", desc: "Soy médico, quiero una página para que mis pacientes agenden citas", category: "citas", esperados: ["bot_citas", "bot_faq", "bot_ventas"] },
    { nombre: "consultorio dental", desc: "Tengo un consultorio dental y quiero agenda en línea", category: "citas", esperados: ["bot_citas", "bot_faq", "bot_ventas"] },
    { nombre: "gimnasio", desc: "Quiero una página para mi gimnasio con membresías y cobro recurrente", category: "webapp", esperados: ["bot_membresias", "bot_leads", "bot_faq"] },
    { nombre: "tienda/retail", desc: "Tengo una tienda de ropa y quiero vender por internet con carrito y pagos", category: "ecommerce", esperados: ["bot_dudas", "bot_ventas", "bot_leads"] },
    { nombre: "inmobiliaria", desc: "Tengo una inmobiliaria y quiero un portal con propiedades, filtros y leads por propiedad", category: "webapp", esperados: ["bot_ventas", "bot_leads", "bot_faq"] },
    { nombre: "coach/instructor", desc: "Soy coach y quiero vender mis cursos en línea", category: "webapp", esperados: ["bot_membresias", "bot_ventas", "bot_leads"] },
    { nombre: "mecánico", desc: "Tengo un taller mecánico y quiero que me encuentren en Google", category: "landing", esperados: ["bot_faq", "bot_leads", "bot_cotizacion"] },
    { nombre: "servicios hogar", desc: "Soy plomero y quiero una tarjeta para compartir mi información", category: "tarjeta_digital", esperados: ["bot_faq", "bot_leads", "bot_cotizacion"] },
  ];

  for (const c of casos) {
    const ctx = createEmptyContext();
    ctx.category = c.category;
    ctx.negocioDescripcion = c.desc;
    const rec = detectarBotsRecomendados(ctx);
    const real = rec.slice(0, 3).map((b) => b.id).sort().join(",");
    const esperado = [...c.esperados].sort().join(",");
    assert(real === esperado, `[FASE6] ${c.nombre} → ${real} (esperado ${esperado})`);
    assert(rec.length <= 3, `[FASE6] ${c.nombre} → máx 3 bots (${rec.length})`);
  }
}
{
  // El giro manda sobre la regla genérica: una tienda que solo quiere presencia
  // (landing) NO recibe el FAQ genérico sino la matriz del giro (dudas+ventas+
  // leads), y el FAQ genérico no desplaza a los bots de mayor valor.
  const ctx = createEmptyContext();
  ctx.category = "landing";
  ctx.negocioDescripcion = "Tengo una tienda de abarrotes y quiero que me encuentren";
  const rec = detectarBotsRecomendados(ctx);
  assert(rec.some((b) => b.id === "bot_dudas"), "[FASE6] tienda+landing → bot_dudas (no FAQ genérico)");
  assert(!rec.some((b) => b.id === "bot_faq"), "[FASE6] tienda+landing → NO bot_faq (desplazaría valor)");
  assert(rec.length <= 3, "[FASE6] tienda+landing → máx 3");
}
{
  // Giro SIN escalera definida (abogado) conserva la regla genérica (leads+FAQ).
  const ctx = createEmptyContext();
  ctx.category = "landing";
  ctx.negocioDescripcion = "Soy abogado y quiero una página para mi despacho";
  const rec = detectarBotsRecomendados(ctx);
  assert(rec.some((b) => b.id === "bot_leads"), "[FASE6] abogado → bot_leads (regla genérica)");
  assert(rec.some((b) => b.id === "bot_faq"), "[FASE6] abogado → bot_faq (regla genérica)");
  assert(rec.length <= 3, "[FASE6] abogado → máx 3");
}
{
  // Guarda de colisión con Object.prototype: el giro id "constructor" (constructora)
  // NO debe devolver Object.prototype.constructor ni crashear (regla genérica).
  const ctx = createEmptyContext();
  ctx.category = "corporativo";
  ctx.negocioDescripcion = "Quiero una página para mi constructora, varias secciones";
  const rec = detectarBotsRecomendados(ctx);
  assert(Array.isArray(rec), "[FASE6] constructora → devuelve array (sin crashear)");
  assert(rec.some((b) => b.id === "bot_leads"), "[FASE6] constructora → bot_leads");
  assert(rec.length <= 3, "[FASE6] constructora → máx 3");
  assert(sugerirEscaleraProducto(ctx) === null, "[FASE6] constructora → escalera null");
}
{
  // La escalera de producto se sugiere por giro (línea de cross-sell en el copy).
  const ctxRest = createEmptyContext();
  ctxRest.category = "menu_digital";
  ctxRest.negocioDescripcion = "Tengo un restaurante y quiero un menú con QR";
  assert(
    sugerirEscaleraProducto(ctxRest)?.includes("reservas") === true,
    "[FASE6] restaurante → escalera sugiere reservas"
  );
  const ctxAbog = createEmptyContext();
  ctxAbog.category = "landing";
  ctxAbog.negocioDescripcion = "Soy abogado y quiero una página";
  assert(sugerirEscaleraProducto(ctxAbog) === null, "[FASE6] abogado (sin escalera) → null");
}
{
  // Regla 1c: la categoría cotizador NUNCA recomienda bot_cotizacion como add-on
  // (ES el producto que se está vendiendo); sí acompaña con bot_faq.
  const ctx = createEmptyContext();
  ctx.category = "cotizador";
  ctx.negocioDescripcion = "Soy ingeniero y quiero un cotizador en línea para mi negocio";
  const rec = detectarBotsRecomendados(ctx);
  assert(!rec.some((b) => b.id === "bot_cotizacion"), "[FASE6] cotizador → NO bot_cotizacion (es el producto)");
  assert(rec.some((b) => b.id === "bot_faq"), "[FASE6] cotizador → sí bot_faq");
}

// ─── FASE BUNDLE · consolidación + inferencia (menos preguntas) ──
// El nodo technical_bundle agrupa las funciones técnicas en UNA pregunta y la
// inferencia de señales ampliada (mapas/chat/SEO/PWA/documentos/animaciones)
// hace que el bot sepa lo que el cliente quiere sin preguntar de una por una.

section("BUNDLE · consolidación e inferencia (menos preguntas)");
{
  // Inferencia ampliada: mencionar WhatsApp/Google/mapa en la descripción.
  const ctx = createEmptyContext();
  fireOnReceive(
    "discovery_business",
    "Tengo una barbería, quiero que me escriban por WhatsApp y que me encuentren en Google, con un mapa de mi local",
    ctx
  );
  assert(ctx.chat === true, "[BUNDLE] 'WhatsApp' mencionado → chat=true");
  assert(ctx.seo === true, "[BUNDLE] 'Google' mencionado → seo=true");
  assert(ctx.mapas === true, "[BUNDLE] 'mapa de mi local' → mapas=true");
  assert(
    FLOW.technical_chat.condition?.(ctx) === false,
    "[BUNDLE] technical_chat se salta (chat ya conocido)"
  );
  assert(FLOW.design.condition?.(ctx) === true, "[BUNDLE] design se mantiene (estilo aún desconocido)");
}
{
  // pages "cómo llegar" → mapas=true (inferencia en la estructura).
  const ctx = createEmptyContext();
  fireOnReceive("pages", "Una sola página: inicio, mis servicios, cómo llegar y el contacto", ctx);
  assert(ctx.mapas === true, "[BUNDLE] 'cómo llegar' en la estructura → mapas=true");
}
{
  // design se salta si el estilo ya se infirió.
  const ctx = createEmptyContext();
  ctx.animaciones = true;
  assert(FLOW.design.condition?.(ctx) === false, "[BUNDLE] design se salta con animaciones=true");
}
{
  // Bundle: "sí" genérico → recomendaciones (chat+SEO para landing).
  const ctx = createEmptyContext();
  ctx.category = "landing";
  fireOnReceive("technical_bundle", "sí, las que me convengan", ctx);
  assert(ctx.chat === true && ctx.seo === true, "[BUNDLE] 'sí' genérico → chat+SEO recomendados");
  assert(ctx.mapas === false, "[BUNDLE] 'sí' genérico → mapa fuera (no mencionó ubicación)");
}
{
  // Bundle: "todas" → activa todo lo listado (relevante).
  const ctx = createEmptyContext();
  ctx.category = "landing";
  fireOnReceive("technical_bundle", "todas", ctx);
  assert(
    ctx.chat === true && ctx.seo === true && ctx.dashboard === true && ctx.mapas === true && ctx.citas === true,
    "[BUNDLE] 'todas' activa todo lo relevante"
  );
}
{
  // Bundle: "ninguna" → nada de lo listado.
  const ctx = createEmptyContext();
  ctx.category = "landing";
  fireOnReceive("technical_bundle", "ninguna, gracias", ctx);
  assert(
    ctx.chat === false && ctx.seo === false && ctx.mapas === false,
    "[BUNDLE] 'ninguna' deja todo fuera"
  );
}
{
  // Bundle: mención específica → lo mencionado true, lo no mencionado fuera.
  const ctx = createEmptyContext();
  ctx.category = "landing";
  fireOnReceive("technical_bundle", "Quiero el mapa y el botón de WhatsApp, pero no el panel", ctx);
  assert(ctx.mapas === true && ctx.chat === true, "[BUNDLE] mención específica activa mapa+WhatsApp");
  assert(ctx.dashboard === false, "[BUNDLE] 'no el panel' → dashboard=false");
  assert(ctx.seo === false, "[BUNDLE] SEO no mencionado → fuera (política del bundle)");
}
{
  // "no sé" → clarify_bundle; con "no sé" crónico aplica recomendaciones.
  const ctx = createEmptyContext();
  ctx.category = "landing";
  let node = "technical_bundle";
  node = FLOW.technical_bundle.nextNode("no sé", ctx);
  assert(node === "clarify_bundle", "[BUNDLE] bundle 'no sé' → clarify_bundle");
  node = FLOW[node].nextNode("no sé", ctx);
  node = FLOW[node].nextNode("no sé", ctx);
  assert(node === "design", "[BUNDLE] 'no sé' crónico en bundle avanza a design sin congelarse");
  assert(ctx.chat === true, "[BUNDLE] tras 'no sé' crónico se aplican las recomendaciones (chat=true)");
}
{
  // Reducción real: landing con bundle consume MENOS respuestas que el flujo
  // anterior de una por una (antes ~15 preguntas, ahora ~11).
  const { asked } = simulate([
    "Doy clases de yoga, quiero una página sencilla con información de mis clases y cómo contactarme",
    "sí",
    "Inicio, Clases, Horarios y Contacto",
    "Sí quiero el mapa, el botón de WhatsApp y que me encuentren en Google, pero no el panel ni las citas",
    "sobrio",
    "ninguno",
    "no",
    "clases grupales, clases privadas y retiros",
    "para ya, y de presupuesto unos 15 mil",
    "Me llamo Andrea, andrea@yoga.com, 81 9999 8888",
    "todo bien",
  ]);
  assert(asked.includes("technical_bundle"), "[BUNDLE] el flujo usa el bundle");
  assert(
    !asked.includes("technical_dashboard") &&
      !asked.includes("technical_chat") &&
      !asked.includes("technical_maps") &&
      !asked.includes("technical_seo"),
    "[BUNDLE] no se preguntan las funciones de una por una"
  );
  assert(asked.length <= 12, `[BUNDLE] landing ≤ 12 preguntas (obtuve ${asked.length})`);
}

section("QA9 · Nivel 3 · ecommerce pro: ticket alto por features (no inflando base)");
{
  // Señales pro desde la descripción: venta en línea + inventario + facturación.
  const ctx = createEmptyContext();
  fireOnReceive(
    "discovery_business",
    "Tengo una tienda de electrónica y quiero vender por internet con carrito y pagos con tarjeta, administrar mi inventario y facturar a mis clientes",
    ctx
  );
  assert(ctx.category === "ecommerce", `[QA9] venta en línea + inventario + facturar → ecommerce (obtuve: ${ctx.category})`);
  assert(ctx.pagos === true, "[QA9] 'pagos con tarjeta/vender' → pagos=true");
  assert(ctx.dashboard === true, "[QA9] 'administrar mi inventario' → dashboard=true");
  assert(ctx.inventario === true, "[QA9] 'administrar mi inventario' → inventario=true (feature pro)");
  assert(ctx.facturacionCfdi === true, "[QA9] 'facturar a mis clientes' → facturacionCfdi=true (feature pro)");

  // El ticket "pro" se alcanza por features acumuladas + nivel avanzado,
  // nunca inflando la base (ecommerce base avanzado = 60000).
  const pro = ["pagos", "dashboard", "facturacion_cfdi", "inventario_avanzado", "reportes_ventas", "multi_vendedor", "pwa"];
  assert(inferNivel(pro) === "avanzado", "[QA9] muchas features pro → nivel avanzado");
  const estimado = estimatePrice("ecommerce", pro);
  assert(estimado.precio_min > 60000, `[QA9] base avanzado + features pro supera los $60k (obtuve: $${estimado.precio_min})`);
  const baseSolo = estimatePrice("ecommerce", []);
  assert(baseSolo.precio_min < estimado.precio_min, "[QA9] las features pro suben el ticket (sin inflar la base)");

  // Citas con pago por adelantado: frases con "no" interno (no-show / "que no
  // me fallen") marcan pagos=true (el "no" es parte de la frase, no rechazo).
  const c1 = createEmptyContext();
  fireOnReceive(
    "discovery_business",
    "Tengo un salón y quiero que paguen al reservar para que no me fallen las citas",
    c1
  );
  assert(c1.pagos === true, "[QA9] 'que no me fallen las citas' (con pago al reservar) → pagos=true");
  const c2 = createEmptyContext();
  fireOnReceive(
    "discovery_business",
    "Tengo un consultorio y quiero cobrar un anticipo al agendar para evitar no-shows",
    c2
  );
  assert(c2.pagos === true, "[QA9] 'anticipo al agendar para evitar no-shows' → pagos=true");
  // Rechazo real de anticipos NO marca pagos=true.
  const c3 = createEmptyContext();
  fireOnReceive("discovery_business", "No quiero cobrar anticipos, que agenden y ya", c3);
  assert(c3.pagos === null, "[QA9] 'no quiero cobrar anticipos' → pagos se mantiene null (rechazo)");
}

// ─── FASE QA10 · Nivel 4 · Plataformas por vertical (webapp + features) ──
// El motor detecta los portales de nivel 4 (inmobiliaria, membresías, cursos,
// telemedicina, directorio) como webapp por SEÑALES EXPLÍCITAS (bonus en
// inferCategory + señales pasivas en conversation-flow), sin robarle landings
// a negocios que solo quieren una página de presentación, y sin inflar el
// fallback si el cliente no pidió la vertical.

section("QA10 · Nivel 4 · verticales → webapp, sin robar landings ni inflar");
{
  // inferCategory: las plataformas por vertical → webapp.
  const casos: Array<[string, string]> = [
    ["Tengo una inmobiliaria y quiero un portal de propiedades con filtros por zona y precio, y que cada propiedad genere leads de compradores", "webapp"],
    ["Tengo un gimnasio y quiero un portal de membresías con cobro recurrente y un área de miembros donde vean su plan", "webapp"],
    ["Quiero una plataforma de cursos en línea con lecciones en video y progreso del alumno", "webapp"],
    ["Somos una clínica y queremos un portal de telemedicina con expediente del paciente y videollamada", "webapp"],
    ["Quiero un directorio de negocios de mi zona, con fichas para cada comercio de la asociación", "webapp"],
  ];
  for (const [texto, esperada] of casos) {
    const got = inferCategory(texto);
    assert(got === esperada, `[QA10] inferCategory("${texto.slice(0, 55)}…") → ${esperada} (obtuve: ${got})`);
  }
  // Sin romper los casos actuales: un gimnasio que solo quiere una página de
  // presentación sigue siendo LANDING (las palabras sueltas "gimnasio"/"curso"/
  // "pacientes" NO mapean a webapp por sí solas).
  assert(
    inferCategory("Tengo un gimnasio aquí en el centro y quiero una página para que la gente vea los horarios y me llame") === "landing",
    "[QA10] gimnasio que solo quiere presentación → landing (no robar con 'gimnasio')"
  );
  assert(
    inferCategory("Tengo una inmobiliaria y quiero una página sencilla para que la gente vea mis propiedades y me llame") === "landing",
    "[QA10] inmobiliaria que solo quiere una página sencilla → landing (empates favorecen a landing)"
  );
  assert(
    inferCategory("Quiero un blog de nutrición donde escribo artículos y que la gente encuentre mis artículos en Google") === "blog",
    "[QA10] blog intacto (no lo roban las verticales)"
  );
  assert(
    inferCategory("Tengo una estética y quiero que mis clientas agenden sus citas en línea y que me encuentren en Google") === "citas",
    "[QA10] citas intacto (no lo roban las verticales)"
  );

  // Señales pasivas: la vertical se detecta desde discovery (extractSignals).
  {
    const ctx = createEmptyContext();
    fireOnReceive("discovery_business", "Tengo una inmobiliaria y quiero un portal de propiedades con filtros por zona y precio, y leads por propiedad", ctx);
    assert(ctx.inmobiliaria === true, "[QA10] señal inmobiliaria activada desde discovery");
  }
  {
    const ctx = createEmptyContext();
    fireOnReceive("discovery_business", "Tengo un gimnasio y quiero un portal de membresías con cobro recurrente y un área de miembros", ctx);
    assert(ctx.membresias === true, "[QA10] señal membresias activada desde discovery");
  }
  {
    const ctx = createEmptyContext();
    fireOnReceive("discovery_business", "Quiero una plataforma de cursos en línea con lecciones en video para mis alumnos", ctx);
    assert(ctx.cursos === true, "[QA10] señal cursos activada desde discovery");
  }
  {
    const ctx = createEmptyContext();
    fireOnReceive("discovery_business", "Queremos un portal de telemedicina con expediente del paciente y videollamada", ctx);
    assert(ctx.telemedicina === true, "[QA10] señal telemedicina activada desde discovery");
  }
  {
    const ctx = createEmptyContext();
    fireOnReceive("discovery_business", "Quiero un directorio de negocios con fichas para cada comercio de la asociación", ctx);
    assert(ctx.directorio === true, "[QA10] señal directorio activada desde discovery");
  }
  // Negación-aware: "no quiero un portal de propiedades" NO activa la vertical.
  {
    const ctx = createEmptyContext();
    fireOnReceive("discovery_business", "No quiero un portal de propiedades, solo una página sencilla", ctx);
    assert(ctx.inmobiliaria !== true, "[QA10] inmobiliaria NO se activa con negación");
  }

  // Fallback: las features verticales entran SOLO si el cliente las pidió
  // (se pasan en activeFeatureIds) y NO inflan un webapp genérico.
  {
    const ctx = createEmptyContext();
    ctx.category = "webapp";
    ctx.negocioDescripcion = "portal de propiedades";
    ctx.clientName = "Marisol";
    ctx.dashboard = true;
    ctx.baseDeDatos = true;
    ctx.autenticacion = true;
    const prop = buildFallbackProposal("webapp", ["filtros_inmobiliaria", "leads_propiedad", "panel_publicacion"], ctx.clientName, ctx);
    const feats = prop.funcionalidades ?? [];
    assert(
      feats.some((f) => /Filtros por zona y precio/.test(f)) &&
        feats.some((f) => /leads de compradores/.test(f)) &&
        feats.some((f) => /publicar propiedades/.test(f)),
      "[QA10] fallback webapp inmobiliaria incluye las features de la vertical"
    );
  }
  {
    const ctx = createEmptyContext();
    ctx.category = "webapp";
    ctx.negocioDescripcion = "sistema de inventario";
    ctx.clientName = "Rodrigo";
    ctx.dashboard = true;
    ctx.baseDeDatos = true;
    ctx.autenticacion = true;
    const prop = buildFallbackProposal("webapp", [], ctx.clientName, ctx);
    const feats = prop.funcionalidades ?? [];
    assert(
      !feats.some((f) => /Filtros por zona y precio/.test(f) || /leads de compradores/.test(f) || /Cobro recurrente/.test(f)),
      "[QA10] webapp genérico NO incluye features de vertical (no inflar sin pedirlas)"
    );
  }

  // Bots por vertical: inmobiliaria → ventas+leads · membresías → membresías+leads
  // · telemedicina → citas+faq · directorio → leads (tope de 3 intacto).
  {
    const ctx = createEmptyContext();
    ctx.category = "webapp";
    ctx.inmobiliaria = true;
    const rec = detectarBotsRecomendados(ctx);
    assert(rec.some((b) => b.id === "bot_ventas"), "[QA10] inmobiliaria → recomienda bot_ventas");
    assert(rec.some((b) => b.id === "bot_leads"), "[QA10] inmobiliaria → recomienda bot_leads");
    assert(rec.length <= 3, "[QA10] inmobiliaria → máx 3 bots");
  }
  {
    const ctx = createEmptyContext();
    ctx.category = "webapp";
    ctx.membresias = true;
    const rec = detectarBotsRecomendados(ctx);
    assert(rec.some((b) => b.id === "bot_membresias"), "[QA10] membresías → recomienda bot_membresias");
    assert(rec.some((b) => b.id === "bot_leads"), "[QA10] membresías → recomienda bot_leads");
  }
  {
    const ctx = createEmptyContext();
    ctx.category = "webapp";
    ctx.telemedicina = true;
    const rec = detectarBotsRecomendados(ctx);
    assert(rec.some((b) => b.id === "bot_citas"), "[QA10] telemedicina → recomienda bot_citas");
    assert(rec.some((b) => b.id === "bot_faq"), "[QA10] telemedicina → recomienda bot_faq");
  }
  {
    const ctx = createEmptyContext();
    ctx.category = "webapp";
    ctx.directorio = true;
    const rec = detectarBotsRecomendados(ctx);
    assert(rec.some((b) => b.id === "bot_leads"), "[QA10] directorio → recomienda bot_leads");
  }

  // resolverCategoria intacto: una webapp vertical sin panel/BD/login se degrada.
  {
    const ctx = createEmptyContext();
    ctx.category = "webapp";
    ctx.inmobiliaria = true;
    ctx.dashboard = false;
    ctx.baseDeDatos = false;
    ctx.autenticacion = false;
    assert(resolverCategoria(ctx) === "landing", "[QA10] webapp vertical sin panel/db/login → landing (resolverCategoria intacto)");
  }
}

// ─── Resumen ───────────────────────────────────────────────────────

console.log(`\n${"-".repeat(60)}`);
console.log(`Resultado: ${passed} OK · ${failures} FALLO${failures === 1 ? "" : "S"}`);
if (failures > 0) {
  console.error("\nLa prueba de regresión NO pasó.");
  process.exit(1);
}
console.log("La prueba de regresión pasó ✅");
