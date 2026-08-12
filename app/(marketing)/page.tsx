import Link from "next/link";
import {
  ArrowRight,
  Bot,
  FileText,
  Rocket,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Hero } from "@/components/marketing/Hero";
import { JsonLd } from "@/components/marketing/JsonLd";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CTAButton } from "@/components/ui/CTAButton";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { ServiceCard } from "@/components/ui/ServiceCard";
import {
  PortfolioCard,
  type PortfolioCardProps,
} from "@/components/ui/PortfolioCard";
import { Stat } from "@/components/ui/Stat";
import { FadeIn } from "@/components/ui/FadeIn";
import { TrustBar } from "@/components/ui/TrustBar";
import { AGENCY_WEB_TYPES } from "@/lib/agency-catalog";
import { agencyJsonLd, pageSeo } from "@/lib/seo";

export const metadata = pageSeo({
  title: "Nexora · Webs que venden. Hechas con IA.",
  description:
    "El nexo entre tu negocio y tus clientes. Páginas web con IA en México: webs que venden en días, con precio desde honesto y acabado premium. Cotiza gratis con Alex.",
  path: "/",
  absolute: true,
  keywords: [
    "páginas web con IA",
    "desarrollo web México",
    "cuánto cuesta una página web",
    "diseño web rápido",
    "agencia web",
    "cotizador web",
    "Nexora",
  ],
});

/* ════════════════════════════════════════════════════════════════════
   HOME DE LA VITRINA NEXORA (FASE 3)
   Fuente de verdad de precios/nombres: lib/agency-catalog.ts (regla #7).
   data/portfolio.json está vacío (FASE 5 lo llena con sync-agency-data),
   así que la vitrina usa aquí un array de ejemplo con los PACKs destacados.
   ════════════════════════════════════════════════════════════════════ */

/** Las 11 categorías del motor, ordenadas por la escalera N0→N4. */
const SERVICIOS_TEASER: { id: string; nivel: string }[] = [
  { id: "link_in_bio", nivel: "N0" },
  { id: "menu_digital", nivel: "N0" },
  { id: "tarjeta_digital", nivel: "N0" },
  { id: "landing", nivel: "N1" },
  { id: "blog", nivel: "N1" },
  { id: "portafolio", nivel: "N1" },
  { id: "corporativo", nivel: "N2" },
  { id: "citas", nivel: "N2" },
  { id: "cotizador", nivel: "N2" },
  { id: "ecommerce", nivel: "N3" },
  { id: "webapp", nivel: "N4" },
];

const byId = new Map(AGENCY_WEB_TYPES.map((w) => [w.id, w]));

const servicios = SERVICIOS_TEASER.map(({ id, nivel }) => {
  const spec = byId.get(id);
  return spec ? { ...spec, nivel } : null;
}).filter((s): s is NonNullable<typeof s> => s !== null);

/** PACKs destacados (array de ejemplo; FASE 5 lo sustituye con data/portfolio.json). */
const PACKS_DESTACADOS: PortfolioCardProps[] = [
  {
    codigo: "PK-008",
    nombre: "Landing page",
    nivel: "N1",
    descripcion:
      "La más vendida: presenta tu negocio y capta contactos. Se entrega en una semana.",
    precioDesde: 8500,
    urlDemo: "https://nexora-landing.vercel.app",
    repo: "https://github.com/Nexora/pack-landing",
    estado: "proximamente",
  },
  {
    codigo: "PK-014",
    nombre: "Sistema de citas",
    nivel: "N2",
    descripcion:
      "Calendario en línea con confirmaciones y recordatorios automáticos.",
    precioDesde: 15000,
    urlDemo: "https://nexora-citas.vercel.app",
    repo: "https://github.com/Nexora/pack-citas",
    estado: "proximamente",
  },
  {
    codigo: "PK-017",
    nombre: "E-commerce (tienda online)",
    nivel: "N3",
    descripcion: "Catálogo, carrito y pagos en línea para vender 24/7.",
    precioDesde: 20000,
    urlDemo: "https://nexora-ecommerce.vercel.app",
    repo: "https://github.com/Nexora/pack-ecommerce",
    estado: "proximamente",
  },
  {
    codigo: "PK-021",
    nombre: "Portal inmobiliario",
    nivel: "N4",
    descripcion:
      "Propiedades con filtros, panel de administración y captura de leads.",
    precioDesde: 25000,
    urlDemo: "https://nexora-inmobiliaria.vercel.app",
    repo: "https://github.com/Nexora/pack-inmobiliaria",
    estado: "proximamente",
  },
  {
    codigo: "PK-025",
    nombre: "Marketplace multi-vendedor",
    nivel: "N5",
    descripcion:
      "Plataforma donde varios vendedores publican y cobran por separado.",
    precioDesde: 40000,
    urlDemo: "https://nexora-marketplace.vercel.app",
    repo: "https://github.com/Nexora/pack-marketplace",
    estado: "proximamente",
  },
  {
    codigo: "PK-029",
    nombre: "Landing de psicólogo + IA",
    nivel: "N1",
    descripcion:
      "Landing con asistente IA que agenda citas y responde 24/7.",
    precioDesde: 12000,
    urlDemo: "https://nexora-psicologo.vercel.app",
    repo: "https://github.com/Nexora/pack-psicologo",
    estado: "proximamente",
  },
];

