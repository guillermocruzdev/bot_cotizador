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
  // ── Fase 1 · Productos de entrada ──────────────────────────────
  {
    file: "PACK-menu-digital.md",
    clientName: "Taquería El Pastor",
    businessDescription:
      "Quiero un menú con código QR para que mis clientes escaneen y vean mi carta en la mesa",
    categoryId: "menu_digital",
    nivel: "basico",
    buildCtx: (ctx) => {
      ctx.paginas = 1;
      ctx.estructuraWeb = "Menú, Promociones, Cómo pedir, Contacto";
      ctx.servicios = "tacos, tortas, quesadillas y aguas frescas";
      ctx.mapas = true;
      ctx.chat = true;
      ctx.seo = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "6000 a 9000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Menú digital con código QR",
      nivelLabel: "Básico",
      precio_min: 6960,
      precio_max: 9960,
      tiempo_estimado: "2-4 días de desarrollo",
      giro: "Restaurante / negocio de comida",
      punto_venta: "Cada mesa escanea el QR y ve tu carta al instante, sin esperar mesero.",
    },
  },
  {
    file: "PACK-tarjeta-digital.md",
    clientName: "Pedro Ramírez",
    businessDescription:
      "Quiero una tarjeta digital para compartir mi información por WhatsApp",
    categoryId: "tarjeta_digital",
    nivel: "basico",
    buildCtx: (ctx) => {
      ctx.paginas = 1;
      ctx.estructuraWeb = "Presentación, Servicios, Galería, Ubicación, Contacto";
      ctx.servicios = "fotografía de eventos y retratos";
      ctx.mapas = true;
      ctx.chat = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "6000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Tarjeta digital / minisitio",
      nivelLabel: "Básico",
      precio_min: 6960,
      precio_max: 9960,
      tiempo_estimado: "2-4 días de desarrollo",
      giro: "Fotógrafo / creativo",
      punto_venta: "Tu información profesional en un solo link que se abre al tocar.",
    },
  },
  {
    file: "PACK-link-in-bio.md",
    clientName: "Sofía Creativa",
    businessDescription:
      "Quiero una página con mis enlaces para poner en mi bio de Instagram",
    categoryId: "link_in_bio",
    nivel: "basico",
    buildCtx: (ctx) => {
      ctx.paginas = 1;
      ctx.estructuraWeb = "Enlaces, Mini-catálogo, Contacto";
      ctx.servicios = "asesorías de marca y contenido";
      ctx.chat = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "5000";
      ctx.fechaEntrega = "para la próxima semana";
    },
    analysis: {
      categoria: "Página de enlaces (link-in-bio)",
      nivelLabel: "Básico",
      precio_min: 5800,
      precio_max: 7800,
      tiempo_estimado: "1-2 días de desarrollo",
      giro: "Creador de contenido",
      punto_venta: "Un solo link en tu bio que ordena tus enlaces y hace que la gente actúe.",
    },
  },
  {
    file: "PACK-cotizador.md",
    clientName: "Iván Contreras",
    businessDescription:
      "Quiero que mis clientes me pidan cotización en línea con cálculo automático",
    categoryId: "cotizador",
    nivel: "profesional",
    buildCtx: (ctx) => {
      ctx.paginas = 3;
      ctx.estructuraWeb = "Inicio, Cotiza aquí, Servicios, Contacto";
      ctx.servicios = "mantenimiento industrial y reparaciones";
      ctx.documentos = true;
      ctx.chat = true;
      ctx.seo = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "20000 a 25000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Cotizador / presupuesto en línea",
      nivelLabel: "Profesional",
      precio_min: 20300,
      precio_max: 28800,
      tiempo_estimado: "12-20 días de desarrollo",
      giro: "Negocio de servicios que cotiza",
      punto_venta: "Tus clientes piden su presupuesto en línea y el sistema calcula el precio solo.",
    },
  },
  // ── Fase 2 · Nivel 2 · Negocio ─────────────────────────────────
  {
    file: "PACK-corporativo.md",
    clientName: "Grupo Constructor MX",
    businessDescription:
      "Quiero una página para mi constructora con quienes somos, proyectos y contacto, varias secciones",
    categoryId: "corporativo",
    nivel: "profesional",
    buildCtx: (ctx) => {
      ctx.paginas = 5;
      ctx.estructuraWeb = "Inicio, Nosotros, Servicios, Proyectos, Contacto";
      ctx.servicios = "construcción residencial y comercial";
      ctx.mapas = true;
      ctx.chat = true;
      ctx.seo = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "20000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Sitio corporativo (varias páginas)",
      nivelLabel: "Profesional",
      precio_min: 20300,
      precio_max: 25800,
      tiempo_estimado: "10-18 días de desarrollo",
      giro: "Constructora / arquitecto",
      punto_venta: "Posiciona a tu empresa como seria con varias páginas y contenido real.",
    },
  },
  {
    file: "PACK-reservas-restaurante.md",
    clientName: "La Esquina Bistro",
    businessDescription:
      "Quiero que mis clientes aparten mesa en línea con hora y número de personas",
    categoryId: "citas",
    nivel: "profesional",
    buildCtx: (ctx) => {
      ctx.paginas = 4;
      ctx.estructuraWeb = "Inicio, Menú, Reservar mesa, Contacto";
      ctx.servicios = "cocina de autor y maridajes";
      ctx.citas = true;
      ctx.pagos = true;
      ctx.dashboard = true;
      ctx.mapas = true;
      ctx.chat = true;
      ctx.seo = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "25000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Sistema de reservas de mesa para restaurante",
      nivelLabel: "Profesional",
      precio_min: 26796,
      precio_max: 32796,
      tiempo_estimado: "12-18 días de desarrollo",
      giro: "Restaurante / negocio de comida",
      punto_venta: "Tus clientes apartan mesa en línea y tú bloqueas el horario sin llamadas.",
    },
  },
  // ── Fase 3 · Nivel 3 · Venta (ecommerce pro) ───────────────────
  {
    file: "PACK-ecommerce-pro.md",
    clientName: "Distribuidora GDL",
    businessDescription:
      "Quiero una tienda online con carrito y pagos, y administrar inventario y facturar con CFDI",
    categoryId: "ecommerce",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 6;
      ctx.estructuraWeb = "Inicio, Catálogo, Producto, Carrito, Checkout, Panel";
      ctx.servicios = "abarrotes al mayoreo";
      ctx.inventario = true;
      ctx.reportesVentas = true;
      ctx.facturacionCfdi = true;
      ctx.multiVendedor = true;
      ctx.autenticacion = true;
      ctx.baseDeDatos = true;
      ctx.pagos = true;
      ctx.dashboard = true;
      ctx.documentos = true;
      ctx.chat = true;
      ctx.seo = true;
      ctx.pwa = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "40000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Tienda online pro (inventario, facturación CFDI y multi-vendedor)",
      nivelLabel: "Avanzado",
      precio_min: 32640,
      precio_max: 46640,
      tiempo_estimado: "21-30 días de desarrollo",
      giro: "Tienda / comercio local",
      punto_venta: "Vende 24/7 y opera tu tienda desde el panel: inventario, reportes y CFDI.",
    },
  },
  // ── Fase 4 · Nivel 4 · Plataformas ─────────────────────────────
  {
    file: "PACK-inmobiliaria.md",
    clientName: "Inmobiliaria Horizonte",
    businessDescription:
      "Quiero un portal con propiedades, filtros por zona y precio, y que cada propiedad genere leads",
    categoryId: "webapp",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 4;
      ctx.estructuraWeb = "Inicio, Propiedades, Detalle de propiedad, Panel";
      ctx.servicios = "venta y renta de casas y departamentos";
      ctx.inmobiliaria = true;
      ctx.autenticacion = true;
      ctx.baseDeDatos = true;
      ctx.dashboard = true;
      ctx.mapas = true;
      ctx.seo = true;
      ctx.pwa = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "50000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Portal inmobiliario (propiedades, filtros y leads)",
      nivelLabel: "Avanzado",
      precio_min: 25000,
      precio_max: 50000,
      tiempo_estimado: "18-28 días de desarrollo",
      giro: "Agencia inmobiliaria",
      punto_venta: "Cada propiedad genera leads de compradores reales, con filtros y panel.",
    },
  },
  {
    file: "PACK-membresias.md",
    clientName: "Gimnasio FitZone",
    businessDescription:
      "Quiero un portal de membresías con cobro recurrente y área de miembros",
    categoryId: "webapp",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 3;
      ctx.estructuraWeb = "Inicio, Planes, Área de miembros";
      ctx.servicios = "gimnasio con entrenamiento funcional";
      ctx.membresias = true;
      ctx.autenticacion = true;
      ctx.baseDeDatos = true;
      ctx.pagos = true;
      ctx.dashboard = true;
      ctx.seo = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "40000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Portal de membresías (cobro recurrente y área privada)",
      nivelLabel: "Avanzado",
      precio_min: 28000,
      precio_max: 50000,
      tiempo_estimado: "18-28 días de desarrollo",
      giro: "Gimnasio / entrenador",
      punto_venta: "Cobra la membresía cada mes de forma automática y retén a tus miembros.",
    },
  },
  {
    file: "PACK-cursos.md",
    clientName: "Academia CursosPro",
    businessDescription:
      "Quiero una plataforma de cursos en línea con lecciones en video, progreso y certificados",
    categoryId: "webapp",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 3;
      ctx.estructuraWeb = "Inicio, Catálogo de cursos, Mi curso";
      ctx.servicios = "cursos de programación y diseño";
      ctx.cursos = true;
      ctx.autenticacion = true;
      ctx.baseDeDatos = true;
      ctx.pagos = true;
      ctx.dashboard = true;
      ctx.seo = true;
      ctx.pwa = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "45000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Plataforma de cursos en línea",
      nivelLabel: "Avanzado",
      precio_min: 30000,
      precio_max: 55000,
      tiempo_estimado: "21-30 días de desarrollo",
      giro: "Empresa / operación (plataforma a medida)",
      punto_venta: "Vende cursos en línea con lecciones, progreso del alumno y certificados.",
    },
  },
  {
    file: "PACK-telemedicina.md",
    clientName: "Clínica VidaSana",
    businessDescription:
      "Quiero un portal para que mis pacientes agenden consulta en línea con videollamada y expediente",
    categoryId: "webapp",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 4;
      ctx.estructuraWeb = "Inicio, Servicios médicos, Agendar consulta, Expediente";
      ctx.servicios = "consultas generales y especialidades";
      ctx.telemedicina = true;
      ctx.citas = true;
      ctx.autenticacion = true;
      ctx.baseDeDatos = true;
      ctx.pagos = true;
      ctx.dashboard = true;
      ctx.seo = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "45000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Portal de salud / telemedicina",
      nivelLabel: "Avanzado",
      precio_min: 26000,
      precio_max: 55000,
      tiempo_estimado: "21-30 días de desarrollo",
      giro: "Clínica / consultorio médico",
      punto_venta: "Tu paciente agenda, se atiende por videollamada y llevas su expediente digital.",
    },
  },
  {
    file: "PACK-directorio.md",
    clientName: "Cámara de Comercio Local",
    businessDescription:
      "Quiero un directorio de negocios con fichas autogestionables y búsqueda por categoría y mapa",
    categoryId: "webapp",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 3;
      ctx.estructuraWeb = "Inicio, Directorio, Ficha de negocio, Panel";
      ctx.servicios = "asociados del comercio local";
      ctx.directorio = true;
      ctx.autenticacion = true;
      ctx.baseDeDatos = true;
      ctx.pagos = true;
      ctx.dashboard = true;
      ctx.mapas = true;
      ctx.seo = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "35000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Directorio de negocios (fichas y mapa)",
      nivelLabel: "Avanzado",
      precio_min: 22000,
      precio_max: 45000,
      tiempo_estimado: "18-28 días de desarrollo",
      giro: "Empresa / operación (plataforma a medida)",
      punto_venta: "Cada negocio del directorio tiene su ficha autogestionable con búsqueda y mapa.",
    },
  },
  // ── Fase 5 · Nivel 5 · Ecosistema ──────────────────────────────
  {
    file: "PACK-marketplace.md",
    clientName: "Mercado Local",
    businessDescription:
      "Quiero montar un marketplace con varios vendedores que publiquen y vendan, y yo cobrar comisión por venta",
    categoryId: "webapp",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 4;
      ctx.estructuraWeb = "Inicio, Tiendas, Producto, Panel del vendedor";
      ctx.servicios = "productos de artesanos y pymes";
      ctx.marketplace = true;
      ctx.autenticacion = true;
      ctx.baseDeDatos = true;
      ctx.pagos = true;
      ctx.dashboard = true;
      ctx.seo = true;
      ctx.pwa = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "80000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Marketplace multi-vendedor (comisión por venta)",
      nivelLabel: "Avanzado",
      precio_min: 40000,
      precio_max: 90000,
      tiempo_estimado: "30-45 días de desarrollo",
      giro: "Empresa / operación (plataforma a medida)",
      punto_venta: "Muchos vendedores publican y venden; tú cobras comisión con split de pagos.",
    },
  },
  {
    file: "PACK-saas.md",
    clientName: "NubeContable",
    businessDescription:
      "Quiero un software como servicio para que mis clientes lleven su contabilidad con planes y pago mensual",
    categoryId: "webapp",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 3;
      ctx.estructuraWeb = "Landing del SaaS, Panel, Configuración";
      ctx.servicios = "contabilidad en línea para pymes";
      ctx.saas = true;
      ctx.autenticacion = true;
      ctx.baseDeDatos = true;
      ctx.pagos = true;
      ctx.dashboard = true;
      ctx.seo = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "100000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Software como servicio (SaaS) multi-tenant",
      nivelLabel: "Avanzado",
      precio_min: 60000,
      precio_max: 120000,
      tiempo_estimado: "45-60 días de desarrollo",
      giro: "Empresa / operación (plataforma a medida)",
      punto_venta: "Tu software para muchos clientes, con datos aislados y cobro de plan mensual.",
    },
  },
  {
    file: "PACK-erp.md",
    clientName: "Logística del Norte",
    businessDescription:
      "Quiero un sistema con módulos de compras, ventas, almacén y nómina para controlar mi operación",
    categoryId: "webapp",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 3;
      ctx.estructuraWeb = "Panel, Compras, Ventas, Almacén, Nómina";
      ctx.servicios = "logística y distribución";
      ctx.erp = true;
      ctx.autenticacion = true;
      ctx.baseDeDatos = true;
      ctx.dashboard = true;
      ctx.documentos = true;
      ctx.seo = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "150000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "ERP a medida (compras, ventas, almacén, nómina)",
      nivelLabel: "Avanzado",
      precio_min: 90000,
      precio_max: 200000,
      tiempo_estimado: "60-90 días de desarrollo",
      giro: "Empresa / operación (plataforma a medida)",
      punto_venta: "Controla toda tu operación en un solo sistema con reportes ejecutivos.",
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
