/**
 * CATÁLOGO DE PRECIOS (MXN)
 *
 * Cada categoría tiene:
 * - `base`: precio inicial según nivel
 * - `descripcionCliente`: lo que ve el cliente (lenguaje humano)
 * - `tiempo`: estimación de entrega
 *
 * El precio final = base(nivel) + sum(precios de características).
 * La IA (DeepSeek) se encarga de afinar el cálculo; este catálogo
 * también sirve de fallback si la API falla.
 */

import type { AnalysisResult, ChatContext } from "@/lib/types";
import { buildTechnicalPrompt } from "@/lib/prompt-builder";
import {
  adaptarCopyGiro,
  ajustarPrecio,
  detectarGiro,
  filtrarPorDeclinados,
  generarExplicacionPrecio,
  generarValorNegocio,
} from "@/lib/industry-pricing";
import { calcularTotalDeterminista } from "@/lib/quote-engine";
import { botsParaResultado, totalBotsMensual, totalBotsSetup } from "@/lib/bots-catalog";

export type Nivel = "basico" | "profesional" | "avanzado";

export interface PricingFeature {
  id: string;
  /** Cómo se describe la feature al cliente (lenguaje humano) */
  labelCliente: string;
  /** Precio aproximado en MXN */
  precio: number;
}

export interface PricingCategory {
  id: string;
  /** Categoría legible para la propuesta */
  nombreCliente: string;
  /** Cómo la detecta la IA (palabras clave) */
  keywords: string[];
  /** Precio base por nivel */
  base: Record<Nivel, number>;
  /** Tiempo estimado por nivel */
  tiempo: Record<Nivel, string>;
  /** Características que se suman según lo que pidió el cliente */
  features: PricingFeature[];
  /** Stack recomendado (tags legibles) */
  stack: string[];
  /** Entregables estándar */
  entregables: string[];
  /** Explicación breve del precio */
  explicacionPrecio: string;
}

