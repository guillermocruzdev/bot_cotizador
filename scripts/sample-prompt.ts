/**
 * Script de verificación (no parte del build): genera un prompt técnico
 * de muestra con datos realistas de una entrevista de citas.
 * Ejecutar: npx tsx scripts/sample-prompt.ts
 */
import { createEmptyContext } from "../lib/types";
import { getCategoryById } from "../lib/pricing-catalog";
import { buildTechnicalPrompt } from "../lib/prompt-builder";

const ctx = createEmptyContext();
ctx.clientName = "Dra. Laura Gómez";
ctx.negocioDescripcion =
  "Soy dentista en Madero, quiero que mis pacientes agenden citas online";
ctx.category = "citas";
ctx.paginas = 5;
ctx.autenticacion = false;
ctx.baseDeDatos = true;
ctx.pagos = false;
ctx.dashboard = true;
ctx.mapas = true;
ctx.documentos = false;
ctx.chat = true;
ctx.citas = true;
ctx.animaciones = true;
ctx.seo = true;
ctx.pwa = true;
ctx.contenidoListo = true;
ctx.presupuesto = "unos 20 mil pesos";
ctx.fechaEntrega = "para el próximo mes";
ctx.referencia = "una clínica moderna";

const category = getCategoryById("citas")!;

const prompt = buildTechnicalPrompt({
  clientName: ctx.clientName,
  businessDescription: ctx.negocioDescripcion,
  category,
  nivel: "avanzado",
  context: ctx,
  analysis: {
    categoria: "Sistema de Citas para Consultorio Dental",
    nivelLabel: "Avanzado",
    precio_min: 54630,
    precio_max: 57305,
    tiempo_estimado: "18-28 días de desarrollo",
    funcionalidades: [
      "Página principal con la información de tu consultorio",
      "Calendario donde el paciente elige día y hora",
      "Confirmaciones automáticas por correo",
      "Panel para ti donde ves todas las citas",
      "Mapa con tu ubicación",
      "Diseño que se ve bien en celular",
    ],
    stack_tecnico: ["Next.js", "Supabase", "Tailwind CSS", "Framer Motion"],
    entregables: [
      "Calendario en línea",
      "Confirmaciones automáticas",
      "Panel de agenda",
    ],
    recomendaciones: ["Agregar mantenimiento mensual"],
    giro: "Consultorio dental",
    punto_venta:
      "Para un consultorio dental, la web es tu recepcionista 24/7: agenda citas mientras atiendes a otros pacientes.",
    dolor:
      "Pierdes pacientes porque no pueden ver tus tratamientos ni agendar fuera de tu horario de atención.",
    beneficios: [
      "Citas en línea sin llamadas de por medio",
      "Mostrar tratamientos y precios con claridad",
      "Recordatorios automáticos que reducen ausencias",
    ],
    valor_negocio:
      "Para tu consultorio dental, esta página no es un gasto: es una herramienta que trabaja para ti todos los días. Con una inversión de $54,630–$57,305 MXN te pones a la altura de los mejores de tu sector y recuperas lo invertido con pocos pacientes nuevos.",
    costo_omision:
      "Cada cita que no se agendó por falta de agenda en línea es ingreso que se va a otro consultorio.",
    presupuesto_giro: "$12,000–$32,000 MXN",
    cuota_mensual: 2276,
    alcance_ajustado: false,
  },
});

console.log(prompt);
console.log("\n\n--- LEN:", prompt.length, "chars ---");
