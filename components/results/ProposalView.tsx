"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowLeft,
  CalendarHeart,
  Download,
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
import { buildCommercialProposal } from "@/lib/commercial-proposal";
import { downloadCommercialProposalPdf } from "@/lib/commercial-proposal-pdf";
import { createEmptyContext, type AnalysisResult, type ChatContext } from "@/lib/types";
import { ContactCTA } from "./ContactCTA";
import { FeatureList } from "./FeatureList";
import { PriceCard } from "./PriceCard";
import { PromptDownloader } from "./PromptDownloader";
import { TechStackTags } from "./TechStackTags";
import { ValueSelling } from "./ValueSelling";
import { WhyThisPrice } from "./WhyThisPrice";

const DEV_NAME = process.env.NEXT_PUBLIC_DEVELOPER_NAME || "";

export function ProposalView() {
  const storeResult = useChatStore((s) => s.result);
  const storeContext = useChatStore((s) => s.context);

  // El resultado puede venir del store (navegación SPA) o del sessionStorage
  // (full reload desde /chat). Rehidrata el store para mantener consistencia.
  const persisted = useMemo(() => readPersistedResult(), []);
  const result: AnalysisResult | null = storeResult ?? persisted?.result ?? null;
  const context: ChatContext = storeContext ?? persisted?.context ?? createEmptyContext();

  const descargarPropuesta = () => {
    if (!result) return;
    downloadCommercialProposalPdf(buildCommercialProposal(result, context));
  };

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

  const firstName = result.clientName?.split(" ")[0];

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

        {/* ── Precio (exacto, sin rangos) ── */}
        <PriceCard
          categoria={result.categoria}
          nivel={result.nivel}
          precio_exacto={result.precio_min}
          tiempo_estimado={result.tiempo_estimado}
          giro={result.giro}
          cuota_mensual={result.cuota_mensual}
          alcance_ajustado={result.alcance_ajustado}
          mensaje_alcance={result.mensaje_alcance}
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

          {/* ── Tecnología ── */}
          <section>
            <MessageAnimator delay={0.2}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                🛠️ ¿Qué tecnología usaré?
              </h2>
            </MessageAnimator>
            <TechStackTags stack={result.stack_tecnico} delay={0.25} />
          </section>

          {/* ── Por qué este precio ── */}
          <section>
            <MessageAnimator delay={0.3}>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                ¿Por qué este precio?
              </h2>
            </MessageAnimator>
            <WhyThisPrice explanation={result.explicacion_precio} delay={0.35} />
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
                <ContactCTA clientName={result.clientName} categoria={result.categoria} />
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