export const PRICING_CATALOG: PricingCategory[] = [
  {
    id: "landing",
    nombreCliente: "Página de presentación para tu negocio",
    // OJO: "mostrar mi"/"presentar mi" (singular) NO van como keywords-frase:
    // son subcadenas de "mostrar mis"/"presentar mis" y hacían doble conteo
    // ("mostrar mis trabajos" casaba con AMBAS → inflaba landing en +2 y hacía
    // perder a portafolio con descripciones típicas de fotógrafo). La palabra
    // "mostrar"/"presentar" (sueltas) ya cubre el singular.
    // OJO 2: "tarjeta" NO va como keyword: "tarjeta digital"/"tarjeta de
    // presentación" son el producto de entrada tarjeta_digital (categoría
    // propia), y "tarjeta" aquí hacía empatar y perder a tarjeta_digital
    // (landing va primero en el catálogo y el empate favorece a landing).
    keywords: ["presentar", "presentación", "información", "servicios", "landing", "vitrina", "mostrar", "folleto", "curriculum", "cv", "profesional", "consultorio", "catálogo", "catalogo", "me encuentren", "que me encuentren", "página sencilla", "pagina sencilla", "página simple", "pagina simple", "mostrar mis", "presentar mis", "solo información", "solo informacion"],
    // Base alineada al motor determinista ($8,500) y al catálogo de la agencia
    // (regla #7 de AGENTS.md: UI, PDF, copy y fallback deben citar el MISMO total).
    base: { basico: 8500, profesional: 15000, avanzado: 25000 },
    tiempo: { basico: "3-5 días", profesional: "5-8 días", avanzado: "8-12 días" },
    features: [
      { id: "seo", labelCliente: "Que te encuentren en Google al buscar tu servicio", precio: 2500 },
      { id: "animaciones", labelCliente: "Diseño moderno con movimiento y detalles", precio: 2500 },
      { id: "mapas", labelCliente: "Mapa con tus sucursales o ubicación", precio: 1500 },
      { id: "chat", labelCliente: "Burbuja para que te escriban por WhatsApp", precio: 1000 },
      { id: "pwa", labelCliente: "Se puede instalar en el celular como app", precio: 3000 },
      { id: "multilingue", labelCliente: "Versión en inglés y español", precio: 3000 },
    ],
    stack: ["Next.js", "Tailwind CSS", "Vercel"],
    entregables: [
      "Diseño responsive (celular, tablet, escritorio)",
      "Formulario de contacto con envío a tu correo",
      "SEO básico en Google",
      "Guía para actualizar el contenido",
    ],
    explicacionPrecio:
      "Es una página enfocada en presentar tu negocio y captar contactos. El precio refleja el diseño a medida, la optimización para celular y el SEO para que te encuentren en Google.",
  },
  {
    id: "corporativo",
    nombreCliente: "Sitio corporativo (varias páginas)",
    // Nivel 2 · Negocio. Solo se detecta con señales CLARAS de sitio
    // multi-página/empresa ("constructora", "despacho", "quienes somos",
    // "varias secciones", "más de una página"...). NO se incluyen las palabras
    // genéricas sueltas ("empresa", "nosotros", "equipo") porque roban clientes
    // a landing ("una página para mi empresa" es, en la mayoría de los casos,
    // una landing). El conflicto con landing se resuelve en inferCategory:
    // landing va PRIMERO en el catálogo y los empates favorecen a landing.
    keywords: [
      "corporativo", "corporativa", "sitio corporativo", "web corporativa",
      "página corporativa", "pagina corporativa", "constructora", "despacho",
      "quienes somos", "quiénes somos", "varias secciones", "varias páginas",
      "varias paginas", "más de una página", "mas de una pagina",
      "multi-página", "multipagina", "multipágina", "nuestra empresa",
      "nuestro equipo", "equipo de trabajo", "sobre nosotros", "conócenos",
    ],
    base: { basico: 15000, profesional: 25000, avanzado: 40000 },
    tiempo: { basico: "7-10 días", profesional: "10-18 días", avanzado: "18-28 días" },
    features: [
      { id: "galeria_proyectos", labelCliente: "Galería de tus proyectos o trabajos", precio: 2500 },
      { id: "panel_contenido", labelCliente: "Panel para editar el contenido de tu web sin programar", precio: 4000 },
      { id: "seo", labelCliente: "Que te encuentren en Google al buscar tu servicio", precio: 2500 },
      { id: "multilingue", labelCliente: "Versión en inglés y español (u otros idiomas)", precio: 3000 },
      { id: "mapas", labelCliente: "Mapa con tus sucursales o ubicación", precio: 1500 },
      { id: "chat", labelCliente: "Burbuja para que te escriban por WhatsApp", precio: 1000 },
    ],
    stack: ["Next.js", "Tailwind CSS", "Supabase", "Vercel"],
    entregables: [
      "Diseño responsive (celular, tablet, escritorio)",
      "Varias páginas (Inicio, Nosotros, Servicios, Contacto…)",
      "Formulario de contacto con envío a tu correo",
      "SEO básico en Google",
      "Panel para editar el contenido (si lo contratas)",
    ],
    explicacionPrecio:
      "Es un sitio de varias páginas pensado para empresas que quieren proyectar autoridad: quienes somos, servicios, proyectos y contacto, cada sección con su diseño. El precio refleja más páginas, más contenido y un acabado más formal que una landing de una sola página.",
  },
  {
    id: "ecommerce",
    nombreCliente: "Tienda online con carrito y pagos",
    // OJO: "tienda", "vender" o "productos" SUELTOS no son ecommerce: una
    // "tienda de ropa que solo quiere que la encuentren" es una LANDING.
    // Solo cuentan señales de VENTA EN LÍNEA real: carrito, pagos, envíos,
    // "vender por internet", "tienda online", etc.
    keywords: [
      "tienda online", "tienda en linea", "tienda en línea",
      "vender en linea", "vender en línea", "vender por internet", "venta por internet",
      "venta online", "venta en linea", "venta en línea",
      "comprar en linea", "comprar en línea", "compras en linea", "compras en línea",
      "catalogo en linea", "catálogo en línea",
      "carrito", "checkout", "pasarela",
      "pago en linea", "pago en línea", "pagar en linea", "pagar en línea",
      "pagos en linea", "pagos en línea",
      "pedidos online", "pedidos en linea", "pedidos en línea", "hacer pedidos",
      "envio", "envíos", "envios", "shop", "mercancia", "mercancía",
      // Nivel 3 · Ecommerce "pro": señales que DETECTAN el escalón premium
      // (inventario, reportes de venta, facturación, mayoreo, multi-vendedor).
      // El ticket alto se alcanza por FEATURES acumuladas + nivel avanzado,
      // NUNCA inflando la base. OJO: "inventario"/"reportes" también son
      // keywords de webapp — el ecommerce solo gana si además hay señales de
      // venta en línea (carrito/pagos/"por internet"), y un "sistema" con
      // inventario sigue siendo webapp.
      "inventario", "existencias", "stock",
      "reportes de venta", "reportes de ventas",
      "facturar", "facturación", "facturacion", "factura", "facturas", "cfdi",
      "mayoreo", "varios vendedores", "multi-vendedor", "multivendedor",
    ],
    base: { basico: 20000, profesional: 35000, avanzado: 60000 },
    tiempo: { basico: "10-15 días", profesional: "15-25 días", avanzado: "25-40 días" },
    features: [
      { id: "pagos", labelCliente: "Pagos con tarjeta o transferencia (Stripe / PayPal)", precio: 8000 },
      { id: "autenticacion", labelCliente: "Clientes con cuenta para ver su historial", precio: 5000 },
      { id: "dashboard", labelCliente: "Panel para ti donde ves pedidos y ventas", precio: 8000 },
      { id: "envios", labelCliente: "Cálculo de envío por código postal", precio: 3500 },
      { id: "facturacion", labelCliente: "Generación de facturas o recibos", precio: 4000 },
      { id: "seo", labelCliente: "Optimización para aparecer en Google", precio: 3000 },
      { id: "pwa", labelCliente: "Instalable en el celular como app", precio: 4000 },
      // ── Nivel 3 · Ecommerce "pro" (escalón premium) ──
      // Se alcanza por FEATURES acumuladas + nivel avanzado (inferNivel), nunca
      // con categoría duplicada ni inflando la base. Se activan con señales
      // pasivas del cliente (lib/conversation-flow.ts SIGNAL_PATTERNS).
      { id: "inventario_avanzado", labelCliente: "Control de inventario avanzado (existencias, tallas, colores y alertas de stock bajo)", precio: 6000 },
      { id: "reportes_ventas", labelCliente: "Reportes de ventas (qué vendes más, por día, mes o producto)", precio: 4000 },
      { id: "facturacion_cfdi", labelCliente: "Facturación CFDI (facturas fiscales con RFC para tus clientes)", precio: 5000 },
      { id: "multi_vendedor", labelCliente: "Varios vendedores internos con sus propias cuentas", precio: 8000 },
    ],
    stack: ["Next.js", "Supabase", "Stripe", "Tailwind CSS"],
    entregables: [
      "Catálogo de productos con fotos y precios",
      "Carrito de compras funcional",
      "Pasarela de pagos integrada",
      "Panel para administrar pedidos",
      "Notificaciones de nueva venta",
    ],
    explicacionPrecio:
      "Una tienda online implica carrito, pagos seguros, panel de pedidos y base de datos. Es de los proyectos más completos y por eso el precio es mayor: son muchas piezas trabajando juntas.",
  },
  {
    id: "citas",
    nombreCliente: "Sistema de citas y reservaciones",
    keywords: ["cita", "citas", "agendar", "reservar", "reserva", "horario", "turno", "consultas", "agenda", "barbero", "dentista", "estética", "clinica", "consulta", "peluquería", "salon", "doctor", "doctora", "masaje", "spa"],
    base: { basico: 15000, profesional: 28000, avanzado: 45000 },
    tiempo: { basico: "7-10 días", profesional: "10-18 días", avanzado: "18-28 días" },
    features: [
      // Nivel 3 · Citas con pago por adelantado: la feature "pagos" ya cobra
      // al reservar (labelCliente comunica el "pagan al reservar"); aquí se
      // añade la política de cancelación para reforzar el anti no-show.
      { id: "pagos", labelCliente: "Pago por adelantado al reservar", precio: 6000 },
      { id: "politica_cancelacion", labelCliente: "Política de cancelación y reagendado en línea (para no perder citas)", precio: 1500 },
      { id: "autenticacion", labelCliente: "Clientes con cuenta y su historial de citas", precio: 4500 },
      { id: "dashboard", labelCliente: "Panel donde ves todas tus citas del día", precio: 6000 },
      { id: "recordatorios", labelCliente: "Recordatorios automáticos por correo o WhatsApp", precio: 3500 },
      { id: "mapas", labelCliente: "Mapa con tu ubicación para llegar", precio: 1200 },
      { id: "pwa", labelCliente: "Instalable en el celular como app", precio: 3500 },
    ],
    stack: ["Next.js", "Supabase", "Tailwind CSS", "Cal.com (opcional)"],
    entregables: [
      "Calendario donde el cliente elige día y hora",
      "Confirmaciones automáticas por correo",
      "Panel para administrar agenda y citas",
      "Bloqueo automático de horarios ocupados",
    ],
    explicacionPrecio:
      "Un sistema de citas ahorra muchísimas llamadas y WhatsApp perdidos. Incluye calendario en línea, confirmaciones automáticas y un panel para ti. El precio crece si quieres cobro por adelantado o cuentas de clientes.",
  },
  {
    id: "webapp",
    nombreCliente: "Plataforma o sistema web a medida",
    keywords: ["sistema", "plataforma", "panel", "dashboard", "administrar", "gestión", "gestionar", "base de datos", "reportes", "inventario", "clientes", "empleados", "usuarios", "app", "aplicación", "control", "registro", "intranet", "crud", "herramienta"],
    base: { basico: 25000, profesional: 45000, avanzado: 80000 },
    tiempo: { basico: "10-15 días", profesional: "15-30 días", avanzado: "30-60 días" },
    features: [
      { id: "autenticacion", labelCliente: "Usuarios con roles (admin, empleado, cliente)", precio: 6000 },
      { id: "dashboard", labelCliente: "Panel de control con estadísticas", precio: 7000 },
      { id: "documentos", labelCliente: "Generación de PDFs (cotizaciones, reportes)", precio: 5000 },
      { id: "pagos", labelCliente: "Cobros integrados a la plataforma", precio: 7000 },
      { id: "chat", labelCliente: "Mensajería interna entre usuarios", precio: 6000 },
      { id: "mapas", labelCliente: "Mapas con ubicaciones o rutas", precio: 2500 },
      { id: "seo", labelCliente: "Optimización para buscadores", precio: 2500 },
      { id: "pwa", labelCliente: "Instalable en el celular como app", precio: 4500 },
      // ── Nivel 4 · Plataformas por vertical (señales pasivas en conversation-flow) ──
      // Cada vertical (inmobiliaria, membresías, cursos, telemedicina, directorio)
      // tiene sus features específicas: se activan SOLO si el cliente menciona la
      // señal y suben el ticket por FEATURES acumuladas + nivel avanzado
      // (inferNivel), nunca inflando la base. Se mapean desde localFallback
      // (openrouter.ts) cuando categoryId === "webapp".
      { id: "filtros_inmobiliaria", labelCliente: "Filtros por zona y precio para buscar propiedades", precio: 4000 },
      { id: "leads_propiedad", labelCliente: "Formulario de interés por cada propiedad (leads de compradores)", precio: 3500 },
      { id: "panel_publicacion", labelCliente: "Panel para publicar propiedades sin programar", precio: 5000 },
      { id: "cobro_recurrente", labelCliente: "Cobro recurrente automático de la membresía (Stripe)", precio: 6000 },
      { id: "area_privada", labelCliente: "Área privada para tus miembros", precio: 4500 },
      { id: "gestion_planes", labelCliente: "Gestión de planes y suscripciones", precio: 4000 },
      { id: "reportes_retencion", labelCliente: "Reportes de retención de miembros", precio: 3000 },
      { id: "lecciones_video", labelCliente: "Lecciones en video", precio: 5000 },
      { id: "progreso_alumno", labelCliente: "Progreso del alumno en cada curso", precio: 3500 },
      { id: "certificado", labelCliente: "Certificados al completar el curso", precio: 2500 },
      { id: "comunidad_foros", labelCliente: "Comunidad y foros para tus alumnos", precio: 5000 },
      { id: "expediente_paciente", labelCliente: "Expediente digital del paciente", precio: 6000 },
      { id: "videollamada", labelCliente: "Videollamada para consultas en línea", precio: 8000 },
      { id: "recetas", labelCliente: "Recetas electrónicas", precio: 3000 },
      { id: "fichas_autogestionables", labelCliente: "Fichas autogestionables por cada negocio", precio: 5000 },
      { id: "busqueda_mapa", labelCliente: "Búsqueda y mapa del directorio", precio: 3500 },
      { id: "pagos_ficha_premium", labelCliente: "Pagos por ficha premium del directorio", precio: 6000 },
      // ── Nivel 5 · Ecosistema (marketplace, SaaS, ERP/CRM) ──
      // Proyectos de $40k-$90k+: se detectan con señales pasivas
      // (marketplace/saas/erp en conversation-flow) y suben el ticket por
      // FEATURES acumuladas + nivel avanzado (inferNivel), nunca inflando la
      // base. El bot las CALIFICA (webapp + "desde" honesto) y NO promete un
      // precio cerrado en el chat: se cotizan con propuesta formal detallada
      // (ver buildRecap y compactContext de chat-llm). Se mapean desde
      // localFallback (openrouter.ts) cuando categoryId === "webapp".
      { id: "split_pagos", labelCliente: "Split de pagos / escrow (cada vendedor recibe su parte al vender)", precio: 12000 },
      { id: "multi_tenant", labelCliente: "Multi-tenant: cada cliente con sus datos aislados", precio: 15000 },
      { id: "planes_billing", labelCliente: "Planes y facturación automática (billing)", precio: 10000 },
      { id: "api_publica", labelCliente: "API pública para integrar tu plataforma con otros sistemas", precio: 10000 },
      { id: "modulo_compras", labelCliente: "Módulo de compras (órdenes y proveedores)", precio: 12000 },
      { id: "modulo_ventas", labelCliente: "Módulo de ventas (clientes y facturación)", precio: 12000 },
      { id: "modulo_almacen", labelCliente: "Módulo de almacén (existencias y movimientos)", precio: 12000 },
      { id: "modulo_nomina", labelCliente: "Módulo de nómina (empleados y pagos)", precio: 12000 },
      { id: "integracion_contable", labelCliente: "Integraciones contables (CONTPAQi, Aspel, etc.)", precio: 15000 },
      { id: "reportes_ejecutivos", labelCliente: "Reportes ejecutivos (ventas, costos, rentabilidad)", precio: 10000 },
    ],
    stack: ["Next.js", "Supabase / PostgreSQL", "Tailwind CSS", "shadcn/ui"],
    entregables: [
      "Sistema web a la medida de tu proceso",
      "Panel de administración",
      "Base de datos segura",
      "Capacitación para tu equipo",
    ],
    explicacionPrecio:
      "Los sistemas a medida se cotizan por el trabajo de lógica y datos que llevan detrás. Cada módulo (usuarios, reportes, pagos) suma horas de desarrollo real, y por eso el precio se ajusta al alcance exacto.",
  },
  {
    id: "blog",
    nombreCliente: "Blog o sitio de contenido",
    keywords: ["blog", "noticias", "articulos", "contenido", "escribir", "publicaciones", "post", "revista", "newsletter", "boletin"],
    base: { basico: 9000, profesional: 16000, avanzado: 25000 },
    tiempo: { basico: "5-7 días", profesional: "7-12 días", avanzado: "12-18 días" },
    features: [
      { id: "seo", labelCliente: "Optimización completa para Google", precio: 3000 },
      { id: "autenticacion", labelCliente: "Área de autores con permisos", precio: 4000 },
      { id: "newsletter", labelCliente: "Suscripción a boletín por correo", precio: 2500 },
      { id: "pwa", labelCliente: "Instalable en el celular como app", precio: 3000 },
    ],
    stack: ["Next.js", "Supabase", "Tailwind CSS"],
    entregables: [
      "Publicación de artículos desde un panel sencillo",
      "Diseño optimizado para lectura en celular",
      "SEO para posicionar tus artículos",
      "Búsqueda y categorías",
    ],
    explicacionPrecio:
      "Un blog con panel de publicación y SEO bien hecho tiene su chiste: el precio cubre el editor amigable, la velocidad de carga y que Google te encuentre con tus artículos.",
  },
  {
    id: "portafolio",
    nombreCliente: "Portafolio profesional",
    keywords: ["portafolio", "portfolio", "trabajos", "proyectos", "fotógrafo", "fotografo", "fotógrafa", "fotografa", "diseñador", "diseñadora", "disenador", "disenadora", "arquitecto", "arquitecta", "artista", "freelance", "muestras", "galeria", "galería"],
    base: { basico: 7000, profesional: 13000, avanzado: 22000 },
    tiempo: { basico: "4-6 días", profesional: "6-10 días", avanzado: "10-15 días" },
    features: [
      { id: "animaciones", labelCliente: "Galería con transiciones y efectos", precio: 3000 },
      { id: "seo", labelCliente: "Optimización para aparecer en Google", precio: 2000 },
      { id: "chat", labelCliente: "Contacto directo por WhatsApp", precio: 800 },
      { id: "multilingue", labelCliente: "Versión en varios idiomas", precio: 2500 },
    ],
    stack: ["Next.js", "Tailwind CSS", "Framer Motion", "Vercel"],
    entregables: [
      "Galería de proyectos o trabajos",
      "Diseño visual impactante",
      "Formulario de contacto",
      "Optimizado para celular",
    ],
    explicacionPrecio:
      "Un portafolio es tu carta de presentación: el precio refleja el diseño cuidado, las animaciones y que se vea impecable en cualquier dispositivo.",
  },
  {
    id: "menu_digital",
    nombreCliente: "Menú digital con código QR",
    // OJO: NO incluir "menú"/"carta" sueltos como keywords regulares: se
    // cuentan SOLO vía el bonus de inferCategory cuando hay señal de comida
    // (restaurante/cafetería...) para no robarle clientes a landing ni activar
    // ecommerce. Aquí solo van las frases explícitas de menú digital/QR.
    keywords: [
      "menú digital", "menu digital", "carta digital", "menú con qr", "menu con qr",
      "código qr", "codigo qr", "que escaneen", "escanear", "vean mi carta",
    ],
    base: { basico: 3500, profesional: 6000, avanzado: 9000 },
    tiempo: { basico: "2-4 días", profesional: "3-6 días", avanzado: "5-8 días" },
    features: [
      { id: "promociones", labelCliente: "Sección de promociones del día", precio: 800 },
      { id: "pedido_whatsapp", labelCliente: "Pedido directo por WhatsApp desde el menú", precio: 1000 },
      { id: "multilingue", labelCliente: "Menú en varios idiomas", precio: 1500 },
    ],
    stack: ["Next.js", "Tailwind CSS", "Vercel"],
    entregables: [
      "Menú digital con código QR para cada mesa",
      "QR imprimible para mesas y vidriera",
      "Fotos y precios de tu carta que se actualizan solos",
      "Se ve perfecto en el celular del comensal",
    ],
    explicacionPrecio:
      "Es el menú de tu negocio en línea: el comensal escanea el QR de la mesa y ve tu carta al instante, sin apps ni descargas. El precio refleja el diseño, el QR y que puedas actualizar precios y promociones cuando quieras.",
  },
  {
    id: "tarjeta_digital",
    nombreCliente: "Tarjeta digital / minisitio",
    keywords: [
      "tarjeta digital", "tarjeta de presentación", "tarjeta de presentacion",
      "minisitio", "mini sitio", "compartir mi información", "compartir mi informacion",
      "mi información en un link", "mi informacion en un link",
    ],
    base: { basico: 3500, profesional: 6000, avanzado: 9000 },
    tiempo: { basico: "2-4 días", profesional: "3-6 días", avanzado: "5-8 días" },
    features: [
      { id: "chat", labelCliente: "Botón de WhatsApp para que te escriban directo", precio: 500 },
      { id: "mapas", labelCliente: "Mapa con tu ubicación para llegar", precio: 800 },
      { id: "galeria", labelCliente: "Galería de tus trabajos", precio: 1000 },
    ],
    stack: ["Next.js", "Tailwind CSS", "Vercel"],
    entregables: [
      "Tu tarjeta digital con tu información de contacto",
      "Botón de WhatsApp y tus redes sociales",
      "Link corto para compartir por WhatsApp",
      "Se ve profesional en cualquier celular",
    ],
    explicacionPrecio:
      "Es como tu tarjeta de presentación, pero en línea: compartes un link y la persona ve tu información, tus servicios y tu WhatsApp al instante. Perfecto para profesionistas y oficios que hoy comparten su info de palabra.",
  },
  {
    id: "link_in_bio",
    nombreCliente: "Página de enlaces (link-in-bio)",
    keywords: [
      "link en mi bio", "link de instagram", "links de mis redes", "link in bio",
      "mis enlaces", "enlaces de mis redes", "una página con mis enlaces",
      "una pagina con mis enlaces",
    ],
    base: { basico: 2500, profesional: 4500, avanzado: 7000 },
    tiempo: { basico: "1-2 días", profesional: "2-3 días", avanzado: "3-5 días" },
    features: [
      { id: "qr", labelCliente: "QR físico para compartir tu página", precio: 500 },
      { id: "mini_catalogo", labelCliente: "Mini-catálogo con fotos de tus productos o servicios", precio: 1000 },
    ],
    stack: ["Next.js", "Tailwind CSS", "Vercel"],
    entregables: [
      "Una página con todos tus enlaces (WhatsApp, Instagram, TikTok…)",
      "Diseño a tu marca",
      "Link corto para poner en tu bio",
    ],
    explicacionPrecio:
      "Es la página donde viven todos tus enlaces: pones el link en tu bio de Instagram o TikTok y la gente encuentra tu WhatsApp, tus redes y tus servicios en un solo lugar. Rápido de entregar y con tu estilo.",
  },
  {
    id: "cotizador",
    nombreCliente: "Cotizador / presupuesto en línea",
    keywords: [
      "cotizador", "cotización en línea", "cotizacion en linea", "presupuesto en línea",
      "presupuesto en linea", "que me pidan cotización", "que me pidan cotizacion",
      "que cotice", "pedir cotización", "pedir cotizacion", "pedir presupuesto",
      "calculadora", "cuánto cuesta mi servicio", "cuanto cuesta mi servicio",
    ],
    base: { basico: 15000, profesional: 25000, avanzado: 40000 },
    tiempo: { basico: "8-12 días", profesional: "12-20 días", avanzado: "20-30 días" },
    features: [
      { id: "formulario_multipaso", labelCliente: "Formulario multi-paso para que tus clientes pidan su cotización", precio: 3000 },
      { id: "calculo_automatico", labelCliente: "Cálculo automático del precio según lo que eligen", precio: 3500 },
      { id: "pdf_cotizacion", labelCliente: "PDF de cotización que se genera solo", precio: 2000 },
      { id: "notificacion_whatsapp", labelCliente: "Te llega la cotización por WhatsApp al instante", precio: 1500 },
    ],
    stack: ["Next.js", "Supabase", "Tailwind CSS", "Vercel"],
    entregables: [
      "Formulario donde tu cliente describe lo que necesita",
      "Cálculo automático del precio en línea",
      "PDF de cotización listo para enviar",
      "Aviso por WhatsApp cuando alguien pide una cotización",
    ],
    explicacionPrecio:
      "Es un sistema para que tus clientes te pidan presupuesto en línea: llenan un formulario, el sistema calcula el precio solo y te llega el aviso. Es como el bot que estás usando, pero para tu negocio.",
  },
];

