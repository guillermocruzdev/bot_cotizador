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
  },
});

console.log(prompt);
console.log("\n\n--- LEN:", prompt.length, "chars ---");
