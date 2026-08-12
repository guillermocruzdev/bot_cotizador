import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Mail,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CTAButton } from "@/components/ui/CTAButton";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { LiftCard } from "@/components/ui/LiftCard";
import { ContactForm, type TipoWebOption } from "@/components/contact/ContactForm";
import { emailLink, siteConfig } from "@/lib/site";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo({
  title: "Contacto",
  description:
    "Habla con Nexora por WhatsApp, correo o formulario de contacto. Te respondemos en menos de 24 horas hábiles. Cotiza tu web con Alex en minutos.",
  path: "/contacto",
  keywords: ["contacto Nexora", "cotizar página web", "WhatsApp desarrollo web", "Nexora"],
});

/* ── Tipos de web para el select del formulario (curado, sin precios) ── */
const TIPOS: TipoWebOption[] = [
  { value: "Landing page", label: "Landing page (presentación)" },
  { value: "Menú digital", label: "Menú digital" },
  { value: "Tarjeta digital", label: "Tarjeta digital / link in bio" },
  { value: "Sitio corporativo", label: "Sitio corporativo (varias páginas)" },
  { value: "Sistema de citas / reservas", label: "Sistema de citas / reservas" },
  { value: "E-commerce (tienda online)", label: "E-commerce (tienda online)" },
  { value: "Webapp / plataforma", label: "Webapp / plataforma" },
  { value: "Portal inmobiliario", label: "Portal inmobiliario" },
  { value: "Membresías / cursos online", label: "Membresías / cursos online" },
  { value: "Telemedicina / clínica", label: "Telemedicina / clínica" },
  { value: "Marketplace / SaaS / ERP", label: "Marketplace / SaaS / ERP" },
  { value: "Asistentes IA", label: "Asistentes IA (bot para mi web)" },
];

export default function ContactoPage() {
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
            &gt; contacto
          </p>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Hablemos de tu web,{" "}
            <span className="text-brand-300">hoy mismo</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-slate-300">
            Escríbenos por WhatsApp, por correo o con el formulario. Te
            respondemos en menos de 24 horas hábiles, sin compromiso.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CTAButton asChild size="lg">
              <Link href="/chat">
                Cotizar con Alex <ArrowRight className="h-5 w-5" />
              </Link>
            </CTAButton>
            <WhatsAppButton
              variant="inline"
              label="Hablar por WhatsApp"
              message="Hola Nexora, quiero hablar sobre mi web"
            />
          </div>
        </div>
      </section>

      {/* ── Contacto directo + formulario ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
          {/* Columna izquierda: contacto directo */}
          <FadeIn>
            <div className="space-y-5">
              <SectionHeader
                align="left"
                eyebrow="contacto directo"
                title="Lo más rápido: WhatsApp"
                subtitle="Es el canal donde respondemos primero. También puedes escribirnos por correo."
              />

              <WhatsAppButton
                variant="inline"
                label="Abrir chat de WhatsApp"
                message="Hola Nexora, quiero una web para mi negocio"
                className="h-14 w-full px-6 text-base"
              />

              <a
                href={emailLink}
                className="flex items-center gap-4 rounded-2xl border border-night-900/10 bg-white p-5 transition hover:border-brand-600/30 hover:shadow-lg hover:shadow-brand-600/5 dark:border-white/10 dark:bg-night-900 dark:hover:border-brand-400/30"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 dark:bg-brand-400/15 dark:text-brand-400">
                  <Mail className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-heading text-sm font-bold text-night-900 dark:text-white">
                    Escríbenos por correo
                  </span>
                  <span className="block text-sm text-night-700 dark:text-slate-300">
                    {siteConfig.email}
                  </span>
                </span>
              </a>

              <div className="grid gap-4 sm:grid-cols-2">
                <LiftCard className="p-5">
                  <Clock className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                  <h3 className="mt-3 font-heading text-sm font-bold text-night-900 dark:text-white">
                    Respuesta rápida
                  </h3>
                  <p className="mt-1.5 text-sm text-night-700 dark:text-slate-300">
                    Menos de 24 horas hábiles en todos los canales.
                  </p>
                </LiftCard>
                <LiftCard className="p-5">
                  <MessageCircle className="h-6 w-6 text-whatsapp" />
                  <h3 className="mt-3 font-heading text-sm font-bold text-night-900 dark:text-white">
                    Sin compromiso
                  </h3>
                  <p className="mt-1.5 text-sm text-night-700 dark:text-slate-300">
                    Hablamos, cotizas y tú decides. Cero presión de venta.
                  </p>
                </LiftCard>
              </div>

              <a
                href="/aviso-privacidad"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline"
              >
                <ShieldCheck className="h-4 w-4" />
                Ver aviso de privacidad
              </a>
            </div>
          </FadeIn>

          {/* Columna derecha: formulario */}
          <FadeIn delay={0.1}>
            <div className="rounded-3xl border border-night-900/10 bg-white p-6 shadow-lg shadow-night-900/5 sm:p-8 dark:border-white/10 dark:bg-night-900 dark:shadow-black/20">
              <h2 className="font-heading text-2xl font-bold text-night-900 dark:text-white">
                Cuéntanos tu proyecto
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-night-700 dark:text-slate-300">
                Llena este formulario y te respondemos con propuesta y precio.
                ¿Prefieres rapidez? Escríbenos por WhatsApp.
              </p>
              <div className="mt-6">
                <ContactForm tipos={TIPOS} />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-4 pb-24 sm:px-6">
        <FadeIn>
          <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-16 text-center text-white shadow-xl shadow-brand-600/20 sm:px-12">
            <p className="font-mono text-xs uppercase tracking-widest text-brand-100/80">
              &gt; ¿todavía no cotizas?
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Prueba a Alex, te cotiza en 3 minutos
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-50">
              Sin formularios largos: una conversación natural que termina en
              tu precio desde con IVA incluido.
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
