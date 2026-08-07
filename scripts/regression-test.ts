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
  totalBotsMensual,
  totalBotsSetup,
} from "../lib/bots-catalog";
import {
  buildFallbackProposal,
  inferCategory,
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
  "no", // cuentas
  "no", // base de datos
  "no", // panel
  "sí", // mapa
  "sí", // WhatsApp
  "no", // citas (no agenda en línea)
  "moderno", // diseño
  "sí", // SEO
  "el de preguntas frecuentes, por favor", // bots (LangChain): FAQ
  // PWA y página de referencia: se SALTAN para landing (Tarea C)
  "sí", // contenido listo
  "limpieza dental, ortodoncia y blanqueamiento", // servicios
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
  "ninguno", // bots (LangChain): sin asistentes IA
  // PWA y referencia: se SALTAN para landing (Tarea C)
  "no",
  "clases grupales, clases privadas y retiros",
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
  "ninguno", // bots (LangChain): sin asistentes IA
  // PWA y referencia: se SALTAN para landing (Tarea C)
  "sí",
  "corte, barba, afeitado y cejas",
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
  "el de promociones", // bots (LangChain): promos
  // PWA y referencia: se SALTAN para landing (Tarea C)
  "no",
  "comida casera, desayunos y comida corrida",
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
  "ninguno", // bots (LangChain): sin asistentes IA
  // PWA y referencia: se SALTAN para landing (Tarea C)
  "tengo algunas fotos pero no muy profesionales", // contenido
  "unas 30 prendas con su precio y descripción", // servicios/catálogo
  "en unas 3 semanas", // fecha
  "unos 6 o 7 mil pesos", // presupuesto
  "Me llamo María y mi tienda se llama Moda GDL", // nombre
  "maria.moda@gmail.com", // email
  "33 1234 5678", // teléfono
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
  "No, no, que ni se registren. Ellos nada más me marcan o me escriben por el WhatsApp", // cuentas
  "No, no necesito guardar nada de mis clientes. Con que me encuentren y me contacten, ya la hizo", // base de datos
  "No, no necesito ningún panel. Con que me lleguen las llamadas y los mensajes del WhatsApp, con eso me basta", // panel
  "Sí, sí tengo mi local aquí en Toluca. Me gustaría el mapa para que la gente llegue sin pedir indicaciones", // mapa
  "Sí, ese botón del WhatsApp es justo lo que quiero. La gente me escribe mucho por ahí", // WhatsApp
  "No, no, eso no lo quiero. La gente me llama o me escribe y yo les aparto su lugar por teléfono, sin necesidad de andar con agenda en línea", // citas
  "Pues algo sobrio, de confianza, que se vea serio. Nada de muchas cosas con movimiento ni nada muy elegante, ¿eh?", // diseño
  "Sí, claro, eso es justo lo que quiero: que cuando busquen taller mecánico en Toluca salga mi taller", // SEO
  "Ninguno, la verdad, con la página me basta", // bots (LangChain): sin asistentes IA
  // PWA y referencia: se SALTAN para landing (Tarea C)
  "Pues tengo unas fotos del taller que saqué con mi celular, pero no son muy profesionales. El logo del Toro lo tengo pero está medio sencillo. Si me ayuda con los textos, mejor", // contenido
  "Pues le ofrezco a la gente cambio de aceite, frenos, afinación y también el escaneo de la computadora del carro. Sin precios mejor, porque cada coche es distinto; con una breve descripción de cada uno está bien", // servicios
  "Pues no hay mucha prisa, la verdad. Cuando se pueda, con calma, no le urge", // fecha
  "Pues mire, la verdad yo pensaba en unos 5 o 6 mil pesos, no más. ¿Cree que con eso alcance para algo bien hecho?", // presupuesto
  "Me llamo Ricardo Mendoza, y el negocio se llama Taller El Toro", // nombre
  "ricardo.tallertoro@gmail.com", // email
  "722 123 4567, ese es el que uso para el negocio", // teléfono
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
    "no, no necesito guardar datos de mis pacientes", // technical_db
    "sí, quiero el mapa de la clínica", // technical_maps
    "sí, que me escriban por WhatsApp", // technical_chat
    "moderno pero de confianza", // design
    "sí, que me encuentren en Google", // technical_seo
    "no, sin instalarse como app", // technical_pwa
    "ninguno", // bots (LangChain): sin asistentes IA
    "sí, ya tengo fotos de la clínica", // scope_content
    "limpieza dental, ortodoncia y blanqueamiento", // scope_services
    "ninguna referencia", // scope_reference
    "para el próximo mes", // scope_deadline
    "unos 20 mil pesos", // budget
    "Soy la Dra. Laura", // contact_name
    "laura@clinica.com", // contact_email
    "81 2345 6789", // contact_phone
    "no, gracias", // extra_comments
  ]);
  assert(ctx.category === "citas", "[Clínica] categoría citas");
  assert(ctx.citas === true, "[Clínica] citas=true (lo quiere, se confirma)");
  assert(ctx.pagos === false, "[Clínica] pagos=false (lo rechazó en la descripción)");
  assert(ctx.dashboard === false, "[Clínica] dashboard=false");
  assert(ctx.autenticacion === false, "[Clínica] autenticacion=false");
  // No se preguntaron los temas que el cliente ya rechazó:
  const noPreguntadas = ["technical_auth", "technical_payments", "technical_dashboard", "technical_pdfs", "technical_bookings"];
  const preguntadas = noPreguntadas.filter((id) => asked.includes(id));
  assert(
    preguntadas.length === 0,
    `[Clínica] no repregunta lo rechazado (solo preguntó: ${preguntadas.join(", ") || "ninguno"})`
  );
  // Sí se preguntan los que faltaban por confirmar (mapa, WhatsApp, SEO, etc.):
  assert(
    ["technical_db", "technical_maps", "technical_chat", "technical_seo", "technical_pwa"].every((id) =>
      asked.includes(id)
    ),
    "[Clínica] sí pregunta lo que aún no se sabía (db, mapa, chat, seo, pwa)"
  );
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
    "No, no quiero cuentas ni registros, la gente solo va a ver y me va a escribir",
    "No, no quiero guardar nada de mis clientes, nada de base de datos, solo que me contacten",
    "No, no quiero ningún panel, con que me escriban por WhatsApp me basta",
    "Sí, quiero el mapa de mi tienda para que la gente llegue sin pedir indicaciones",
    "Sí, quiero el botón de WhatsApp para que me escriban directo desde la página",
    "No, no necesito citas en línea, mi tienda no es de citas",
    "Algo moderno pero sobrio, con fotos grandes y que se vea limpio",
    "Sí, lo más importante es que me encuentren en Google cuando busquen tienda de ropa en Guadalajara",
    "ninguno", // bots (LangChain): sin asistentes IA
    // PWA y referencia: se SALTAN para landing (Tarea C)
    "Tengo fotos de mi mercancía y el logo, pero los textos me ayudarías tú",
    "Camisas de vestir, pantalones de mezclilla y trajes para caballero",
    "Lo quiero para el próximo mes",
    "Unos 10 mil pesos, no más de eso",
    "Me llamo Carlos, y la tienda se llama La Tijera de Oro",
    "Mi correo es carlos.tijeradeoro@gmail.com",
    "33 1234 5678, ese es mi WhatsApp",
    "No, con eso es todo",
  ]);
  assert(ctx.category === "landing", "[Carlos] categoría landing");
  assert(ctx.chat === true, "[Carlos] chat=true (sí quiere WhatsApp)");
  assert(ctx.citas === false, "[Carlos] citas=false (declinó citas en línea)");
  assert(ctx.seo === true, "[Carlos] seo=true (sí quiere Google)");
  assert(ctx.baseDeDatos === false, "[Carlos] baseDeDatos=false (no guarda datos)");
  assert(ctx.dashboard === false, "[Carlos] dashboard=false (no quiere panel)");
  assert(ctx.autenticacion === false, "[Carlos] autenticacion=false (no quiere cuentas)");
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

