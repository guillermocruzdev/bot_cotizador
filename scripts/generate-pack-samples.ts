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
import { REGISTRO_PACKS, SERVICIOS_SIN_PACK, type PackRegistro } from "./pack-registry";

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
  // ── Nivel 0 · Micro-landing promocional ─────────────────────────
  {
    file: "PACK-micro-landing.md",
    clientName: "PromoTech Studio",
    businessDescription:
      "Quiero una micro-landing para una promoción o campaña con un solo objetivo: captar contactos",
    categoryId: "landing",
    nivel: "basico",
    buildCtx: (ctx) => {
      ctx.paginas = 1;
      ctx.estructuraWeb = "Promo, Oferta, Formulario, Contacto";
      ctx.servicios = "promoción de lanzamiento de un curso";
      ctx.chat = true;
      ctx.seo = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "5000";
      ctx.fechaEntrega = "para la próxima semana";
    },
    analysis: {
      categoria: "Micro-landing promocional (una sola oferta)",
      nivelLabel: "Básico",
      precio_min: 5800,
      precio_max: 8300,
      tiempo_estimado: "2-4 días de desarrollo",
      giro: "Negocio local / campaña promocional",
      punto_venta: "Una sola página enfocada en UNA oferta: el visitante actúa o se va.",
    },
  },
  // ── Nivel 1 · Landing de evento ─────────────────────────────────
  {
    file: "PACK-landing-evento.md",
    clientName: "Congreso Innovación MX",
    businessDescription:
      "Quiero una landing para mi evento con registro de asistentes, agenda, ponentes y contador",
    categoryId: "landing",
    nivel: "basico",
    buildCtx: (ctx) => {
      ctx.paginas = 1;
      ctx.estructuraWeb = "Hero del evento, Agenda, Ponentes, Registro";
      ctx.servicios = "congreso anual de innovación y tecnología";
      ctx.chat = true;
      ctx.seo = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "8000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Landing de evento (registro y boletos)",
      nivelLabel: "Básico",
      precio_min: 7540,
      precio_max: 10040,
      tiempo_estimado: "3-7 días de desarrollo",
      giro: "Organizador de eventos",
      punto_venta: "Registro de asistentes, agenda, ponentes y venta de boletos en una sola página.",
    },
  },
  // ── Nivel 1 · Portafolio profesional ────────────────────────────
  {
    file: "PACK-portafolio.md",
    clientName: "Mariana Fotógrafa",
    businessDescription:
      "Quiero un portafolio para mostrar mi trabajo con galería y animaciones",
    categoryId: "portafolio",
    nivel: "profesional",
    buildCtx: (ctx) => {
      ctx.paginas = 1;
      ctx.estructuraWeb = "Inicio, Portafolio, Sobre mí, Contacto";
      ctx.servicios = "fotografía de bodas y retratos";
      ctx.animaciones = true;
      ctx.chat = true;
      ctx.seo = true;
      ctx.contenidoListo = true;
      ctx.presupuesto = "9000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Portafolio profesional (galería con animaciones)",
      nivelLabel: "Profesional",
      precio_min: 10150,
      precio_max: 12150,
      tiempo_estimado: "4-10 días de desarrollo",
      giro: "Fotógrafo / creativo",
      punto_venta: "Tu trabajo en una galería con animaciones que deja huella y cierra proyectos.",
    },
  },
  // ── Nivel 1 · Blog / contenido ──────────────────────────────────
  {
    file: "PACK-blog.md",
    clientName: "Nutrición Clara",
    businessDescription:
      "Quiero un blog para publicar artículos que me posicionen en Google y atraigan clientes",
    categoryId: "blog",
    nivel: "profesional",
    buildCtx: (ctx) => {
      ctx.paginas = 3;
      ctx.estructuraWeb = "Inicio, Blog, Artículo, Contacto";
      ctx.servicios = "nutrición y hábitos saludables";
      ctx.seo = true;
      ctx.pwa = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "12000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Blog / sitio de contenido con SEO",
      nivelLabel: "Profesional",
      precio_min: 12180,
      precio_max: 14680,
      tiempo_estimado: "5-12 días de desarrollo",
      giro: "Marca personal / contenido",
      punto_venta: "Publica artículos que posicionan en Google y atraen clientes orgánicos.",
    },
  },
  // ── Nivel 2 · Sitio multilingüe ─────────────────────────────────
  {
    file: "PACK-multilingue.md",
    clientName: "Tour Riviera Maya",
    businessDescription:
      "Quiero mi web en español e inglés porque atiendo turistas y clientes de exportación",
    categoryId: "landing",
    nivel: "profesional",
    buildCtx: (ctx) => {
      ctx.paginas = 4;
      ctx.estructuraWeb = "Inicio, Tours, Nosotros, Contacto";
      ctx.servicios = "tours y experiencias en la Riviera Maya";
      ctx.multilingue = true;
      ctx.seo = true;
      ctx.chat = true;
      ctx.mapas = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "15000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Sitio multilingüe (español + inglés con SEO por idioma)",
      nivelLabel: "Profesional",
      precio_min: 15260,
      precio_max: 18760,
      tiempo_estimado: "6-12 días de desarrollo",
      giro: "Turismo / negocio fronterizo",
      punto_venta: "Atiende turistas y clientes internacionales con SEO por idioma (hreflang).",
    },
  },
  // ── Nivel 2 · PWA instalable ────────────────────────────────────
  {
    file: "PACK-pwa.md",
    clientName: "Pizzería La Flama",
    businessDescription:
      "Quiero que mi web se instale en el celular de mis clientes como app con notificaciones",
    categoryId: "landing",
    nivel: "profesional",
    buildCtx: (ctx) => {
      ctx.paginas = 3;
      ctx.estructuraWeb = "Inicio, Menú, Pedido, Contacto";
      ctx.servicios = "pizza artesanal a domicilio";
      ctx.pwa = true;
      ctx.chat = true;
      ctx.seo = true;
      ctx.mapas = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "15000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Web instalable (PWA) con notificaciones",
      nivelLabel: "Profesional",
      precio_min: 15260,
      precio_max: 19260,
      tiempo_estimado: "7-15 días de desarrollo",
      giro: "Restaurante / negocio local",
      punto_venta: "Tus clientes instalan tu web como app sin pasar por la tienda y reciben notificaciones.",
    },
  },
  // ── Nivel 3 · Reservas con pago por adelantado ──────────────────
  {
    file: "PACK-reservas-pago.md",
    clientName: "Spa Serenidad",
    businessDescription:
      "Quiero que mis clientes reserven su cita y paguen por adelantado al reservar",
    categoryId: "citas",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 4;
      ctx.estructuraWeb = "Inicio, Servicios, Reservar con pago, Panel";
      ctx.servicios = "masajes y tratamientos de spa";
      ctx.citas = true;
      ctx.pagos = true;
      ctx.autenticacion = true;
      ctx.baseDeDatos = true;
      ctx.dashboard = true;
      ctx.mapas = true;
      ctx.chat = true;
      ctx.seo = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "25000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Sistema de reservas con pago por adelantado",
      nivelLabel: "Avanzado",
      precio_min: 26796,
      precio_max: 32796,
      tiempo_estimado: "12-18 días de desarrollo",
      giro: "Spa / estética",
      punto_venta: "El cliente paga al reservar: cero no-shows y tu agenda garantizada.",
    },
  },
  // ── Nivel 4 · Plataforma / webapp a medida ──────────────────────
  {
    file: "PACK-webapp.md",
    clientName: "Taller Mecánico Express",
    businessDescription:
      "Quiero un sistema a la medida de mi operación para controlar clientes, servicios y reportes",
    categoryId: "webapp",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 4;
      ctx.estructuraWeb = "Panel, Clientes, Servicios, Reportes";
      ctx.servicios = "servicio automotriz";
      ctx.autenticacion = true;
      ctx.baseDeDatos = true;
      ctx.dashboard = true;
      ctx.documentos = true;
      ctx.chat = true;
      ctx.seo = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "40000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Plataforma / sistema web a medida",
      nivelLabel: "Avanzado",
      precio_min: 20300,
      precio_max: 45000,
      tiempo_estimado: "15-30 días de desarrollo",
      giro: "Empresa / operación (plataforma a medida)",
      punto_venta: "Un sistema hecho a la medida de tu proceso: solo pagas los módulos que usas.",
    },
  },
  // ── Nivel 5 · Marketplace con split de pagos ────────────────────
  {
    file: "PACK-marketplace-split.md",
    clientName: "Plaza Digital MX",
    businessDescription:
      "Quiero un marketplace donde cada vendedor reciba su parte automáticamente al vender (split de pagos)",
    categoryId: "webapp",
    nivel: "avanzado",
    buildCtx: (ctx) => {
      ctx.paginas = 4;
      ctx.estructuraWeb = "Inicio, Tiendas, Producto, Panel del vendedor";
      ctx.servicios = "productos de múltiples vendedores";
      ctx.marketplace = true;
      ctx.autenticacion = true;
      ctx.baseDeDatos = true;
      ctx.pagos = true;
      ctx.dashboard = true;
      ctx.seo = true;
      ctx.pwa = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "120000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Marketplace con split de pagos (escrow multi-vendedor)",
      nivelLabel: "Avanzado",
      precio_min: 70000,
      precio_max: 150000,
      tiempo_estimado: "45-80 días de desarrollo",
      giro: "Empresa / operación (plataforma a medida)",
      punto_venta: "Cada vendedor cobra su parte al instante; tú administras la plataforma y cobras comisión.",
    },
  },
  // ── Extra · Landing de psicólogo con asistente IA ───────────────
  {
    file: "PACK-psicologo.md",
    clientName: "Lic. Paola Rivera",
    businessDescription:
      "Quiero una página para mi consultorio de psicología con un asistente que responda dudas y agende citas",
    categoryId: "landing",
    nivel: "profesional",
    buildCtx: (ctx) => {
      ctx.paginas = 4;
      ctx.estructuraWeb = "Inicio, Servicios, Sobre mí, Contacto";
      ctx.servicios = "terapia individual, de pareja y manejo de ansiedad";
      ctx.bots = ["bot_atencion", "bot_faq", "bot_leads"];
      ctx.chat = true;
      ctx.seo = true;
      ctx.mapas = true;
      ctx.contenidoListo = false;
      ctx.presupuesto = "15000";
      ctx.fechaEntrega = "para el próximo mes";
    },
    analysis: {
      categoria: "Landing para consultorio de psicología con asistente IA",
      nivelLabel: "Profesional",
      precio_min: 15260,
      precio_max: 18260,
      tiempo_estimado: "10-15 días de desarrollo",
      giro: "Médico / clínica",
      punto_venta: "Un asistente responde dudas y agenda citas 24/7, con calidez y privacidad.",
    },
  },
];

