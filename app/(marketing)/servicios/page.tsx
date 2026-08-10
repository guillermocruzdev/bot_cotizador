import Link from "next/link";
import { ArrowRight, Bot, Check, Clock } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ServiceCard } from "@/components/ui/ServiceCard";
import { NivelBadge, NIVEL_LABELS } from "@/components/ui/NivelBadge";
import { CTAButton } from "@/components/ui/CTAButton";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { Checklist } from "@/components/ui/Checklist";
import { LiftCard } from "@/components/ui/LiftCard";
import { getWebTypeById } from "@/lib/agency-catalog";
import { getCategoryById } from "@/lib/pricing-catalog";
import { BOTS_CATALOG } from "@/lib/bots-catalog";
import { cn, formatMXN } from "@/lib/utils";
import type { WebTypeSpec } from "@/lib/agency-catalog";
import type { PricingCategory } from "@/lib/pricing-catalog";
import type { BotSpec } from "@/lib/bots-catalog";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo({
  title: "Servicios",
  description:
    "11 tipos de web para tu negocio con precios desde honestos: landing, ecommerce, webapp, menú digital, tarjeta digital y más. Asistentes IA desde $3,500 + $199/mes. Nexora.",
  path: "/servicios",
  keywords: [
    "servicios de páginas web",
    "tipos de web con IA",
    "landing page México",
    "ecommerce",
    "webapp",
    "menú digital",
    "asistentes IA",
    "Nexora",
  ],
});

/* ════════════════════════════════════════════════════════════════════
   PÁGINA DE SERVICIOS · VITRINA NEXORA (FASE 4)
   Fuente de verdad de precios/nombres: lib/agency-catalog.ts (regla #7).
   data/portfolio.json está vacío (FASE 5 lo llena con sync-agency-data),
   así que los precios "desde" salen de AGENCY_WEB_TYPES.precioDesde.
   Detalles de cada servicio con anclas (#<id>) en la misma página (la
   opción "una sola página con anclas" del plan FASE 4).
   ════════════════════════════════════════════════════════════════════ */

type ServicioExtras = {
  titulo: string;
  items: string[];
};

type ServicioDef = {
  /** id de AGENCY_WEB_TYPES / PRICING_CATALOG. */
  id: string;
  /** Nivel de producto N0–N5. */
  nivel: string;
  /** Descripción de 1 línea para la tarjeta (copy curado, sin precios). */
  descripcionCorta: string;
  /** Bloques extra tras "qué incluye" (escalón pro, verticales N4, N5…). */
  extras?: ServicioExtras[];
};

