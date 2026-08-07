/**
 * CATÁLOGO DE TIPOS DE PÁGINAS WEB · AGENCIA VIBECODER
 *
 * Todos los productos/servicios web que la agencia puede ofrecer y vender.
 * Incluye los 6 tipos que ya cotiza el bot (landing, ecommerce, citas,
 * webapp, blog, portafolio) más los tipos PREMIUM que amplían el catálogo
 * para captar más clientes (menú QR, directorio, marketplace, reservas de
 * restaurante, membresías, cursos online, etc.).
 *
 * Cada tipo indica:
 *  - `categoriaBase`: el id de PRICING_CATALOG al que se mapea (los que ya
 *    cotiza el motor) o `null` si es un tipo nuevo que se cotiza con su
 *    propio `precioDesde`.
 *  - `precioDesde`: precio accesible MXN (IVA incluido) para captar clientes.
 *  - Estrategia de mercado documentada en docs/MERCADO_VIBECODER.md.
 */

export type WebComplejidad = "basica" | "media" | "avanzada";

export interface WebTypeSpec {
  id: string;
  nombre: string;
  descripcion: string;
  paraQuien: string;
  /** id de PRICING_CATALOG al que se mapea, o null si es tipo nuevo */
  categoriaBase: string | null;
  /** Precio "desde" accesible (MXN, IVA incluido) para captar clientes */
  precioDesde: number;
  /** Tiempo típico de entrega */
  tiempoEntrega: string;
  complejidad: WebComplejidad;
  /** Diferencial / propuesta de venta de la agencia */
  diferencial: string;
}

