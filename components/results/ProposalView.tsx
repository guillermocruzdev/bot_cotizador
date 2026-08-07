"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarHeart,
  Download,
  Loader2,
  PackageCheck,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageAnimator } from "@/components/chat/MessageAnimator";
import {
  BOT_NAME,
  readPersistedResult,
  useChatStore,
} from "@/lib/chat-store";
import { generateProposal } from "@/lib/generate-proposal";
import {
  buildClientData,
  calculateQuote,
  derivarTipoWeb,
  detectarCiudad,
  formatPesos,
  type ClientData,
} from "@/lib/quote-engine";
import { resolverCategoria } from "@/lib/pricing-catalog";
import { totalBotsMensual, totalBotsSetup } from "@/lib/bots-catalog";
import type { AnalysisResult } from "@/lib/types";
import { ContactCTA } from "./ContactCTA";
import { FeatureList } from "./FeatureList";
import { PriceCard } from "./PriceCard";
import { PromptDownloader } from "./PromptDownloader";
import { TechStackTags } from "./TechStackTags";
import { ValueSelling } from "./ValueSelling";
import { WhyThisPrice } from "./WhyThisPrice";

const DEV_NAME = process.env.NEXT_PUBLIC_DEVELOPER_NAME || "";

/** Máximo del presupuesto que dijo el cliente ("6000 a 7000" → 7000). */
function maxBudget(presupuesto: string | null): number | null {
  if (!presupuesto) return null;
  const nums = presupuesto.match(/\d+/g)?.map(Number) ?? [];
  return nums.length ? Math.max(...nums) : null;
}

