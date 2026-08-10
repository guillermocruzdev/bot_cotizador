"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { CTAButton } from "@/components/ui/CTAButton";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

/**
 * Hero de la vitrina Nexora (FASE 3).
 * Fondo night con glows de marca + partículas sutiles (framer-motion) y
 * tarjeta "terminal" JetBrains Mono que muestra la cotización relámpago.
 * Respeta prefers-reduced-motion.
 */

/** Puntos del "mesh" flotante (posiciones deterministas, sin aleatoriedad en render). */
const PARTICLES = [
  { left: "6%", top: "20%", size: 5, duration: 7, delay: 0 },
  { left: "14%", top: "66%", size: 4, duration: 9, delay: 1 },
  { left: "24%", top: "38%", size: 6, duration: 8, delay: 0.5 },
  { left: "38%", top: "82%", size: 4, duration: 10, delay: 2 },
  { left: "50%", top: "14%", size: 5, duration: 7.5, delay: 1.5 },
  { left: "60%", top: "56%", size: 3, duration: 11, delay: 0 },
  { left: "72%", top: "26%", size: 5, duration: 8.5, delay: 1 },
  { left: "84%", top: "68%", size: 4, duration: 9.5, delay: 0.5 },
  { left: "92%", top: "22%", size: 6, duration: 7, delay: 2 },
  { left: "96%", top: "50%", size: 3, duration: 12, delay: 1 },
];

const TERMINAL_LINES: { text: string; tone: "cmd" | "ok" | "out" | "muted" }[] = [
  { text: "$ nexora cotizar --tipo=landing", tone: "cmd" },
  { text: "✓ diagnóstico completado en 3 min", tone: "ok" },
  { text: "✓ alcance y features calculados", tone: "ok" },
  { text: "→ tu propuesta: desde $8,500 MXN", tone: "out" },
  { text: "$ cotizar webapp --vertical=inmobiliaria", tone: "cmd" },
  { text: "› calculando módulos y panel…", tone: "muted" },
  { text: "→ propuesta formal · nivel N4", tone: "out" },
];

type TerminalLine = (typeof TERMINAL_LINES)[number];

const TONE_CLASS: Record<TerminalLine["tone"], string> = {
  cmd: "text-slate-300",
  ok: "text-emerald-400",
  out: "text-white",
  muted: "text-slate-500",
};

const HERO_TRUST = ["Desde $2,500 MXN", "Entrega en días", "Soporte real"];

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden bg-night-900 text-white">
      {/* ── Fondo: glows de marca + partículas ── */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-600/25 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-[30rem] w-[30rem] rounded-full bg-brand-700/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        {reduce
          ? null
          : PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-brand-400/60"
                style={{
                  left: p.left,
                  top: p.top,
                  width: p.size,
                  height: p.size,
                }}
                animate={{ y: [0, -18, 0], opacity: [0.2, 0.7, 0.2] }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:pb-28 lg:pt-24">
        {/* ── Columna de texto ── */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-600/40 bg-brand-600/10 px-3 py-1 font-mono text-xs font-medium tracking-widest text-brand-400">
            <Sparkles className="h-3.5 w-3.5" />
            &gt; nexora — webs hechas con IA
          </p>

          <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Tu web profesional{" "}
            <span className="bg-gradient-to-r from-brand-400 to-emerald-400 bg-clip-text text-transparent">
              en días, no en meses.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            Somos el nexo entre tu negocio y tus clientes: webs con acabado
            premium, precio desde honesto y entrega rápida. Cotiza en 3 minutos
            con Alex, nuestro bot de IA — sin formularios ni letras chiquitas.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CTAButton asChild size="lg">
              <Link href="/servicios">
                Ver lo que hacemos
                <ArrowRight className="h-5 w-5" />
              </Link>
            </CTAButton>
            <WhatsAppButton
              variant="inline"
              label="Escríbenos por WhatsApp"
              message="Hola Nexora, quiero una web para mi negocio"
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {HERO_TRUST.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 font-mono text-sm text-slate-400"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── Tarjeta terminal ── */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-md lg:max-w-none"
        >
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-night-900/80 shadow-2xl shadow-brand-600/20 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-xs text-slate-400">
                nexora — cotizador
              </span>
            </div>
            <div className="space-y-2.5 p-5 font-mono text-sm sm:p-6">
              {TERMINAL_LINES.map((line, i) => (
                <p key={i} className={TONE_CLASS[line.tone]}>
                  {line.text}
                </p>
              ))}
              <p className="inline-block h-4 w-2 animate-pulse bg-brand-400" aria-hidden />
            </div>
          </div>
          <p className="mt-4 text-center font-mono text-xs text-slate-500">
            &gt; así de fácil: prueba el cotizador Alex en /chat
          </p>
        </motion.div>
      </div>
    </section>
  );
}
