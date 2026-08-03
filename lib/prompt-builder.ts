/**
 * GENERADOR DE PACK DE PROMPTS PARA ROO CODE + DEEPSEEK (mobile-first, por fases)
 *
 * En lugar de un único documento enorme, emite un PACK de 5 prompts
 * secuenciales. Cada prompt es una FASE que se pega en un CHAT NUEVO de
 * Roo Code + DeepSeek, con su propio contexto compacto e instrucciones
 * detalladas. Así se AHORRAN tokens (cada chat carga solo lo que necesita)
 * y la web queda construida al 100%, primero para CELULAR (mobile-first)
 * y luego escalada a tablet/escritorio.
 *
 * Fases: 1) Fundación + design tokens + base mobile-first · 2) Shell
 * (header/footer) + componentes UI · 3) Secciones de contenido · 4) Lógica,
 * API e integraciones · 5) QA, rendimiento y despliegue en Vercel.
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
  // ── Comercial / venta de valor ──
  giro?: string;
  punto_venta?: string;
  dolor?: string;
  beneficios?: string[];
  valor_negocio?: string;
  costo_omision?: string;
  presupuesto_giro?: string;
  cuota_mensual?: number;
  alcance_ajustado?: boolean;
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

// ─── Generador del PACK de prompts por fases (Roo Code + DeepSeek) ───
//
// En lugar de un único documento enorme (que obliga a cargar TODO el contexto
// en un solo chat y quema tokens), este generador emite un PACK de 5 prompts
// secuenciales. Cada prompt es una FASE que se pega en un CHAT NUEVO de
// Roo Code + DeepSeek, con su propio contexto compacto y sus instrucciones.
// Resultado: menos tokens por chat, contexto fresco, y la web queda al 100%,
// construida PRIMERO para celular (mobile-first) y luego escalada a los demás
// tamaños.

interface PackBase {
  clientName: string;
  businessDescription: string | null;
  category: PricingCategory;
  nivel: Nivel;
  context: ChatContext;
  analysis: PromptAnalysis;
  spec: CategorySpec;
  features: string[];
  stack: string[];
  entregables: string[];
  today: string;
}

export function buildTechnicalPrompt(opts: PromptBuildOptions): string {
  const { clientName, businessDescription, category, nivel, context, analysis } = opts;
  const spec = CATEGORY_SPECS[category.id] ?? CATEGORY_SPECS.landing;
  const today = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  const features = analysis.funcionalidades.length
    ? analysis.funcionalidades
    : buildFallbackFeatures(context, category);

  const stack = analysis.stack_tecnico.length ? analysis.stack_tecnico : category.stack;
  const entregables = analysis.entregables.length ? analysis.entregables : category.entregables;

  const base: PackBase = { clientName, businessDescription, category, nivel, context, analysis, spec, features, stack, entregables, today };
  const ctxCompact = buildCompactContext(base);

  const chats: string[] = [];
  chats.push(buildPreamble(base, ctxCompact));
  chats.push(buildChat1Fundacion(base, ctxCompact));
  chats.push(buildChat2Shell(base, ctxCompact));
  chats.push(buildChat3Contenido(base, ctxCompact));
  chats.push(buildChat4Logica(base, ctxCompact));
  chats.push(buildChat5QaDeploy(base, ctxCompact));

  return chats.join("\n\n\n");
}

// ─── Helpers del pack por fases ────────────────────────────────────

/** Contexto compacto y autosuficiente que acompaña a CADA fase. */
function buildCompactContext(base: PackBase): string {
  const { context, analysis } = base;
  const estilo = si(context.animaciones)
    ? `moderno, con micro-interacciones y animaciones sutiles${context.referencia ? ` (referencia del cliente: ${context.referencia})` : ""}`
    : "sobrio, limpio y directo";
  const lines = [
    `PROYECTO: ${analysis.categoria} para ${base.clientName || "el cliente"} · Nivel ${analysis.nivelLabel}.`,
    `GIRO: ${analysis.giro ?? "negocio local"}${analysis.presupuesto_giro ? ` · Presupuesto del giro: ${analysis.presupuesto_giro}` : ""}.`,
    `STACK: Next.js 14+ (App Router) · TypeScript estricto · Tailwind CSS · shadcn/ui${si(context.animaciones) ? " · Framer Motion" : ""}${si(context.baseDeDatos) || si(context.autenticacion) || base.category.id !== "landing" ? " · Supabase" : ""} · Vercel.`,
    `ESTILO: ${estilo}.`,
    context.servicios ? `SERVICIOS/OFERTA A MOSTRAR: ${context.servicios}.` : null,
    context.estructuraWeb ? `ESTRUCTURA ACORDADA CON EL CLIENTE: ${context.estructuraWeb}.` : null,
    context.negocioDescripcion ? `NEGOCIO: "${context.negocioDescripcion}".` : null,
    "REGLAS GLOBALES: mobile-first (360px → 1440px), Lighthouse ≥ 90, TS estricto, componentes tipados, UI y código en español, placeholders visuales de alta calidad, sin cajas vacías ni imágenes rotas.",
  ].filter((l): l is string => l !== null);
  return lines.join("\n");
}