/** Las 11 categorías del motor, ordenadas por la escalera N0→N4. */
const SERVICIOS: ServicioDef[] = [
  {
    id: "link_in_bio",
    nivel: "N0",
    descripcionCorta:
      "Todos tus enlaces (WhatsApp, Instagram, TikTok) en una página con tu estilo, lista para tu bio.",
  },
  {
    id: "menu_digital",
    nivel: "N0",
    descripcionCorta:
      "Tu carta en línea con código QR en cada mesa. Cero apps, cero descargas.",
  },
  {
    id: "tarjeta_digital",
    nivel: "N0",
    descripcionCorta:
      "Tu tarjeta de presentación en línea: un link con tus datos, servicios y WhatsApp.",
  },
  {
    id: "landing",
    nivel: "N1",
    descripcionCorta:
      "La más vendida: presenta tu negocio y capta contactos. Se entrega en una semana.",
  },
  {
    id: "blog",
    nivel: "N1",
    descripcionCorta:
      "Publica artículos que posicionan en Google y atraen clientes orgánicos.",
  },
  {
    id: "portafolio",
    nivel: "N1",
    descripcionCorta:
      "Galería de tus proyectos con diseño impactante para vender con tu trabajo.",
  },
  {
    id: "corporativo",
    nivel: "N2",
    descripcionCorta:
      "Sitio de varias páginas que proyecta la imagen seria de tu empresa.",
  },
  {
    id: "citas",
    nivel: "N2",
    descripcionCorta:
      "Calendario en línea con confirmaciones y recordatorios automáticos.",
  },
  {
    id: "cotizador",
    nivel: "N2",
    descripcionCorta:
      "Tus clientes piden presupuesto en línea y el sistema calcula el precio solo.",
  },
  {
    id: "ecommerce",
    nivel: "N3",
    descripcionCorta:
      "Tienda online con catálogo, carrito y pagos. Con escalón 'pro' por features.",
    extras: [
      {
        titulo: "Escalón Pro (features que suman)",
        items: [
          "Control de inventario avanzado (existencias, tallas y alertas de stock)",
          "Reportes de ventas por día, mes o producto",
          "Facturación CFDI con RFC para tus clientes",
          "Varios vendedores internos con sus propias cuentas",
        ],
      },
    ],
  },
  {
    id: "webapp",
    nivel: "N4",
    descripcionCorta:
      "Sistemas a medida: verticales N4 y ecosistemas N5 (marketplace, SaaS, ERP).",
    extras: [
      {
        titulo: "Verticales · Nivel 4",
        items: [
          "Inmobiliaria (filtros, leads por propiedad, panel de publicación)",
          "Membresías y suscripciones con cobro recurrente",
          "Cursos en línea con progreso y certificados",
          "Telemedicina (expediente y videollamada)",
          "Directorio de negocios con fichas autogestionables",
        ],
      },
      {
        titulo: "Ecosistemas · Nivel 5 (propuesta formal)",
        items: [
          "Marketplace multi-vendedor",
          "Marketplace con split de pagos / escrow",
          "SaaS multi-tenant con billing automático",
          "ERP / CRM a medida con módulos de operación",
        ],
      },
    ],
  },
];

/** Resuelve cada servicio: spec (catálogo agencia) + pricing (catálogo motor). */
const SERVICIOS_CON_DETALLE: {
  id: string;
  nivel: string;
  descripcionCorta: string;
  extras?: ServicioExtras[];
  spec: WebTypeSpec;
  pricing: PricingCategory;
}[] = SERVICIOS.map((s) => {
  const spec = getWebTypeById(s.id);
  const pricing = getCategoryById(s.id);
  return spec && pricing ? { ...s, spec, pricing } : null;
}).filter((s): s is NonNullable<typeof s> => s !== null);

/* ── Escalera de niveles N0–N5 (consistente con la cartera) ── */
const NIVELES: { nivel: string; ejemplos: string; descripcion: string }[] = [
  {
    nivel: "N0",
    ejemplos: "Link-in-bio · Menú digital · Tarjeta digital",
    descripcion:
      "Presencia mínima a bajo costo: tu información en línea en 1–2 días.",
  },
  {
    nivel: "N1",
    ejemplos: "Landing · Portafolio · Blog",
    descripcion:
      "Tu negocio en Google: presenta, muestra y publica para que te encuentren.",
  },
  {
    nivel: "N2",
    ejemplos: "Corporativo · Citas · Cotizador",
    descripcion:
      "Herramientas que operan tu negocio: citas, presupuestos y multi-página.",
  },
  {
    nivel: "N3",
    ejemplos: "E-commerce · E-commerce pro",
    descripcion:
      "Vende en línea con catálogo, carrito y pagos (con escalón pro).",
  },
  {
    nivel: "N4",
    ejemplos: "Webapp · Inmobiliaria · Membresías · Cursos · Telemedicina · Directorio",
    descripcion: "Sistemas a medida por vertical, con paneles y datos propios.",
  },
  {
    nivel: "N5",
    ejemplos: "Marketplace · SaaS · ERP",
    descripcion:
      "Plataformas multi-tenant, marketplace y ERP. Propuesta formal, no precio cerrado.",
  },
];

