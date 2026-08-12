import Link from "next/link";
import {
  ArrowRight,
  Bot,
  FileText,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CTAButton } from "@/components/ui/CTAButton";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { LiftCard } from "@/components/ui/LiftCard";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo({
  title: "Proceso",
  description:
    "Cómo trabajamos en Nexora: diagnóstico con Alex, propuesta con precio cerrado, desarrollo en días y entrega con soporte. Garantías: 2 rondas de revisión, 15 días y soporte real.",
  path: "/proceso",
  keywords: ["cómo trabajamos", "proceso de desarrollo web", "garantías", "Nexora"],
});

/* ── Los 4 pasos del proceso (con CTA por paso) ── */
const PASOS: {
  icon: typeof Bot;
  titulo: string;
  descripcion: string;
  cta: "chat" | "whatsapp";
  ctaLabel: string;
  ctaMessage?: string;
}[] = [
  {
    icon: Bot,
    titulo: "Diagnóstico con Alex",
    descripcion:
      "Cuéntanos tu negocio: Alex te entrevista en ~3 minutos, detecta tu tipo de web y arma una primera cotización al instante. Sin formularios largos ni compromiso.",
    cta: "chat",
    ctaLabel: "Hacer mi diagnóstico",
  },
  {
    icon: FileText,
    titulo: "Propuesta con precio cerrado",
    descripcion:
      "Recibes una propuesta clara: alcance, precio desde honesto (IVA incluido) y tiempos. Tú decides si seguimos; nada de sorpresas después.",
    cta: "whatsapp",
    ctaLabel: "Pedir mi propuesta",
    ctaMessage:
      "Hola Nexora, ya hice mi diagnóstico y quiero mi propuesta con precio cerrado",
  },
  {
    icon: Rocket,
    titulo: "Desarrollo en días",
    descripcion:
      "Construimos tu web mobile-first con avances constantes y 2 rondas de revisión incluidas. Trabajamos con IA + criterio de diseño para entregar rápido y pulido.",
    cta: "whatsapp",
    ctaLabel: "Hablar de mi proyecto",
    ctaMessage:
      "Hola Nexora, quiero saber cómo va el desarrollo de mi web",
  },
  {
    icon: Users,
    titulo: "Entrega + soporte",
    descripcion:
      "Publicamos tu web, te capacitamos para editarla y te acompañamos con soporte real post-entrega. Si algo no quedó perfecto, lo corregimos.",
    cta: "whatsapp",
    ctaLabel: "Empezar hoy",
    ctaMessage: "Hola Nexora, quiero empezar mi web con ustedes",
  },
];

/* ── Garantías que respaldan el proceso ── */
const GARANTIAS: { icon: typeof ShieldCheck; titulo: string; descripcion: string }[] = [
  {
    icon: ShieldCheck,
    titulo: "2 rondas de revisión incluidas",
    descripcion:
      "Tienes derecho a dos rondas de cambios dentro del alcance acordado. Revisamos contigo y ajustamos hasta que quede bien.",
  },
  {
    icon: Sparkles,
    titulo: "Garantía de 15 días",
    descripcion:
      "Después de entregar, corregimos cualquier detalle que no se vea o no funcione como acordamos, sin costo.",
  },
  {
    icon: Users,
    titulo: "Soporte post-entrega",
    descripcion:
      "No te dejamos con la página y ya: te capacitamos para editarla y estamos para lo que necesites después de publicar.",
  },
];

export default function ProcesoPage() {
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
            &gt; proceso
          </p>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Tu web en 4 pasos,{" "}
            <span className="text-brand-300">sin letras chiquitas</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-slate-300">
            Desde el primer clic hasta el día que publicamos, sabes exactamente
            qué pasa, cuánto cuesta y cuándo lo tienes. Así trabajamos en
            Nexora.
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
              message="Hola Nexora, quiero saber cómo es su proceso"
            />
          </div>
        </div>
      </section>

      {/* ── Timeline de 4 pasos ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="cómo trabajamos"
            title="De tu idea a tu web publicada"
            subtitle="Un proceso simple y transparente, pensado para que tú te enfoques en tu negocio."
          />
        </FadeIn>
        <ol className="mt-14 space-y-8">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo}>
              <FadeIn delay={Math.min(i * 0.05, 0.2)}>
                <LiftCard className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 font-heading text-lg font-bold text-white shadow-lg shadow-brand-600/20">
                      {i + 1}
                    </span>
                    <paso.icon className="h-6 w-6 shrink-0 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl font-bold text-night-900 dark:text-white">
                      {paso.titulo}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-night-700 dark:text-slate-300">
                      {paso.descripcion}
                    </p>
                  </div>
                  <div className="lg:pl-4">
                    {paso.cta === "chat" ? (
                      <CTAButton asChild variant="outline">
                        <Link href="/chat">
                          {paso.ctaLabel} <ArrowRight className="h-4 w-4" />
                        </Link>
                      </CTAButton>
                    ) : (
                      <WhatsAppButton
                        variant="inline"
                        label={paso.ctaLabel}
                        message={paso.ctaMessage}
                      />
                    )}
                  </div>
                </LiftCard>
              </FadeIn>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Garantías ── */}
      <section className="bg-white dark:bg-night-900">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <FadeIn>
            <SectionHeader
              eyebrow="garantías"
              title="Trabajamos con respaldo"
              subtitle="Esto no es opcional: son compromisos que asumimos en cada proyecto."
            />
          </FadeIn>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {GARANTIAS.map((g, i) => (
              <FadeIn key={g.titulo} delay={Math.min(i * 0.06, 0.2)}>
                <LiftCard className="h-full p-6">
                  <g.icon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                  <h3 className="mt-4 font-heading text-base font-bold text-night-900 dark:text-white">
                    {g.titulo}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-night-700 dark:text-slate-300">
                    {g.descripcion}
                  </p>
                </LiftCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-4 pb-24 sm:px-6">
        <FadeIn>
          <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-16 text-center text-white shadow-xl shadow-brand-600/20 sm:px-12">
            <p className="font-mono text-xs uppercase tracking-widest text-brand-100/80">
              &gt; ¿listo para empezar?
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Tu web puede estar lista en una semana
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-50">
              Arranca con el diagnóstico de Alex: en 3 minutos sabrás tu tipo de
              web y su precio desde, sin compromiso.
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
                message="Hola Nexora, quiero empezar mi web"
              />
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