/** Metodología mobile-first obligatoria (se instala en el CHAT 1 y se recuerda en los demás). */
function buildMobileFirstRules(): string {
  return `### Metodología MOBILE-FIRST (obligatoria en TODO el proyecto)

Esta web se diseña y construye PRIMERO para celular (360px) y DESPUÉS se escala a tablet y escritorio. No es negociable: la mayoría de los clientes entrarán por teléfono.

1. **Diseña en 360px primero.** Los estilos base (sin prefijo) son los del móvil. Escala hacia arriba con \`sm:\`, \`md:\`, \`lg:\`. NUNCA al revés (no uses prefijos para "arreglar" el móvil).
2. **Fluido, no fijo.** Prohibido \`width: 1200px\` o \`min-width\` grandes en bloques. Usa \`w-full\`, \`max-w-*\`, \`grid\` con \`grid-cols-1\` → \`sm:grid-cols-2\` → \`lg:grid-cols-3\`, y unidades relativas (\`rem\`, \`clamp()\`, \`vw\` con límite).
3. **Cero scroll horizontal.** \`overflow-x-hidden\` en el contenedor raíz; revisa que ningún elemento (imágenes, tablas, tooltips) desborde los 360px.
4. **Objetivos táctiles ≥ 44×44px** para botones, enlaces y controles del menú móvil, con espacio suficiente entre ellos.
5. **Navegación móvil real:** header con logo + menú (hamburguesa) que abre un panel deslizable o dropdown accesible (\`aria-expanded\`, foco gestionado, cierra al tocar un enlace). En escritorio, el mismo header muestra la navegación horizontal.
6. **Tipografía escalable:** \`text-*\` de Tailwind y \`clamp()\` en títulos grandes (hero); nada de tamaños fijos en px que rompan en pantallas chicas.
7. **Imágenes:** \`next/image\` con \`fill\` dentro de contenedores con \`aspect-ratio\`, \`sizes\` correcto y \`alt\` en español; nunca fijes un ancho mayor al viewport.
8. **Prueba SIEMPRE el modo responsive del navegador** en 360px, 375px, 768px, 1024px y 1440px, y corrige cualquier desbordamiento o superposición antes de dar por terminada la fase.`;
}

function buildEstiloTexto(base: PackBase): string {
  return si(base.context.animaciones)
    ? `moderno, con micro-interacciones y animaciones sutiles (Framer Motion), respetando la referencia del cliente${base.context.referencia ? ` (${base.context.referencia})` : ""}`
    : "sobrio, limpio y directo, con foco en la claridad";
}

function buildPreamble(base: PackBase, ctxCompact: string): string {
  const { clientName, analysis, context, today } = base;
  return `# 📦 PACK DE PROMPTS · ${analysis.categoria} — para Roo Code + DeepSeek (mobile-first, por fases)

> Generado por tu consultor senior (${today}) para que Roo Code + DeepSeek construyan la web **al 100%**.
> Estrategia: **celular primero** y **un chat por fase** para **ahorrar tokens** — cada chat carga solo el contexto que necesita.

## Cómo usar este pack (IMPORTANTE)

1. Contiene **5 prompts secuenciales**: CHAT 1 → CHAT 5. Cada uno se pega en un **chat NUEVO** de Roo Code + DeepSeek, en orden. NO pegues varios en el mismo chat.
2. Ejecuta el CHAT 1 y espera el marcador \`FIN_DE_FASE_1\`. Luego abre un **chat nuevo** y pega el CHAT 2; espera \`FIN_DE_FASE_2\`; y así hasta el CHAT 5.
3. Cada chat es **autosuficiente**: trae su propio contexto compacto + las instrucciones de su fase. El agente no necesita "recordar" el chat anterior.
4. Al terminar el CHAT 5 tendrás la página construida, probada en todos los tamaños y desplegada en Vercel.

### Ficha del proyecto

| Campo | Valor |
|---|---|
| Cliente | ${clientName || "Por confirmar"} |
| Tipo de proyecto | ${analysis.categoria} |
| Nivel | ${analysis.nivelLabel} |
| Presupuesto estimado | ${precioMXN(analysis.precio_min)} – ${precioMXN(analysis.precio_max)} |
| Tiempo estimado | ${analysis.tiempo_estimado} |
| Despliegue | Vercel (producción) |
| Fecha de entrega acordada | ${context.fechaEntrega || "Por definir"} |
| Mantenimiento | ${si(context.mantenimiento) ? "Sí, plan mensual" : "No incluido (opcional)"} |

### Contexto global del proyecto

${ctxCompact}

---
Copia cada bloque \`CHAT N\` por separado y pégalo en su propio chat. Empieza por el CHAT 1 👇`;
}

