/**
 * EVALUACIÓN DE PERSONAS + DETECCIÓN DE DERIVA DEL LLM (test:eval)
 *
 * Propósito: detectar los dos problemas que más cuestan en el bot Alex
 * (a) regresiones de flujo/discovery por persona realista y
 * (b) la "deriva del LLM": el modelo pinta un mensaje que NO corresponde
 *     al objetivo del turno (pide el teléfono en vez de repetir opciones,
 *     menciona precios fuera del turno de presupuesto, mezcla tú/usted, etc.).
 *
 * DOS MODOS:
 *  - `npm run test:eval`            → DETERMINISTA, 0 tokens, CI-safe.
 *      Corre N personas guionizadas por la máquina de estados y valida
 *      flujo (cierra, sin preguntas redundantes, discovery corto), datos
 *      capturados (categoría, email, teléfono, presupuesto, bots) y que el
 *      mensaje determinista de cada turno es sano.
 *  - `npm run test:eval:llm`        → CON DEEPSEEK REAL (necesita
 *      DEEPSEEK_API_KEY u OPENROUTER_API_KEY en .env.local). Pinta los
 *      mensajes de cada turno con el MISMO código de producción
 *      (lib/chat-llm.generateNextMessage) y los evalúa:
 *        · heurísticas deterministas (trato mezclado, promesa de monto en
 *          presupuesto, menciones de precio fuera de turno, pedir contacto
 *          fuera de turno, tema no tocado) — las primeras dos FALLAN la
 *          corrida; las demás son warnings para revisar.
 *        · LLM-as-judge (1 llamada barata por mensaje del LLM) que puntúa
 *          la adherencia al OBJETIVO del turno (score 1-5, on_goal) y
 *          lista los temas a los que se desvió. on_goal=false → FALLO.
 *      La corrida es secuencial (~1-3 min para 5 personas) y gasta
 *      ~$0.02-0.05 USD por corrida completa en DeepSeek.
 *
 * Filtros opcionales:
 *  - `npx tsx scripts/eval.ts --llm --persona 2`   → solo la persona 2
 *  - `npx tsx scripts/eval.ts --llm --no-judge`    → pinta + heurísticas,
 *      sin LLM-as-judge (más barato, solo para iterar rápido)
 *
 * Salida: exit 0 si no hay fallos; exit 1 si hay fallos (flujo/datos,
 * deriva confirmada por el judge, trato mezclado o promesa de monto).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createEmptyContext,
  type ChatContext,
  type ChatMessage,
} from "../lib/types";
import { DONE_NODE_ID, START_NODE_ID, getNode, buildRecap } from "../lib/conversation-flow";
import { detectTrato, toUsted } from "../lib/personality";
import { generateNextMessage, resolveGoal } from "../lib/chat-llm";
import { chatCompletion, getLlmProvider } from "../lib/llm-client";
import { detectarBotsRecomendados } from "../lib/bots-catalog";

// ─── Env ────────────────────────────────────────────────────────────
// Carga .env.local para que el modo --llm use la DEEPSEEK_API_KEY local
// (las llamadas leen process.env en tiempo de ejecución).
function loadEnvLocal(): void {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] === undefined) {
      process.env[key] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
}
loadEnvLocal();

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || "Alex";

// ─── CLI ────────────────────────────────────────────────────────────
const ARGS = new Set(process.argv.slice(2));
const LLM_MODE = ARGS.has("--llm");
const RUN_JUDGE = LLM_MODE && !ARGS.has("--no-judge");
const PERSONA_FILTER = (() => {
  const i = process.argv.indexOf("--persona");
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : null;
})();

// ════════════════════════════════════════════════════════════════════
// PERSONAS (clientes realistas, con "no sé", delegación, presupuesto)
// ════════════════════════════════════════════════════════════════════
interface Persona {
  name: string;
  expectedCategory: string;
  /** Máximo de preguntas aceptables para esta persona (guarda contra discovery largo) */
  maxAsked: number;
  /** Si espera que el cliente termine con ≥1 bot IA seleccionado */
  expectsBots?: boolean;
  /** Si espera que el cliente hable de "usted" (trato formal detectado) */
  expectsUsted?: boolean;
  /** Nivel 3: si espera que las features pro de ecommerce se activen (inventario/facturación) */
  expectsProFeatures?: boolean;
  /** Nivel 4: si espera que la señal de la vertical (portal) se active (inmobiliaria/membresias/...) */
  expectsVertical?: "inmobiliaria" | "membresias" | "cursos" | "telemedicina" | "directorio";
  /** Nivel 5: si espera que la señal de ecosistema (marketplace/saas/erp) se active */
  expectsEcosystem?: "marketplace" | "saas" | "erp";
  /** Cotizador: si espera que los documentos (PDFs de cotización) entren en el alcance (parte del producto) */
  expectsDocumentos?: boolean;
  /** FASE 2: si espera que detectarBotsRecomendados recomiende estos bots (id) al final del flujo */
  expectsBotIds?: string[];
  answers: string[];
}