// ─── Características "universales" que aplican a cualquier categoría ─

export const UNIVERSAL_FEATURES: PricingFeature[] = [
  { id: "mantenimiento", labelCliente: "Mantenimiento mensual (actualizaciones y soporte)", precio: 1500 },
];

// ─── Helpers ────────────────────────────────────────────────────────

/** Busca una categoría por id */
export function getCategoryById(id: string): PricingCategory | undefined {
  return PRICING_CATALOG.find((c) => c.id === id);
}

/** Normaliza texto para búsqueda de keywords */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Infiere una categoría a partir de un texto libre (descripción del negocio).
 * Devuelve la categoría con más coincidencias de keywords.
 *
 * Las keywords se comparan como PALABRA COMPLETA (con límites), no como
 * subcadena: evita falsos positivos como "WhatsApp" → "app" (webapp),
 * "curso" → "cv" (landing) o "solicitado" → "cita" (citas).
 */
export function inferCategory(text: string): string {
  const t = normalize(text);

  // Frases (con espacio) → subcadena exacta; palabras sueltas → palabra completa.
  const hasKw = (kw: string): boolean => {
    const nkw = normalize(kw);
    if (nkw.includes(" ")) return t.includes(nkw);
    return new RegExp(`(^|[^a-z0-9])${nkw}([^a-z0-9]|$)`).test(t);
  };

  // Nivel 4 · Plataformas por vertical: una señal de PORTAL clara es casi
  // decisiva → webapp. Solo una petición explícita de "página sencilla/simple/
  // presentación" la supera (el cliente quiere algo simple, no una plataforma).
  // Esto evita el empate frágil con keywords genéricas de categorías tempranas
  // ("clínica"/"consultas"/"doctor" de citas, "información" de landing) que el
  // bonus de +1.0 del loop NO supera con `score > bestScore` (trampa conocida:
  // 1.0 no es > 1 en JS y el empate favorece a la categoría que va primero).
  const VERTICAL_PLATFORM_RE =
    /(portal de (propiedades|bienes ra[ií]ces|membres[ií]as|miembros|socios|cursos|clases|salud|m[eé]dico)|plataforma de (cursos|clases|educaci[oó]n|estudio)|cursos? en l[ií]nea|clases en l[ií]nea|lecciones? (en v[ií]deo|en video)|telemedicina|expediente (del|de mi|de tus|de los) paciente|videollamada|recetas (electr[oó]nicas|en l[ií]nea)|consultas (m[eé]dicas )?en l[ií]nea|directorio de (negocios|empresas|comercios|asociados)|listado de (negocios|empresas|comercios)|c[áa]mara de comercio)/;
  // Nivel 5 · Ecosistema: señales EXPLÍCITAS de marketplace, SaaS y ERP/CRM
  // a medida. Igual que las verticales del nivel 4, son casi decisivas → webapp.
  // OJO: "varios vendedores" suelto NO es decisivo aquí (también es ecommerce
  // pro); solo cuenta con contexto de marketplace (que publiquen/vendan, cada
  // vendedor, comisión). "facturación"/"inventario" sueltos tampoco (son de
  // ecommerce pro/webapp); el ERP se detecta con su contexto (módulos, almacén,
  // nómina, logística).
  const NIVEL5_ECOSYSTEM_RE =
    /(marketplace|mercado en l[ií]nea|comisi[oó]n por (venta|ventas)|cobrar(le)? (una )?comisi[oó]n|plataforma de (ventas?|vendedores|mercado)|varios vendedores (que )?(publiquen|vendan|venden)|cada vendedor (vende|publica|tiene su)|software como servicio|\bsaas\b|plataforma para (mis|tus|sus|los) clientes|plataforma b2b|multi-?tenant|\berp\b|\bcrm\b|control de almac[eé]n|m[oó]dulos? de (compras|ventas|almac[eé]n|n[oó]mina)|sistema de n[oó]mina|log[ií]stica de (env[ií]os|mercanc[ií]a|pedidos))/;
  const SIMPLE_PAGE_RE =
    /(p[aá]gina sencilla|p[aá]gina simple|algo sencillo|solo informaci[oó]n|solo lo b[aá]sico|lo b[aá]sico|p[aá]gina de presentaci[oó]n|de presentaci[oó]n)/;
  if ((VERTICAL_PLATFORM_RE.test(t) || NIVEL5_ECOSYSTEM_RE.test(t)) && !SIMPLE_PAGE_RE.test(t)) return "webapp";

  let best: PricingCategory | null = null;
  let bestScore = 0;

  for (const cat of PRICING_CATALOG) {
    // Dedupe por forma normalizada: "articulos" y "artículos" son la misma
    // palabra y no deben contar doble.
    const matched = new Set<string>();
    for (const kw of cat.keywords) {
      if (hasKw(kw)) matched.add(normalize(kw));
    }
    let score = matched.size;
    // Señal EXPLÍCITA de citas/agenda: pesa más que el bonus genérico de landing
    // ("me encuentren", "presentación"...). Antes era +0.5 y un negocio que pedía
    // "agenden sus citas en línea Y que me encuentren en Google" empataba con
    // landing (2.5 vs 2.5) y perdía por ser el primero de la lista.
    if (cat.id === "citas" && /\b(agendar|agenda|citas?|reservar|horario)\b/.test(t)) score += 1.0;
    // +0.5 si hay señales claras de VENTA EN LÍNEA (carrito, pagos, envíos, "por internet")
    if (
      cat.id === "ecommerce" &&
      /(vender\s+(en linea|en línea|por internet|mi|mis|tus)|vendo\s+(en linea|en línea|por internet|mi|mis|tus)|comprar\s+(en linea|en línea|online)|compras\s+(en linea|en línea|online)|tienda\s+(online|en linea|en línea)|carrito|checkout|pasarela|pagar\s+(en linea|en línea|online)|pago\s+(en linea|en línea|online)|pagos?\s+(en linea|en línea|online)|pedidos?\s+(online|en linea|en línea)|hacer\s+pedidos|env[ií]os|shop\s+online)/.test(t)
    )
      score += 0.5;
    // Señal EXPLÍCITA de portafolio/galería: supera los genéricos de landing
    // ("mostrar", "profesional") que casi todo negocio usa en su descripción.
    if (cat.id === "portafolio" && /\b(portafolio|portfolio|galer[ií]a|muestras?)\b/.test(t)) score += 1.0;
    // Menú digital: solo gana con frases explícitas de menú QR, o con
    // "menú"/"carta" sueltos ACOMPAÑADOS de señal de restaurante/comida
    // (regla del mercado: un menú no debe activar ecommerce ni landing).
    if (
      cat.id === "menu_digital" &&
      (/(men[uú] digital|menu digital|carta digital|men[uú] con (el )?qr|c[oó]digo qr|codigo qr|que escaneen|escanear|vean mi carta)/.test(t) ||
        (/\b(men[uú]|carta)\b/.test(t) &&
          /(restaurante|cafeter[ií]a|caf[eé]|comida|taquer[ií]a|pizzer[ií]a|hamburgues|bar\b|food\s*truck|bistro|cocina|marisquer|tacos|antojitos|loncher)/.test(t)))
    )
      score += 1.0;
    // Tarjeta digital: señal explícita de tarjeta/minisitio supera los
    // genéricos de landing ("tarjeta", "información", "profesional").
    if (
      cat.id === "tarjeta_digital" &&
      /(tarjeta digital|tarjeta de presentaci[oó]n|minisitio|mini sitio|compartir mi informaci[oó]n|mi informaci[oó]n en un link)/.test(t)
    )
      score += 1.0;
    // Link-in-bio: señal explícita de enlaces/bio.
    if (
      cat.id === "link_in_bio" &&
      /(link en mi bio|link de instagram|links? de mis redes|link in bio|mis enlaces|enlaces de mis redes|una p[aá]gina con mis enlaces)/.test(t)
    )
      score += 1.0;
    // Cotizador en línea (flagship): señal explícita de que pidan presupuesto.
    if (
      cat.id === "cotizador" &&
      /(cotizador|cotizaci[oó]n en l[ií]nea|presupuesto en l[ií]nea|que me pidan cotizaci[oó]n|que cotice|pedir cotizaci[oó]n|pedir presupuesto|calculadora|cu[aá]nto cuesta mi servicio)/.test(t)
    )
      score += 1.0;
    // +0.5 si pide algo sencillo de presentación/catálogo (empates favorecen a landing)
    if (
      cat.id === "landing" &&
      (/\b(catálogo|catalogo|presentación|presentacion|presentar|mostrar|me encuentren|que me encuentren|página sencilla|pagina sencilla|página simple|pagina simple|vitrina|solo información|solo informacion|básic|basic)\b/.test(t) ||
        /no muy caro|no tan caro|algo sencillo|algo básico|algo basico/.test(t))
    )
      score += 0.5;
    // Corporativo (nivel 2): señales explícitas de sitio multi-página/empresa
    // pesan más que los genéricos de landing ("presentación", "mostrar"): un
    // despacho o una constructora que pide "quienes somos" + "varias secciones"
    // es un sitio corporativo, no una landing de una página. El empate con
    // landing sigue favoreciendo a landing (va primero en el catálogo).
    if (
      cat.id === "corporativo" &&
      /(corporativ|constructora|despacho|varias secciones|v[aá]s de una p[aá]gina|varias p[aá]ginas|quienes somos|qui[eé]nes somos|nuestra empresa|nuestro equipo|sobre nosotros|con[oó]cenos|multi-?p[aá]gina|sitio corporativ|web corporativ)/.test(t)
    )
      score += 1.0;
    // Nivel 4 · Plataformas por vertical → webapp. Señales EXPLÍCITAS de portal/
    // sistema por vertical (inmobiliaria, membresías, cursos, telemedicina,
    // directorio). NO se usan palabras sueltas genéricas ("gimnasio", "curso",
    // "clases", "pacientes") para no robarle landings/citas a negocios que solo
    // quieren una página de presentación (regla "sin romper los casos actuales":
    // un gimnasio que pide "que la gente vea los horarios y me llame" es LANDING).
    if (
      cat.id === "webapp" &&
      /(portal de (propiedades|bienes ra[ií]ces)|propiedades|inmobiliaria|bienes ra[ií]ces|casas? (en venta|en renta)|departamentos? (en venta|en renta)|terrenos? (en venta|en renta)|vender propiedades|filtros? por (zona|precio) (para|de) (las |mis )?propiedades)/.test(t)
    )
      score += 1.0;
    if (
      cat.id === "webapp" &&
      /(membres[ií]a|membres[ií]as|suscripci[oó]n|suscripciones|pago recurrente|cobro recurrente|cuota mensual|plan(es)? de membres[ií]a|portal de (miembros|socios|membres[ií]as)|[aá]rea de (miembros|socios)|ingreso recurrente)/.test(t)
    )
      score += 1.0;
    if (
      cat.id === "webapp" &&
      /(plataforma de (cursos|clases|educaci[oó]n|estudio)|cursos en l[ií]nea|curso en l[ií]nea|clases en l[ií]nea|lecciones? (en v[ií]deo|en video)|vender mis (cursos|clases)|portal de cursos|plataforma educativa|educaci[oó]n en l[ií]nea|alumnos)/.test(t)
    )
      score += 1.0;
    if (
      cat.id === "webapp" &&
      /(telemedicina|expediente (del|de mi|de tus|de los) paciente|expedientes cl[ií]nicos|historia cl[ií]nica|videollamada|video-?llamada|recetas (electr[oó]nicas|en l[ií]nea)|consultas (m[eé]dicas )?en l[ií]nea|portal de salud|portal m[eé]dico)/.test(t)
    )
      score += 1.0;
    if (
      cat.id === "webapp" &&
      /(directorio|directorios|listado de (negocios|empresas|comercios)|directorio de (negocios|empresas|comercios|asociados)|fichas? de (negocios|empresas|comercios)|asociaci[oó]n de (negocios|comercios)|c[áa]mara de comercio)/.test(t)
    )
      score += 1.0;
    // Nivel 5 · Ecosistema → webapp (marketplace, SaaS, ERP/CRM). Señales
    // EXPLÍCITAS de plataforma grande, mismo patrón que las verticales del
    // nivel 4: son webapp con features de nivel 5, no categorías nuevas.
    // OJO: "varios vendedores" suelto no basta aquí (es ecommerce pro); solo
    // con contexto de marketplace (que publiquen/vendan, cada vendedor,
    // comisión). Y "facturación"/"inventario" sueltos NO van (son ecommerce
    // pro/webapp); el ERP se detecta con su contexto (módulos, almacén,
    // nómina, logística).
    if (
      cat.id === "webapp" &&
      /(marketplace|mercado en l[ií]nea|varios vendedores (que )?(publiquen|vendan|venden)|cada vendedor (vende|publica|tiene su)|comisi[oó]n por (venta|ventas)|cobrar(le)? (una )?comisi[oó]n|plataforma de (ventas?|vendedores|mercado)|que (otros|varios) (vendedores )?vendan)/.test(t)
    )
      score += 1.0;
    if (
      cat.id === "webapp" &&
      /(software como servicio|\bsaas\b|plataforma para (mis|tus|sus|los) clientes|plataforma b2b|multi-?tenant|ofrecer(les)? (un )?(servicio|software|sistema) a (mis|tus|sus) clientes|plataforma de suscripci[oó]n)/.test(t)
    )
      score += 1.0;
    if (
      cat.id === "webapp" &&
      /(\berp\b|\bcrm\b|control de almac[eé]n|m[oó]dulos? de (compras|ventas|almac[eé]n|n[oó]mina)|sistema de n[oó]mina|control de n[oó]mina|log[ií]stica de (env[ií]os|mercanc[ií]a|pedidos)|gestionar (toda|toda la|mi|la) operaci[oó]n|control de inventario y (compras|ventas))/.test(t)
    )
      score += 1.0;
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  if (!best || bestScore === 0) return "landing";
  return best.id;
}

/**
 * Resuelve la categoría FINAL considerando lo que el cliente DECLINÓ durante
 * la conversación (no solo lo inferido del texto):
 * - "ecommerce" sin pagos en línea → no es una tienda online real, es una
 *   landing con catálogo (evita cobrar $20,300 por una página básica).
 * - "webapp" sin panel, sin base de datos y sin login → no es plataforma.
 */
export function resolverCategoria(
  ctx: Pick<
    ChatContext,
    "category" | "pagos" | "dashboard" | "baseDeDatos" | "autenticacion" | "citas"
  >
): string | null {
  const cat = ctx.category;
  if (!cat) return null;
  if (cat === "ecommerce" && ctx.pagos === false) return "landing";
  if (
    cat === "webapp" &&
    ctx.dashboard === false &&
    ctx.baseDeDatos === false &&
    ctx.autenticacion === false
  )
    return "landing";
  // "citas" sin citas (el cliente las rechazó al confirmar) no es un sistema
  // de citas: es una landing de presentación.
  if (cat === "citas" && ctx.citas === false) return "landing";
  return cat;
}

/** Nivel por cantidad de features activas */
export function inferNivel(activeFeatureIds: string[]): Nivel {
  const count = activeFeatureIds.length;
  if (count <= 1) return "basico";
  if (count <= 4) return "profesional";
  return "avanzado";
}

/**
 * Calcula un precio aproximado (fallback local) a partir del contexto.
 * Se usa si la API de DeepSeek falla.
 */
export function estimatePrice(
  categoryId: string,
  activeFeatureIds: string[],
  nivel?: Nivel
): { precio_min: number; precio_max: number; nivel: Nivel } {
  const cat = getCategoryById(categoryId) ?? PRICING_CATALOG[0];
  const lvl = nivel ?? inferNivel(activeFeatureIds);

  let featuresTotal = 0;
  for (const id of activeFeatureIds) {
    const f = cat.features.find((x) => x.id === id);
    if (f) featuresTotal += f.precio;
  }

  const base = cat.base[lvl];
  const min = base + Math.round(featuresTotal * 0.9);
  const max = base + Math.round(featuresTotal * 1.15);

  return { precio_min: min, precio_max: max, nivel: lvl };
}

/** Genera una propuesta de respaldo completa (sin IA) */
export function buildFallbackProposal(
  categoryId: string,
  activeFeatureIds: string[],
  clientName: string,
  context: ChatContext
) {
  // La categoría final considera lo que el cliente DECLINÓ (p.ej. una
  // "tienda de ropa" que no quiere pagos en línea es una landing, no ecommerce).
  const categoryIdResuelto = resolverCategoria(context) ?? categoryId;
  const cat = getCategoryById(categoryIdResuelto) ?? PRICING_CATALOG[0];
  const giro = detectarGiro(context.negocioDescripcion, categoryIdResuelto);
  // Copy adaptado a las funciones que el cliente realmente declinó
  const copy = adaptarCopyGiro(giro, context);

  // Estimado técnico + ajuste al presupuesto del giro (con gancho)
  const { precio_min: estMin, precio_max: estMax, nivel } = estimatePrice(categoryIdResuelto, activeFeatureIds);
  const ajustado = ajustarPrecio(estMin, estMax, giro);
  // Bots de LangChain (add-on): si el cliente eligió, su setup (IVA incluido)
  // se suma al total EXACTO y ese número pasa a ser el precio de la propuesta.
  const botsIds = context.bots ?? [];
  const botsSeleccionados = botsParaResultado(botsIds);
  const botsTotal = totalBotsSetup(botsIds);
  const botsCuota = totalBotsMensual(botsIds);
  // Total EXACTO que verá la UI: el copy cita este número, no un rango suelto.
  const totalExacto = calcularTotalDeterminista({
    giro: giro.nombre,
    clientName: context.clientName,
    clientPhone: context.clientPhone,
    negocioDescripcion: context.negocioDescripcion,
    category: categoryIdResuelto,
    paginas: context.paginas,
    bots: botsIds,
  });
  // Regla #7 (precio único): el total EXACTO del motor (base + bots) manda
  // SIEMPRE sobre el clamp del giro. La UI, el PDF de cotización, el copy, la
  // propuesta formal y el pack técnico citan el MISMO número que ve el cliente
  // (calcularTotalDeterminista). El clamp del giro solo queda como estimación
  // de mercado para el extremo superior del rango (precio_max) y el copy.
  // Si el motor falla (no debería), se cae al clamp por giro.
  const precio_min =
    totalExacto != null ? totalExacto : ajustado.precio_min;
  const precio_max =
    totalExacto != null
      ? Math.max(totalExacto, ajustado.precio_max)
      : ajustado.precio_max;

  const citasItem =
    context.citas === true
      ? "Apartado para que tus clientes pidan o agenden cita (día y hora)"
      : null;
  const funcionalidades = [
    "Página principal con la información de tu negocio",
    "Diseño que se ve perfecto en celular, tablet y computadora",
    ...(citasItem ? [citasItem] : []),
    ...activeFeatureIds
      .map((id) => cat.features.find((f) => f.id === id)?.labelCliente)
      .filter((x): x is string => Boolean(x)),
    "Formulario de contacto para que te escriban directo",
  ];

  const stack = cat.stack;
  const entregables = cat.entregables;
  const nivelLabel = nivel === "basico" ? "Básico" : nivel === "profesional" ? "Profesional" : "Avanzado";

  // Copy comercial (adaptado + citando el total exacto cuando existe)
  const explicacion_precio = generarExplicacionPrecio(giro, precio_min, precio_max, ajustado.alcance_ajustado);
  const valor_negocio = generarValorNegocio(giro.nombre, precio_min, precio_max, totalExacto ?? undefined);
  const presupuesto_giro = `$${giro.presupuesto[0].toLocaleString("es-MX")}–$${giro.presupuesto[1].toLocaleString("es-MX")} MXN`;

  const promptTecnico = buildTechnicalPrompt({
    clientName,
    businessDescription: context.negocioDescripcion,
    category: cat,
    nivel,
    context,
    analysis: {
      categoria: cat.nombreCliente,
      nivelLabel,
      precio_min,
      precio_max,
      tiempo_estimado: cat.tiempo[nivel],
      funcionalidades: Array.from(new Set(funcionalidades)),
      stack_tecnico: stack,
      entregables,
      recomendaciones: [
        "Considera agregar mantenimiento mensual para mantener todo actualizado.",
        "Prepara fotos y textos reales de tu negocio para el lanzamiento.",
      ],
      giro: giro.nombre,
      punto_venta: copy.pitch,
      dolor: copy.dolor,
      beneficios: copy.beneficios,
      valor_negocio,
      costo_omision: copy.costo_omision,
      presupuesto_giro,
      cuota_mensual: ajustado.cuota_mensual,
      alcance_ajustado: ajustado.alcance_ajustado,
    },
  });

  const base: AnalysisResult = filtrarPorDeclinados(
    {
      clientName,
      categoria: cat.nombreCliente,
      nivel: nivelLabel,
      precio_min,
      precio_max,
      tiempo_estimado: cat.tiempo[nivel],
      stack_tecnico: stack,
      funcionalidades: Array.from(new Set(funcionalidades)),
      explicacion_precio,
      recomendaciones: [
        "Considera agregar mantenimiento mensual para mantener todo actualizado.",
        "Prepara fotos y textos reales de tu negocio para el lanzamiento.",
      ],
      entregables,
      prompt_tecnico: promptTecnico,
      // ── Campos comerciales ──
      giro: giro.nombre,
      punto_venta: copy.pitch,
      dolor: copy.dolor,
      beneficios: copy.beneficios,
      valor_negocio,
      cuota_mensual: ajustado.cuota_mensual,
      alcance_ajustado: ajustado.alcance_ajustado,
      mensaje_alcance: ajustado.mensaje_alcance,
      costo_omision: copy.costo_omision,
    },
    context
  );

  // ── Bots de LangChain (add-on determinista: aparecen en propuesta, prompt y PDF) ──
  if (botsSeleccionados.length) {
    base.bots = botsSeleccionados;
    base.bots_total = botsTotal;
    base.bots_cuota_mensual = botsCuota;
    base.funcionalidades = [
      ...(base.funcionalidades ?? []),
      ...botsSeleccionados.map((b) => b.funcionalidad),
    ];
    base.entregables = [
      ...(base.entregables ?? []),
      ...botsSeleccionados.map(
        (b) => `Bot "${b.nombre}" entrenado y configurado con la información de tu negocio`
      ),
    ];
    base.stack_tecnico = [...(base.stack_tecnico ?? []), "LangChain", "DeepSeek"];
    base.recomendaciones = [
      ...(base.recomendaciones ?? []),
      `Mantén tus asistentes (${botsSeleccionados
        .map((b) => b.nombre)
        .join(", ")}) siempre activos con la suscripción mensual de $${botsCuota.toLocaleString(
        "es-MX"
      )} MXN, que cubre el motor de IA y las actualizaciones.`,
    ];
  }

  return base;
}
