/**
 * Genera packs de prompts para Roo Code + DeepSeek (con rol) por tipo de
 * servicio y los guarda en docs/prompts/. Reutiliza buildTechnicalPrompt, el
 * mismo generador que usa el bot en producción.
 *
 * Ejecutar: npx tsx scripts/generate-pack-samples.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createEmptyContext, type ChatContext } from "../lib/types";
import { getCategoryById } from "../lib/pricing-catalog";
import { buildTechnicalPrompt, type PromptAnalysis } from "../lib/prompt-builder";

interface Scenario {
  file: string;
  clientName: string;
  businessDescription: string;
  categoryId: string;
  nivel: "basico" | "profesional" | "avanzado";
  buildCtx: (ctx: ChatContext) => void;
  analysis: Partial<PromptAnalysis> & Pick<PromptAnalysis, "categoria">;
}

const SCENARIOS: Scenario[] = [
  {
    file: "PACK-landing.md",
    clientName: "Barbería El Corte",
    businessDescription:
      "Tengo una barbería y quiero que la gente me encuentre en Google y me escriba por WhatsApp",
    categoryId: "landing",
    nivel: "profesional",
    buildCtx: (ctx) => {
      ctx.paginas = 1;
      ctx.estructuraWeb = "Inicio, Servicios, Galería, Ubicación, Contacto";
      ctx.servicios = "corte clásico, barba y afeitado";
      ctx.mapas = true;
      ctx.chat = true;
      ctx.seo = true;
      ctx.animaciones = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "12000 a 15000";
      ctx.fechaEntrega = "para el próximo mes";
      ctx.comentarios = "Quiere verse moderno pero serio";
    },
    analysis: {
      categoria: "Página de presentación para barbería (landing)",
      nivelLabel: "Profesional",
      precio_min: 12760,
      precio_max: 15260,
      tiempo_estimado: "10-14 días de desarrollo",
      giro: "Barbería",
      punto_venta: "Una barbería que aparece en Google y recibe WhatsApp sin fricción.",
    },
  },
  {
    file: "PACK-citas.md",
    clientName: "Dra. Laura Gómez",
    businessDescription:
      "Soy dentista en Madero, quiero que mis pacientes agenden citas online",
    categoryId: "citas",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 5;
      ctx.estructuraWeb = "Inicio, Servicios, Agenda, Panel, Contacto";
      ctx.servicios = "limpieza dental, ortodoncia y blanqueamiento";
      ctx.baseDeDatos = true;
      ctx.dashboard = true;
      ctx.mapas = true;
      ctx.chat = true;
      ctx.citas = true;
      ctx.animaciones = true;
      ctx.seo = true;
      ctx.pwa = true;
      ctx.contenidoListo = true;
      ctx.presupuesto = "20000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Sistema de Citas para Consultorio Dental",
      nivelLabel: "Avanzado",
      precio_min: 54630,
      precio_max: 57305,
      tiempo_estimado: "18-28 días de desarrollo",
      giro: "Consultorio dental",
      punto_venta: "La web es tu recepcionista 24/7: agenda citas mientras atiendes.",
    },
  },
  {
    file: "PACK-ecommerce.md",
    clientName: "Moda GDL",
    businessDescription:
      "Quiero una tienda online con carrito y pagos para vender ropa por internet",
    categoryId: "ecommerce",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 6;
      ctx.estructuraWeb = "Inicio, Catálogo, Producto, Carrito, Checkout, Contacto";
      ctx.servicios = "ropa de hombre y mujer, tallas 26-42";
      ctx.autenticacion = true;
      ctx.baseDeDatos = true;
      ctx.pagos = true;
      ctx.dashboard = true;
      ctx.documentos = true;
      ctx.chat = true;
      ctx.animaciones = true;
      ctx.seo = true;
      ctx.pwa = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "25000 a 30000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Tienda online con carrito y pagos",
      nivelLabel: "Avanzado",
      precio_min: 32640,
      precio_max: 36640,
      tiempo_estimado: "21-30 días de desarrollo",
      giro: "Tienda de ropa",
      punto_venta: "Vende 24/7 con checkout sin fricción y panel de pedidos.",
    },
  },
];

function buildAnalysis(s: Scenario): PromptAnalysis {
  return {
    nivelLabel: s.analysis.nivelLabel,
    precio_min: s.analysis.precio_min ?? 1000,
    precio_max: s.analysis.precio_max ?? 2000,
    tiempo_estimado: s.analysis.tiempo_estimado ?? "10-20 días",
    funcionalidades: [],
    stack_tecnico: [],
    entregables: [],
    recomendaciones: [],
    ...s.analysis,
  } as PromptAnalysis;
}

const OUT_DIR = join(process.cwd(), "docs", "prompts");
mkdirSync(OUT_DIR, { recursive: true });

for (const s of SCENARIOS) {
  const ctx = createEmptyContext();
  ctx.clientName = s.clientName;
  ctx.negocioDescripcion = s.businessDescription;
  ctx.category = s.categoryId;
  s.buildCtx(ctx);

  const category = getCategoryById(s.categoryId)!;
  const prompt = buildTechnicalPrompt({
    clientName: s.clientName,
    businessDescription: s.businessDescription,
    category,
    nivel: s.nivel,
    context: ctx,
    analysis: buildAnalysis(s),
  });

  const path = join(OUT_DIR, s.file);
  writeFileSync(path, prompt, "utf8");
  console.log(`✓ ${s.file} (${(prompt.length / 1024).toFixed(1)} KB, ${prompt.length} chars)`);
}

console.log(`\nPacks generados en ${OUT_DIR}`);
