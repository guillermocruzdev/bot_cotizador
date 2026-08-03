/**
 * GENERADOR DE PROMPT TÉCNICO PROFESIONAL (para Roo Code + DeepSeek)
 *
 * Produce un documento de ingeniería completo, como si un desarrollador
 * senior le diera indicaciones a un agente de coding autónomo. El objetivo
 * es que el trabajo resultante sea profesional tanto visual como
 * internamente, listo para desplegar en Vercel y entregar al cliente.
 *
 * Este generador es DETERMINISTA: usa el contexto estructurado de la
 * conversación (autenticación, pagos, panel, citas, SEO, PWA, etc.) más el
 * catálogo por categoría, por lo que la calidad es consistente en cada
 * propuesta (no depende de la creatividad del LLM).
 */

import type { ChatContext } from "@/lib/types";
import type { Nivel, PricingCategory } from "@/lib/pricing-catalog";

export interface PromptAnalysis {
  categoria: string;
  nivelLabel: string;
  precio_min: number;
  precio_max: number;
  tiempo_estimado: string;
  funcionalidades: string[];
  stack_tecnico: string[];
  entregables: string[];
  recomendaciones: string[];
}

export interface PromptBuildOptions {
  clientName: string;
  businessDescription: string | null;
  category: PricingCategory;
  nivel: Nivel;
  context: ChatContext;
  analysis: PromptAnalysis;
}

// ─── Especificaciones por categoría ────────────────────────────────

interface CategorySpec {
  /** Rutas / páginas del sitio */
  pages: string[];
  /** Tablas de la base de datos (Supabase) */
  dataModel: string[];
  /** Flujo de usuario principal */
  userFlow: string[];
  /** Integraciones y API routes */
  integrations: string[];
}

