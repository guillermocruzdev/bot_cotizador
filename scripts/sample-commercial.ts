/**
 * Verificación de la propuesta comercial (markdown + PDF).
 * Ejecutar: npx tsx scripts/sample-commercial.ts
 */
import { createEmptyContext } from "../lib/types";
import { buildCommercialProposal, toMarkdown } from "../lib/commercial-proposal";
import { downloadCommercialProposalPdf } from "../lib/commercial-proposal-pdf";

const ctx = createEmptyContext();
ctx.clientName = "Consultorio Dental Sonrisa";
ctx.clientEmail = "contacto@sonrisa.mx";
ctx.negocioDescripcion = "soy dentista en Madero, quiero que mis pacientes agenden citas online";
ctx.category = "citas";

const result = {
  clientName: "Consultorio Dental Sonrisa",
  categoria: "Sistema de Citas para Consultorio Dental",
  nivel: "Profesional",
  precio_min: 26240,
  precio_max: 32000,
  tiempo_estimado: "18-28 días",
  stack_tecnico: ["Next.js", "Supabase", "Tailwind CSS"],
  funcionalidades: [
    "Calendario donde el paciente elige día y hora",
    "Confirmaciones automáticas por correo",
    "Panel donde ves todas tus citas del día",
    "Mapa con tu ubicación para llegar",
    "Instalable en el celular como app",
    "Formulario de contacto",
  ],
  explicacion_precio: "Ajustado al presupuesto de un consultorio dental.",
  recomendaciones: [],
  entregables: [
    "Página principal con la información de tu consultorio",
    "Calendario de citas en línea",
    "Panel para administrar tu agenda",
    "Confirmaciones automáticas por correo",
    "Diseño responsive profesional",
  ],
  prompt_tecnico: "",
  giro: "Consultorio dental",
  punto_venta:
    "Para un consultorio dental, la web es tu recepcionista 24/7: agenda citas mientras atiendes a otros pacientes.",
  dolor:
    "Pierdes pacientes porque no pueden ver tus tratamientos ni agendar fuera de tu horario de atención.",
  beneficios: [
    "Citas en línea sin llamadas de por medio",
    "Recordatorios automáticos que reducen ausencias",
    "Imagen profesional que respalda tu consultorio",
  ],
  valor_negocio: "",
  cuota_mensual: 1093,
  alcance_ajustado: true,
  costo_omision:
    "Cada cita que no se agendó por falta de agenda en línea es ingreso que se va a otro consultorio.",
};

const prop = buildCommercialProposal(result as any, ctx);

console.log("=== DATOS ===");
console.log("Numero:", prop.numero);
console.log("Emision:", prop.fechaEmision, "| Vigencia:", prop.fechaVigencia);
console.log("Total:", prop.total, "| Anticipo:", prop.anticipo, "| Saldo:", prop.saldo, "| IVA:", prop.iva);
console.log("Dias entrega:", prop.diasEntrega);
console.log("Ciudad:", prop.cliente.ciudad);
console.log("Entregables:", prop.entregables.map((e) => `${e.nombre} = ${e.valor}`).join(" | "));
console.log("Bullets solucion:", prop.solucionBullets.length);

console.log("\n=== MARKDOWN (primeras 60 líneas) ===\n");
console.log(toMarkdown(prop).split("\n").slice(0, 60).join("\n"));

console.log("\n=== Generando PDF ... ===");
downloadCommercialProposalPdf(prop);
console.log("PDF generado OK.");