// ─── FASE P2 · Presupuesto dicho junto con el plazo (no re-preguntar) ──
// Bug: si el cliente mencionaba su monto al responder el plazo, la máquina
// guardaba fechaEntrega pero perdía el monto, y el nodo budget volvía a
// preguntar ("¿qué inversión tienes en mente?"). Ahora scope_deadline captura
// el monto y budget se salta por condición.

section("P2 · Presupuesto capturado desde scope_deadline y budget saltado");
{
  // Plazo + monto: se captura el presupuesto y budget se salta.
  const ctx = createEmptyContext();
  const resp =
    "Para mediados del próximo mes está bien. Y de presupuesto, la verdad no sé cuánto cobran, pero yo pensaba en unos 10 mil pesos, no más.";
  fireOnReceive("scope_deadline", resp, ctx);
  assert(
    ctx.presupuesto === "10000",
    `[P2] monto capturado desde scope_deadline → 10000 (obtuve: ${ctx.presupuesto})`
  );
  assert(ctx.fechaEntrega !== null, `[P2] fechaEntrega también se captura (${ctx.fechaEntrega})`);
  assert(
    FLOW.scope_deadline.nextNode(resp, ctx) === "budget",
    "[P2] scope_deadline sigue apuntando a budget"
  );
  // budget se salta por condición; el skip (respuesta vacía) va a contact_name.
  assert(
    FLOW.budget.condition?.(ctx) === false,
    "[P2] budget.condition = false con presupuesto capturado"
  );
  assert(
    FLOW.budget.nextNode("", ctx) === "contact_name",
    "[P2] skip de budget → contact_name, no re-pregunta"
  );
}
{
  // Plazo SIN monto → budget SÍ se pregunta (sin regresión).
  const ctx = createEmptyContext();
  fireOnReceive("scope_deadline", "Lo quiero para el próximo mes", ctx);
  assert(ctx.presupuesto === null, "[P2] plazo sin monto → presupuesto sigue null");
  assert(FLOW.budget.condition?.(ctx) === true, "[P2] budget.condition = true (sí se pregunta)");
}
{
  // Flujo completo con monto en el plazo: budget se salta y el flujo llega a
  // contact_name sin re-preguntar (asked = nodos donde SÍ se consumió respuesta).
  const { ctx, asked } = simulate([
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
    "ninguno", // bots (LangChain): sin asistentes IA
    "no",
    "clases grupales, clases privadas y retiros",
    "para ya, y de presupuesto unos 15 mil pesos",
    "Me llamo Andrea",
    "andrea@yoga.com",
    "81 9999 8888",
    "todo bien",
  ]);
  assert(
    ctx.presupuesto === "15000",
    `[P2-flujo] presupuesto capturado en el plazo (${ctx.presupuesto})`
  );
  assert(
    !asked.includes("budget") && !asked.includes("clarify_budget"),
    "[P2-flujo] budget NO se preguntó (saltado)"
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
    "no",
    "no",
    "no",
    "sí",
    "sí",
    "no",
    "sobrio",
    "sí",
    "ninguno", // bots (LangChain): sin asistentes IA
    "no",
    "clases grupales, clases privadas y retiros",
    "para ya",
    "unos 15 mil",
    "Me llamo Andrea",
    "andrea@yoga.com",
    "81 9999 8888",
    "todo bien",
  ]);
  assert(
    ctx.presupuesto === "15000",
    `[P2-flujo] presupuesto capturado en budget (${ctx.presupuesto})`
  );
  assert(asked.includes("budget"), "[P2-flujo] budget SÍ se preguntó (sin monto previo)");
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
  fireOnReceive("scope_deadline", "para marzo, tengo 10000", ctx);
  assert(
    ctx.presupuesto === "10000",
    `[B1] "para marzo, tengo 10000" → presupuesto 10000 (obtuve: ${ctx.presupuesto})`
  );
  assert(ctx.fechaEntrega === "para marzo", `[B1] fecha capturada (${ctx.fechaEntrega})`);
  assert(FLOW.budget.condition?.(ctx) === false, "[B1] budget se salta (monto ya capturado)");
}
{
  const ctx = createEmptyContext();
  fireOnReceive("scope_deadline", "en 3 meses", ctx);
  assert(
    ctx.presupuesto === null,
    `[B2] "en 3 meses" → presupuesto null (obtuve: ${ctx.presupuesto})`
  );
  assert(FLOW.budget.condition?.(ctx) === true, "[B2] budget sí se pregunta");
}
{
  const ctx = createEmptyContext();
  fireOnReceive("scope_deadline", "para el próximo mes, en unas 3 semanas", ctx);
  assert(
    ctx.presupuesto === null,
    `[B2] "para el próximo mes, en unas 3 semanas" → presupuesto null (obtuve: ${ctx.presupuesto})`
  );
  assert(ctx.fechaEntrega !== null, "[B2] la fecha sí se captura");
  // Conversación F de María intacta: "en unas 3 semanas" no captura presupuesto.
  const ctxM = createEmptyContext();
  fireOnReceive("scope_deadline", "en unas 3 semanas", ctxM);
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
    "no",
    "no",
    "no",
    "sí",
    "sí",
    "no",
    "sobrio",
    "sí",
    "ninguno", // bots (LangChain): sin asistentes IA
    "no",
    "clases grupales, clases privadas y retiros",
    "para ya",
    "unos 15 mil",
    "Me llamo Andrea",
    "andrea@yoga.com",
    "81 9999 8888",
    "todo bien",
  ]);
  assert(ctx.category === "landing", "[C] yoga → landing");
  assert(!asked.includes("technical_pwa"), "[C] technical_pwa NO se pregunta para landing");
  assert(!asked.includes("scope_reference"), "[C] scope_reference NO se pregunta para landing");
  assert(!asked.includes("technical_pdfs"), "[C] technical_pdfs NO se pregunta para landing");
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
  assert(FLOW.scope_deadline.condition?.(ctx) === false, "[D] scope_deadline se salta");
  assert(FLOW.budget.condition?.(ctx) === false, "[D] budget se salta");
  assert(FLOW.contact_name.condition?.(ctx) === false, "[D] contact_name se salta");
  // El skip con respuesta vacía va al siguiente (no cae en clarificación).
  assert(FLOW.scope_deadline.nextNode("", ctx) === "budget", "[D] skip de scope_deadline → budget");
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
    "no", // cuentas
    "no", // base de datos
    "no", // panel
    "sí", // mapa
    "sí", // WhatsApp
    "no", // citas
    "moderno", // diseño
    "sí", // SEO
    "ninguno", // bots (LangChain): sin asistentes IA
    "sí", // contenido
    "limpieza dental y consultas", // servicios
    "81 2345 6789", // teléfono
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
  for (const id of ["scope_deadline", "budget", "contact_name", "contact_email"]) {
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
    ["scope_deadline", "clarify_deadline"],
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
    "no, no guardo datos de pacientes",
    "sí, quiero el mapa de la clínica",
    "sí, que me escriban por WhatsApp",
    "moderno pero de confianza",
    "sí, que me encuentren en Google",
    "ninguno", // bots (LangChain): sin asistentes IA
    "sí, ya tengo fotos",
    "limpieza dental, ortodoncia y blanqueamiento",
    "para el próximo mes",
    "unos 10 mil pesos",
    "laura.sonrisa@gmail.com",
    "81 2345 6789",
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
    "no, no necesito guardar datos",
    "sí, el mapa de la clínica",
    "sí, botón de WhatsApp",
    "moderno",
    "sí",
    "ninguno", // bots (LangChain): sin asistentes IA
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
    "scope_reference",
    "scope_deadline",
    "budget",
    "contact_name",
    "contact_email",
  ]) {
    assert(!asked.includes(id), `[QA6] ${id} NO se pregunta (ya respondido/rechazado o saltado)`);
  }
  assert(ctx.clientName === "La Dra. Laura", `[QA6] nombre capturado temprano (${ctx.clientName})`);
  assert(ctx.presupuesto === "20000", `[QA6] presupuesto capturado (${ctx.presupuesto})`);
  assert(asked.includes("contact_phone"), "[QA6] teléfono se pide en su nodo (una vez)");
}

