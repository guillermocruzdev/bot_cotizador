/**
 * QA · 10 PERSONAS DE PRUEBA (determinista)
 * Simula cada conversación con la máquina de estados (sin LLM) e imprime el
 * diagnóstico final: categoría resuelta, flags, presupuesto, estructura,
 * total determinista y si la propuesta promete lo declinado.
 *
 * Correr: npx tsx scripts-tmp/qa-personas.ts
 */
import { createEmptyContext, type ChatContext } from "../lib/types";
import { DONE_NODE_ID, FLOW, START_NODE_ID, getNode } from "../lib/conversation-flow";
import { resolverCategoria, buildFallbackProposal } from "../lib/pricing-catalog";
import { calcularTotalDeterminista, derivarTipoWeb, calculateQuote, buildClientData } from "../lib/quote-engine";
import { detectarGiro } from "../lib/industry-pricing";

function simulate(answers: string[]): {
  ctx: ChatContext;
  asked: string[];
} {
  const ctx = createEmptyContext();
  let nodeId: string = START_NODE_ID;
  const asked: string[] = [];
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
    let g = 0;
    while (g < 60) {
      const target = getNode(nodeId);
      if (!target || !target.condition || target.condition(ctx)) break;
      nodeId = target.nextNode("", ctx);
      g += 1;
    }
  }
  if (nodeId !== DONE_NODE_ID) throw new Error(`No cerró; terminó en ${nodeId}`);
  return { ctx, asked };
}

const F = (v: unknown) => (v === null ? "null" : v === undefined ? "undef" : String(v));