export const AGENCY_WEB_TYPES: WebTypeSpec[] = [
  {
    id: "landing",
    nombre: "Landing page (página de presentación)",
    descripcion:
      "Página de 1 a 3 secciones enfocada en presentar el negocio y captar contactos. La más vendida para negocios locales.",
    paraQuien: "Negocios locales que solo necesitan presencia y que los contacten (mecánicos, estéticas, abogados, contadores).",
    categoriaBase: "landing",
    precioDesde: 8500,
    tiempoEntrega: "3-8 días",
    complejidad: "basica",
    diferencial: "Mobile-first, SEO local y botón de WhatsApp incluidos; se entrega en una semana.",
  },
  {
    id: "corporativo",
    nombre: "Sitio corporativo (multi-página)",
    descripcion:
      "Sitio de 4 a 6 páginas: Inicio, Nosotros, Servicios, Galería, Contacto. La imagen seria de una empresa.",
    paraQuien: "Empresas y profesionales que necesitan transmitir autoridad (constructoras, despachos, clínicas).",
    categoriaBase: "landing",
    precioDesde: 15000,
    tiempoEntrega: "7-15 días",
    complejidad: "media",
    diferencial: "Arquitectura clara, copy que vende por página y panel para editar contenido.",
  },
  {
    id: "ecommerce",
    nombre: "Tienda online (e-commerce)",
    descripcion:
      "Catálogo, carrito y pagos en línea con pasarela (Stripe/PayPal). Vendes 24/7 sin intermediarios.",
    paraQuien: "Negocios que ya venden o quieren vender por internet con catálogo y pagos.",
    categoriaBase: "ecommerce",
    precioDesde: 20000,
    tiempoEntrega: "10-25 días",
    complejidad: "avanzada",
    diferencial: "Carrito, pasarela, panel de pedidos y notificaciones de venta en un solo proyecto.",
  },
  {
    id: "citas",
    nombre: "Sistema de citas y reservas",
    descripcion:
      "Calendario en línea donde el cliente elige día y hora, con confirmaciones y recordatorios automáticos.",
    paraQuien: "Consultorios, estéticas, barberías, spas y cualquier negocio que agenda por servicio.",
    categoriaBase: "citas",
    precioDesde: 15000,
    tiempoEntrega: "7-18 días",
    complejidad: "media",
    diferencial: "Bloqueo de horarios, confirmaciones por correo/WhatsApp y panel de agenda.",
  },
  {
    id: "menu_digital",
    nombre: "Menú digital con código QR",
    descripcion:
      "El menú/carta de tu negocio en línea, accesible con un código QR en cada mesa. Cero apps ni descargas.",
    paraQuien: "Restaurantes, cafeterías, bares y food trucks que quieren modernizar su carta.",
    categoriaBase: "landing",
    precioDesde: 3500,
    tiempoEntrega: "2-4 días",
    complejidad: "basica",
    diferencial: "Se actualiza solo (precios y promos) y se imprime el QR; ideal venta rápida de entrada.",
  },
  {
    id: "reservas_restaurante",
    nombre: "Reservas para restaurante",
    descripcion:
      "Los comensales reservan mesa, hora y número de personas en línea, con confirmación automática.",
    paraQuien: "Restaurantes, cafeterías y establecimientos con mesas que quieren llenar sin llamadas.",
    categoriaBase: "citas",
    precioDesde: 12000,
    tiempoEntrega: "7-12 días",
    complejidad: "media",
    diferencial: "Menú QR + reservas en un solo proyecto; upsell natural del menú digital.",
  },
  {
    id: "inmobiliaria",
    nombre: "Portal inmobiliario (propiedades)",
    descripcion:
      "Catálogo de propiedades con fotos, filtros, mapas y formularios de interés por propiedad.",
    paraQuien: "Agencias inmobiliarias y desarrolladores que venden casas, terrenos o departamentos.",
    categoriaBase: "webapp",
    precioDesde: 25000,
    tiempoEntrega: "15-30 días",
    complejidad: "avanzada",
    diferencial: "Filtros por zona/precio, leads por propiedad y panel para publicar sin programar.",
  },
  {
    id: "directorio",
    nombre: "Directorio / listado de negocios",
    descripcion:
      "Directorio donde cada negocio tiene su ficha (datos, fotos, contacto) y los usuarios buscan por categoría.",
    paraQuien: "Cámaras, asociaciones y proyectos de comunidad que agrupan negocios de una zona o rubro.",
    categoriaBase: "webapp",
    precioDesde: 22000,
    tiempoEntrega: "15-25 días",
    complejidad: "avanzada",
    diferencial: "Fichas autogestionables por cada negocio + búsqueda y mapa.",
  },
  {
    id: "marketplace",
    nombre: "Marketplace (multi-vendedor)",
    descripcion:
      "Plataforma donde varios vendedores publican y venden sus productos, y tú cobras una comisión.",
    paraQuien: "Emprendedores que quieren montar su propio mercado en línea con varios vendedores.",
    categoriaBase: "webapp",
    precioDesde: 40000,
    tiempoEntrega: "30-60 días",
    complejidad: "avanzada",
    diferencial: "Cuentas de vendedor, comisiones y panel de administración por rol.",
  },
  {
    id: "webapp",
    nombre: "Plataforma / sistema web a medida",
    descripcion:
      "Sistema a la medida del proceso del cliente: inventario, clientes, reportes, control interno.",
    paraQuien: "Negocios con procesos manuales que quieren ordenar su operación (talleres, bodegas, agencias).",
    categoriaBase: "webapp",
    precioDesde: 25000,
    tiempoEntrega: "10-30 días",
    complejidad: "avanzada",
    diferencial: "Se cotiza por módulos reales; el cliente paga solo lo que usa.",
  },
  {
    id: "membresias",
    nombre: "Portal de membresías / suscripciones",
    descripcion:
      "Portal con planes, cobro recurrente (Stripe) y área privada para tus miembros.",
    paraQuien: "Gimnasios, academias, consultores y negocios con ingreso recurrente.",
    categoriaBase: "webapp",
    precioDesde: 28000,
    tiempoEntrega: "15-30 días",
    complejidad: "avanzada",
    diferencial: "Ingreso recurrente automatizado + área de miembros con su historial.",
  },
  {
    id: "curso_online",
    nombre: "Plataforma de cursos online",
    descripcion:
      "Vende y publica tus cursos con lecciones en video, progreso del alumno y pagos.",
    paraQuien: "Instructores, coaches y academias que quieren vender sus cursos por internet.",
    categoriaBase: "webapp",
    precioDesde: 30000,
    tiempoEntrega: "20-35 días",
    complejidad: "avanzada",
    diferencial: "Lecciones, progreso, certificado y pasarela de pagos en un solo sistema.",
  },
  {
    id: "telemedicina",
    nombre: "Portal de citas para salud",
    descripcion:
      "Agenda médica en línea con recordatorios, expediente del paciente y videollamada opcional.",
    paraQuien: "Consultorios, clínicas y especialistas que quieren ordenar sus citas y expedientes.",
    categoriaBase: "citas",
    precioDesde: 26000,
    tiempoEntrega: "15-30 días",
    complejidad: "avanzada",
    diferencial: "Expediente por paciente + recordatorios que reducen inasistencias.",
  },
  {
    id: "blog",
    nombre: "Blog / sitio de contenido",
    descripcion:
      "Sitio para publicar artículos que posicionan en Google y atraen clientes orgánicos.",
    paraQuien: "Marca personal, medios y negocios que quieren crecer con contenido y SEO.",
    categoriaBase: "blog",
    precioDesde: 9000,
    tiempoEntrega: "5-12 días",
    complejidad: "media",
    diferencial: "Editor amigable + SEO on-page + newsletter para crecer la audiencia.",
  },
  {
    id: "portafolio",
    nombre: "Portafolio profesional",
    descripcion:
      "Galería de proyectos o trabajos con diseño impactante, para freelancers y creativos.",
    paraQuien: "Fotógrafos, diseñadores, arquitectos y cualquier profesional que venda con su trabajo.",
    categoriaBase: "portafolio",
    precioDesde: 7000,
    tiempoEntrega: "4-10 días",
    complejidad: "media",
    diferencial: "Galería con animaciones que deja huella; ideal para cerrar proyectos grandes.",
  },
  {
    id: "evento",
    nombre: "Landing de evento",
    descripcion:
      "Página para lanzar un evento, curso o lanzamiento: registro de asistentes, agenda y venta de boletos.",
    paraQuien: "Organizadores de eventos, lanzamientos de producto y campañas de registro.",
    categoriaBase: "landing",
    precioDesde: 6500,
    tiempoEntrega: "3-7 días",
    complejidad: "basica",
    diferencial: "Registro de asistentes + contador + venta de boletos opcional.",
  },
  {
    id: "pwa_app",
    nombre: "PWA instalable (app sin tienda)",
    descripcion:
      "La web se instala en el celular como una app (sin pasar por Google Play) con notificaciones.",
    paraQuien: "Negocios que quieren presencia de app sin pagar las comisiones de las tiendas.",
    categoriaBase: "landing",
    precioDesde: 12000,
    tiempoEntrega: "7-15 días",
    complejidad: "media",
    diferencial: "Se agrega a cualquier web existente; app a una fracción del costo.",
  },
  {
    id: "multilingue",
    nombre: "Sitio multilingüe",
    descripcion:
      "Versión en español e inglés (o más idiomas) para atender mercados turísticos o de exportación.",
    paraQuien: "Negocios en zonas turísticas o fronterizas, y empresas que venden al extranjero.",
    categoriaBase: "landing",
    precioDesde: 11000,
    tiempoEntrega: "6-12 días",
    complejidad: "media",
    diferencial: "Cambio de idioma con SEO por idioma (hreflang) y traducción profesional.",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

export function getWebTypeById(id: string): WebTypeSpec | undefined {
  return AGENCY_WEB_TYPES.find((w) => w.id === id);
}

/** Los tipos que la agencia puede cotizar como "producto de entrada" (precio < $10k) */
export function webTypesDeEntrada(): WebTypeSpec[] {
  return AGENCY_WEB_TYPES.filter((w) => w.precioDesde < 10000);
}

/** Mapea un id de PRICING_CATALOG a los tipos de web de la agencia que lo usan */
export function webTypesPorCategoria(categoriaBase: string): WebTypeSpec[] {
  return AGENCY_WEB_TYPES.filter((w) => w.categoriaBase === categoriaBase);
}

/** Catálogo legible para el nodo de descubrimiento (sin duplicar el motor) */
export function nombresWebTypes(): string[] {
  return AGENCY_WEB_TYPES.map((w) => w.nombre);
}