const CATEGORY_SPECS: Record<string, CategorySpec> = {
  landing: {
    pages: [
      "/ — Página de inicio: hero con propuesta de valor, servicios, beneficios, testimonios (opcional), CTA de contacto.",
      "/#servicios — Sección de servicios anclada.",
      "/#contacto — Formulario de contacto + datos de la empresa + mapa (si aplica).",
      "/aviso-de-privacidad — Página legal obligatoria en México (LFPDPPP).",
    ],
    dataModel: [
      "contact_messages(id, nombre, email, telefono, mensaje, leido boolean, created_at)",
      "locations(id, nombre, direccion, lat, lng, telefono, horario, created_at) — solo si el cliente tiene sucursales.",
    ],
    userFlow: [
      "Visitante aterriza en la portada y entiende en <5s qué ofrece el negocio.",
      "El visitante navega servicios, lee beneficios y decide contactar.",
      "Completa el formulario o toca el botón de WhatsApp.",
      "El mensaje llega al correo/panel del dueño y se confirma con un mensaje de éxito en pantalla.",
    ],
    integrations: [
      "POST /api/contact — recibe el formulario, valida con Zod y envía por correo (Resend) y/o guarda en Supabase.",
      "Botón flotante de WhatsApp con deep link wa.me.",
      "Mapa embebido (Leaflet/Google Maps) si aplica.",
    ],
  },

  ecommerce: {
    pages: [
      "/ — Home: categorías destacadas, productos top, promociones.",
      "/productos — Catálogo con filtros (categoría, precio) y búsqueda.",
      "/productos/[slug] — Detalle de producto: fotos, precio, descripción, botón agregar al carrito.",
      "/carrito — Resumen del carrito con cantidades y total.",
      "/checkout — Datos de envío + pago (Stripe) + confirmación.",
      "/gracias — Página de confirmación de compra.",
      "/mi-cuenta — (si autenticación) historial de pedidos y datos.",
      "/panel — (si dashboard) administración de productos, pedidos y ventas.",
      "/aviso-de-privacidad — página legal.",
    ],
    dataModel: [
      "profiles(id uuid fk auth.users, nombre, email, telefono, created_at) — solo si hay autenticación.",
      "products(id, slug unique, nombre, descripcion, precio, precio_promo, stock, activo, imagen_url, categoria_id, created_at)",
      "product_categories(id, nombre, slug unique, posicion)",
      "orders(id, usuario_id null, nombre, email, telefono, direccion, ciudad, cp, subtotal, envio, total, estado, stripe_payment_id null, created_at)",
      "order_items(id, order_id fk, product_id fk, cantidad, precio_unitario)",
      "payments(id, order_id fk, proveedor, referencia, monto, estatus, created_at) — si hay pasarela.",
    ],
    userFlow: [
      "Cliente explora el catálogo y filtra por categoría.",
      "Agrega productos al carrito (estado persistente, recuperable).",
      "Pasa a checkout, captura datos de envío.",
      "Paga con tarjeta (Stripe) o elige pago por transferencia.",
      "Recibe confirmación por correo y el dueño ve el pedido en su panel.",
      "El inventario se descuenta y se notifica una nueva venta.",
    ],
    integrations: [
      "POST /api/checkout — crea la orden y genera el PaymentIntent de Stripe.",
      "Webhook POST /api/webhooks/stripe — confirma pagos y actualiza estado de la orden.",
      "GET/POST /api/products — CRUD de productos (protegido, solo admin).",
      "POST /api/contact — soporte/consultas.",
      "Cálculo de envío por código postal (paquetería) si aplica.",
    ],
  },

  citas: {
    pages: [
      "/ — Home: presentación del consultorio/negocio, servicios y CTA de agendar.",
      "/servicios — Lista de servicios con precios y duración.",
      "/agendar — Calendario + selección de día y hora para el servicio elegido.",
      "/confirmacion — Confirmación de cita con resumen.",
      "/panel — (si dashboard) agenda del día, próximas citas, gestión de horarios y servicios.",
      "/aviso-de-privacidad — página legal.",
    ],
    dataModel: [
      "services(id, nombre, descripcion, duracion_min, precio, activo, created_at)",
      "appointments(id, servicio_id fk, cliente_nombre, cliente_email, cliente_telefono, fecha, hora_inicio, hora_fin, estado, notas, creado_en)",
      "availability(id, dia_semana, hora_inicio, hora_fin, activo) — horarios del negocio.",
      "appointment_blockers(id, fecha, hora_inicio, hora_fin, motivo) — bloqueos puntuales.",
      "profiles(id, rol admin/cliente, ...) — solo si hay autenticación.",
      "payments(id, appointment_id fk, monto, estatus) — si hay pago por adelantado.",
    ],
    userFlow: [
      "Cliente entra, elige un servicio y ve la duración.",
      "Selecciona una fecha y una hora libre del calendario.",
      "Captura nombre, correo y teléfono (puede agendar sin cuenta).",
      "Recibe confirmación automática por correo.",
      "El consultorio recibe notificación y la cita aparece en el panel.",
      "Se bloquea el horario para evitar dobles reservas.",
    ],
    integrations: [
      "GET /api/availability — horarios libres por fecha.",
      "POST /api/appointments — crea la cita, valida disponibilidad y envía confirmación (Resend).",
      "Webhook de pago (Stripe) si se cobra por adelantado.",
      "Panel protegido para gestionar agenda y servicios.",
    ],
  },

  webapp: {
    pages: [
      "/login y /registro — Autenticación (si aplica).",
      "/ — Dashboard principal con métricas.",
      "/[recurso] — Módulos del sistema (según el proceso del cliente): clientes, pedidos, inventario, reportes, etc.",
      "/[recurso]/[id] — Detalle/edición de registros.",
      "/configuracion — Ajustes y usuarios (roles).",
      "/aviso-de-privacidad — página legal.",
    ],
    dataModel: [
      "profiles(id uuid fk auth.users, nombre, email, rol, created_at) — roles admin/empleado/cliente.",
      "modules según el proceso: customers, inventory, orders, reports, etc. (definir con el cliente en el kickoff).",
      "audit_log(id, usuario_id, accion, detalle jsonb, created_at) — trazabilidad.",
    ],
    userFlow: [
      "Usuario autenticado entra al panel y ve su rol y permisos.",
      "Realiza operaciones CRUD sobre los módulos correspondientes.",
      "Cada acción crítica queda registrada en auditoría.",
      "Los reportes se generan y pueden exportarse a PDF/CSV.",
    ],
    integrations: [
      "API routes por módulo con validación Zod y autorización por rol (middleware).",
      "Autenticación con Supabase Auth (email + OAuth).",
      "Generación de PDFs (react-pdf/jsPDF) si aplica.",
      "Supabase RLS para seguridad a nivel de fila.",
    ],
  },

  blog: {
    pages: [
      "/ — Home con artículos destacados.",
      "/blog — Lista de artículos con categorías y búsqueda.",
      "/blog/[slug] — Artículo completo con lectura óptima y autor.",
      "/acerca-de — Sobre el autor/marca.",
      "/contacto — Formulario de contacto.",
      "/aviso-de-privacidad — página legal.",
    ],
    dataModel: [
      "posts(id, slug unique, titulo, resumen, contenido, portada_url, autor_id, categoria_id, publicado boolean, created_at, updated_at)",
      "post_categories(id, nombre, slug unique)",
      "profiles(id, nombre, email, bio, avatar_url) — autores.",
      "newsletter_subscribers(id, email unique, created_at) — si hay boletín.",
    ],
    userFlow: [
      "Lector llega desde Google (SEO) y encuentra artículos relevantes.",
      "Navega por categorías y lee contenido con buena tipografía.",
      "Puede suscribirse al boletín o contactar al autor.",
      "El autor publica desde un panel sencillo (editor con preview).",
    ],
    integrations: [
      "GET /api/posts — feed público con paginación.",
      "POST /api/newsletter — alta de suscriptores (validación de correo).",
      "Panel de autor protegido para redactar y publicar.",
      "Generación de sitemap y RSS.",
    ],
  },

  portafolio: {
    pages: [
      "/ — Home: hero con tu propuesta, proyectos destacados y CTA.",
      "/proyectos — Galería completa con filtros por tipo.",
      "/proyectos/[slug] — Caso de estudio con imágenes y resultados.",
      "/contacto — Formulario + redes sociales + WhatsApp.",
      "/aviso-de-privacidad — página legal.",
    ],
    dataModel: [
      "projects(id, titulo, slug unique, descripcion, categoria, imagen_cover, galeria jsonb, link_demo, link_repo, created_at)",
      "contact_messages(id, nombre, email, mensaje, leido, created_at)",
    ],
    userFlow: [
      "Reclutador/cliente ve la portada y capta la especialidad en segundos.",
      "Explora la galería de proyectos con transiciones suaves.",
      "Abre un caso de estudio y ve el impacto del trabajo.",
      "Contacta por formulario o WhatsApp directo.",
    ],
    integrations: [
      "POST /api/contact — recepción de mensajes.",
      "Galería con animaciones (Framer Motion) y lazy-loading de imágenes.",
      "Botón de WhatsApp.",
    ],
  },
};