function buildChat1Fundacion(base: PackBase, ctxCompact: string): string {
  const { category, analysis } = base;
  return `## 🧩 CHAT 1 · FUNDACIÓN DEL PROYECTO + DESIGN TOKENS + BASE MOBILE-FIRST

> Pega este bloque en un **chat NUEVO** de Roo Code + DeepSeek y ejecútalo. No pegues el CHAT 2 aquí.

### Rol
Actúa como **desarrollador senior de Next.js**. Estás INICIANDO un proyecto desde cero y vas a dejarlo listo para recibir las siguientes fases (interfaz, contenido, lógica y despliegue). Tu criterio es el de alguien que ya entregó decenas de webs en producción.

### Contexto del proyecto
${ctxCompact}

### Objetivo de esta fase
Dejar la base funcionando con \`npm run dev\`: sistema de diseño definido (tokens), layout raíz listo, estructura de carpetas y la metodología mobile-first documentada. Al terminar NO debe haber aún secciones visibles: solo el esqueleto estilizado.

### Pasos
1. **Scaffold**: crea el proyecto Next.js 14+ (App Router) con TypeScript estricto, Tailwind CSS y shadcn/ui configurado. Si el proyecto ya existe, verifica que compile y que ESLint + Prettier estén listos.
2. **Design tokens**: define en \`globals.css\` (CSS variables) la paleta, tipografía, radios, sombras y escala de espaciado según el estilo del cliente (**${buildEstiloTexto(base)}**). Conecta las variables a \`tailwind.config\` (colores, fuentes, breakpoints y \`container\`).
3. **Layout raíz**: \`app/layout.tsx\` con \`lang="es"\`, fuentes (Inter o similar), metadata (title = nombre del negocio, description y Open Graph) y el contenido mínimo (el header/footer se construyen en el CHAT 2).
4. **Base CSS**: reset, \`overflow-x-hidden\` en el cuerpo (regla mobile-first), utilidad de contenedor/sección, estilos base de encabezados, enlaces y foco accesible.
5. **Estructura de carpetas**: crea la estructura recomendada:
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
6. **README**: documenta arranque (instalación, comandos, variables de entorno) y pega la metodología mobile-first de abajo para que quede como referencia del proyecto.

### Reglas de diseño
${bullets([
  `Estilo: ${buildEstiloTexto(base)}.`,
  "Sistema de diseño: paleta en CSS variables, tipografía legible, componentes shadcn/ui consistentes.",
  "Favicon, íconos PWA y Open Graph image para compartir en redes.",
])}

### Metodología mobile-first (aplícala en todo el proyecto)
${buildMobileFirstRules()}

### Definition of Done de esta fase
- \`npm run dev\` corre sin errores y carga un shell básico pero con la paleta correcta.
- Tokens definidos en CSS variables y conectados a Tailwind.
- \`npm run build\` compila sin errores ni warnings de tipos.
- Estructura de carpetas creada y README documentado (arranque + mobile-first).

Cuando termines, responde ÚNICAMENTE con el marcador \`FIN_DE_FASE_1\` seguido de un resumen de 3-5 líneas (archivos creados y comandos). No sigas con la siguiente fase.`;
}

