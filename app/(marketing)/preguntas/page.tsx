import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CTAButton } from "@/components/ui/CTAButton";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { FAQItem } from "@/components/ui/FAQItem";
import { pageSeo } from "@/lib/seo";

export const metadata = pageSeo({
  title: "Preguntas frecuentes",
  description:
    "Preguntas frecuentes de Nexora: plazos de entrega, qué significa 'hecho con IA', cómo funciona el anticipo, qué incluye el soporte, dominio y hosting.",
  path: "/preguntas",
  keywords: ["preguntas frecuentes", "plazos de entrega web", "qué incluye", "Nexora"],
});

/* ── FAQ de la vitrina (FASE 7) ── */
const FAQ: { q: string; a: string }[] = [
  {
    q: "¿En cuánto tiempo me entregan mi web?",
    a: "Depende del nivel: una landing, un menú digital o un link in bio en 1–8 días; un corporativo, sistema de citas o e-commerce en 7–18 días; una plataforma N4 (webapp, inmobiliaria, cursos…) en 15–30 días. Las ecosistemas N5 se planean por fases con propuesta formal. El cotizador Alex te indica el plazo estimado de tu caso al final.",
  },
  {
    q: "¿Qué significa que las webs están hechas con IA?",
    a: "Usamos IA (DeepSeek) para acelerar el diseño, la programación y la generación de contenido, pero con criterio humano: revisamos cada detalle, cuidamos tu marca y probamos todo antes de entregar. Para ti el resultado es el mismo de una agencia tradicional, pero más rápido y a mejor precio.",
  },
  {
    q: "¿Cómo funciona el anticipo y los pagos?",
    a: "Es simple y honesto: 50% de anticipo para arrancar el proyecto y apartar tu lugar, y 50% cuando tu web está publicada y funcionando. Aceptamos transferencia/SPEI y, en proyectos seleccionados, evaluamos tarjeta (Stripe) o un plan de pagos. Si tu negocio factura, te emitimos factura con tu RFC sin costo.",
  },
  {
    q: "¿Qué incluye el soporte post-entrega?",
    a: "Después de publicar te capacitamos para editar tu web, tienes garantía de 15 días para corregir cualquier detalle y 2 rondas de revisión incluidas durante el desarrollo. Además, si contratas asistentes IA, incluyen soporte y mantenimiento mensual del bot.",
  },
  {
    q: "¿El dominio y el hosting están incluidos?",
    a: "Sí. Configuramos el hosting y te ayudamos con el dominio en el precio de tu web (la mayoría de planes incluyen un dominio). Tú decides si usas uno que ya tengas o registramos uno nuevo; nosotros nos encargamos de la parte técnica.",
  },
  {
    q: "¿Cómo manejan mis datos personales?",
    a: "Con seriedad y conforme a la ley. Solo recabamos lo necesario para cotizar y darte seguimiento (nombre, correo, WhatsApp y lo que nos cuentas de tu negocio). Puedes consultar nuestro aviso de privacidad y ejercer tus derechos ARCO en cualquier momento.",
  },
  {
    q: "¿Necesito saber de tecnología para empezar?",
    a: "Para nada. Nosotros hablamos en español claro, no en código. Tú solo cuentas tu negocio y lo que quieres lograr: Alex te hace las preguntas correctas y nosotros nos encargamos del resto. Si no entiendes algo, pregúntanos sin pena.",
  },
  {
    q: "¿Cómo empiezo?",
    a: "En 3 pasos: 1) Cotiza con Alex (te entrevista y te da tu precio desde en minutos), 2) te enviamos la propuesta con precio cerrado y 3) si te convence, arrancamos. Sin compromiso y sin letras chiquitas. También puedes escribirnos directo por WhatsApp.",
  },
];

export default function PreguntasPage() {
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
            &gt; preguntas frecuentes
          </p>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Resolvemos tus dudas,{" "}
            <span className="text-brand-300">sin rodeos</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-slate-300">
            Todo lo que nos preguntan antes de empezar: plazos, pagos, soporte,
            IA y cómo funciona. ¿Falta algo? Escríbenos.
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
              message="Hola Nexora, tengo una duda antes de cotizar"
            />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <FadeIn>
          <SectionHeader
            eyebrow="preguntas frecuentes"
            title="Lo que más nos preguntan"
            subtitle="Plazos, pagos, soporte y qué incluye cada web. Haz clic para ver la respuesta."
          />
        </FadeIn>
        <div className="mt-10 space-y-3">
          {FAQ.map((f, i) => (
            <FadeIn key={f.q} delay={Math.min(i * 0.04, 0.2)}>
              <FAQItem question={f.q} answer={f.a} defaultOpen={i === 0} />
            </FadeIn>
          ))}
        </div>
        <FadeIn>
          <p className="mt-10 flex items-start justify-center gap-2 text-center text-sm text-muted-foreground">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-whatsapp" />
            ¿No encontraste tu duda? Escríbenos por WhatsApp y te respondemos en
            menos de 24 horas hábiles.
          </p>
        </FadeIn>
      </section>

      {/* ── CTA final ── */}
      <section className="px-4 pb-24 sm:px-6">
        <FadeIn>
          <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-16 text-center text-white shadow-xl shadow-brand-600/20 sm:px-12">
            <p className="font-mono text-xs uppercase tracking-widest text-brand-100/80">
              &gt; ¿listo para empezar?
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Cotiza tu web en 3 minutos
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