// ─── Helpers ───────────────────────────────────────────────────────

const si = (v: boolean | null) => v === true;
const no = (v: boolean | null) => v === false;

function precioMXN(n: number): string {
  return `$${n.toLocaleString("es-MX")} MXN`;
}

function bullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join("\n");
}

// ─── Requisitos funcionales desde el contexto ──────────────────────

function buildFunctionalRequirements(ctx: ChatContext, spec: CategorySpec, category: PricingCategory): string[] {
  const reqs: string[] = [];
  const add = (id: string, label: string, priority = "Alta") => reqs.push(`- **${id}** · [${priority}] ${label}`);

  add("RF-01", "Página de inicio profesional con propuesta de valor clara y CTAs visibles.", "Alta");
  add("RF-02", "Diseño 100% responsive (móvil, tablet, escritorio) con enfoque mobile-first.", "Alta");
  add("RF-03", "Formulario de contacto funcional con validación, protección contra spam y confirmación visual.", "Alta");

  if (si(ctx.autenticacion))
    add("RF-04", "Sistema de cuentas de usuario: registro, login (correo y/o OAuth), recuperación de contraseña y sesión segura.", "Alta");
  if (si(ctx.baseDeDatos))
    add("RF-05", "Base de datos PostgreSQL (Supabase) con persistencia segura de la información del negocio.", "Alta");
  if (si(ctx.pagos))
    add("RF-06", "Pasarela de pagos integrada (Stripe recomendado) con manejo de webhooks, confirmación y reembolsos.", "Alta");
  if (si(ctx.dashboard))
    add("RF-07", "Panel de administración protegido para gestionar la información y ver estadísticas.", "Alta");
  if (si(ctx.mapas))
    add("RF-08", "Mapa interactivo con la ubicación o sucursales del negocio.", "Media");
  if (si(ctx.documentos))
    add("RF-09", "Generación de documentos (PDF) como cotizaciones, recibos o reportes.", "Media");
  if (si(ctx.chat))
    add("RF-10", "Canal de contacto directo: botón flotante de WhatsApp y/o chat.", "Media");
  if (si(ctx.citas) || category.id === "citas")
    add("RF-11", "Sistema de agendamiento: calendario, selección de día/hora, bloqueo de horarios ocupados y confirmaciones automáticas.", "Alta");
  if (si(ctx.animaciones))
    add("RF-12", "Micro-interacciones y animaciones (Framer Motion) para una experiencia moderna.", "Media");
  if (si(ctx.seo))
    add("RF-13", "Optimización SEO: metadata dinámica, Open Graph, sitemap, robots.txt y datos estructurados JSON-LD.", "Alta");
  if (si(ctx.pwa))
    add("RF-14", "PWA instalable: manifest, service worker, íconos y carga offline básica.", "Media");
  if (no(ctx.contenidoListo))
    add("RF-15", "Estructurar el contenido: textos placeholder profesionales y guía de reemplazo para el cliente.", "Media");

  // Requisitos específicos de la categoría (síntesis del flujo)
  reqs.push(`- **RF-16** · [Alta] Cumplir el flujo de usuario de la categoría: ${spec.userFlow.length} pasos documentados en la sección 9.`);

  return reqs;
}

