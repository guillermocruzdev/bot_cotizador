/**
 * QA · BOT TESTER — Cliente NO-TÉCNICO que quiere una LANDING básica
 *
 * Simula (sin LLM) la conversación con la máquina de estados determinista y
 * reporta como tester: categoría resuelta, flags técnicos, presupuesto/plazo,
 * estructura, total determinista, cuántas preguntas se hicieron (¿el discovery
 * es corto para una landing?) y si la propuesta fallback promete funciones que
 * el cliente declinó o no entiende.
 *
 * Correr: npx tsx scripts-tmp/qa-no-tecnico.ts
 */
import { createEmptyContext, type ChatContext } from "../lib/types";
import { DONE_NODE_ID, FLOW, START_NODE_ID, getNode } from "../lib/conversation-flow";
import { buildFallbackProposal, resolverCategoria } from "../lib/pricing-catalog";
import { calcularTotalDeterminista } from "../lib/quote-engine";
import { detectarGiro, filtrarPorDeclinados } from "../lib/industry-pricing";

function simulate(answers: string[]): { ctx: ChatContext; asked: string[]; visited: string[] } {
  const ctx = createEmptyContext();
  let nodeId: string = START_NODE_ID;
  const asked: string[] = [];
  const visited: string[] = [];
  let used = 0;
  let guard = 0;
  while (nodeId !== DONE_NODE_ID && guard < 300) {
    guard += 1;
    const node = getNode(nodeId);
    if (!node) throw new Error(`Nodo inexistente: ${nodeId}`);
    if (node.type === "greeting") {
      nodeId = node.nextNode("", ctx);
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
    while (g < 60) {
      const target = getNode(nodeId);
      if (!target || !target.condition || target.condition(ctx)) break;
      nodeId = target.nextNode("", ctx);
      visited.push(nodeId);
      g += 1;
    }
  }
  if (nodeId !== DONE_NODE_ID) throw new Error(`No cerró; terminó en ${nodeId}`);
  return { ctx, asked, visited };
}

const F = (v: unknown) => (v === null ? "null" : v === undefined ? "undef" : String(v));

function report(name: string, answers: string[]) {
  try {
    const { ctx, asked, visited } = simulate(answers);
    const cat = resolverCategoria(ctx) ?? ctx.category;
    const total = calcularTotalDeterminista({
      giro: detectarGiro(ctx.negocioDescripcion, cat ?? "landing").nombre,
      clientName: ctx.clientName,
      clientPhone: ctx.clientPhone,
      negocioDescripcion: ctx.negocioDescripcion,
      category: cat,
      paginas: ctx.paginas,
    });
    const cuota = total != null ? Math.round(total / 24) : null;

    console.log(`\n${"═".repeat(72)}`);
    console.log(`PERSONA: ${name}`);
    console.log(`  categoría final : ${F(cat)}  (inferida: ${F(ctx.category)})`);
    console.log(`  paginas=${F(ctx.paginas)}  estructura="${ctx.estructuraWeb}"`);
    console.log(`  autenticacion=${F(ctx.autenticacion)} baseDeDatos=${F(ctx.baseDeDatos)} pagos=${F(ctx.pagos)} dashboard=${F(ctx.dashboard)}`);
    console.log(`  mapas=${F(ctx.mapas)} documentos=${F(ctx.documentos)} chat=${F(ctx.chat)} citas=${F(ctx.citas)}`);
    console.log(`  animaciones=${F(ctx.animaciones)} seo=${F(ctx.seo)} pwa=${F(ctx.pwa)} contenidoListo=${F(ctx.contenidoListo)}`);
    console.log(`  servicios="${ctx.servicios}"`);
    console.log(`  presupuesto="${ctx.presupuesto}"  fechaEntrega="${ctx.fechaEntrega}"`);
    console.log(`  nombre="${ctx.clientName}" email="${ctx.clientEmail}" phone="${ctx.clientPhone}"`);
    console.log(`  TOTAL determinista = ${total != null ? "$" + total.toLocaleString("es-MX") : "N/A"}  cuota/24 = ${cuota != null ? "$" + cuota.toLocaleString("es-MX") : "N/A"}`);
    console.log(`  preguntados (${asked.length}): ${asked.join(", ")}`);
    // Nodos de clarificación repetidos (posible fricción con no-técnicos)
    const counts = new Map<string, number>();
    for (const id of visited) counts.set(id, (counts.get(id) ?? 0) + 1);
    const dups = Array.from(counts.entries()).filter(([, n]) => n > 1);
    console.log(`  repetidos (>1): ${dups.length ? dups.map(([id, n]) => `${id}x${n}`).join(", ") : "ninguno"}`);

    // Propuesta fallback (ya filtrada por declinados) para detectar promesas
    const raw = buildFallbackProposal(cat ?? "landing", [], ctx.clientName ?? "", ctx);
    const prop = filtrarPorDeclinados(raw, ctx);
    const texto = [prop.punto_venta, prop.dolor, ...(prop.beneficios ?? []), prop.costo_omision, ...(prop.funcionalidades ?? []), ...(prop.entregables ?? []), ...(prop.stack_tecnico ?? [])].join(" ⏐ ");
    console.log(`  PROPUESTA (tras filtrar declinados): categoria="${prop.categoria}"`);
    console.log(`    copy/entregables: ${texto.slice(0, 620)}`);
  } catch (err) {
    console.log(`\n${"═".repeat(72)}`);
    console.log(`PERSONA: ${name} — ERROR: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ════════════════════════════════════════════════════════════════════
// PERSONA 1 · Doña Rosario (55+, tortillería/abarrotes) — NO sabe de
// tecnología. Responde "página de internet", "no entiendo de esas cosas",
// "lo que usted diga", solo quiere que la encuentren y le hablen.
// ════════════════════════════════════════════════════════════════════
report("1 · Doña Rosario (tortillería, NO sabe de tecnología, básico)", [
  // discovery_business
  "Pues mire, yo tengo una tortillería aquí en el pueblo, La Rosario. Quiero una página de internet, de esas que la gente ve en el celular, para que sepan dónde estoy. Yo de esto no sé nada, usted es el que sabe",
  // discovery_confirm
  "sí, sí, eso mismo, que me encuentren",
  // pages
  "Una sola página, así como las que he visto: que diga mi nombre, qué vendo y el teléfono. Nada más",
  // technical_bundle (no entiende el bundle → clarifica, el bot lo simplifica)
  "no sé, usted vea, lo que me convenga. Yo solo quiero que me hablen por el WhatsApp y que me encuentren en el Google",
  // clarify_bundle (el bot simplificó; la persona delega → recomendaciones)
  "sí, lo que usted recomiende",
  // design
  "algo sencillo, que se vea bonito, con el color amarillo de mi negocio",
  // technical_bots
  "no, eso de los robots no, no lo necesito",
  // scope_content
  "tengo unas fotos de las tortillas y del local que me tomó mi hijo con su celular",
  // scope_services
  "pues vendo tortillas de maíz, harina, y también totopos. Eso es todo",
  // budget (fecha + monto)
  "para el otro mes, y de dinero pues… no sé cuánto cobra uno de esto. ¿Cree que con unos 5 mil alcance? No tengo mucho",
  // contact_name (fusionado)
  "Me llamo Rosario Pérez, mi correo es rosario.tortilleria@gmail.com y mi WhatsApp es el 81 44 55 66 77",
  // extra_comments
  "no, con eso es todo, muchas gracias",
]);

// ════════════════════════════════════════════════════════════════════
// PERSONA 2 · Don Chema (ferretería, responde mucho "no sé"/"como usted
// diga" — estrés de cliente vago pero cooperativo)
// ════════════════════════════════════════════════════════════════════
report("2 · Don Chema (ferretería, 'no sé / como usted diga' crónico)", [
  "Pues sí, tengo una ferretería, La de Don Chema. Quiero una página de internet sencilla, de las que se ven en el teléfono, para que la gente me busque. Yo de computadoras no sé nada",
  "sí, así es",
  "una sola página: inicio, lo que vendo y mi teléfono",
  "no sé, la verdad no entiendo de esas cosas. Usted haga lo que crea",
  "lo que usted recomiende, algo sencillo y que se vea serio",
  "no, eso no, yo nada más quiero la página",
  "no tengo fotos, pero mi hijo me va a ayudar con eso",
  "vendo clavos, tornillos, pintura, herramientas y material de plomería",
  "pues para el próximo mes. ¿Y cuánto cobra? … tengo como 6 o 7 mil",
  "Me llamo José Martínez, mi correo es jose.ferreteria@gmail.com, y el teléfono es 81 33 22 11 00",
  "no, ya con eso, gracias",
]);

// ════════════════════════════════════════════════════════════════════
// PERSONA 3 · Estrés máximo: cliente que TODO lo deja en manos del bot
// (responde "no sé" al bundle y "sí" genérico donde se puede). Verifica que
// el flujo no se congele y que el discovery siga siendo corto.
// ════════════════════════════════════════════════════════════════════
report("3 · Doña Chole (puesto de comida, 'lo dejo en tus manos' total)", [
  "Quiero una página de internet para mi puesto de tacos, que la gente me encuentre y me hable. Yo no entiendo nada de eso, usted hágale como mejor convenga",
  "sí",
  "una sola página, con mi nombre, el menú y el teléfono",
  "no sé", // technical_bundle → clarify_bundle
  "no sé", // clarify_bundle (1ª) → re-pregunta
  "lo que usted diga, sí", // clarify_bundle (2ª) → recomendaciones
  "algo sencillo, que se vea limpio", // design
  "no, nada de eso", // technical_bots
  "tengo unas fotos que me sacó mi sobrina", // scope_content
  "tacos de trompo, de bistec y de pastor", // scope_services
  "para el mes que viene, y no sé cuánto cobran… póngale como 6 mil", // budget
  "Soy Consuelo Ramírez, mi correo es consuelo.tacos@gmail.com y el WhatsApp 81 99 88 77 66", // contact_name
  "no, gracias", // extra_comments
]);

// ════════════════════════════════════════════════════════════════════
// PERSONA 4 · Cliente no-técnico PERO con una idea clara y presupuesto
// alto: un gimnasio. Verifica que el "no sé" en bundle aplica
// recomendaciones y que con presupuesto > total no se rompe la coherencia.
// ════════════════════════════════════════════════════════════════════
report("4 · Señor Pancho (gimnasio, no-técnico pero con idea y dinero)", [
  "Tengo un gimnasio aquí en el centro y quiero una página para que la gente vea los horarios y me llame. Yo no entiendo de tecnología, pero quiero que se vea seria y de confianza",
  "sí, exacto",
  "Inicio, Horarios, Mis clases y Contacto, una sola página",
  "no sé de esas cosas, usted vea. Sí quiero que me encuentren en Google porque por eso se llegan los clientes",
  "moderno, que se vea fuerte, con los colores del gimnasio",
  "no, sin asistentes, eso es para grandes empresas creo",
  "sí tengo fotos de las máquinas y de mis alumnos (con permiso de ellos)",
  "crossfit, pesas, spinning y clases de cardio",
  "para el próximo mes, y mi presupuesto es de unos 15 mil pesos",
  "Me llamo Francisco Vega, francisco.gym@gmail.com y el teléfono 81 22 33 44 55",
  "no, con eso es todo",
]);

console.log(`\n${"═".repeat(72)}`);
console.log("FIN DE LA PRUEBA QA — persona no-técnica / landing básica");