function buildChat2Shell(base: PackBase, ctxCompact: string): string {
  return `## 🧩 CHAT 2 · SHELL (HEADER/FOOTER) + COMPONENTES UI MOBILE-FIRST

> Pega este bloque en un **chat NUEVO** de Roo Code + DeepSeek y ejecútalo. El proyecto YA existe (lo dejó listo el CHAT 1).

### Rol
Actúa como **desarrollador senior de UI**. Tu trabajo: construir el esqueleto visual (header, footer, contenedores) y la librería de componentes, todo **mobile-first**.

### Contexto del proyecto
${ctxCompact}

### Reglas mobile-first (resumen)
- Diseña en **360px primero**; escala con \`sm:\`/\`md:\`/\`lg:\`. Cero scroll horizontal. Objetivos táctiles ≥ 44px. Header con menú móvil accesible.

### Qué construir
1. **Header responsive**: logo + botón de menú (hamburguesa) en móvil que abre un panel deslizable (Sheet/Dialog) con \`aria-expanded\`, foco gestionado y cierre al tocar un enlace. En \`md:\`+ muestra la navegación horizontal. Sticky con fondo translúcido y buen contraste.
2. **Footer**: datos del negocio, enlaces, redes sociales, WhatsApp, aviso de privacidad (LFPDPPP / México) y créditos.
3. **Primitivas shadcn/ui** necesarias: Button (variants primary/secondary/outline/ghost + tamaños táctiles), Input, Textarea, Label, Card, Badge, Skeleton, Accordion, Sheet/Dialog, Sonner/Toast y Separator.
4. **Botón flotante de WhatsApp**: fixed, bien posicionado (no tapa contenido), tamaño ≥ 48px, \`aria-label\`, visible siempre o tras pasar el hero.
5. **Contenedores/secciones**: \`container\` con padding lateral correcto en móvil (\`px-4\`/\`px-5\`), espaciado vertical coherente entre secciones.

### Criterios de calidad
- Cada componente: TypeScript tipado, accesible (foco visible, roles correctos) y consistente con los tokens del CHAT 1.
- Prueba en **360 / 768 / 1440px**: sin desbordes, menú móvil funcional y footer sin romperse.

Cuando termines, responde ÚNICAMENTE con el marcador \`FIN_DE_FASE_2\` + resumen breve (componentes creados). No sigas con la siguiente fase.`;
}