// ─── Requisitos no funcionales ─────────────────────────────────────

const NFR = [
  "**Rendimiento (Lighthouse)**: puntuación ≥ 90 en Performance, Accessibility, Best Practices y SEO en móvil.",
  "**Core Web Vitals**: LCP < 2.5s, INP < 200ms, CLS < 0.1.",
  "**Responsive**: probado en 360px (móvil), 768px (tablet) y 1440px (desktop).",
  "**Accesibilidad**: semántica HTML correcta, contraste AA (WCAG 2.1), navegación por teclado y labels en formularios.",
  "**SEO técnico**: metadata dinámica, Open Graph, sitemap.xml, robots.txt, canonical tags.",
  "**Seguridad**: secretos solo en variables de entorno, validación con Zod en todas las API routes, RLS en Supabase, headers de seguridad.",
  "**Calidad de código**: TypeScript estricto, ESLint + Prettier, componentes tipados, sin `any` sin justificar.",
  "**Buenas prácticas**: directiva `use client` solo donde se necesite interactividad; Server Components por defecto.",
] as const;

// ─── Secciones del documento ───────────────────────────────────────

export function buildTechnicalPrompt(opts: PromptBuildOptions): string {
  const { clientName, businessDescription, category, nivel, context, analysis } = opts;
  const spec = CATEGORY_SPECS[category.id] ?? CATEGORY_SPECS.landing;
  const today = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  const features = analysis.funcionalidades.length
    ? analysis.funcionalidades
    : buildFallbackFeatures(context, category);

  const stack = analysis.stack_tecnico.length ? analysis.stack_tecnico : category.stack;
  const entregables = analysis.entregables.length ? analysis.entregables : category.entregables;

  const sections: string[] = [];

  // ═══ Cabecera ═══
  sections.push(`# BRIEF TÉCNICO DE DESARROLLO — ${analysis.categoria}

> **Preparado para:** Roo Code + DeepSeek
> **Cliente:** ${clientName || "Por confirmar"}
> **Generado:** ${today}
> **Instrucción:** lee el documento completo antes de escribir código. Cada sección es un requisito de entrega. Trabaja con criterio de desarrollador senior: código limpio, arquitectura escalable y resultado visual impecable.`);

  // ═══ 0. Ficha ═══
  sections.push(`## 0 · Ficha del proyecto

| Campo | Valor |
|---|---|
| Cliente | ${clientName || "Por confirmar"} |
| Tipo de proyecto | ${analysis.categoria} |
| Nivel | ${analysis.nivelLabel} |
| Presupuesto estimado | ${precioMXN(analysis.precio_min)} – ${precioMXN(analysis.precio_max)} |
| Tiempo estimado | ${analysis.tiempo_estimado} |
| Despliegue | Vercel (producción) |
| Fecha de entrega acordada | ${context.fechaEntrega || "Por definir"} |
| Mantenimiento | ${si(context.mantenimiento) ? "Sí, plan mensual" : "No incluido (opcional)"}`);

  // ═══ 1. Resumen ejecutivo ═══
  sections.push(`## 1 · Resumen ejecutivo

${businessDescription ? `El cliente se dedica a: "${businessDescription}".` : `El cliente necesita una presencia web para su negocio.`}
El objetivo es construir **${analysis.categoria.toLowerCase()}** para **${clientName || "el cliente"}**, con un acabado profesional tanto visual como interno, listo para **desplegar en producción (Vercel)** y entregar al cliente final.

Esta pieza debe sentirse como un producto terminado: diseño cuidado, contenido realista (aunque sea placeholder de alta calidad), código limpio, documentado y con todas las integraciones funcionando con datos de prueba cuando no se disponga de credenciales reales.`);

  // ═══ 2. Contexto y objetivos ═══
  sections.push(`## 2 · Contexto y objetivos de negocio

### Objetivos del proyecto
${bullets([
  "Establecer o mejorar la presencia digital del negocio.",
  si(context.pagos) ? "Permitir transacciones en línea de forma segura." : "Generar contacto y consultas de clientes potenciales.",
  si(context.citas) || category.id === "citas" ? "Reducir llamadas y agendar citas en línea sin fricción." : si(context.dashboard) ? "Centralizar la administración de la operación." : "Comunicar servicios/beneficios de forma clara y atractiva.",
  "Garantizar una experiencia impecable en cualquier dispositivo.",
])}

### Datos relevantes capturados en la entrevista
${bullets([
  `Páginas/secciones estimadas: ${context.paginas ?? "por definir"}.`,
  `Autenticación: ${si(context.autenticacion) ? "sí" : no(context.autenticacion) ? "no" : "no definido"}.`,
  `Base de datos: ${si(context.baseDeDatos) ? "sí" : no(context.baseDeDatos) ? "no" : "no definido"}.`,
  `Pagos en línea: ${si(context.pagos) ? "sí" : no(context.pagos) ? "no" : "no definido"}.`,
  `Panel de administración: ${si(context.dashboard) ? "sí" : no(context.dashboard) ? "no" : "no definido"}.`,
  `Citas/reservas: ${si(context.citas) || category.id === "citas" ? "sí" : no(context.citas) ? "no" : "no definido"}.`,
  `Mapas: ${si(context.mapas) ? "sí" : "no"}. · PDFs/documentos: ${si(context.documentos) ? "sí" : "no"}. · Chat/WhatsApp: ${si(context.chat) ? "sí" : "no"}.`,
  `Animaciones/modernidad: ${si(context.animaciones) ? "sí" : no(context.animaciones) ? "prefiere sobrio" : "por definir"}.`,
  `SEO: ${si(context.seo) ? "sí" : "básico"}. · PWA instalable: ${si(context.pwa) ? "sí" : "no"}.`,
  `Contenido del cliente: ${si(context.contenidoListo) ? "lo tiene listo" : no(context.contenidoListo) ? "necesita ayuda" : "por confirmar"}.`,
  `Presupuesto mencionado: ${context.presupuesto ?? "no especificado"}.`,
  context.referencia ? `Referencia de estilo: ${context.referencia}.` : null,
  context.comentarios ? `Comentarios extra: ${context.comentarios}.` : null,
].filter((l): l is string => l !== null))}`);

  // ═══ 3. Alcance ═══
  sections.push(`## 3 · Alcance

### 3.1 Dentro del alcance
${bullets(features)}

### 3.2 Fuera del alcance (a menos que se indique)
${bullets([
  "Contenido definitivo del cliente (fotos profesionales, textos finales, logotipo) — se entrega con placeholders de alta calidad.",
  "Servicios de hosting adicionales, dominios o SSL por cuenta del cliente.",
  "Integraciones no mencionadas en la entrevista.",
])}`);

  // ═══ 4. Requisitos funcionales ═══
  sections.push(`## 4 · Requisitos funcionales (historias de usuario)

${buildFunctionalRequirements(context, spec, category).join("\n")}

> Prioridades: **Alta** (bloquea la entrega), **Media** (esperada), **Baja** (nice-to-have).`);

  // ═══ 5. No funcionales ═══
  sections.push(`## 5 · Requisitos no funcionales

${bullets([...NFR])}`);

  // ═══ 6. Stack y arquitectura ═══
  sections.push(`## 6 · Stack técnico y arquitectura

### 6.1 Stack recomendado
> ${stack.join(" · ")}

${bullets([
  "**Next.js 14+ (App Router)** — Server Components por defecto, API routes como Backend.",
  "**TypeScript estricto** — sin `any` sin justificar.",
  "**Tailwind CSS + shadcn/ui** — sistema de diseño consistente.",
  "**Supabase (PostgreSQL + Auth + Storage)** — base de datos y autenticación.",
  "**Framer Motion** — animaciones suaves y accesibles.",
  "**Vercel** — despliegue con CI/CD automático.",
])}

### 6.2 Estructura de carpetas recomendada
\`\`\`
app/
  (public)/        # páginas visibles (rutas por categoría)
  (admin)/         # panel protegido (si aplica)
  api/             # API routes (contact, checkout, webhooks, etc.)
  layout.tsx       # layout raíz con metadata y fuentes
components/
  ui/              # primitivas shadcn/ui
  [feature]/       # componentes por dominio (products, appointments...)
lib/
  supabase/        # clientes (browser/server)
  validations/     # esquemas Zod
  utils/           # helpers
public/            # estáticos (íconos PWA, og-image...)
supabase/
  migrations/      # SQL del esquema
\`\`\`

### 6.3 Decisiones de arquitectura
${bullets([
  "Separar Server Components (datos, render) de Client Components (interactividad) para minimizar el JS enviado al navegador.",
  "Toda API route valida su input con **Zod** y responde JSON tipado.",
  "Las consultas a Supabase usan **RLS** para que el cliente anónimo solo lea lo público.",
  "Los secretos (service role, Stripe) viven SOLO en el servidor; el cliente usa las keys públicas.",
  "Manejo de estados de carga/error/vacío en cada vista (UX completa, no solo el caso feliz).",
])}`);

  // ═══ 7. Estructura de páginas ═══
  sections.push(`## 7 · Estructura de páginas / rutas

${bullets(spec.pages)}`);

  // ═══ 8. Modelo de datos ═══
  sections.push(`## 8 · Modelo de datos (Supabase)

Aplicar el siguiente esquema en una migración SQL versionada (\`supabase/migrations\`):

\`\`\`sql
${dataModelSql(context, spec, category.id)}
\`\`\`

**Reglas RLS:**
${bullets([
  "Tablas públicas (catálogo, contenido) → SELECT para anónimos, escritura solo server.",
  "Tablas sensibles (pedidos, citas, mensajes) → SOLO server (service role) o dueño autenticado.",
  "Habilitar \`alter table ... enable row level security\` en todas.",
])}`);

  // ═══ 9. Flujo de usuario ═══
  sections.push(`## 9 · Flujo de usuario principal

${bullets(spec.userFlow.map((f, i) => `${i + 1}. ${f}`))}`);

  // ═══ 10. API routes e integraciones ═══
  sections.push(`## 10 · API routes e integraciones

${bullets(spec.integrations)}

**Integraciones externas según lo capturado:**
${bullets([
  si(context.pagos) ? "Stripe: PaymentIntent + webhooks para confirmar pagos." : "Sin pasarela de pagos (contacto directo).",
  "WhatsApp: deep links (wa.me) para contacto directo.",
  "Correos transaccionales: Resend (confirmaciones de cita, pedido o contacto).",
  si(context.mapas) ? "Mapas: Leaflet (ligero, open-source) o Google Maps." : "Sin mapa.",
].filter(Boolean))}

> Si una credencial real no está disponible, implementar con modo sandbox/datos de prueba y documentar en el README cómo activarla.`);

  // ═══ 11. Diseño y UX ═══
  const estiloTexto = si(context.animaciones)
    ? `moderno, con micro-interacciones y animaciones sutiles (Framer Motion), respetando la referencia del cliente${context.referencia ? ` (${context.referencia})` : ""}.`
    : "sobrio, limpio y directo, con foco en la claridad.";
  sections.push(`## 11 · Diseño y experiencia de usuario

${bullets([
  `Estilo: ${estiloTexto}`,
  "Sistema de diseño: paleta definida en CSS variables, tipografía legible (Inter/System), componentes shadcn/ui consistentes.",
  "Estados visuales completos: loading (skeletons), vacío, error y éxito en cada flujo.",
  "Micro-copy profesional en español (México), tono cercano pero formal.",
  si(context.animaciones) ? "Animaciones de entrada suaves, sin sacrificar rendimiento (transform/opacity)." : "Movimiento mínimo, transiciones rápidas.",
  "Favicon, íconos PWA y Open Graph image para compartir en redes.",
  si(context.pwa) ? "Manifest + service worker para instalación como app en móvil." : "Sin PWA.",
])}`);

  // ═══ 12. Despliegue en Vercel ═══
  sections.push(`## 12 · Configuración de despliegue en Vercel

1. Subir el repositorio a GitHub (rama \`main\`).
2. Importar en Vercel → framework **Next.js** (detección automática).
3. Variables de entorno (Production):
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://<dominio>.vercel.app
RESEND_API_KEY=            # si hay correos
STRIPE_SECRET_KEY=         # si hay pagos
STRIPE_WEBHOOK_SECRET=     # si hay pagos
\`\`\`
4. Ejecutar las migraciones de Supabase antes del primer deploy.
5. Configurar dominios personalizado y SSL (auto).
6. Verificar con **Lighthouse** en producción antes de entregar.`);

  // ═══ 13. QA / Definition of Done ═══
  sections.push(`## 13 · Garantía de calidad (Definition of Done)

Un ticket/feature se considera terminado cuando:

${bullets([
  "Compila con \`npm run build\` sin errores y sin warnings de tipos.",
  "Lighthouse ≥ 90 en las 4 métricas (móvil).",
  "Responsive probado en 360px / 768px / 1440px.",
  "Todos los flujos tienen estados de carga, vacío, error y éxito.",
  "Los formularios validan con Zod y muestran errores claros.",
  "El código está tipado, formateado (Prettier) y sin imports muertos.",
  "Los secretos NO están en el código ni en el repo.",
  "README actualizado con instrucciones de instalación y variables.",
])}`);

  // ═══ 14. Notas del desarrollador ═══
  sections.push(`## 14 · Notas del desarrollador

- Trabaja con **criterio senior**: si algo del brief es ambiguo, toma una decisión razonable y documéntala en el README (no dejes la tarea bloqueada).
- Prioriza la **experiencia del cliente final**: cada pantalla debe verse como un producto terminado.
- Usa datos de demostración realistas (nombres, productos, horarios) para que el deploy en Vercel se vea vivo desde el primer momento.
- No inventes funcionalidades fuera del alcance; si crees que falta algo crítico, agrégalo como \`TODO\` con justificación.
- Mantén commits atómicos y mensajes claros en español.
- El resultado final DEBE poder abrirse en producción (Vercel) y entregarse al cliente sin que el cliente tenga que "arreglar" nada técnico.

${analysis.recomendaciones.length ? `**Recomendaciones detectadas:**\n${bullets(analysis.recomendaciones)}` : ""}`);

  // ═══ 15. Criterios de aceptación ═══
  sections.push(`## 15 · Criterios de aceptación (para validar con el cliente)

${bullets([
  "El sitio abre rápido y se ve impecable en celular, tablet y computadora.",
  ...features.slice(0, 10).map((f) => `"${f.replace(/^[-•]\s*/, "")}" funciona de punta a punta.`),
  "Los formularios y confirmaciones llegan correctamente (correo/WhatsApp).",
  si(context.dashboard) ? "El panel permite gestionar la información principal sin fricción." : null,
  si(context.pagos) ? "Se puede completar un pago de prueba de extremo a extremo." : null,
  "El proyecto está desplegado en Vercel y el cliente puede compartir el enlace.",
].filter((l): l is string => l !== null))}`);

  // ═══ Entregables ═══
  sections.push(`## Anexo · Entregables finales

${bullets(entregables)}

---
*Documento generado automáticamente por el sistema de cotización. Revisar y ajustar con el cliente en el kickoff antes de iniciar desarrollo.*`);

  return sections.join("\n\n");
}