function buildAnalysis(s: Scenario, registro?: PackRegistro): PromptAnalysis {
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
    codigo: registro?.codigo,
    slugVercel: registro?.slugVercel ? `https://${registro.slugVercel}.vercel.app` : undefined,
    repoGitHub: registro?.repoGitHub ? `https://github.com/${registro.repoGitHub}` : undefined,
  } as PromptAnalysis;
}

const OUT_DIR = join(process.cwd(), "docs", "prompts");
mkdirSync(OUT_DIR, { recursive: true });

let generados = 0;

for (const s of SCENARIOS) {
  const registro = REGISTRO_PACKS[s.file];
  if (!registro) {
    console.warn(`⚠ Sin registro (código/URL) para ${s.file} — añádelo a REGISTRO_PACKS.`);
  }
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
    analysis: buildAnalysis(s, registro),
  });

  const path = join(OUT_DIR, s.file);
  writeFileSync(path, buildRegistroHeader(registro, s.file) + prompt, "utf8");
  generados++;
  console.log(`✓ ${s.file}${registro ? ` [${registro.codigo}]` : ""} (${(prompt.length / 1024).toFixed(1)} KB)`);
}

const indice = buildIndicePacks();
writeFileSync(join(OUT_DIR, "INDICE-PACKS.md"), indice, "utf8");
console.log(`\n${generados} packs generados en ${OUT_DIR} + INDICE-PACKS.md`);

