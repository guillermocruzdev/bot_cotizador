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
  "No, no, eso no. Con que la página se vea bien en el celular, ya con eso basta. No necesito que se instale como app", // PWA
  "Pues tengo unas fotos del taller que saqué con mi celular, pero no son muy profesionales. El logo del Toro lo tengo pero está medio sencillo. Si me ayuda con los textos, mejor", // contenido
  "Pues le ofrezco a la gente cambio de aceite, frenos, afinación y también el escaneo de la computadora del carro. Sin precios mejor, porque cada coche es distinto; con una breve descripción de cada uno está bien", // servicios
  "No, no, la verdad no tengo ninguna página de referencia. Con que se vea limpia y seria, me doy por bien servido", // referencia
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

// ─── Resumen ───────────────────────────────────────────────────────

console.log(`\n${"-".repeat(60)}`);
console.log(`Resultado: ${passed} OK · ${failures} FALLO${failures === 1 ? "" : "S"}`);
if (failures > 0) {
  console.error("\nLa prueba de regresión NO pasó.");
  process.exit(1);
}
console.log("La prueba de regresión pasó ✅");