section("QA7 · scope_deadline no guarda 'no sé' como fecha");
{
  const ctx = createEmptyContext();
  fireOnReceive("scope_deadline", "no sé", ctx);
  assert(ctx.fechaEntrega === null, `[QA7] "no sé" en plazo → fecha null (obtuve: ${ctx.fechaEntrega})`);
  const ctx2 = createEmptyContext();
  fireOnReceive("scope_deadline", "para el próximo mes", ctx2);
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
    "no", // cuentas
    "no", // base de datos
    "no", // pagos en línea
    "no", // panel
    "sí", // mapa
    "sí", // WhatsApp
    "moderno", // diseño
    "sí", // SEO
    "no, sin instalarse como app", // PWA
    "el de citas y el de preguntas frecuentes", // bots (LangChain)
    "sí", // contenido
    "limpieza dental, ortodoncia y blanqueamiento", // servicios
    "ninguna referencia", // referencia
    "para el próximo mes", // fecha
    "unos 20 mil", // presupuesto
    "Soy Laura", // nombre
    "laura@clinica.com", // email
    "81 2345 6789", // teléfono
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

// ─── Resumen ───────────────────────────────────────────────────────

console.log(`\n${"-".repeat(60)}`);
console.log(`Resultado: ${passed} OK · ${failures} FALLO${failures === 1 ? "" : "S"}`);
if (failures > 0) {
  console.error("\nLa prueba de regresión NO pasó.");
  process.exit(1);
}
console.log("La prueba de regresión pasó ✅");