// ─── Helpers internos ──────────────────────────────────────────────

function buildFallbackFeatures(ctx: ChatContext, category: PricingCategory): string[] {
  const f: string[] = [];
  f.push("Página principal con la información del negocio");
  f.push("Diseño responsive profesional");
  if (si(ctx.autenticacion)) f.push("Cuentas de usuario (registro/login)");
  if (si(ctx.baseDeDatos)) f.push("Base de datos segura");
  if (si(ctx.pagos)) f.push("Pagos en línea");
  if (si(ctx.dashboard)) f.push("Panel de administración");
  if (si(ctx.mapas)) f.push("Mapa con ubicación");
  if (si(ctx.documentos)) f.push("Generación de documentos/PDF");
  if (si(ctx.chat)) f.push("Contacto por WhatsApp/chat");
  if (si(ctx.citas) || category.id === "citas") f.push("Agendamiento de citas en línea");
  if (si(ctx.animaciones)) f.push("Animaciones modernas");
  if (si(ctx.seo)) f.push("SEO optimizado");
  if (si(ctx.pwa)) f.push("Instalable como app (PWA)");
  f.push("Formulario de contacto");
  return Array.from(new Set(f));
}

function dataModelSql(ctx: ChatContext, spec: CategorySpec, categoryId: string): string {
  const tables = [...spec.dataModel];

  // Tablas adicionales según flags del contexto
  if (si(ctx.documentos) || si(ctx.pagos)) {
    tables.push("documents(id, ref_type, ref_id, url, created_at) — documentos generados.");
  }
  if (si(ctx.chat)) {
    tables.push("contact_messages(id, nombre, email, telefono, mensaje, leido, created_at) — mensajes de contacto/chat.");
  }

  const rows = tables.map((t) => `-- ${t}`).join("\n");
  return `-- ${categoryId.toUpperCase()} — esquema base (ajustar en kickoff)

${rows}

-- Índices y RLS recomendados
-- alter table public.<tabla> enable row level security;
-- create index ... on ... (created_at desc);`;
}
