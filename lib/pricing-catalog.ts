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

import type { ChatContext } from "@/lib/types";
import { buildTechnicalPrompt } from "@/lib/prompt-builder";
import {
  ajustarPrecio,
  detectarGiro,
  generarExplicacionPrecio,
  generarValorNegocio,
} from "@/lib/industry-pricing";

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
    keywords: ["presentar", "presentación", "información", "servicios", "landing", "vitrina", "mostrar", "folleto", "tarjeta", "curriculum", "cv", "profesional", "consultorio"],
    base: { basico: 8000, profesional: 15000, avanzado: 25000 },
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
    id: "ecommerce",
    nombreCliente: "Tienda online con carrito y pagos",
    keywords: ["tienda", "vender", "ventas", "vendo", "productos", "carrito", "pedidos", "comprar", "catalogo en linea", "venta online", "shop", "mercancia", "articulos"],
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
      { id: "pagos", labelCliente: "Pago por adelantado al reservar", precio: 6000 },
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
    keywords: ["portafolio", "portfolio", "trabajos", "proyectos", "fotógrafo", "fotografo", "diseñador", "arquitecto", "artista", "freelance", "muestras", "galeria", "galería"],
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
 */
export function inferCategory(text: string): string {
  const t = normalize(text);
  let best: PricingCategory | null = null;
  let bestScore = 0;

  for (const cat of PRICING_CATALOG) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (t.includes(normalize(kw))) score++;
    }
    // +1 si menciona citas/agendar en la misma frase que algo de ecommerce
    if (cat.id === "citas" && /agendar|agenda|cita/.test(t)) score += 0.5;
    if (cat.id === "ecommerce" && /vender|comprar|tienda/.test(t)) score += 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  if (!best || bestScore === 0) return "landing";
  return best.id;
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
  const cat = getCategoryById(categoryId) ?? PRICING_CATALOG[0];
  const giro = detectarGiro(context.negocioDescripcion, categoryId);

  // Estimado técnico + ajuste al presupuesto del giro (con gancho)
  const { precio_min: estMin, precio_max: estMax, nivel } = estimatePrice(categoryId, activeFeatureIds);
  const ajustado = ajustarPrecio(estMin, estMax, giro);
  const precio_min = ajustado.precio_min;
  const precio_max = ajustado.precio_max;

  const funcionalidades = [
    "Página principal con la información de tu negocio",
    "Diseño que se ve perfecto en celular, tablet y computadora",
    ...activeFeatureIds
      .map((id) => cat.features.find((f) => f.id === id)?.labelCliente)
      .filter((x): x is string => Boolean(x)),
    "Formulario de contacto para que te escriban directo",
  ];

  const stack = cat.stack;
  const entregables = cat.entregables;
  const nivelLabel = nivel === "basico" ? "Básico" : nivel === "profesional" ? "Profesional" : "Avanzado";

  // Copy comercial
  const explicacion_precio = generarExplicacionPrecio(giro, precio_min, precio_max, ajustado.alcance_ajustado);
  const valor_negocio = generarValorNegocio(giro, precio_min, precio_max);
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
      punto_venta: giro.pitch,
      dolor: giro.dolor,
      beneficios: giro.beneficios,
      valor_negocio,
      costo_omision: giro.costo_omision,
      presupuesto_giro,
      cuota_mensual: ajustado.cuota_mensual,
      alcance_ajustado: ajustado.alcance_ajustado,
    },
  });

  return {
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
    punto_venta: giro.pitch,
    dolor: giro.dolor,
    beneficios: giro.beneficios,
    valor_negocio,
    cuota_mensual: ajustado.cuota_mensual,
    alcance_ajustado: ajustado.alcance_ajustado,
    mensaje_alcance: ajustado.mensaje_alcance,
    costo_omision: giro.costo_omision,
  };
}
