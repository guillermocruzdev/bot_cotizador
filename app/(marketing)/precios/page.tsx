import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CreditCard,
  HandCoins,
  Landmark,
  Receipt,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CTAButton } from "@/components/ui/CTAButton";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { LiftCard } from "@/components/ui/LiftCard";
import { FAQItem } from "@/components/ui/FAQItem";
import { TrustBar } from "@/components/ui/TrustBar";
import { TierCard } from "@/components/ui/TierCard";
import { getPricingTiers } from "@/lib/pricing-tiers";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo({
  title: "Precios",
  description:
    "Packaging por nivel N0–N5 con precio 'desde' honesto y cuota desde $X/mes. Cómo pagas: 50% + 50%, transferencia. Nexora, webs que venden hechas con IA.",
  path: "/precios",
  keywords: ["precios de páginas web", "cuánto cuesta una web", "niveles N0-N5", "Nexora"],
});

/* ── Tiers derivados de data/portfolio.json (regla #7, cero hardcode) ── */
const TIERS = getPricingTiers();

/* ── Cómo pagas ── */
const COMO_PAGAS: { icon: typeof Banknote; titulo: string; descripcion: string }[] = [
  {
    icon: HandCoins,
    titulo: "50% de anticipo",
    descripcion:
      "Para arrancar el proyecto y apartar tu lugar en la agenda de desarrollo.",
  },
  {
    icon: Banknote,
    titulo: "50% al entregar",
    descripcion:
      "Pagas el resto cuando tu web está publicada y funcionando, no antes.",
  },
  {
    icon: Landmark,
    titulo: "Transferencia / SPEI",
    descripcion:
      "Aceptamos transferencia bancaria; también evaluamos tarjeta (Stripe) cuando aplica.",
  },
  {
    icon: Receipt,
    titulo: "Factura con RFC",
    descripcion:
      "Si tu negocio factura, te emitimos factura con tu RFC sin costo extra.",
  },
];

/* ── FAQ de precio ── */
const FAQ: { q: string; a: string }[] = [
  {
    q: "¿Por qué los precios son \"desde\"?",
    a: "Porque el precio final depende de tu caso: el número de páginas, las funciones que elijas (pagos, citas, panel…) y si sumas asistentes IA. El \"desde\" es honesto e incluye IVA; el cotizador Alex te da tu precio en 3 minutos y la propuesta con precio cerrado.",
  },
  {
    q: "¿Qué incluye el precio?",
    a: "Diseño mobile-first con tu marca, desarrollo, dominio/hosting configurado, SEO básico, botón de WhatsApp y las funciones del nivel que elijas. También 2 rondas de revisión, garantía de 15 días y soporte post-entrega.",
  },
  {
    q: "¿En cuánto tiempo me entregan?",
    a: "Depende del nivel: una landing o un menú digital en 1–8 días, un corporativo o sistema de citas en 7–18 días, y las plataformas (N4) en 15–30 días. Las ecosistemas N5 se planean por fases con propuesta formal.",
  },
  {
    q: "¿Qué significa la cuota mensual?",
    a: "Es un reencuadre: tu inversión total se divide entre 24 meses para que veas lo accesible que es. No es un cobro recurrente obligatorio: el precio es único por el proyecto. La cuota mensual real solo aplica si contratas asistentes IA (soporte + mantenimiento del bot).",
  },
  {
    q: "¿Los asistentes IA se pagan aparte?",
    a: "Sí, son un add-on recurrente (setup único + cuota mensual). Responden, agendan, venden y capturan leads 24/7 con DeepSeek. Los puedes sumar a cualquier nivel y son opcionales.",
  },
  {
    q: "¿Los proyectos N5 (marketplace, SaaS, ERP) cómo se cotizan?",
    a: "Con propuesta formal: como son plataformas a medida con alcance por módulos, no damos un precio cerrado en el cotizador. Te armamos una propuesta detallada con fases, alcance y estimado \"desde\", y la ajustamos a tu operación.",
  },
];

