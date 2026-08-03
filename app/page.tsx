"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FileText,
  MessageCircle,
  Sparkles,
  Timer,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOT_NAME } from "@/lib/chat-store";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const STEPS = [
  {
    icon: MessageCircle,
    title: "1. Chatea con Alex",
    text: "Cuéntale sobre tu negocio en una conversación natural. Nada de formularios aburridos.",
  },
  {
    icon: Sparkles,
    title: "2. Análisis inteligente",
    text: "Alex revisa tus respuestas con IA y calcula un alcance y precio realista para tu proyecto.",
  },
  {
    icon: FileText,
    title: "3. Propuesta al instante",
    text: "Recibe tu propuesta personalizada: precio, funcionalidades, tecnología y siguiente paso.",
  },
];

const PERKS = [
  "Precio estimado en pesos mexicanos",
  "Respuesta en minutos, no en días",
  "Propuesta en lenguaje humano, sin tecnicismos",
  "Prompt técnico listo para desarrollarte",
  "100% gratis y sin compromiso",
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-[#fafafa]">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
              {BOT_NAME[0]}
            </span>
            <span className="text-lg font-bold text-gray-900">
              Cotizador<span className="text-primary">.web</span>
            </span>
          </div>
          <Button asChild size="sm">
            <Link href="/chat">Iniciar cotización</Link>
          </Button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              Propuesta en minutos, sin formularios
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl">
              ¿Necesitas una web para tu negocio?{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Habla con {BOT_NAME}.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              {BOT_NAME} te entrevista como un consultor real: entiende tu
              negocio, analiza lo que necesitas con inteligencia artificial y
              te entrega una propuesta clara con precio estimado en MXN.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="text-base">
                <Link href="/chat">
                  Iniciar mi cotización
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link href="#como-funciona">Ver cómo funciona</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Timer className="h-4 w-4 text-emerald-500" /> 2-3 minutos
              </span>
              <span className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-emerald-500" /> Precios en MXN
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-500" /> Sin compromiso
              </span>
            </div>
          </motion.div>

          {/* Mock de chat */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="hidden lg:block"
          >
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xl shadow-blue-100/50">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                  {BOT_NAME[0]}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{BOT_NAME}</p>
                  <p className="text-xs text-emerald-600">● En línea</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-[#f0f0f0] px-4 py-2.5 text-gray-800">
                  ¡Hola! Soy {BOT_NAME}. Cuéntame, ¿a qué se dedica tu negocio?
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#e8f0fe] px-4 py-2.5 text-gray-800">
                  Soy dentista y quiero que mis pacientes agenden citas online
                </div>
                <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-[#f0f0f0] px-4 py-2.5 text-gray-800">
                  ¡Qué buena idea! Eso te ahorra mucho tiempo en llamadas.
                  Entonces sería algo tipo: página de tu consultorio + sistema
                  de citas donde el paciente elige día y hora. ¿Correcto? 😄
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#e8f0fe] px-4 py-2.5 text-gray-800">
                  Sí, exacto
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-[#f0f0f0] px-4 py-2.5 text-gray-800">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-typing-bounce"
                        style={{ animationDelay: `${i * 0.18}s` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section id="como-funciona" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Así de fácil funciona
            </h2>
            <p className="mt-3 text-muted-foreground">
              Sin llamadas, sin agendas, sin esperas. Solo una conversación.
            </p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                className="rounded-2xl border border-gray-100 bg-[#fafafa] p-6"
              >
                <step.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qué obtienes ── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              ¿Qué obtienes al final?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Una propuesta completa, clara y lista para tomar acción.
            </p>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PERKS.map((perk, i) => (
              <motion.div
                key={perk}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  ✓
                </span>
                <p className="text-[15px] font-medium text-gray-800">{perk}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="pb-20">
        <motion.div
          {...fadeUp}
          className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-14 text-center text-white sm:px-12"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Listo para saber cuánto cuesta tu web
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-blue-100">
            Toma 2 minutos. {BOT_NAME} te guía paso a paso y tendrás tu
            propuesta antes de lo que crees.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-white text-blue-700 hover:bg-blue-50"
          >
            <Link href="/chat">
              Iniciar cotización ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.div>
      </section>

      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Cotizador.web · Hecho con ♥ en México ·
          {BOT_NAME} es un consultor digital impulsado por IA.
        </div>
      </footer>
    </div>
  );
}