const STATS = [
  { value: "28", label: "Tipos de web", sub: "de landing a ERP" },
  { value: "28", label: "PACKs listos", sub: "para desplegar" },
  { value: "≤ 10", label: "Días de entrega", sub: "promedio por web" },
  { value: "$199/mes", label: "Asistentes IA", sub: "add-on recurrente" },
];

type Paso = {
  icon: LucideIcon;
  title: string;
  text: string;
  href?: string;
  cta?: string;
};

const PASOS: Paso[] = [
  {
    icon: Bot,
    title: "Diagnóstico",
    text: "Cotiza en minutos con Alex: el bot te entrevista y entiende tu negocio, sin formularios.",
    href: "/chat",
    cta: "Probar el cotizador",
  },
  {
    icon: FileText,
    title: "Propuesta",
    text: "Recibes alcance y precio desde cerrado, en lenguaje humano y sin letras chiquitas.",
  },
  {
    icon: Rocket,
    title: "Desarrollo",
    text: "Construimos tu web mobile-first con avances y la entregamos en días, no en meses.",
  },
  {
    icon: Sparkles,
    title: "Entrega + soporte",
    text: "Capacitación, garantía de 15 días y soporte real después de lanzar.",
  },
];

export default function MarketingHome() {
  return (
    <>
      {/* Datos estructurados: Organization + ProfessionalService (FASE 8) */}
      <JsonLd data={agencyJsonLd()} />
      <Hero />

      {/* ── Confianza transversal (FASE 7) ── */}
      <TrustBar />

      {/* ── Prueba social ── */}
      <section className="bg-white dark:bg-night-900">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <FadeIn>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
              {STATS.map((s) => (
                <Stat key={s.label} {...s} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Servicios (teaser) ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="servicios"
            title="Lo que hacemos"
            subtitle="Del link in bio a la plataforma completa: 11 tipos de web, todos cotizables en minutos con Alex."
          />
        </FadeIn>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((s, i) => (
            <FadeIn key={s.id} delay={Math.min(i * 0.04, 0.25)}>
              <ServiceCard
                nombre={s.nombre}
                descripcion={s.descripcion}
                nivel={s.nivel}
                precioDesde={s.precioDesde}
              />
            </FadeIn>
          ))}
        </div>
        <div className="mt-12 text-center">
          <CTAButton asChild variant="outline" size="lg">
            <Link href="/servicios">
              Ver todos los servicios
              <ArrowRight className="h-5 w-5" />
            </Link>
          </CTAButton>
        </div>
      </section>

      {/* ── Vitrina (teaser) ── */}
      <section className="bg-white dark:bg-night-900">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <FadeIn>
            <SectionHeader
              eyebrow="portafolio"
              title="Nuestros PACKs"
              subtitle="28 tipos de web con código de registro, precio desde honesto y listos para desplegar en días."
            />
          </FadeIn>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PACKS_DESTACADOS.map((p, i) => (
              <FadeIn key={p.codigo} delay={Math.min(i * 0.04, 0.25)}>
                <PortfolioCard {...p} />
              </FadeIn>
            ))}
          </div>
          <div className="mt-12 text-center">
            <CTAButton asChild variant="outline" size="lg">
              <Link href="/portafolio">
                Ver todo el portafolio
                <ArrowRight className="h-5 w-5" />
              </Link>
            </CTAButton>
          </div>
        </div>
      </section>

      {/* ── Cómo trabajamos ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="proceso"
            title="Cómo trabajamos"
            subtitle="Un proceso transparente, de la cotización a la entrega, sin letras chiquitas."
          />
        </FadeIn>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PASOS.map((paso, i) => (
            <FadeIn key={paso.title} delay={Math.min(i * 0.05, 0.25)}>
              <div className="flex h-full flex-col rounded-2xl border border-night-900/10 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-600/30 hover:shadow-lg hover:shadow-brand-600/5 dark:border-white/10 dark:bg-night-900 dark:hover:border-brand-400/30 dark:hover:shadow-brand-400/5">
                <span className="font-mono text-xs font-semibold tracking-widest text-brand-600 dark:text-brand-400">
                  PASO {i + 1}/4
                </span>
                <paso.icon className="mt-4 h-8 w-8 text-brand-600 dark:text-brand-400" />
                <h3 className="mt-4 font-heading text-lg font-bold text-night-900 dark:text-white">
                  {paso.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">
                  {paso.text}
                </p>
                {paso.href ? (
                  <Link
                    href={paso.href}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:gap-2.5 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    {paso.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-4 pb-24 sm:px-6">
        <FadeIn>
          <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-16 text-center text-white shadow-xl shadow-brand-600/20 sm:px-12">
            <p className="font-mono text-xs uppercase tracking-widest text-brand-100/80">
              &gt; ¿empezamos?
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              ¿Listo para tu web?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-50">
              Cotiza con Alex en 3 minutos o escríbenos por WhatsApp. Te
              respondemos el mismo día con tu propuesta.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <CTAButton asChild size="lg">
                <Link href="/chat">
                  Cotizar con Alex
                  <ArrowRight className="h-5 w-5" />
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

      {/* Botón flotante de WhatsApp (conversión persistente; en móvil lo
          sustituye la barra CTA fija de components/marketing/MobileCta). */}
      <WhatsAppButton
        variant="float"
        message="Hola Nexora, quiero una web para mi negocio"
        className="hidden md:inline-flex"
      />
    </>
  );
}