function buildChat3Contenido(base: PackBase, ctxCompact: string): string {
  const { context, analysis, spec } = base;
  const serviciosBloque = context.servicios
    ? `### Servicios / oferta a mostrar
El cliente quiere destacar los siguientes servicios u oferta. Crea una sección de servicios (o catálogo) bien armada, con cada ítem:
${bullets(
    context.servicios
      .split(/[,;•\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `${s} — con descripción breve, beneficios y CTA de contacto.`)
  )}`
    : `### Sección de servicios
El cliente no detalló servicios. Incluye una sección de servicios (o de lo que ofrece) con 3-4 ítems placeholder realistas para el giro **${analysis.giro ?? "del cliente"}**, cada uno con descripción, beneficios y CTA de contacto.`;
  return `## 🧩 CHAT 3 · SECCIONES DE CONTENIDO (LA PÁGINA VISIBLE) — MOBILE-FIRST

> Pega este bloque en un **chat NUEVO** de Roo Code + DeepSeek y ejecútalo. El shell y los componentes ya existen (CHAT 2).

### Rol
Actúa como **desarrollador senior de UI/UX y copywriter técnico**. Tu trabajo: construir TODAS las secciones visibles de la página con copy que vende y con imágenes, **mobile-first**. Al terminar, la página debe verse **COMPLETA y profesional en el celular**.

### Contexto del proyecto
${ctxCompact}

### Estrategia comercial que la página DEBE comunicar
- **Mensaje de venta:** ${analysis.punto_venta ?? "Comunicar profesionalismo y convertir visitas en clientes."}
- **El problema que resuelve:** ${analysis.dolor ?? "El cliente pierde oportunidades por no tener presencia digital clara."}
- **Beneficios de negocio:** ${bullets(analysis.beneficios?.length ? analysis.beneficios : ["Presencia profesional", "Captación de clientes", "Ahorro de tiempo"])}
- **Propuesta de valor (copy de portada y secciones):** ${analysis.valor_negocio ?? ""}
- **Costo de omisión (por qué actuar ahora):** ${analysis.costo_omision ?? ""}

> **Regla de oro:** el copy de la portada y de cada sección responde "¿qué gano yo como dueño del negocio?". La página VENDE, no solo describe servicios.

### Secciones a construir (${analysis.categoria} — ${spec.pages.length} bloques)
${bullets(spec.pages)}

${serviciosBloque}

${context.estructuraWeb
    ? `### Sitemap / estructura acordada con el cliente
El cliente describió la estructura así: "${context.estructuraWeb}". Asegúrate de que la navegación y las secciones reflejen esta estructura de forma completa y coherente.`
    : `### Estructura completa
Arma la web COMPLETA: hero, servicios, sobre nosotros (si aplica), testimonios (opcional), CTA final y contacto con formulario/WhatsApp.`}

### Imágenes (OBLIGATORIO: nunca cajas vacías)
La página DEBE verse completa desde el primer deploy. Cuando el cliente no tenga fotos reales, usa imágenes placeholder de alta calidad; **nunca dejes cajas grises, espacios vacíos ni imágenes rotas**.

**Fuentes permitidas (gratuitas / licenciadas):**
- \`https://picsum.photos/seed/<slug-del-negocio>/1200/800\` — foto con semilla estable (no cambia en cada carga).
- \`https://placehold.co/1200x800/2563eb/ffffff?text=Tu+Negocio\` — placeholder con texto.
- \`https://images.unsplash.com/...\` — URLs directas de fotos libres (verificar licencia).

**Reglas:**
- Usa la imagen ADECUADA a cada sección: hero, servicios, galería/portafolio, productos, comida (si es restaurante), local/consultorio (si es clínica, estética, taller, barbería), etc.
- \`next/image\` con \`fill\` o dimensiones correctas, \`alt\` descriptivo en español y \`loading="lazy"\` (excepto el hero, que va con \`priority\`).
- No uses imágenes con derechos de autor no licenciadas ni hotlinks frágiles.
- Crea en el README una sección "Reemplazar imágenes" que indique al cliente cómo poner sus fotos reales sin tocar código.

### SEO
Metadata dinámica por página, Open Graph, datos estructurados JSON-LD (LocalBusiness), \`sitemap.xml\`, \`robots.txt\` y canonical tags.

### Criterios de calidad
- En **360px** la página se ve completa: nada se corta, no hay scroll horizontal, los CTA se tocan bien y el hero se lee sin hacer zoom.
- Escala correcta a **768 / 1024 / 1440px**.
- Ninguna sección con cajas grises, textos placeholder feos ("lorem ipsum") ni imágenes rotas.

Cuando termines, responde ÚNICAMENTE con el marcador \`FIN_DE_FASE_3\` + resumen breve. No sigas con la siguiente fase.`;
}

function buildChat4Logica(base: PackBase, ctxCompact: string): string {
  const { context, spec, category } = base;
  const reqs = buildFunctionalRequirements(context, spec, category).join("\n");
  return `## 🧩 CHAT 4 · LÓGICA, API ROUTES E INTEGRACIONES

> Pega este bloque en un **chat NUEVO** de Roo Code + DeepSeek y ejecútalo. Las secciones visibles ya existen (CHAT 3).

### Rol
Actúa como **desarrollador senior full-stack**. Tu trabajo: dar vida a los formularios, crear las API routes, el modelo de datos y las integraciones, todo con TypeScript estricto y validación Zod.

### Contexto del proyecto
${ctxCompact}

### Requisitos funcionales a implementar
${reqs}

> Prioridades: **Alta** (bloquea la entrega), **Media** (esperada), **Baja** (nice-to-have).

### API routes e integraciones
${bullets(spec.integrations)}

**Integraciones externas según lo capturado:**
${bullets([
    si(context.pagos) ? "Stripe: PaymentIntent + webhooks para confirmar pagos." : "Sin pasarela de pagos (contacto directo).",
    "WhatsApp: deep links (wa.me) para contacto directo.",
    "Correos transaccionales: Resend (confirmaciones de cita, pedido o contacto).",
    si(context.mapas) ? "Mapas: Leaflet (ligero, open-source) o Google Maps." : "Sin mapa.",
  ].filter(Boolean))}

> Si una credencial real no está disponible, implementa con modo sandbox/datos de prueba y documenta en el README cómo activarla.

### Modelo de datos (Supabase)
Aplica el esquema en una migración SQL versionada (\`supabase/migrations\`):

\`\`\`sql
${dataModelSql(context, spec, category.id)}
\`\`\`

**Reglas RLS:**
${bullets([
    "Tablas públicas (catálogo, contenido) → SELECT para anónimos, escritura solo server.",
    "Tablas sensibles (pedidos, citas, mensajes) → SOLO server (service role) o dueño autenticado.",
    "Habilitar \`alter table ... enable row level security\` en todas.",
  ])}

### Flujo de usuario a validar de extremo a extremo
${bullets(spec.userFlow.map((f, i) => `${i + 1}. ${f}`))}

### Estados de UI
Cada formulario/flujo debe tener estados de **carga, error, vacío y éxito** con mensajes claros en español (el diseño base ya existe del CHAT 2/3).

### Seguridad
- Secretos SOLO en variables de entorno del servidor; el cliente usa solo las keys públicas.
- Toda API route valida su input con **Zod** y responde JSON tipado.

### Definition of Done
- Los formularios envían y confirman de extremo a extremo (con datos de prueba).
- \`npm run build\` compila sin errores ni warnings.
- README documenta cómo activar cada integración (env vars + pasos).

Cuando termines, responde ÚNICAMENTE con el marcador \`FIN_DE_FASE_4\` + resumen breve (rutas API y tablas). No sigas con la siguiente fase.`;
}