/** Cabecera de registro que identifica el PACK en Vercel/GitHub (va antes del prompt). */
function buildRegistroHeader(registro: PackRegistro | undefined, file: string): string {
  if (!registro) return "";
  const desde = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(registro.desde);
  return [
    `> #️⃣ **REGISTRO · ${registro.codigo}** — identifica este PACK en Vercel / GitHub`,
    `>`,
    `> | Campo | Valor |`,
    `> |---|---|`,
    `> | Código | \`${registro.codigo}\` |`,
    `> | Producto | ${registro.nombre} |`,
    `> | Nivel | ${registro.nivel} |`,
    `> | Archivo | \`${file}\` |`,
    `> | URL Vercel | https://${registro.slugVercel}.vercel.app |`,
    `> | Repo GitHub | https://github.com/${registro.repoGitHub} |`,
    `> | Precio desde | ${desde} MXN |`,
    ``,
    ``,
  ].join("\n");
}

/** Índice maestro: "qué PACK es cuál" en Vercel/GitHub. Se regenera en cada corrida. */
function buildIndicePacks(): string {
  const desde = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
  const filas: string[] = [];
  for (const s of SCENARIOS) {
    const r = REGISTRO_PACKS[s.file];
    if (!r) continue;
    filas.push(`| ${r.codigo} | ${r.nombre} | \`${s.file}\` | ${r.nivel} | ${desde(r.desde)} | https://${r.slugVercel}.vercel.app | https://github.com/${r.repoGitHub} | ✅ Listo para deploy |`);
  }
  const servicios = SERVICIOS_SIN_PACK.map(
    (sv) => `| ${sv.codigo} | ${sv.nombre} | — | ${sv.nivel} | ${desde(sv.desde)} | — | — | 🛠 Servicio (sin PACK) |`
  );
  const todas = [...filas, ...servicios].sort((a, b) => {
    const aN = a.match(/^\| (PK-\d+)/)?.[1] ?? "";
    const bN = b.match(/^\| (PK-\d+)/)?.[1] ?? "";
    return aN.localeCompare(bN, undefined, { numeric: true });
  });
  const hoy = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  return `# 📇 ÍNDICE DE PACKS · Vitrina Nexora (qué página es cuál en Vercel / GitHub)

> Generado automáticamente por \`npx tsx scripts/generate-pack-samples.ts\` (${hoy}). No lo edites a mano:
> se regenera en cada corrida. Para registrar la URL REAL una vez desplegada, usa \`docs/prompts/REGISTRO-DEPLOY.md\`.

## 🔑 Cómo funciona el código

- Cada PACK tiene un **código único** \`PK-XXX\` que lo identifica en Vercel y GitHub.
- El código está **dentro del propio PACK** (bloque \`#️⃣ REGISTRO\` al inicio + fila "Código de registro" en la Ficha del proyecto).
- La **URL de Vercel propuesta** es \`https://{slug}.vercel.app\` (crea el proyecto en Vercel con ese slug exacto).
- El **repo de GitHub propuesto** es \`https://github.com/{repo}\` (crea el repo con ese nombre).
- Sigue la convención de nombres y el registro se mantiene exacto sin tocar nada más.

## 🚀 Qué hacer para desplegar (flujo rápido)

1. Crea el repo en GitHub con el nombre de la columna **Repo GitHub** y sube ahí el proyecto construido con su PACK.
2. Importa ese repo en Vercel → el proyecto se llama igual que el **slug** → la URL queda \`https://{slug}.vercel.app\`.
3. Marca el PACK como "desplegado" en \`docs/prompts/REGISTRO-DEPLOY.md\` (URL real + fecha) para llevar el control.
4. Opcional: cada PACK ya trae un **CHAT de despliegue** que construye, prueba y publica en Vercel automáticamente.

## 📋 Registro completo (${SCENARIOS.length} PACKs + ${SERVICIOS_SIN_PACK.length} servicio)

| Código | Producto | Archivo | Nivel | Desde | URL Vercel | Repo GitHub | Estado |
|---|---|---|---|---|---|---|---|
${todas.join("\n")}

## 📌 Notas

- **PK-005 Perfil Google Business** es un **servicio de setup** (no una web): se vende junto a cualquier landing, por eso no tiene PACK de prompts.
- **PK-029 Psicólogo** es una **demo extra** (landing con asistente IA) fuera del catálogo maestro de 28 tipos.
- Todos los PACKs regenerados pasan por \`npm run lint\` y \`npx tsc --noEmit\`; el contenido lo valida \`npm run test:regression\` (regla #7: motor = pack = PDF).
`;
}