const PERSONAS: Persona[] = [
  {
    name: "1 · Doña Rosario (tortillería, NO sabe de tecnología, básico)",
    expectedCategory: "landing",
    maxAsked: 15,
    answers: [
      // discovery_business
      "Pues mire, yo tengo una tortillería aquí en el pueblo, La Rosario. Quiero una página de internet, de esas que la gente ve en el celular, para que sepan dónde estoy. Yo de esto no sé nada, usted es el que sabe",
      // discovery_confirm
      "sí, sí, eso mismo, que me encuentren",
      // pages
      "Una sola página, así como las que he visto: que diga mi nombre, qué vendo y el teléfono. Nada más",
      // technical_bundle (no entiende → el bot simplifica / clarifica)
      "no sé, usted vea, lo que me convenga. Yo solo quiero que me hablen por el WhatsApp y que me encuentren en el Google",
      // clarify_bundle (delega → recomendaciones)
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
    ],
  },
  {
    name: "2 · Don Chema (ferretería, 'no sé / como usted diga' crónico)",
    expectedCategory: "landing",
    maxAsked: 15,
    answers: [
      // discovery_business
      "Pues sí, tengo una ferretería, La de Don Chema. Quiero una página de internet sencilla, de las que se ven en el teléfono, para que la gente me busque. Yo de computadoras no sé nada",
      // discovery_confirm
      "sí, así es",
      // pages
      "una sola página: inicio, lo que vendo y mi teléfono",
      // technical_bundle (deferral → recomendaciones, no clarifica)
      "no sé, la verdad no entiendo de esas cosas. Usted haga lo que crea",
      // design
      "lo que usted recomiende, algo sencillo y que se vea serio",
      // technical_bots
      "no, eso no, yo nada más quiero la página",
      // scope_content
      "no tengo fotos, pero mi hijo me va a ayudar con eso",
      // scope_services
      "vendo clavos, tornillos, pintura, herramientas y material de plomería",
      // budget
      "pues para el próximo mes. ¿Y cuánto cobra? … tengo como 6 o 7 mil",
      // contact_name
      "Me llamo José Martínez, mi correo es jose.ferreteria@gmail.com, y el teléfono es 81 33 22 11 00",
      // extra_comments
      "no, ya con eso, gracias",
    ],
  },
  {
    name: "3 · Doña Chole (puesto de tacos, 'lo dejo en tus manos' total)",
    expectedCategory: "landing",
    maxAsked: 15,
    answers: [
      // discovery_business
      "Quiero una página de internet para mi puesto de tacos, que la gente me encuentre y me hable. Yo no entiendo nada de eso, usted hágale como mejor convenga",
      // discovery_confirm
      "sí",
      // pages
      "una sola página, con mi nombre, el menú y el teléfono",
      // technical_bundle → clarify_bundle
      "no sé",
      // clarify_bundle (1ª) → re-pregunta
      "no sé",
      // clarify_bundle (2ª) → recomendaciones
      "lo que usted diga, sí",
      // design
      "algo sencillo, que se vea limpio",
      // technical_bots
      "no, nada de eso",
      // scope_content
      "tengo unas fotos que me sacó mi sobrina",
      // scope_services
      "tacos de trompo, de bistec y de pastor",
      // budget
      "para el mes que viene, y no sé cuánto cobran… póngale como 6 mil",
      // contact_name
      "Soy Consuelo Ramírez, mi correo es consuelo.tacos@gmail.com y el WhatsApp 81 99 88 77 66",
      // extra_comments
      "no, gracias",
    ],
  },
  {
    name: "4 · Señor Pancho (gimnasio, no-técnico pero con idea y dinero)",
    expectedCategory: "landing",
    maxAsked: 15,
    answers: [
      // discovery_business
      "Tengo un gimnasio aquí en el centro y quiero una página para que la gente vea los horarios y me llame. Yo no entiendo de tecnología, pero quiero que se vea seria y de confianza",
      // discovery_confirm
      "sí, exacto",
      // pages
      "Inicio, Horarios, Mis clases y Contacto, una sola página",
      // technical_bundle (deferral + señal específica Google → recomendaciones)
      "no sé de esas cosas, usted vea. Sí quiero que me encuentren en Google porque por eso se llegan los clientes",
      // design
      "moderno, que se vea fuerte, con los colores del gimnasio",
      // technical_bots
      "no, sin asistentes, eso es para grandes empresas creo",
      // scope_content
      "sí tengo fotos de las máquinas y de mis alumnos (con permiso de ellos)",
      // scope_services
      "crossfit, pesas, spinning y clases de cardio",
      // budget
      "para el próximo mes, y mi presupuesto es de unos 15 mil pesos",
      // contact_name
      "Me llamo Francisco Vega, francisco.gym@gmail.com y el teléfono 81 22 33 44 55",
      // extra_comments
      "no, con eso es todo",
    ],
  },
  {
    name: "5 · Clínica dental con asistentes IA (bundle completo + technical_bots)",
    expectedCategory: "landing",
    maxAsked: 15,
    expectsBots: true,
    answers: [
      // discovery_business
      "Tengo una clínica dental y quiero una página de presentación con información de mis servicios y datos de contacto",
      // discovery_confirm
      "sí",
      // pages
      "Inicio, Servicios, Ubicación y Contacto",
      // technical_bundle (elección específica + rechazos)
      "Quiero el botón de WhatsApp y que me encuentren en Google. No necesito panel ni citas en línea",
      // design
      "moderno",
      // technical_bots
      "el de preguntas frecuentes, por favor",
      // scope_content
      "sí, ya tengo fotos y textos",
      // scope_services
      "limpieza dental, ortodoncia y blanqueamiento",
      // budget
      "para el próximo mes, y de presupuesto unos 20 mil",
      // contact_name
      "Soy Laura, laura@clinica.com, 81 2345 6789",
      // extra_comments
      "nada, gracias",
    ],
  },
  {
    name: "6 · Mariana (joyería, tienda en línea con carrito y panel)",
    expectedCategory: "ecommerce",
    maxAsked: 15,
    expectsBots: true,
    answers: [
      // discovery_business → ecommerce (carrito + pagos + panel)
      "Tengo una tienda en línea de joyería hecha a mano. Quiero que la gente compre directo en la página con carrito y pague con tarjeta, y que yo vea los pedidos en un panel",
      // discovery_confirm
      "Sí, así es, una tienda para vender por internet",
      // pages
      "Varias secciones: Inicio, Catálogo, Productos y Contacto",
      // technical_bundle → pagos/dashboard/chat/seo true · auth/BD/mapas/doc/citas/pwa false
      "Quiero cobrar con tarjeta, un panel para los pedidos, el botón de WhatsApp y que me encuentren en Google. No necesito que los clientes se registren ni guardar sus datos",
      // design
      "moderno y elegante, que se vea premium",
      // technical_bots
      "me gustaría el de preguntas frecuentes y el capturador de clientes",
      // scope_content
      "sí, ya tengo fotos de las piezas",
      // scope_services
      "aretes, collares, pulseras y anillos, con sus precios",
      // scope_reference (ecommerce)
      "no tengo ninguna referencia",
      // budget
      "para el próximo mes, y de presupuesto tengo unos 30 mil",
      // contact_name
      "Mariana López, mariana.joyeria@gmail.com, 81 4567 8901",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "7 · Doctora Ana (estética, sistema de citas con agenda y bots)",
    expectedCategory: "citas",
    maxAsked: 15,
    expectsBots: true,
    answers: [
      // discovery_business → citas (agendar + Google)
      "Tengo una estética y quiero que mis clientas agenden sus citas en línea, que vean los precios y que me encuentren en Google",
      // discovery_confirm
      "Sí, eso quiero, que agenden solas",
      // pages
      "Una sola página: Inicio, Servicios, Galería y Contacto",
      // technical_bundle → pagos/dashboard/chat true · auth/BD/mapas/pwa false (citas ya true)
      "Quiero que paguen al reservar, un panel para ver mis citas y el botón de WhatsApp. No necesito cuentas ni base de datos",
      // design
      "moderno, que se vea fresco y bonito",
      // technical_bots (bookings se salta: categoría citas)
      "sí, el de citas y el de preguntas frecuentes",
      // scope_content
      "sí, tengo fotos del local y de mis trabajos",
      // scope_services
      "corte de cabello, color, manicure y tratamiento facial",
      // scope_reference (citas)
      "me gusta la página de una estética de la ciudad, es muy limpia",
      // budget
      "para el próximo mes, tengo unos 25 mil",
      // contact_name
      "Ana Torres, ana.estetica@gmail.com, 81 2233 4455",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "8 · Rodrigo (refacciones, plataforma a medida con inventario y reportes)",
    expectedCategory: "webapp",
    maxAsked: 16,
    answers: [
      // discovery_business → webapp (sistema + inventario + reportes)
      "Tengo un negocio de refacciones y necesito un sistema para controlar mi inventario, dar de alta a mis empleados con cuentas y generar reportes de ventas",
      // discovery_confirm
      "Sí, un sistema interno para mi negocio",
      // pages
      "Varias secciones: Inicio, Inventario, Reportes y Usuarios",
      // technical_bundle → "las que me convengan" → recomendaciones webapp (+documentos)
      "Sí, las que me convengan",
      // design
      "sobrio y profesional, que transmita confianza",
      // technical_bots
      "no, sin asistentes por ahora",
      // scope_content
      "sí, tengo los datos del inventario",
      // scope_services
      "refacciones automotrices, herramientas y servicio de instalación",
      // scope_reference (webapp)
      "no tengo ninguna página de referencia",
      // budget
      "para el próximo mes, tengo unos 45 mil",
      // contact_name
      "Rodrigo Núñez, rodrigo.refacciones@gmail.com, 81 9876 5432",
      // extra_comments
      "no, listo",
    ],
  },
  {
    name: "9 · Diana (fotógrafa, portafolio elegante con galería)",
    expectedCategory: "portafolio",
    maxAsked: 13,
    answers: [
      // discovery_business → portafolio + chat (WhatsApp)
      "Soy fotógrafa profesional y quiero un portafolio en línea para mostrar mis trabajos, que se vea elegante y que me contacten por WhatsApp",
      // discovery_confirm
      "Sí, un portafolio profesional",
      // pages
      "Una sola página: Inicio, Galería, Sobre mí y Contacto",
      // technical_bundle → seo=true · dashboard/mapas/citas=false
      "Que me encuentren en Google sí, pero no necesito cuentas ni mapa",
      // design
      "moderno, elegante, con movimiento en la galería",
      // technical_bots
      "no, gracias",
      // scope_content
      "sí, tengo mis mejores fotos",
      // scope_services
      "fotografía de bodas, retratos y sesiones de embarazo",
      // budget (scope_reference se salta: portafolio)
      "para el próximo mes, unos 10 mil",
      // contact_name
      "Diana Ruiz, diana.foto@gmail.com, 81 3344 5566",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "10 · Carlos (nutrición, blog de contenido con SEO)",
    expectedCategory: "blog",
    maxAsked: 13,
    answers: [
      // discovery_business → blog + seo
      "Tengo un blog de nutrición donde escribo artículos sobre alimentación saludable. Quiero que se vea profesional y que la gente encuentre mis artículos en Google",
      // discovery_confirm
      "Sí, un blog de contenido",
      // pages
      "Varias secciones: Inicio, Artículos, Recetas y Contacto",
      // technical_bundle → chat/seo true · dashboard/mapas/citas=false
      "Solo quiero el botón de WhatsApp y que me encuentren en Google, nada más",
      // design
      "limpio, tipo revista, profesional",
      // technical_bots
      "no, sin bots",
      // scope_content
      "sí, tengo los artículos escritos",
      // scope_services
      "publico sobre nutrición, recetas y hábitos saludables",
      // budget (scope_reference se salta: blog)
      "para el próximo mes, unos 15 mil",
      // contact_name
      "Carlos Mendoza, carlos.nutricion@gmail.com, 81 6677 8899",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "11 · Luisa (mermeladas, NO confirma categoría → re-inferencia a ecommerce)",
    expectedCategory: "ecommerce",
    maxAsked: 16,
    answers: [
      // discovery_business → landing (vago, sin señales de venta en línea)
      "Tengo un negocio de mermeladas artesanales y quiero una página de internet para darme a conocer",
      // discovery_confirm → "no, no es eso" → discovery_examples (y category=null)
      "No, no es eso. Yo quiero vender en línea, con carrito y que paguen con tarjeta",
      // discovery_examples → re-infiera a ecommerce
      "Quiero una tienda en línea, con carrito, pagos con tarjeta y que yo vea los pedidos",
      // pages
      "Varias secciones: Inicio, Catálogo, Productos y Contacto",
      // technical_bundle → pagos/dashboard/seo true · resto false
      "Quiero el carrito con pagos, un panel para ver los pedidos y que me encuentren en Google",
      // design
      "sencillo y limpio",
      // technical_bots
      "no, sin asistentes",
      // scope_content
      "sí, tengo fotos de los productos",
      // scope_services
      "mermeladas, ates y salsas artesanales",
      // scope_reference (ecommerce)
      "no tengo referencia",
      // budget
      "para el próximo mes, unos 20 mil",
      // contact_name
      "Luisa Herrera, luisa.mermeladas@gmail.com, 81 4455 6677",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "12 · Gustavo (despacho de abogados, trato formal 'usted')",
    expectedCategory: "landing",
    maxAsked: 13,
    expectsUsted: true,
    answers: [
      // discovery_business → landing + seo + trato "usted"
      "Buenas tardes, tengo un despacho de abogados y deseo una página web profesional donde la gente vea mis servicios y me contacte. Me gustaría que me encuentren en Google. ¿Usted me puede orientar?",
      // discovery_confirm
      "Sí, así es, una página de presentación para mi despacho",
      // pages
      "Una sola página: Inicio, Servicios, Sobre el despacho y Contacto",
      // technical_bundle → chat/seo true · dashboard/mapas/citas=false
      "Solo deseo que me contacten por WhatsApp y aparecer en Google. No necesito más que eso, usted verá",
      // design
      "Sobrio y elegante, que transmita confianza",
      // technical_bots
      "No, gracias, no requiero asistentes",
      // scope_content
      "Sí, tengo el logotipo y algunas fotografías",
      // scope_services
      "Derecho corporativo, laboral y fiscal",
      // budget (scope_reference se salta: landing)
      "Para el próximo mes, y mi presupuesto es de unos 12 mil pesos",
      // contact_name
      "Me llamo Gustavo Ríos, mi correo es gustavo.despacho@gmail.com y mi teléfono 81 1111 2222",
      // extra_comments
      "No, es todo, muchas gracias",
    ],
  },
  {
    name: "13 · Maricarmen (salón, 'no sé' crónico en bundle + correo olvidado)",
    expectedCategory: "citas",
    maxAsked: 16,
    expectsBots: true,
    answers: [
      // discovery_business → citas
      "Tengo un salón de belleza y quiero que mis clientas agenden sus citas en línea y que me encuentren en Google",
      // discovery_confirm
      "sí, eso quiero",
      // pages
      "Una sola página: Inicio, Servicios, Galería y Contacto",
      // technical_bundle → "no sé" → clarify_bundle
      "no sé",
      // clarify_bundle (2ª) → delegación → recomendaciones citas (+documentos)
      "pues lo que usted recomiende, sí",
      // design
      "moderno, bonito",
      // technical_bots
      "sí, el de citas, por favor",
      // scope_content
      "sí, tengo fotos del salón",
      // scope_services
      "corte, color, alisado y maquillaje",
      // scope_reference (citas: la categoría correcta ya lo pregunta)
      "no, no tengo ninguna",
      // budget
      "para el próximo mes, unos 18 mil",
      // contact_name → solo nombre+teléfono (sin correo) → contact_email
      "Me llamo Maricarmen Salinas, mi WhatsApp es 81 8877 6655",
      // contact_email → contact_phone se salta (ya lo dio) → extra_comments
      "Sí, maricarmen.salon@gmail.com",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "14 · Doña Teresita (papelería, lo básico con presupuesto ajustado)",
    expectedCategory: "landing",
    maxAsked: 13,
    answers: [
      // discovery_business → landing
      "Tengo una papelería y quiero una página sencilla para que la gente vea mis servicios y me llame. Algo económico por favor",
      // discovery_confirm
      "sí, algo sencillo",
      // pages
      "Una sola página, solo lo básico: mi nombre, servicios y teléfono",
      // technical_bundle → "nada de eso" → explicitNone (todo fuera)
      "No, no quiero nada de eso, solo lo básico",
      // design
      "sencillo y claro",
      // technical_bots
      "no, gracias",
      // scope_content
      "no, no tengo fotos todavía",
      // scope_services
      "copias, impresiones, artículos de papelería y enmarcado",
      // budget (scope_reference se salta: landing)
      "para el próximo mes, y solo tengo unos 6 mil",
      // contact_name
      "Soy Teresa Jiménez, mi correo es teresa.papeleria@gmail.com y mi teléfono 81 2323 4545",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "15 · Don Héctor (restaurante, pedidos en línea con urgencia y bot de ventas)",
    expectedCategory: "ecommerce",
    maxAsked: 16,
    expectsBots: true,
    answers: [
      // discovery_business → ecommerce (pedidos en línea) + pagos + urgencia
      "Tengo un restaurante y quiero que la gente haga pedidos en línea, con pago y entrega a domicilio. Me urge, para la próxima semana",
      // discovery_confirm
      "sí, pedidos en línea",
      // pages
      "Varias secciones: Inicio, Menú, Pedidos y Contacto",
      // technical_bundle → "las que me convengan" → recomendaciones ecommerce (+documentos)
      "Sí, las que me convengan",
      // design
      "moderno, que se vea apetitoso",
      // technical_bots
      "sí, el de ventas para que cierre pedidos",
      // scope_content
      "sí, tengo fotos del menú",
      // scope_services
      "comida mexicana, antojitos y bebidas",
      // scope_reference (ecommerce)
      "me gusta la página de una taquería de la ciudad, la que hace pedidos en línea",
      // budget
      "para la próxima semana, me urge, y tengo unos 40 mil",
      // contact_name
      "Héctor Ramírez, hector.restaurante@gmail.com, 81 9090 1212",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "16 · Javier (restaurante, menú digital con código QR)",
    expectedCategory: "menu_digital",
    maxAsked: 13,
    expectsBots: true,
    answers: [
      // discovery_business → menu_digital (menú digital + QR + carta)
      "Tengo un restaurante y quiero un menú digital con código QR: que la gente escanee el QR de la mesa y vea mi carta en el celular, sin apps ni descargas",
      // discovery_confirm
      "Sí, así es, un menú digital",
      // pages
      "Una sola página: mi menú con fotos y el teléfono",
      // technical_bundle (categoría simple → solo funciones relevantes) → chat+seo
      "Solo el botón de WhatsApp y que me encuentren en Google, nada más",
      // design
      "moderno y apetitoso",
      // technical_bots → FAQ (menu_digital recomienda bot_faq)
      "el de preguntas frecuentes, por favor",
      // scope_content
      "sí, tengo fotos de mis platillos",
      // scope_services
      "tacos, quesadillas y mariscos, con sus precios",
      // budget (scope_reference se salta: categoría simple)
      "para el próximo mes, y tengo unos 5 mil",
      // contact_name
      "Me llamo Javier Ramos, javier.menu@gmail.com y mi WhatsApp 81 5566 7788",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "17 · Pedro (plomero, tarjeta digital para WhatsApp)",
    expectedCategory: "tarjeta_digital",
    maxAsked: 13,
    answers: [
      // discovery_business → tarjeta_digital (tarjeta digital + compartir info)
      "Soy plomero y quiero una tarjeta digital para compartir mi información por WhatsApp: mis servicios, mi teléfono y mis zonas de cobertura",
      // discovery_confirm
      "Sí, una tarjeta digital para compartirla por WhatsApp",
      // pages
      "Una sola página, corta: mis servicios, mi teléfono y el botón de WhatsApp",
      // technical_bundle (categoría simple) → chat+seo
      "Solo el botón de WhatsApp y que me encuentren en Google",
      // design
      "sencillo y limpio",
      // technical_bots
      "no, gracias, sin asistentes por ahora",
      // scope_content
      "tengo fotos de mis trabajos",
      // scope_services
      "instalaciones, reparaciones y desagües",
      // budget (scope_reference se salta: categoría simple)
      "para el próximo mes, y tengo unos 4 mil",
      // contact_name
      "Me llamo Pedro Flores, pedro.plomeria@gmail.com y mi WhatsApp 81 2233 4455",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "18 · Constructora (sitio corporativo multi-página)",
    expectedCategory: "corporativo",
    maxAsked: 14,
    answers: [
      // discovery_business → corporativo (constructora + quienes somos + varias secciones)
      "Quiero una página para mi constructora con quienes somos, proyectos y contacto, varias secciones. Somos una empresa seria que quiere proyectar confianza",
      // discovery_confirm
      "Sí, así es, un sitio con varias páginas para mi constructora",
      // pages
      "Varias secciones: Inicio, Quiénes somos, Proyectos, Galería y Contacto",
      // technical_bundle → panel (contenido) + SEO · sin cuentas/pagos/citas
      "Quiero un panel para editar el contenido y que me encuentren en Google. No necesito cuentas, pagos ni citas",
      // design
      "sobrio y de confianza, que transmita seriedad",
      // technical_bots
      "no, gracias, sin asistentes por ahora",
      // scope_content
      "sí, tenemos fotos de los proyectos y el logo",
      // scope_services
      "construcción de casas, remodelaciones y proyectos industriales",
      // scope_reference (corporativo NO es simple → se pregunta)
      "nos gusta el sitio de una constructora grande de la ciudad, es limpio",
      // budget
      "para el próximo mes, y tenemos unos 25 mil",
      // contact_name
      "Me llamo Roberto Castillo, roberto.constructora@gmail.com y mi WhatsApp 81 1122 3344",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "19 · Restaurante (reservas de mesa en línea)",
    expectedCategory: "citas",
    maxAsked: 14,
    answers: [
      // discovery_business → citas (reservar mesa en línea) + reservas de restaurante
      "Tengo un restaurante con terraza y quiero que mis clientes puedan reservar su mesa en línea, elegir día, hora y número de personas, sin llamadas",
      // discovery_confirm
      "Sí, que reserven mesa y hora en línea",
      // pages
      "Una sola página: Inicio, Menú, Reservas y Contacto",
      // technical_bundle → pago al reservar (grupos) · sin cuentas ni panel
      "Quiero que puedan pagar al reservar para grupos grandes y que les lleguen recordatorios automáticos. No necesito cuentas ni panel",
      // design
      "moderno, que se vea apetitoso y elegante",
      // technical_bots
      "no, por ahora sin asistentes",
      // scope_content
      "sí, tenemos fotos del menú y del local",
      // scope_services
      "comida italiana, pizzas, pastas y vinos",
      // scope_reference (citas NO es simple → se pregunta)
      "no tengo ninguna referencia",
      // budget
      "para el próximo mes, y tengo unos 18 mil",
      // contact_name
      "Me llamo Silvia Ortega, silvia.restaurante@gmail.com y mi WhatsApp 81 3344 5566",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "20 · Sofía (tienda de electrónica, ecommerce pro con inventario y facturación)",
    expectedCategory: "ecommerce",
    maxAsked: 15,
    expectsBots: true,
    expectsProFeatures: true,
    answers: [
      // discovery_business → ecommerce (venta en línea + carrito) + features pro
      // (inventario → ctx.inventario, facturar → ctx.facturacionCfdi, "administrar" → dashboard)
      "Tengo una tienda de electrónica y quiero vender por internet con carrito y pagos con tarjeta, administrar mi inventario y facturar a mis clientes",
      // discovery_confirm
      "Sí, una tienda en línea completa",
      // pages
      "Varias secciones: Inicio, Catálogo, Productos y Contacto",
      // technical_bundle → pagos/dashboard/chat/seo true · auth/BD/mapas/doc/citas/pwa false
      "Quiero cobrar con tarjeta, un panel para pedidos e inventario, el botón de WhatsApp y que me encuentren en Google. No necesito que los clientes se registren ni guardar sus datos",
      // design
      "moderno y limpio, que se vea premium",
      // technical_bots
      "sí, el de ventas y cierre y el que responda sobre la garantía",
      // scope_content
      "sí, tengo fotos de los productos",
      // scope_services
      "electrónica, accesorios y componentes",
      // scope_reference (ecommerce)
      "no tengo ninguna referencia",
      // budget
      "para el próximo mes, tengo unos 50 mil",
      // contact_name
      "Sofía Ramírez, sofia.tech@gmail.com, 81 9988 7766",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "21 · Marisol (inmobiliaria, portal de propiedades con filtros y leads)",
    expectedCategory: "webapp",
    maxAsked: 16,
    expectsBots: true,
    expectsVertical: "inmobiliaria",
    answers: [
      // discovery_business → webapp (bonus inmobiliaria) + ctx.inmobiliaria
      "Tengo una inmobiliaria y quiero un portal de propiedades con filtros por zona y precio, y que cada propiedad genere leads de compradores",
      // discovery_confirm
      "Sí, un portal de propiedades en línea",
      // pages
      "Varias secciones: Inicio, Propiedades, Filtros y Contacto",
      // technical_bundle → panel + SEO · sin cuentas/pagos/citas/mapa
      "Quiero un panel para publicar las propiedades y que me encuentren en Google. No necesito pagos ni citas",
      // design
      "moderno y elegante, que se vea premium",
      // technical_bots (inmobiliaria recomienda bot_ventas + bot_leads)
      "sí, el de ventas y el capturador de clientes",
      // scope_content
      "sí, tengo fotos de las propiedades",
      // scope_services
      "casas, departamentos y terrenos en venta y renta",
      // scope_reference (webapp NO es simple → se pregunta)
      "me gusta el portal de una inmobiliaria grande de la ciudad",
      // budget
      "para el próximo mes, y tengo unos 60 mil",
      // contact_name
      "Me llamo Marisol Peña, marisol.inmobiliaria@gmail.com y mi WhatsApp 81 2233 8899",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "22 · Ricardo (gimnasio, portal de membresías con cobro recurrente)",
    expectedCategory: "webapp",
    maxAsked: 16,
    expectsBots: true,
    expectsVertical: "membresias",
    answers: [
      // discovery_business → webapp (bonus membresías) + ctx.membresias
      "Tengo un gimnasio y quiero un portal de membresías con cobro recurrente y un área de miembros donde puedan ver su plan",
      // discovery_confirm
      "Sí, un portal para las membresías de mi gimnasio",
      // pages
      "Varias secciones: Inicio, Planes, Miembros y Contacto",
      // technical_bundle → panel + SEO · sin citas ni pagos por adelantado
      "Quiero un panel para gestionar los planes y suscripciones, y que me encuentren en Google. No necesito citas ni pagos por adelantado",
      // design
      "moderno, que se vea fuerte y con energía",
      // technical_bots (membresías recomienda bot_membresias + bot_leads)
      "sí, el de membresías y el capturador de clientes",
      // scope_content
      "sí, tengo fotos del gimnasio y de las instalaciones",
      // scope_services
      "gimnasio, clases de spinning, crossfit y entrenamiento personal",
      // scope_reference (webapp NO es simple → se pregunta)
      "no tengo ninguna referencia",
      // budget
      "para el próximo mes, y tengo unos 40 mil",
      // contact_name
      "Me llamo Ricardo Campos, ricardo.gym@gmail.com y mi WhatsApp 81 4455 6677",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "23 · Andrés (marketplace multi-vendedor con comisiones, nivel 5 ecosistema)",
    expectedCategory: "webapp",
    maxAsked: 16,
    expectsEcosystem: "marketplace",
    answers: [
      // discovery_business → webapp (NIVEL5_ECOSYSTEM_RE: marketplace) + ctx.marketplace
      "Quiero montar un marketplace con varios vendedores que publiquen y vendan sus productos, y yo cobrar una comisión por cada venta",
      // discovery_confirm
      "Sí, un marketplace con varios vendedores",
      // pages
      "Varias secciones: Inicio, Vendedores, Productos y Contacto",
      // technical_bundle → panel (administrar) + SEO · sin citas ni mapa
      "Quiero un panel para administrar los vendedores y sus comisiones, y que me encuentren en Google. No necesito citas ni mapa",
      // design
      "moderno y confiable, que se vea como una plataforma seria",
      // technical_bots
      "no, por ahora sin asistentes",
      // scope_content
      "sí, tengo el diseño de la marca y algunas fotos",
      // scope_services
      "varias categorías de productos que venden los vendedores",
      // scope_reference (webapp NO es simple → se pregunta)
      "me gusta cómo funciona un marketplace conocido, con los perfiles de vendedor",
      // budget (fecha reconocible para extractDeadline + monto)
      "para el próximo mes, y tengo unos 80 mil",
      // contact_name
      "Me llamo Andrés Fuentes, andres.market@gmail.com y mi WhatsApp 81 6677 8899",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "24 · Valeria (creadora de contenido, link-in-bio para Instagram)",
    expectedCategory: "link_in_bio",
    maxAsked: 13,
    answers: [
      // discovery_business → link_in_bio ("link en mi bio" + "mis enlaces" + bonus)
      "Soy creadora de contenido y quiero un link en mi bio de Instagram con todos mis enlaces: mi WhatsApp, mi TikTok y mis redes en una sola página",
      // discovery_confirm
      "sí, eso mismo, una página con mis enlaces",
      // pages (categoría simple: NO pregunta auth/db/pagos/pwa ni referencia)
      "una sola página, cortita: mi foto, mis enlaces y el botón de WhatsApp",
      // technical_bundle (solo funciones relevantes: chat+seo; el resto fuera)
      "Solo el botón de WhatsApp y que me encuentren en Google, nada más",
      // design
      "moderno, que se vea bonito y con mi marca",
      // technical_bots
      "no, por ahora sin asistentes",
      // scope_content
      "sí, tengo fotos de mi contenido y de mis productos",
      // scope_services
      "asesorías en línea, contenido exclusivo y marcas que recomiendo",
      // budget (scope_reference se salta: categoría simple)
      "para el próximo mes, y tengo unos 5 mil",
      // contact_name
      "Me llamo Valeria Soto, valeria.creadora@gmail.com y mi WhatsApp 81 2233 7788",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "25 · Gerardo (imprenta, cotizador en línea con PDF y WhatsApp)",
    expectedCategory: "cotizador",
    maxAsked: 15,
    expectsDocumentos: true,
    answers: [
      // discovery_business → cotizador ("cotizador" + "presupuesto en línea" + bonus)
      "Tengo una imprenta y quiero un cotizador para que mis clientes me pidan presupuesto en línea y les llegue por WhatsApp",
      // discovery_confirm
      "sí, así es, un cotizador en línea",
      // pages
      "una sola página: el formulario para pedir su cotización y el botón de WhatsApp",
      // technical_bundle → "las que me convengan" → recomendaciones cotizador:
      // chat+seo+documentos (PDFs de cotización son parte del producto) true,
      // el resto false (cotizador ES simple desde FASE 4/QA11: auth/db/pagos/PWA
      // no entran al bundle y scope_reference se salta).
      "Las que me convengan, lo que recomiendes",
      // design
      "moderno y profesional, que se vea serio",
      // technical_bots (NO recomienda bot_cotizacion: es el producto)
      "no, sin asistentes por ahora",
      // scope_content
      "sí, tengo el logotipo y fotos de mis trabajos",
      // scope_services
      "impresión digital, tarjetas de presentación, lonas y volantes",
      // (scope_reference se salta: cotizador es categoría simple desde FASE 4)
      // budget
      "para el próximo mes, y tengo unos 20 mil",
      // contact_name
      "Me llamo Gerardo Luna, gerardo.imprenta@gmail.com y mi WhatsApp 81 3344 9988",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "26 · Marco (academia, plataforma de cursos en línea, vertical N4)",
    expectedCategory: "webapp",
    maxAsked: 16,
    expectsBots: true,
    expectsVertical: "cursos",
    expectsBotIds: ["bot_membresias", "bot_ventas"],
    answers: [
      // discovery_business → webapp (plataforma de cursos) + ctx.cursos + giro consultor.
      // OJO: NO empieza con "soy coach" (captureEarlyData guardaría "coach" como
      // nombre y saltaría contact_name → pediría correo/teléfono por separado).
      "Tengo una academia y quiero una plataforma de cursos en línea con lecciones en video, progreso del alumno y certificados para vender mis cursos",
      // discovery_confirm
      "Sí, una plataforma para vender mis cursos en línea",
      // pages
      "Varias secciones: Inicio, Catálogo de cursos, Mis cursos y Contacto",
      // technical_bundle → panel + SEO · sin cuentas/citas/pagos por adelantado
      "Quiero un panel para gestionar los cursos y que me encuentren en Google. No necesito citas ni pagos por adelantado",
      // design
      "moderno, que se vea profesional y con energía",
      // technical_bots (cursos recomienda bot_membresias + bot_ventas)
      "sí, el de membresías y el de ventas",
      // scope_content
      "sí, tengo los videos de las lecciones y el logo",
      // scope_services
      "cursos de marketing digital, coaching y talleres en línea",
      // scope_reference (webapp NO es simple → se pregunta)
      "no tengo ninguna referencia",
      // budget
      "para el próximo mes, y tengo unos 45 mil",
      // contact_name
      "Me llamo Marco Ibarra, marco.cursos@gmail.com y mi WhatsApp 81 2233 4455",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "27 · Dra. Elena (clínica, portal de telemedicina, vertical N4)",
    expectedCategory: "webapp",
    maxAsked: 16,
    expectsBots: true,
    expectsVertical: "telemedicina",
    expectsBotIds: ["bot_citas", "bot_faq"],
    answers: [
      // discovery_business → webapp (portal de telemedicina) + ctx.telemedicina + giro medico
      "Tengo una clínica y quiero un portal de telemedicina con expediente del paciente y videollamadas para las consultas en línea",
      // discovery_confirm
      "Sí, un portal para las consultas en línea",
      // pages
      "Varias secciones: Inicio, Especialidades, Consultas y Contacto",
      // technical_bundle → panel + SEO · sin pagos en línea
      "Quiero un panel para gestionar las citas y los expedientes, y que me encuentren en Google. No necesito pagos en línea",
      // design
      "sobrio y profesional, que transmita confianza",
      // technical_bots (telemedicina recomienda bot_citas + bot_faq)
      "sí, el de citas y el de preguntas frecuentes",
      // scope_content
      "sí, tengo el logo y fotos de la clínica",
      // scope_services
      "consultas médicas generales, pediatría y teleconsultas",
      // scope_reference (webapp NO es simple → se pregunta)
      "no tengo ninguna referencia",
      // budget
      "para el próximo mes, y tenemos unos 60 mil",
      // contact_name
      "Me llamo Elena Vázquez, elena.clinica@gmail.com y mi WhatsApp 81 5566 7788",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "28 · Rosa (asociación, directorio de negocios, vertical N4)",
    expectedCategory: "webapp",
    maxAsked: 16,
    expectsBots: true,
    expectsVertical: "directorio",
    expectsBotIds: ["bot_faq", "bot_leads"],
    answers: [
      // discovery_business → webapp (directorio) + ctx.directorio + giro tienda (comercio)
      "Tengo una asociación de comerciantes de mi zona y quiero un directorio de negocios con fichas autogestionables y búsqueda por mapa para que encuentren a los comercios asociados",
      // discovery_confirm
      "Sí, un directorio de los negocios de la asociación",
      // pages
      "Varias secciones: Inicio, Directorio, Fichas y Contacto",
      // technical_bundle → panel + SEO · sin pagos ni citas
      "Quiero un panel para que cada negocio publique su ficha y que me encuentren en Google. No necesito pagos ni citas",
      // design
      "moderno y limpio, que se vea confiable",
      // technical_bots (directorio recomienda bot_faq + bot_leads)
      "sí, el de preguntas frecuentes y el capturador de clientes",
      // scope_content
      "sí, tengo el logo de la asociación y los datos de los negocios",
      // scope_services
      "directorio de los comercios afiliados, con sus fichas y su contacto",
      // scope_reference (webapp NO es simple → se pregunta)
      "no tengo ninguna referencia",
      // budget
      "para el próximo mes, y tengo unos 35 mil",
      // contact_name
      "Me llamo Rosa Aguilar, rosa.asociacion@gmail.com y mi WhatsApp 81 9988 7766",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "29 · David (emprendedor, SaaS con suscripción mensual, ecosistema N5)",
    expectedCategory: "webapp",
    maxAsked: 16,
    expectsEcosystem: "saas",
    answers: [
      // discovery_business → webapp (NIVEL5_ECOSYSTEM_RE: software como
      // servicio/SaaS) + ctx.saas. OJO: NO debe confundirse con marketplace
      // ni con ERP (solo "software como servicio" + "saas" activan la señal).
      "Quiero montar un software como servicio (SaaS) para que mis clientes se registren y paguen una suscripción mensual, con los datos de cada cliente aislados entre sí",
      // discovery_confirm
      "Sí, un SaaS con suscripción mensual para mis clientes",
      // pages
      "Varias secciones: Inicio, Planes, Registro y Contacto",
      // technical_bundle → panel + SEO · sin citas ni mapa
      "Quiero un panel para gestionar los clientes y sus suscripciones, y que me encuentren en Google. No necesito citas ni mapa",
      // design
      "moderno y profesional, que se vea como una plataforma seria",
      // technical_bots
      "no, por ahora sin asistentes",
      // scope_content
      "sí, tengo el diseño de la marca y las capturas del sistema",
      // scope_services
      "un servicio de suscripción con varios planes para mis clientes",
      // scope_reference (webapp NO es simple → se pregunta)
      "me gusta cómo funciona un SaaS conocido, con sus planes y su área de clientes",
      // budget
      "para el próximo mes, y tengo unos 90 mil",
      // contact_name
      "Me llamo David Salinas, david.saas@gmail.com y mi WhatsApp 81 2233 4455",
      // extra_comments
      "no, eso es todo",
    ],
  },
  {
    name: "30 · Héctor (empresa, sistema ERP de operación, ecosistema N5)",
    expectedCategory: "webapp",
    maxAsked: 16,
    expectsEcosystem: "erp",
    answers: [
      // discovery_business → webapp (NIVEL5_ECOSYSTEM_RE: \berp\b) + ctx.erp.
      // OJO: "facturación"/"inventario" sueltos NO caen a ecommerce ni a
      // ecommerce-pro: el ERP exige contexto de operación (compras/ventas/
      // almacén/nómina) y el texto incluye "control de almacén" → además el
      // giro empresa_operacion protege el ticket del clamp.
      "Tengo una empresa y necesito un sistema ERP con control de almacén, compras, ventas y nómina, con reportes ejecutivos e integración contable",
      // discovery_confirm
      "Sí, un sistema ERP para toda la operación de mi empresa",
      // pages
      "Varias secciones: Inicio, Compras, Almacén, Nómina y Reportes",
      // technical_bundle → panel + SEO · sin citas ni mapa
      "Quiero un panel para administrar los módulos y que me encuentren en Google. No necesito citas ni mapa",
      // design
      "sobrio y profesional, que transmita confianza",
      // technical_bots
      "no, por ahora sin asistentes",
      // scope_content
      "sí, tengo el logo y los datos de la operación",
      // scope_services
      "control de compras, ventas, almacén y nómina para mi empresa",
      // scope_reference (webapp NO es simple → se pregunta)
      "me gusta cómo se ve el sistema que usa un distribuidor grande de la ciudad",
      // budget
      "para el próximo mes, y tengo unos 120 mil",
      // contact_name
      "Me llamo Héctor Lara, hector.erp@gmail.com y mi WhatsApp 81 6677 8899",
      // extra_comments
      "no, eso es todo",
    ],
  },
];

// ════════════════════════════════════════════════════════════════════
// MOTOR DETERMINISTA (camina la máquina de estados, como producción)
// ════════════════════════════════════════════════════════════════════
interface EvalTurn {
  /** Nodo que el cliente acaba de responder */
  answeredNodeId: string;
  /** Respuesta del cliente */
  answer: string;
  /** Nodo que el bot preguntará a continuación (el mensaje a evaluar le pertenece) */
  nextNodeId: string;
  /** Mensaje determinista de respaldo para ese nodo */
  fallbackReply: string;
  /** Contexto en el momento de pintar (post onReceive + skip) */
  ctx: ChatContext;
}

interface WalkResult {
  ctx: ChatContext;
  asked: string[];
  visited: string[];
  turns: EvalTurn[];
}

function cloneCtx(ctx: ChatContext): ChatContext {
  return { ...ctx, bots: [...ctx.bots] };
}

/** Equivalente local de fallbackFor (chat-store): mensaje determinista + trato. */
function fallbackForNode(nodeId: string, ctx: ChatContext): string {
  const node = getNode(nodeId);
  if (!node || typeof node.generateMessage !== "function") return "";
  const msg = node.generateMessage(ctx);
  return ctx.trato === "usted" ? toUsted(msg) : msg;
}

function walk(answers: string[]): WalkResult {
  const ctx = createEmptyContext();
  let nodeId: string = START_NODE_ID;
  const asked: string[] = [];
  const visited: string[] = [];
  const turns: EvalTurn[] = [];
  let used = 0;
  let guard = 0;
  while (nodeId !== DONE_NODE_ID && guard < 300) {
    guard += 1;
    const node = getNode(nodeId);
    if (!node) throw new Error(`Nodo inexistente: ${nodeId}`);
    if (node.type === "greeting") {
      nodeId = node.nextNode("", ctx); // passthrough
      continue;
    }
    if (used >= answers.length) {
      throw new Error(`Faltaron respuestas; en nodo ${nodeId}`);
    }
    const answer = answers[used];
    used += 1;
    // Igual que producción: detecta tratamiento en la respuesta del cliente.
    const trato = detectTrato(answer);
    if (trato) ctx.trato = trato;
    asked.push(nodeId);
    node.onReceive?.(answer, ctx);
    nodeId = node.nextNode(answer, ctx);
    visited.push(nodeId);
    // Skip de nodos condicionales (sin consumir respuestas).
    let g = 0;
    while (g < 60) {
      const target = getNode(nodeId);
      if (!target || !target.condition || target.condition(ctx)) break;
      nodeId = target.nextNode("", ctx);
      visited.push(nodeId);
      g += 1;
    }
    // Solo hay mensaje que pintar si el siguiente nodo existe (no es DONE).
    if (nodeId !== DONE_NODE_ID) {
      turns.push({
        answeredNodeId: asked[asked.length - 1],
        answer,
        nextNodeId: nodeId,
        fallbackReply: fallbackForNode(nodeId, ctx),
        ctx: cloneCtx(ctx),
      });
    }
  }
  if (nodeId !== DONE_NODE_ID) throw new Error(`No cerró; terminó en ${nodeId}`);
  return { ctx, asked, visited, turns };
}

// ════════════════════════════════════════════════════════════════════
// HEURÍSTICAS DE DERIVA (deterministas, gratis)
// ════════════════════════════════════════════════════════════════════
/** Objetivo tópico por nodo: el mensaje del turno debe tocar uno de estos temas. */
const TOPIC_RE: Record<string, RegExp> = {
  discovery_business:
    /(qu[eé] (hace|vende|ofrece)|negocio|clientes|servicios|productos|giro|dedica|trabaja|tienes)/i,
  // "algo tipo **Portafolio profesional**" también confirma la categoría (sin
  // "de" ni los nombres clásicos): se aceptan las categorías del catálogo,
  // incluidas las de entrada (menú digital, tarjeta digital, cotizador, link).
  discovery_confirm:
    /(tipo\s+de?(\s+\*\*)?(web|p[aá]gina|sitio|portafolio|blog|tienda|plataforma|sistema|men[uú]|tarjeta|cotizador|enlaces?|link|bio)|presentaci[oó]n|tienda|citas|p[aá]gina|web|portafolio|blog|plataforma|sistema|men[uú]|tarjeta|cotizador)/i,
  discovery_examples: /(ejemplo|p[aá]gina|web|parecid|negocio|te gusta)/i,
  pages: /(p[aá]gina|seccion|estructura|inicio|contacto|servicios|secciones)/i,
  technical_bundle: /(funcion|opci[oó]n|interesan|agregar|incluir|panel|mapa|whatsapp|pagos|citas|google|dejamos|recomiendo|todas|ninguna)/i,
  technical_auth: /(cuenta|registr|entrar|usuario|clientes|acceso)/i,
  technical_db: /(guardar|datos|informaci[oó]n|base de datos|bd)/i,
  technical_payments: /(cobra|pagar|tarjeta|transferencia|pagos?|whatsapp|cobras)/i,
  technical_dashboard: /(panel|pedidos|citas|clientes|avisos|administra|ver)/i,
  technical_maps: /(mapa|ubicaci[oó]n|encontrar|sucursal|local|direcci[oó]n|llegar)/i,
  technical_pdfs: /(cotizaci[oó]n|recibos?|reportes?|documentos|pdf)/i,
  technical_chat: /(escribir|chat|mensaje|whatsapp|contactar|escriban)/i,
  technical_bookings: /(cita|reservar|agendar|hora|d[ií]a|turno)/i,
  design: /(estilo|dise[ñn]o|moderno|sobrio|movimiento|color|sensaci[oó]n|transmitir|confianza|seria)/i,
  technical_seo: /(google|b[uú]squeda|aparecer|encontrar|seo|internet)/i,
  technical_pwa: /(app|instalar|celular|pantalla|aplicaci[oó]n)/i,
  technical_bots: /(asistente|bot|inteligente|atienda|responda|preguntas|recomiendo|agenda|ventas|leads|cotizaci[oó]n|interesa)/i,
  scope_content: /(fotos|textos|logo|im[aá]genes|contenido|material)/i,
  scope_services: /(servicios|ofrece|vende|mostrar|precios|lista|destacar|c[uaá]les)/i,
  scope_reference: /(referencia|ejemplo|p[aá]gina|enlace|link|gusta|parecida)/i,
  budget: /(presupuesto|inversi[oó]n|invertir|monto|cu[aá]nto|fecha|cu[aá]ndo|plazo|mes|entrega|alcanza|cobra)/i,
  contact_name: /(nombre|correo|whatsapp|tel[eé]fono|contacto|propuesta|localice)/i,
  contact_email: /(correo|email|mail)/i,
  contact_phone: /(tel[eé]fono|whatsapp|celular|n[uú]mero|localizar|contacto|d[ií]gitos)/i,
  extra_comments: /(m[aá]s|ajustar|contar|detalle|agregar|otra cosa|propuesta|preocupado)/i,
};

/** Pedir datos de contacto del cliente (fuera de los nodos de contacto). */
const CONTACT_ASK_RE =
  /\b(tu (correo|email|tel[eé]fono|whatsapp|celular|n[uú]mero)|me (dejas|das|dices) tu|dame tu|cu[aá]l es tu nombre|como te llamas|tu nombre|d[oó]nde (te|lo) (localiz|contact)|un (correo|email|tel[eé]fono|whatsapp|celular) (donde|para))/i;

/** El bot NO debe confirmar/condicionar un monto en el turno de presupuesto. */
const PRICE_PROMISE_RE =
  /(con ese monto|te armo algo|s[ií] te armo|alcanza|con eso (te|le) (armo|hago)|cupo|no hay problema|perfecto con eso|s[ií] alcanza)/i;

/** Mencionar montos/precios fuera del turno de presupuesto. */
const PRICE_MENTION_RE = /(\$\s?\d|\d+\s*mil\b|mil pesos|cu[aá]nto cuesta|cuesta\b)/i;

function baseNodeId(nodeId: string): string {
  return nodeId.replace(/^clarify_/, "");
}

/** true si el mensaje mezcla tratamiento formal e informal. */
function mixesTrato(msg: string): boolean {
  return (
    /\busted\b/.test(msg) &&
    /\b(t[eé]|t[ií]|contigo|tuy[oa]|t[uú]\b|tus)\b/.test(msg)
  );
}

/**
 * Devuelve advertencias (no bloqueantes) de deriva para un mensaje de turno.
 * Las heurísticas bloqueantes (trato mezclado, promesa de monto) se manejan
 * aparte porque sí hacen fallar la corrida en modo LLM.
 */
function driftWarnings(nodeId: string, msg: string): string[] {
  const flags: string[] = [];
  const base = baseNodeId(nodeId);
  const topic = TOPIC_RE[base];
  if (topic && !topic.test(msg)) {
    flags.push(
      `posible deriva de tema (turno ${nodeId}): el mensaje no toca el objetivo — "${msg.slice(0, 90)}"`
    );
  }
  if (
    !["contact_name", "contact_email", "contact_phone", "clarify_email", "clarify_phone"].includes(
      nodeId
    ) &&
    CONTACT_ASK_RE.test(msg)
  ) {
    flags.push(`turno ${nodeId}: pide datos de contacto fuera de turno — "${msg.slice(0, 90)}"`);
  }
  if (!["budget", "clarify_budget"].includes(nodeId) && PRICE_MENTION_RE.test(msg)) {
    flags.push(`turno ${nodeId}: menciona precios/montos fuera del presupuesto — "${msg.slice(0, 90)}"`);
  }
  return flags;
}

// ════════════════════════════════════════════════════════════════════
// PINTADO CON LLM REAL (mismo código de producción)
// ════════════════════════════════════════════════════════════════════
interface PaintedTurn {
  nodeId: string;
  answer: string;
  painted: string;
  fallback: string;
  isFallback: boolean;
}

function greetingText(ctx: ChatContext): string {
  const node = getNode(START_NODE_ID);
  if (!node || typeof node.generateMessage !== "function") return "¡Hola!";
  return node.generateMessage(ctx);
}

async function paintTurns(walkResult: WalkResult): Promise<PaintedTurn[]> {
  const { turns, ctx } = walkResult;
  const history: ChatMessage[] = [
    { id: "msg-greeting", role: "assistant", content: greetingText(ctx), timestamp: Date.now() },
  ];
  const painted: PaintedTurn[] = [];
  for (let i = 0; i < turns.length; i++) {
    const t = turns[i];
    history.push({ id: `msg-u${i}`, role: "user", content: t.answer, timestamp: Date.now() + i });
    // generateNextMessage = la misma función que usa /api/chat en producción.
    const msg = await generateNextMessage({
      nodeId: t.nextNodeId,
      fallbackReply: t.fallbackReply,
      messages: history,
      context: t.ctx,
      botName: BOT_NAME,
    });
    history.push({ id: `msg-a${i}`, role: "assistant", content: msg, timestamp: Date.now() + i });
    painted.push({
      nodeId: t.nextNodeId,
      answer: t.answer,
      painted: msg,
      fallback: t.fallbackReply,
      isFallback: msg === t.fallbackReply,
    });
  }
  return painted;
}

// ════════════════════════════════════════════════════════════════════
// LLM-AS-JUDGE (evalúa la adherencia al objetivo del turno)
// ════════════════════════════════════════════════════════════════════
interface JudgeVerdict {
  score: number;
  on_goal: boolean;
  off_goal_topics: string[];
  treatment_ok: boolean;
  note: string;
}

const JUDGE_SYSTEM = `Eres un evaluador de QA de un chatbot de ventas (una entrevista para cotizar una página web).
Recibes el OBJETIVO del turno que el bot debía cumplir, la última respuesta del cliente y el MENSAJE que el bot envió.
Evalúa si el mensaje CUMPLE el objetivo (pregunta justo lo que toca en ese turno) o se DESVÍA (adelanta turnos futuros, pide datos de contacto, menciona precios, cambia de tema).
También detecta: mezcla de tratamientos (tú/usted) y confirmación de montos en el turno de presupuesto.
Responde SOLO JSON: {"score": 1-5, "on_goal": true/false, "off_goal_topics": ["..."], "treatment_ok": true/false, "note": "1 frase"}.`;

function parseJudgeJson(raw: string): Partial<JudgeVerdict> | null {
  try {
    let t = raw.trim();
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    const obj = JSON.parse(t) as Record<string, unknown>;
    if (typeof obj !== "object" || obj === null) return null;
    return obj as unknown as Partial<JudgeVerdict>;
  } catch {
    return null;
  }
}

async function judgeTurn(
  nodeId: string,
  goal: string,
  message: string,
  answer: string
): Promise<JudgeVerdict | null> {
  try {
    const completion = await chatCompletion({
      messages: [
        { role: "system", content: JUDGE_SYSTEM },
        {
          role: "user",
          content: [
            `Turno (nodo): ${nodeId}`,
            `Objetivo del turno: ${goal}`,
            `Última respuesta del cliente: ${answer.slice(0, 200)}`,
            `Mensaje del bot a evaluar: ${message}`,
            "JSON:",
          ].join("\n"),
        },
      ],
      temperature: 0,
      max_tokens: 220,
      json: true,
    });
    if (!completion?.content) return null;
    const parsed = parseJudgeJson(completion.content);
    if (!parsed || typeof parsed.score !== "number" || typeof parsed.on_goal !== "boolean") {
      return null;
    }
    return {
      score: parsed.score,
      on_goal: parsed.on_goal,
      off_goal_topics: Array.isArray(parsed.off_goal_topics) ? parsed.off_goal_topics : [],
      treatment_ok: parsed.treatment_ok !== false,
      note: typeof parsed.note === "string" ? parsed.note : "",
    };
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════
// ORQUESTACIÓN
// ════════════════════════════════════════════════════════════════════
let failures = 0;
let passed = 0;
let warnings = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    passed += 1;
  } else {
    failures += 1;
    console.error(`  ✗ ${label}`);
  }
}

function warn(label: string): void {
  warnings += 1;
  console.warn(`  ⚠ ${label}`);
}

/** Asserts deterministas de flujo + datos por persona. */
function checkPersonaFlow(persona: Persona, result: WalkResult): void {
  const { ctx, asked, visited } = result;

  const counts = new Map<string, number>();
  for (const id of visited) counts.set(id, (counts.get(id) ?? 0) + 1);
  const dups = Array.from(counts.entries()).filter(([, n]) => n > 1);
  const redundantes = dups.filter(([id]) => !id.startsWith("clarify_"));
  const clarifyExcesivos = dups.filter(([id, n]) => id.startsWith("clarify_") && n > 2);

  assert(redundantes.length === 0, `[${persona.name}] sin preguntas redundantes ${JSON.stringify(redundantes)}`);
  assert(clarifyExcesivos.length === 0, `[${persona.name}] sin ciclos de clarificación ${JSON.stringify(clarifyExcesivos)}`);
  assert(asked.length <= persona.maxAsked, `[${persona.name}] discovery corto (${asked.length} ≤ ${persona.maxAsked})`);
  assert(ctx.category === persona.expectedCategory, `[${persona.name}] categoría ${persona.expectedCategory} (obtuve: ${ctx.category})`);
  assert(ctx.clientEmail !== null && ctx.clientEmail.includes("@"), `[${persona.name}] email limpio guardado (${ctx.clientEmail})`);
  assert(ctx.clientPhone !== null && /^\+52 \d{2} \d{4} \d{4}$/.test(ctx.clientPhone), `[${persona.name}] teléfono limpio guardado (${ctx.clientPhone})`);
  assert(ctx.presupuesto !== null, `[${persona.name}] presupuesto capturado (${ctx.presupuesto})`);
  if (persona.expectsBots) {
    assert(ctx.bots.length >= 1, `[${persona.name}] bots seleccionados (${ctx.bots.join(", ")})`);
  }
  if (persona.expectsProFeatures) {
    assert(
      ctx.inventario === true && ctx.facturacionCfdi === true,
      `[${persona.name}] features pro de ecommerce activadas (inventario=${ctx.inventario}, facturacionCfdi=${ctx.facturacionCfdi})`
    );
  }
  if (persona.expectsVertical) {
    assert(
      ctx[persona.expectsVertical] === true,
      `[${persona.name}] señal vertical ${persona.expectsVertical} activada (obtuve: ${String(ctx[persona.expectsVertical])})`
    );
  }
  if (persona.expectsEcosystem) {
    assert(
      ctx[persona.expectsEcosystem] === true,
      `[${persona.name}] señal nivel 5 ${persona.expectsEcosystem} activada (obtuve: ${String(ctx[persona.expectsEcosystem])})`
    );
    // FASE 3: las plataformas N5 (marketplace/saas/erp) se cotizan con
    // "propuesta formal" (nunca precio cerrado en el chat): el recap del
    // cierre debe comunicarlo para que el cliente lo confirme antes de cerrar.
    const recap = buildRecap(ctx);
    assert(
      /propuesta formal/.test(recap),
      `[${persona.name}] recap N5 comunica "propuesta formal" (obtuve: ${recap || "(vacío)"})`
    );
    // FASE 3: la señal N5 no debe confundirse con las otras dos del ecosistema
    // (saas ≠ marketplace/erp, erp ≠ marketplace/saas, etc.).
    const otras = (["marketplace", "saas", "erp"] as const).filter(
      (e) => e !== persona.expectsEcosystem
    );
    for (const otra of otras) {
      assert(
        ctx[otra] !== true,
        `[${persona.name}] señal ${persona.expectsEcosystem} sin contaminar ${otra} (obtuve: ${String(ctx[otra])})`
      );
    }
  }
  if (persona.expectsDocumentos) {
    assert(
      ctx.documentos === true,
      `[${persona.name}] documentos (PDFs de cotización) recomendados como parte del producto (obtuve: ${String(ctx.documentos)})`
    );
  }
  if (persona.expectsBotIds) {
    const rec = detectarBotsRecomendados(ctx).map((b) => b.id);
    assert(
      persona.expectsBotIds.every((id) => rec.includes(id)),
      `[${persona.name}] bots recomendados incluyen ${persona.expectsBotIds.join(", ")} (obtuve: ${rec.join(", ")})`
    );
  }
  if (persona.expectsUsted) {
    assert(
      ctx.trato === "usted",
      `[${persona.name}] trato formal detectado ("usted"), obtuve: ${ctx.trato ?? "null"}`
    );
  }

  // Sanidad del mensaje determinista de cada turno (debe tocar su tema).
  for (const t of result.turns) {
    assert(t.fallbackReply.trim().length >= 8, `[${persona.name}] fallback no vacío en ${t.nextNodeId}`);
    for (const f of driftWarnings(t.nextNodeId, t.fallbackReply)) {
      warn(`[${persona.name}] fallback: ${f}`);
    }
  }
}

async function run(): Promise<number> {
  const personas =
    PERSONA_FILTER != null
      ? PERSONAS.filter((_, i) => i + 1 === PERSONA_FILTER)
      : PERSONAS;
  if (personas.length === 0) {
    console.error(`No existe la persona ${PERSONA_FILTER} (hay ${PERSONAS.length}).`);
    return 1;
  }

  const provider = getLlmProvider();
  if (LLM_MODE && !provider) {
    console.warn(
      "⚠ Sin DEEPSEEK_API_KEY/OPENROUTER_API_KEY: el modo --llm cae a determinista (sin pintado real ni judge)."
    );
  }

  let paintCalls = 0;
  let judgeCalls = 0;
  let judgeErrors = 0;
  let fallbackCount = 0;
  let driftCount = 0;

  for (const persona of personas) {
    console.log(`\n${"═".repeat(72)}`);
    console.log(`PERSONA ${PERSONAS.indexOf(persona) + 1} · ${persona.name}`);

    let walkResult: WalkResult;
    try {
      walkResult = walk(persona.answers);
    } catch (err) {
      failures += 1;
      console.error(`  ✗ flujo: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    checkPersonaFlow(persona, walkResult);

    // ── Modo LLM: pintar con DeepSeek real y evaluar deriva ──
    if (LLM_MODE && provider) {
      const painted = await paintTurns(walkResult);
      const real = painted.filter((p) => !p.isFallback);
      fallbackCount += painted.length - real.length;
      paintCalls += painted.length;
      console.log(
        `  [LLM] pintados ${painted.length}/${walkResult.turns.length} · fallback determinista: ${painted.length - real.length}`
      );

      // Heurísticas: warnings informativos.
      for (const p of painted) {
        for (const f of driftWarnings(p.nodeId, p.painted)) {
          warn(`[${persona.name}] ${f}`);
        }
        if (mixesTrato(p.painted)) {
          warn(`[${persona.name}] trato mezclado (turno ${p.nodeId}) — "${p.painted.slice(0, 120)}"`);
        }
        if (
          (p.nodeId === "budget" || p.nodeId === "clarify_budget") &&
          PRICE_PROMISE_RE.test(p.painted)
        ) {
          warn(`[${persona.name}] posible confirmación de monto (turno ${p.nodeId}) — "${p.painted.slice(0, 120)}"`);
        }
      }

      // FALLOS deterministas (no dependen del judge): trato mezclado y promesa de monto.
      for (const p of painted) {
        if (mixesTrato(p.painted)) {
          failures += 1;
          console.error(`  ✗ TRATO MEZCLADO [${persona.name} · ${p.nodeId}]`);
          console.error(`    mensaje completo: "${p.painted}"`);
        }
        if (
          (p.nodeId === "budget" || p.nodeId === "clarify_budget") &&
          PRICE_PROMISE_RE.test(p.painted)
        ) {
          failures += 1;
          console.error(`  ✗ PROMESA DE MONTO [${persona.name} · ${p.nodeId}]`);
          console.error(`    mensaje completo: "${p.painted}"`);
        }
      }

      // LLM-as-judge: la autoridad final sobre la deriva de objetivos.
      if (RUN_JUDGE && real.length > 0) {
        console.log(`  [judge] evaluando ${real.length} mensajes del LLM…`);
        for (const p of real) {
          const goal = resolveGoal(p.nodeId);
          const verdict = await judgeTurn(p.nodeId, goal, p.painted, p.answer);
          judgeCalls += 1;
          if (!verdict) {
            judgeErrors += 1;
            warn(`[${persona.name}] judge sin respuesta para ${p.nodeId} (se omite)`);
            continue;
          }
          if (!verdict.on_goal || verdict.score < 4) {
            driftCount += 1;
            failures += 1;
            console.error(`  ✗ DERIVA [${persona.name} · ${p.nodeId}]: score ${verdict.score}/5 · fuera de objetivo: ${verdict.off_goal_topics.join(", ") || "—"}`);
            console.error(`    mensaje: "${p.painted.slice(0, 160)}"`);
            if (verdict.note) console.error(`    nota: ${verdict.note}`);
          } else if (!verdict.treatment_ok) {
            driftCount += 1;
            failures += 1;
            console.error(`  ✗ TRATO (judge) [${persona.name} · ${p.nodeId}]: mezcla tú/usted — "${p.painted.slice(0, 120)}"`);
          }
        }
      }
    }
  }

  // ── Resumen ──
  console.log(`\n${"═".repeat(72)}`);
  console.log(`RESUMEN test:eval · ${personas.length} persona(s)`);
  // Cobertura: QA queremos saber qué categorías del catálogo quedaron probadas.
  const categoriasCubiertas = new Set(personas.map((p) => p.expectedCategory));
  const TODAS = [
    "landing", "corporativo", "ecommerce", "citas", "webapp", "blog", "portafolio",
    "menu_digital", "tarjeta_digital", "link_in_bio", "cotizador",
  ];
  const faltantes = TODAS.filter((c) => !categoriasCubiertas.has(c));
  // Array.from(Set) — con el target del proyecto el spread de Set no compila
  // (TS2802), mismo patrón que el resto del script.
  console.log(
    `  Cobertura de categorías (${categoriasCubiertas.size}/${TODAS.length}): ${Array.from(categoriasCubiertas).sort().join(", ")}` +
      (faltantes.length ? ` · FALTAN: ${faltantes.join(", ")}` : "")
  );
  // Cobertura de verticales N4 y ecosistemas N5 (FASE 2/3 del plan de QA).
  const TODAS_V = ["inmobiliaria", "membresias", "cursos", "telemedicina", "directorio"] as const;
  const verticalesCubiertas = new Set(
    personas
      .map((p) => p.expectsVertical)
      .filter((v): v is NonNullable<Persona["expectsVertical"]> => v !== undefined)
  );
  const faltantesV = TODAS_V.filter((v) => !verticalesCubiertas.has(v));
  console.log(
    `  Cobertura de verticales N4 (${verticalesCubiertas.size}/${TODAS_V.length}): ${Array.from(verticalesCubiertas).sort().join(", ")}` +
      (faltantesV.length ? ` · FALTAN: ${faltantesV.join(", ")}` : "")
  );
  const TODAS_E = ["marketplace", "saas", "erp"] as const;
  const ecosCubiertos = new Set(
    personas
      .map((p) => p.expectsEcosystem)
      .filter((e): e is NonNullable<Persona["expectsEcosystem"]> => e !== undefined)
  );
  const faltantesE = TODAS_E.filter((e) => !ecosCubiertos.has(e));
  console.log(
    `  Cobertura de ecosistemas N5 (${ecosCubiertos.size}/${TODAS_E.length}): ${Array.from(ecosCubiertos).sort().join(", ")}` +
      (faltantesE.length ? ` · FALTAN: ${faltantesE.join(", ")}` : "")
  );
  console.log(`  asserts: ${passed} ✓ · fallos: ${failures} ✗ · warnings: ${warnings} ⚠`);
  if (LLM_MODE && provider) {
    console.log(`  LLM: ${paintCalls} pintados · ${fallbackCount} fallback · judge: ${judgeCalls} (${judgeErrors} errores) · deriva confirmada: ${driftCount}`);
    const inTok = paintCalls * 2000 + judgeCalls * 450;
    const outTok = paintCalls * 160 + judgeCalls * 90;
    const usd = (inTok / 1e6) * 0.27 + (outTok / 1e6) * 1.1;
    console.log(`  LLM estimado: ~${(inTok + outTok).toLocaleString()} tokens ≈ $${usd.toFixed(3)} USD por corrida`);
  }
  return failures > 0 ? 1 : 0;
}

run().then((code) => process.exit(code));