function buildChat5QaDeploy(base: PackBase, ctxCompact: string): string {
  const { context, analysis, features, entregables } = base;
  return `## 🧩 CHAT 5 · QA, RENDIMIENTO Y DESPLIEGUE EN VERCEL

> Pega este bloque en un **chat NUEVO** de Roo Code + DeepSeek y ejecútalo. El proyecto está completo (CHAT 4).

### Rol
Actúa como **desarrollador senior de calidad y DevOps**. Tu trabajo: auditar, pulir, probar en TODOS los tamaños (celular primero) y desplegar a producción.

### Contexto del proyecto
${ctxCompact}

### Requisitos no funcionales (auditar y cumplir)
${bullets([...NFR])}

### Garantía de calidad (Definition of Done)
${bullets([
    "Compila con \`npm run build\` sin errores y sin warnings de tipos.",
    "Lighthouse ≥ 90 en las 4 métricas (móvil).",
    "Responsive probado en 360px / 768px / 1440px.",
    "Todos los flujos tienen estados de carga, vacío, error y éxito.",
    "Los formularios validan con Zod y muestran errores claros.",
    "El código está tipado, formateado (Prettier) y sin imports muertos.",
    "Los secretos NO están en el código ni en el repo.",
    "README actualizado con instrucciones de instalación y variables.",
  ])}

### Prueba responsive final (celular primero)
- **360px**: la página se ve perfecta, sin scroll horizontal, CTA táctiles (≥ 44px), menú móvil funcional.
- **375 / 768 / 1024 / 1440px**: escalada correcta. Corrige lo que falle.

### Criterios de aceptación (para validar con el cliente)
${bullets([
    "El sitio abre rápido y se ve impecable en celular, tablet y computadora.",
    ...features.slice(0, 10).map((f) => `"${f.replace(/^[-•]\s*/, "")}" funciona de punta a punta.`),
    "Los formularios y confirmaciones llegan correctamente (correo/WhatsApp).",
    si(context.dashboard) ? "El panel permite gestionar la información principal sin fricción." : null,
    si(context.pagos) ? "Se puede completar un pago de prueba de extremo a extremo." : null,
    "El proyecto está desplegado en Vercel y el cliente puede compartir el enlace.",
  ].filter((l): l is string => l !== null))}

### Despliegue en Vercel
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
5. Configurar dominio personalizado y SSL (auto).
6. Verificar con **Lighthouse** en producción antes de entregar.

### Entregables finales
${bullets(entregables)}

### Notas finales
- Trabaja con **criterio senior**: si algo es ambiguo, toma una decisión razonable y documéntala en el README (no dejes la tarea bloqueada).
- Usa datos de demostración realistas para que el deploy se vea vivo desde el primer momento.
- El resultado final DEBE poder abrirse en producción y entregarse al cliente sin que el cliente tenga que "arreglar" nada técnico.
${analysis.recomendaciones.length ? `\n**Recomendaciones detectadas:**\n${bullets(analysis.recomendaciones)}` : ""}

Cuando termines, responde ÚNICAMENTE con el marcador \`FIN_DE_FASE_5\` + un resumen final del proyecto (URL de producción, cómo se probó en cada tamaño y pendientes opcionales).`;
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