/* ── Card de asistente IA (add-on recurrente) ── */
function BotCard({ bot }: { bot: BotSpec }) {
  return (
    <LiftCard className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between gap-2">
        <Bot className="h-5 w-5 text-brand-600" />
        <span className="rounded-full bg-night-900/5 px-2.5 py-0.5 font-mono text-xs text-night-700">
          {bot.casoUso}
        </span>
      </div>
      <h3 className="mt-4 font-heading text-base font-bold text-night-900">
        {bot.nombre}
      </h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">
        {bot.descripcion}
      </p>
      <p className="mt-4 border-t border-night-900/10 pt-4 font-mono text-sm text-night-700">
        desde {formatMXN(bot.precioSetup)}{" "}
        <span className="text-muted-foreground">+</span>{" "}
        {formatMXN(bot.cuotaMensual)}
        <span className="text-muted-foreground">/mes</span>
      </p>
    </LiftCard>
  );
}

export default function ServiciosPage() {
  return (
    <>
      {/* ── Hero de la página ── */}
      <section className="relative isolate overflow-hidden bg-night-900 text-white">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand-600/25 blur-3xl" />
          <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-brand-700/25 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <p className="font-mono text-xs uppercase tracking-widest text-brand-300">
            &gt; servicios
          </p>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Webs que venden,{" "}
            <span className="text-brand-300">a la medida de tu negocio</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-slate-300">
            Del link in bio a la plataforma completa: 11 tipos de web con precio
            desde honesto, cotizables en minutos con Alex. Sin letras chiquitas
            y con soporte real.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CTAButton asChild size="lg">
              <Link href="/chat">
                Cotizar con Alex <ArrowRight className="h-5 w-5" />
              </Link>
            </CTAButton>
            <WhatsAppButton
              variant="inline"
              label="Dudas por WhatsApp"
              message="Hola Nexora, quiero información de sus servicios"
            />
          </div>
        </div>
      </section>

      {/* ── Grid de las 11 categorías ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="catálogo"
            title="Las 11 webs que cotizamos"
            subtitle="Elige la que encaje con tu negocio y tócala para ver qué incluye. Cada una con precio desde honesto (IVA incluido)."
          />
        </FadeIn>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICIOS_CON_DETALLE.map((s, i) => (
            <FadeIn key={s.id} delay={Math.min(i * 0.04, 0.25)}>
              <ServiceCard
                nombre={s.spec.nombre}
                descripcion={s.descripcionCorta}
                nivel={s.nivel}
                precioDesde={s.spec.precioDesde}
                detalleHref={`#${s.id}`}
              />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Detalle de cada servicio (anclas) ── */}
      {SERVICIOS_CON_DETALLE.map((s, i) => (
        <section
          key={s.id}
          id={s.id}
          className={cn("scroll-mt-24", i % 2 === 1 && "bg-white")}
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
                {/* ── Columna izquierda: título, precio, ideal para, CTA ── */}
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <NivelBadge nivel={s.nivel} />
                    <span className="inline-flex items-center gap-1.5 font-mono text-sm text-night-700">
                      <Clock className="h-4 w-4 text-brand-600" />
                      {s.spec.tiempoEntrega}
                    </span>
                  </div>
                  <h2 className="mt-4 font-heading text-2xl font-bold text-night-900 sm:text-3xl">
                    {s.spec.nombre}
                  </h2>
                  <p className="mt-3 text-night-700">{s.spec.descripcion}</p>

                  <div className="mt-6 rounded-2xl border border-brand-600/20 bg-brand-600/5 p-5">
                    <p className="font-mono text-xs uppercase tracking-widest text-brand-700">
                      Desde
                    </p>
                    <p className="mt-1 font-heading text-4xl font-bold text-night-900">
                      {formatMXN(s.spec.precioDesde)}{" "}
                      <span className="text-base font-medium text-muted-foreground">
                        MXN
                      </span>
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      IVA incluido · entrega estimada {s.spec.tiempoEntrega}
                    </p>
                  </div>

                  <div className="mt-6">
                    <h3 className="font-mono text-xs uppercase tracking-widest text-brand-700">
                      Ideal para
                    </h3>
                    <p className="mt-2 text-sm text-night-700">
                      {s.spec.paraQuien}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <CTAButton asChild>
                      <Link href="/chat">
                        Cotizar con Alex <ArrowRight className="h-4 w-4" />
                      </Link>
                    </CTAButton>
                    <WhatsAppButton
                      variant="inline"
                      label="WhatsApp"
                      message={`Hola Nexora, quiero cotizar: ${s.spec.nombre}`}
                    />
                  </div>
                </div>

                {/* ── Columna derecha: qué incluye + extras + stack ── */}
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-widest text-brand-700">
                    Qué incluye
                  </h3>
                  <div className="mt-4 rounded-2xl border border-night-900/10 bg-white p-6">
                    <Checklist items={s.pricing.entregables} />
                    {s.extras?.map((ex) => (
                      <div
                        key={ex.titulo}
                        className="mt-6 border-t border-night-900/10 pt-5"
                      >
                        <p className="text-sm font-semibold text-night-900">
                          {ex.titulo}
                        </p>
                        <ul className="mt-3 space-y-2">
                          {ex.items.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-2.5 text-sm text-night-700"
                            >
                              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {s.pricing.stack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full bg-night-900/5 px-3 py-1 font-mono text-xs text-night-700"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      ))}

      {/* ── Asistentes IA ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <FadeIn>
            <SectionHeader
              eyebrow="asistentes IA"
              title="Suma un asistente IA a tu web"
              subtitle="Los 12 bots que vendemos como add-on: responden, agendan, venden y capturan leads 24/7. Setup único + cuota mensual (moat DeepSeek)."
            />
          </FadeIn>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BOTS_CATALOG.map((bot, i) => (
              <FadeIn key={bot.id} delay={Math.min(i * 0.03, 0.25)}>
                <BotCard bot={bot} />
              </FadeIn>
            ))}
          </div>
          <div className="mt-12 text-center">
            <CTAButton asChild variant="outline" size="lg">
              <Link href="/chat">
                Cotizar mi web + asistentes IA
                <ArrowRight className="h-5 w-5" />
              </Link>
            </CTAButton>
          </div>
        </div>
      </section>

      {/* ── Escalera de niveles N0–N5 ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="niveles"
            title="De link in bio a ERP: la escalera N0–N5"
            subtitle="Todo empieza donde está tu negocio hoy, y crece contigo. Cada nivel suma complejidad y valor; N5 se cotiza con propuesta formal, no precio cerrado."
          />
        </FadeIn>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {NIVELES.map((n, i) => (
            <FadeIn key={n.nivel} delay={Math.min(i * 0.04, 0.25)}>
              <LiftCard className="flex h-full flex-col p-6">
                <div className="flex items-center justify-between gap-2">
                  <NivelBadge nivel={n.nivel} />
                  <span className="font-mono text-xs text-muted-foreground">
                    {NIVEL_LABELS[n.nivel] ?? n.nivel}
                  </span>
                </div>
                <p className="mt-4 flex-1 text-sm text-night-700">
                  {n.descripcion}
                </p>
                <p className="mt-4 border-t border-night-900/10 pt-4 font-mono text-xs leading-relaxed text-muted-foreground">
                  {n.ejemplos}
                </p>
              </LiftCard>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-4 pb-24 sm:px-6">
        <FadeIn>
          <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-16 text-center text-white shadow-xl shadow-brand-600/20 sm:px-12">
            <p className="font-mono text-xs uppercase tracking-widest text-brand-100/80">
              &gt; ¿no sabes cuál elegir?
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Cuéntanos tu negocio y te decimos
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-50">
              Alex te entrevista en 3 minutos y te propone la web ideal, con
              precio desde cerrado y sin compromiso.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <CTAButton asChild size="lg">
                <Link href="/chat">
                  Cotizar con Alex <ArrowRight className="h-5 w-5" />
                </Link>
              </CTAButton>
              <WhatsAppButton
                variant="inline"
                label="Escríbenos por WhatsApp"
                message="Hola Nexora, quiero una web para mi negocio"
              />
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