export default function PreciosPage() {
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
            &gt; precios
          </p>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Precios desde honestos,{" "}
            <span className="text-brand-300">sin sorpresas</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-slate-300">
            De $2,500 a $90,000 según lo que necesite tu negocio. Todos incluyen
            IVA, diseño con tu marca, desarrollo y soporte. El monto exacto lo
            confirmas con Alex en 3 minutos.
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
              message="Hola Nexora, tengo dudas sobre sus precios"
            />
          </div>
        </div>
      </section>

      {/* ── Confianza transversal (FASE 7) ── */}
      <TrustBar />

      {/* ── Tiers N0–N5 ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="planes"
            title="La escalera de niveles N0–N5"
            subtitle="Empieza donde está tu negocio hoy y crece contigo. Los montos salen del catálogo real (regla #7): nada de precios inventados."
          />
        </FadeIn>
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {TIERS.map((tier, i) => (
            <FadeIn key={tier.id} delay={Math.min(i * 0.05, 0.25)}>
              <TierCard
                niveles={tier.niveles}
                titulo={tier.titulo}
                descripcion={tier.descripcion}
                desde={tier.desde}
                hasta={tier.hasta}
                cuota={tier.cuota}
                includes={tier.includes}
                ejemplos={tier.ejemplos}
                featured={tier.titulo === "Negocio"}
                propuestaFormal={tier.propuestaFormal}
              />
            </FadeIn>
          ))}
        </div>
        <FadeIn>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
            Los precios mostrados son la fuente real del catálogo Nexora
            (`portfolio.json`). El cotizador Alex calcula tu total exacto con
            IVA y funciones incluidas. Los proyectos N5 se cotizan con propuesta
            formal detallada, no precio cerrado.
          </p>
        </FadeIn>
      </section>

      {/* ── Cómo pagas ── */}
      <section className="bg-white dark:bg-night-900">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <FadeIn>
            <SectionHeader
              eyebrow="cómo pagas"
              title="Paga en dos partes, sin letras chiquitas"
              subtitle="La mitad al empezar y la mitad al entregar. Así ambos estamos seguros."
            />
          </FadeIn>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {COMO_PAGAS.map((p, i) => (
              <FadeIn key={p.titulo} delay={Math.min(i * 0.05, 0.2)}>
                <LiftCard className="h-full p-6">
                  <p.icon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                  <h3 className="mt-4 font-heading text-base font-bold text-night-900 dark:text-white">
                    {p.titulo}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-night-700 dark:text-slate-300">
                    {p.descripcion}
                  </p>
                </LiftCard>
              </FadeIn>
            ))}
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-brand-600/20 bg-brand-600/5 p-5 text-sm text-night-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-slate-300">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
            <p>
              ¿Prefieres otro método? Hablemos: en proyectos seleccionados
              podemos evaluar pagos con tarjeta a través de Stripe o un plan de
              pagos personalizado.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ de precio ── */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <FadeIn>
          <SectionHeader
            eyebrow="preguntas frecuentes"
            title="Dudas de precio, respondidas"
            subtitle="Lo que más nos preguntan antes de cotizar. Si falta algo, escríbenos."
          />
        </FadeIn>
        <div className="mt-10 space-y-3">
          {FAQ.map((f, i) => (
            <FadeIn key={f.q} delay={Math.min(i * 0.04, 0.2)}>
              <FAQItem question={f.q} answer={f.a} defaultOpen={i === 0} />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-4 pb-24 sm:px-6">
        <FadeIn>
          <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-16 text-center text-white shadow-xl shadow-brand-600/20 sm:px-12">
            <p className="font-mono text-xs uppercase tracking-widest text-brand-100/80">
              &gt; ¿cuánto cuesta la tuya?
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Averígualo en 3 minutos, sin compromiso
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-50">
              Alex te hace las preguntas correctas y te da tu precio desde con
              IVA incluido. Tú decides si seguimos.
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
                message="Hola Nexora, quiero cotizar mi web"
              />
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