function report(name: string, answers: string[]) {
  try {
    const { ctx, asked } = simulate(answers);
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
    console.log(`\n${"─".repeat(70)}`);
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
    // Propuesta fallback (copy/entregables) para detectar promesas de lo declinado
    const prop = buildFallbackProposal(cat ?? "landing", [], ctx.clientName ?? "", ctx);
    const texto = [prop.punto_venta, prop.dolor, ...(prop.beneficios ?? []), prop.costo_omision, ...(prop.funcionalidades ?? []), ...(prop.entregables ?? []), ...(prop.stack_tecnico ?? [])].join(" ⏐ ");
    console.log(`  PROPUESTA fallback: categoria="${prop.categoria}"`);
    console.log(`    copy/entregables: ${texto.slice(0, 600)}`);
  } catch (err) {
    console.log(`\n${"─".repeat(70)}`);
    console.log(`PERSONA: ${name} — ERROR: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── 1 · Clínica dental La Sonrisa (quiere citas; no pagos/panel/cuentas; $10,000) ──
report("1 · Clínica dental La Sonrisa (citas, sin pagos/panel/cuentas, $10k)", [
  "Soy la Dra. Laura de la Clínica Dental La Sonrisa. Quiero una página para presentar mis servicios y que mis pacientes puedan pedir cita. No quiero pagos en línea, ni panel de administración, ni cuentas para pacientes",
  "sí, así es",
  "Inicio, Servicios, Cómo llegar y Contacto, una sola página",
  "no, no guardo datos de pacientes",
  "sí, quiero el mapa de la clínica",
  "sí, que me escriban por WhatsApp",
  "moderno pero de confianza",
  "sí, que me encuentren en Google",
  "sí, ya tengo fotos",
  "limpieza dental, ortodoncia y blanqueamiento",
  "para el próximo mes",
  "unos 10 mil pesos",
  "laura.sonrisa@gmail.com",
  "81 2345 6789",
  "no, gracias",
]);

// ── 2 · Tienda de ropa María (GDL, 6-7k, 30 prendas; declina mapa/pagos/panel/cuentas/citas) ──
report("2 · Tienda de ropa María (básica, 6-7k, declina casi todo)", [
  "Tengo una tienda de ropa en Guadalajara y quiero una página sencilla para que la gente me encuentre por internet. Algo básico, no muy caro",
  "sí, sí, así es",
  "Una sola página de corrido, con inicio, catálogo y contacto",
  "no, sin cuentas ni registros",
  "no, no guardo nada de clientes",
  "no, no quiero panel",
  "no, no quiero mapa",
  "sí, botón de WhatsApp",
  "no, no es negocio de citas",
  "moderno pero sencillo",
  "sí, SEO",
  "tengo fotos pero no muy profesionales",
  "unas 30 prendas con precio y descripción",
  "en unas 3 semanas",
  "unos 6 o 7 mil pesos",
  "Me llamo María, mi tienda es Moda GDL",
  "maria.moda@gmail.com",
  "33 1234 5678",
  "no, con eso es suficiente",
]);

// ── 3 · Restaurante La Esquina (Puebla, menciona WhatsApp varias veces) ──
report("3 · Restaurante La Esquina (Puebla, mucho WhatsApp, no 'app')", [
  "Tengo un restaurante en Puebla, se llama La Esquina. Quiero que la gente me encuentre, vea mi menú y me escriba por WhatsApp para apartar mesa. Me piden mucho mi WhatsApp para pedir comida a domicilio y quiero tener todo en mi página",
  "sí, así es, eso quiero",
  "Inicio, Menú, Nosotros, Ubicación y Contacto",
  "no, sin registros",
  "no, no necesito base de datos",
  "no, no quiero panel",
  "sí, el mapa para que lleguen",
  "sí, el botón de WhatsApp, es muy importante para mí",
  "no, me apartan por WhatsApp, no en línea",
  "cálido y con fotos de comida",
  "sí, que me encuentren en Google",
  "tengo fotos de mis platillos",
  "desayunos, comida corrida, antojitos y especialidades de la casa",
  "para el próximo mes",
  "entre 10 y 15 mil",
  "Me llamo Carmen",
  "carmen.esquina@gmail.com",
  "222 333 4455",
  "nada más",
]);

// ── 4 · Barbería La Tijera de Oro (Carlos: confirmación con lista de rechazos) ──
report("4 · Barbería La Tijera de Oro (Carlos)", [
  "Hola, tengo una barbería en Guadalajara y quiero una página sencilla para que la gente me encuentre y me escriba por WhatsApp",
  "Sí, sí, así es… Nada de andar vendiendo por internet ni nada de eso",
  "Una sola página de corrido: inicio, mis servicios, cómo llegar y el contacto",
  "No, no quiero cuentas ni registros, la gente solo va a ver y me escribe",
  "No, no quiero guardar nada de clientes, nada de base de datos",
  "No, no quiero ningún panel, con que me escriban por WhatsApp me basta",
  "Sí, quiero el mapa de mi barbería",
  "Sí, quiero el botón de WhatsApp para que me escriban directo",
  "No, no necesito citas en línea, mi barbería no es de citas",
  "Algo moderno pero sobrio, con fotos de mis cortes",
  "Sí, que me encuentren en Google cuando busquen barbería",
  "Tengo fotos de mis cortes y el logo",
  "corte de cabello, barba, afeitado clásico y diseño de cejas",
  "Lo quiero para el próximo mes",
  "Unos 10 mil pesos, no más",
  "Me llamo Carlos, y la barbería se llama La Tijera de Oro",
  "carlos.tijeradeoro@gmail.com",
  "33 1234 5678",
  "No, con eso es todo",
]);

// ── 5 · Taller mecánico Ricardo (declina citas → copy neutro, stack sin Supabase) ──
report("5 · Taller mecánico Ricardo (declina citas)", [
  "Pues mire, yo tengo un taller mecánico aquí en Toluca, el Taller El Toro. La gente me busca por teléfono y WhatsApp, pero cuando buscan en Google no salgo. Quiero una página bien sencilla, algo básico, para que me encuentren y me hablen. No quiero nada muy caro",
  "sí, sí, así está bien",
  "Sí, así una sola página: inicio, mis servicios, la ubicación con el mapa y el contacto. Con eso me conformo",
  "No, no, que ni se registren. Ellos nada más me marcan o me escriben por el WhatsApp",
  "No, no necesito guardar nada de mis clientes",
  "No, no necesito ningún panel",
  "Sí, sí tengo mi local aquí en Toluca. Me gustaría el mapa",
  "Sí, ese botón del WhatsApp es justo lo que quiero",
  "No, no, eso no lo quiero. La gente me llama y yo les aparto su lugar por teléfono",
  "Pues algo sobrio, de confianza, que se vea serio",
  "Sí, claro, que cuando busquen taller mecánico en Toluca salga mi taller",
  "Pues tengo unas fotos del taller con mi celular",
  "cambio de aceite, frenos, afinación y escaneo de la computadora del carro",
  "Pues no hay mucha prisa",
  "Pues mire, la verdad yo pensaba en unos 5 o 6 mil pesos, no más",
  "Me llamo Ricardo Mendoza, y el negocio se llama Taller El Toro",
  "ricardo.tallertoro@gmail.com",
  "722 123 4567",
  "No, ya con eso es todo",
]);

// ── 6 · Abogado (giro alto, presupuesto > 15k) ──
report("6 · Abogado (giro alto, presupuesto alto)", [
  "Soy el licenciado Fernando Gutiérrez, tengo un despacho de abogados especializado en derecho corporativo. Quiero una página profesional que transmita seriedad, con información de mis áreas de práctica y testimonios de clientes. Necesito que la gente confíe en mí antes de contratar mis servicios",
  "sí, así es, exactamente eso",
  "Inicio, El despacho, Áreas de práctica, Testimonios, Contacto",
  "no, sin registro de clientes",
  "no, no guardo datos",
  "no, no quiero panel",
  "sí, tengo oficinas en el centro, quiero el mapa",
  "sí, botón de WhatsApp para consultas rápidas",
  "sí, mis clientes agendan consultas",
  "sobrio, elegante, de confianza",
  "sí, lo más importante es aparecer en Google",
  "sí, tengo fotos del despacho y logo",
  "derecho corporativo, derecho laboral, amparos y contratos",
  "lo necesito para el próximo mes",
  "tengo un presupuesto de unos 25 mil pesos",
  "Soy el licenciado Fernando Gutiérrez",
  "fernando.gutierrez@despacho.mx",
  "55 1234 5678",
  "no, eso es todo",
]);

// ── 7 · Cliente vago / "no sé" crónico ──
report("7 · Cliente vago (no sé crónico)", [
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no sé",
  "no",
]);

// ── 8 · Cliente que ya lo dijo todo en la primera descripción ──
report("8 · Cliente que ya lo dijo todo (no repreguntar)", [
  "Soy la Dra. Laura, tengo una clínica dental. Quiero una landing page de una sola página con Inicio, Servicios y Contacto, con botón de WhatsApp y mapa. No quiero pagos en línea, ni panel, ni cuentas, ni citas en línea. Para marzo, y tengo unos 20 mil. Mi correo es laura@clinica.com y mi teléfono es 81 2345 6789",
  "sí, así es",
  "una sola página, Inicio, Servicios y Contacto",
  "no, no necesito guardar datos",
  "sí, el mapa de la clínica",
  "sí, botón de WhatsApp",
  "moderno",
  "sí",
  "sí, tengo fotos",
  "limpieza dental y ortodoncia",
  "81 2345 6789",
  "no, gracias",
]);

// ── 9 · Cliente que habla de usted ──
report("9 · Cliente que habla de usted (tratamiento)", [
  "Mire, tengo una ferretería y quisiera que me haga una página donde la gente vea mis productos y me llame. ¿Usted me puede ayudar con eso?",
  "sí, sí, así es, usted tiene razón",
  "Una sola página: inicio, mis productos y el contacto, así de sencillo",
  "no, no quiero que se registren",
  "no, no guardo datos",
  "no, no quiero panel",
  "sí, quiero el mapa de mi local",
  "sí, quiero que me escriban por WhatsApp",
  "no, no manejo citas",
  "algo sobrio, que se vea serio",
  "sí, que me encuentren en Google",
  "tengo fotos de mis productos",
  "herramientas, material eléctrico, plomería y pintura",
  "para el próximo mes",
  "unos 12 mil pesos",
  "Me llamo don Roberto",
  "roberto.ferreteria@gmail.com",
  "81 9876 5432",
  "no, con eso es todo",
]);

// ── 10 · Cliente con presupuesto en la primera frase ──
report("10 · Presupuesto en la primera frase (tengo 10000)", [
  "Soy Ana y tengo una estética. Quiero una página para mostrar mis servicios y que me contacten. Tengo 10000 para invertir, la quiero para mayo",
  "sí, así es",
  "Inicio, Servicios, Galería y Contacto",
  "no",
  "no",
  "no",
  "sí",
  "sí",
  "no",
  "moderno",
  "sí",
  "sí",
  "corte, color, manicure y pedicure",
  "Soy Ana",
  "ana.estetica@gmail.com",
  "81 5555 6666",
  "no, gracias",
]);
