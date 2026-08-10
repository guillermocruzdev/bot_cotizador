import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CTAButton } from "@/components/ui/CTAButton";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

/** 404 de la vitrina Nexora (FASE 7): versión final con CTAs de conversión. */
export default function VitrinaNotFound() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden bg-night-900 px-6 text-center text-white">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand-600/25 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-brand-700/25 blur-3xl" />
      </div>
      <span className="font-mono text-sm tracking-widest text-brand-600">
        &gt; 404 — página no encontrada
      </span>
      <h1 className="max-w-2xl font-heading text-4xl font-bold sm:text-5xl">
        Se nos perdió esa página
      </h1>
      <p className="max-w-md text-slate-300">
        La página que buscas no existe o se movió. Pero tu web profesional sí
        puede existir: cotiza con Alex o escríbenos y la hacemos realidad.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <CTAButton asChild size="lg">
          <Link href="/chat">
            Cotizar con Alex <ArrowRight className="h-5 w-5" />
          </Link>
        </CTAButton>
        <WhatsAppButton
          variant="inline"
          label="Hablar por WhatsApp"
          message="Hola Nexora, me gustaría cotizar mi web"
        />
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>
    </div>
  );
}