export function ProposalView() {
  const result = useChatStore((s) => s.result);
  const context = useChatStore((s) => s.context);
  const [ready, setReady] = useState(false);

  // El resultado puede venir del store (navegación SPA) o del sessionStorage
  // (full reload desde /chat). La hidratación se hace SOLO en el cliente
  // (useEffect) para evitar errores de hydration al leer sessionStorage
  // durante el render (el servidor no lo tiene).
  useEffect(() => {
    if (!useChatStore.getState().result) {
      const persisted = readPersistedResult();
      if (persisted) {
        useChatStore.setState({
          result: persisted.result,
          context: persisted.context,
          messages: persisted.messages,
          started: true,
        });
      }
    }
    setReady(true);
  }, []);

  // Deriva los datos del cliente (Fase 1) desde la conversación y genera
  // la propuesta comercial profesional de 6 páginas (Fase 2).
  const clientData: ClientData | null = result
    ? buildClientData({
        nombre: context.clientName || result.clientName || "",
        giro: result.giro || result.categoria || "",
        telefono: context.clientPhone ?? null,
        ubicacion: detectarCiudad(context.negocioDescripcion),
        // La categoría final considera lo que el cliente declinó (una tienda
        // de ropa sin pagos en línea es landing, no ecommerce) → el total
        // mostrado coincide con el de la propuesta y el PDF.
        tipoWeb: derivarTipoWeb(resolverCategoria(context), context.paginas),
        dominioHosting: true,
        branding: false,
        presupuesto: null,
      })
    : null;

  // Bots de LangChain (add-on): su setup se suma al total exacto y aportan una
  // suscripción mensual propia (motor de IA + mantenimiento).
  const botsSeleccionados = context.bots ?? [];
  const botsTotal = totalBotsSetup(botsSeleccionados);
  const botsCuota = totalBotsMensual(botsSeleccionados);

  const quoteTotal =
    clientData != null ? calculateQuote(clientData).total + botsTotal : null;

  // Cuota mensual SIEMPRE derivada del mismo precio mostrado (precio/24),
  // para que "Desde $X al mes" nunca contradiga el total exacto.
  const cuotaMensual =
    quoteTotal != null
      ? Math.max(Math.round(quoteTotal / 24), 150)
      : result?.cuota_mensual;

  // Honestidad: si el cliente dio un presupuesto menor al total, se lo
  // decimos claro en vez de que la propuesta lo contradiga en silencio.
  const presupuestoMax = maxBudget(context.presupuesto);
  const mensajeAlcance =
    quoteTotal != null && presupuestoMax != null && presupuestoMax < quoteTotal
      ? `Me dijiste que tu presupuesto era de hasta ${formatPesos(
          presupuestoMax
        )}, y el proyecto que armamos parte de ${formatPesos(
          quoteTotal
        )} (IVA incluido). Te lo digo con claridad: si necesitas que quepa en tu presupuesto, dime y ajusto el alcance (por ejemplo, menos productos o sin SEO) hasta llegar a un precio que sí te quede cómodo. Prefiero ser honesto contigo que venderte algo que no puedas sostener.`
      : null;

  const descargarPropuesta = () => {
    if (!clientData) return;
    generateProposal(clientData);
  };

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#fafafa]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#fafafa] p-6">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <Wand2 className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Aún no hay una propuesta
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Primero cuéntanos sobre tu proyecto en el chat para que {BOT_NAME}{" "}
              arme tu propuesta personalizada.
            </p>
            <Button asChild>
              <Link href="/chat">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ir al chat
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstName = (result.clientName || context.clientName || "")?.split(" ")[0];

  return (
    <div className="min-h-dvh bg-[#fafafa] pb-16">
      <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
        {/* ── Header ── */}
        <MessageAnimator>
          <div className="mb-6">
            <Link
              href="/chat"
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Ajustar alcance (volver al chat)
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {firstName ? `¡Listo, ${firstName}!` : "¡Listo!"} Analicé tu
              proyecto y esto es lo que recomiendo:
            </h1>
            <p className="mt-2 text-muted-foreground">
              Esta es una propuesta preliminar basada en nuestra conversación.
              Nada está grabado en piedra.
            </p>
          </div>
        </MessageAnimator>

        {/* ── Precio (exacto, sin rangos, calculado por el motor) ── */}
        <PriceCard
          categoria={result.categoria}
          nivel={result.nivel}
          precio_exacto={quoteTotal ?? result.precio_min}
          tiempo_estimado={result.tiempo_estimado}
          giro={result.giro}
          cuota_mensual={cuotaMensual}
          alcance_ajustado={Boolean(mensajeAlcance) || result.alcance_ajustado}
          mensaje_alcance={mensajeAlcance ?? result.mensaje_alcance}
        />

        {/* ── Ventas de valor: por qué su negocio lo necesita ── */}
        <div className="mt-10">
          <ValueSelling result={result} />
        </div>

        <div className="mt-10 space-y-10">
          {/* ── Qué incluye ── */}
          <section>
            <MessageAnimator delay={0.1}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <PackageCheck className="h-5 w-5 text-primary" />
                ¿Qué incluye?
              </h2>
            </MessageAnimator>
            <FeatureList features={result.funcionalidades} delay={0.15} />
          </section>

          {/* ── Bots de LangChain (asistentes inteligentes) ── */}
          {(result.bots?.length ?? 0) > 0 && (
            <section>
              <MessageAnimator delay={0.18}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  🤖 Tus asistentes inteligentes
                </h2>
                <p className="mb-4 -mt-2 text-sm text-muted-foreground">
                  Estos bots atienden a tus clientes por ti con IA (LangChain +
                  DeepSeek) y ya están incluidos en tu propuesta.
                </p>
              </MessageAnimator>
              <div className="space-y-3">
                {result.bots!.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold text-gray-900">
                          {b.nombre}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {b.descripcion}
                        </p>
                        <p className="mt-1.5 text-sm text-gray-700">
                          ✨ {b.resultado}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-indigo-600">
                          {formatPesos(b.precio)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          +${b.cuota_mensual.toLocaleString("es-MX")}/mes
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {botsCuota > 0 && (
                  <p className="pt-1 text-sm text-muted-foreground">
                    Tus asistentes se mantienen activos con una suscripción
                    mensual de {formatPesos(botsCuota)}, que cubre el motor de
                    IA y las actualizaciones.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ── Tecnología ── */}
          <section>
            <MessageAnimator delay={0.2}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                🛠️ ¿Qué tecnología usaré?
              </h2>
            </MessageAnimator>
            <TechStackTags stack={result.stack_tecnico} delay={0.25} />
          </section>

          {/* ── Por qué este precio (siempre exacto, sin rangos) ── */}
          <section>
            <MessageAnimator delay={0.3}>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                ¿Por qué este precio?
              </h2>
            </MessageAnimator>
            <WhyThisPrice
              explanation={
                quoteTotal != null
                  ? `Tu inversión exacta es ${formatPesos(quoteTotal)} (IVA incluido). La calculé con una tabla de precios transparente según el tipo de web que necesitas, sin sorpresas ni rangos.`
                  : result.explicacion_precio
              }
              delay={0.35}
            />
          </section>

          {/* ── Entregables ── */}
          {result.entregables?.length > 0 && (
            <section>
              <MessageAnimator delay={0.4}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <PackageCheck className="h-5 w-5 text-primary" />
                  ¿Qué recibirás al finalizar?
                </h2>
              </MessageAnimator>
              <FeatureList features={result.entregables} delay={0.45} />
            </section>
          )}

          {/* ── Y después (mantenimiento) ── */}
          {result.recomendaciones?.length > 0 && (
            <section>
              <MessageAnimator delay={0.5}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <CalendarHeart className="h-5 w-5 text-primary" />
                  ¿Y después?
                </h2>
                <div className="space-y-2.5">
                  {result.recomendaciones.map((r, i) => (
                    <p
                      key={i}
                      className="rounded-xl bg-gray-50 px-4 py-3 text-[15px] text-gray-800"
                    >
                      {r}
                    </p>
                  ))}
                </div>
              </MessageAnimator>
            </section>
          )}
        </div>

        {/* ── CTAs ── */}
        <div className="mt-12 space-y-4">
          <MessageAnimator delay={0.6}>
            <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="text-lg">¿Siguiente paso?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ContactCTA
                  clientName={result.clientName || context.clientName || ""}
                  categoria={result.categoria}
                />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={descargarPropuesta}
                    className="w-full sm:w-auto"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar propuesta en PDF
                  </Button>
                  <PromptDownloader result={result} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {DEV_NAME ? `Listo para empezar cuando digas. ¡Gracias por la confianza, ${firstName || ""}!` : ""}
                </p>
              </CardContent>
            </Card>
          </MessageAnimator>
        </div>
      </div>
    </div>
  );
}
