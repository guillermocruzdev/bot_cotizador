"use client";

import {
  AlertTriangle,
  BadgeCheck,
  HeartHandshake,
  TrendingUp,
} from "lucide-react";
import { MessageAnimator } from "@/components/chat/MessageAnimator";
import type { AnalysisResult } from "@/lib/types";

/**
 * Sección de venta de valor: le muestra al cliente el problema que la web
 * resuelve, el beneficio concreto para SU negocio y por qué es una inversión
 * (no un gasto). El objetivo es que sienta que la necesita.
 */
export function ValueSelling({ result }: { result: AnalysisResult }) {
  const { dolor, punto_venta, beneficios, valor_negocio, costo_omision, giro } = result;

  if (!dolor && !punto_venta && !beneficios?.length && !valor_negocio) return null;

  return (
    <div className="space-y-10">
      {/* ── Por qué tu negocio lo necesita ── */}
      {(dolor || punto_venta) && (
        <section>
          <MessageAnimator delay={0.08}>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {giro ? `Por qué tu ${giro.toLowerCase()} lo necesita` : "Por qué tu negocio lo necesita"}
            </h2>
          </MessageAnimator>
          <div className="space-y-3">
            {dolor && (
              <MessageAnimator delay={0.12}>
                <div className="flex gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                  <div>
                    <p className="text-sm font-semibold text-rose-900">
                      El problema de hoy
                    </p>
                    <p className="text-[15px] leading-relaxed text-rose-900/80">
                      {dolor}
                    </p>
                  </div>
                </div>
              </MessageAnimator>
            )}
            {punto_venta && (
              <MessageAnimator delay={0.16}>
                <div className="flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      La solución que te propongo
                    </p>
                    <p className="text-[15px] leading-relaxed text-emerald-900/80">
                      {punto_venta}
                    </p>
                  </div>
                </div>
              </MessageAnimator>
            )}
          </div>
        </section>
      )}

      {/* ── Beneficios para tu negocio ── */}
      {beneficios && beneficios.length > 0 && (
        <section>
          <MessageAnimator delay={0.2}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <BadgeCheck className="h-5 w-5 text-primary" />
              Lo que esta web hace por tu negocio
            </h2>
          </MessageAnimator>
          <MessageAnimator delay={0.24}>
            <ul className="space-y-2.5">
              {beneficios.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3 text-[15px] text-gray-800"
                >
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </MessageAnimator>
        </section>
      )}

      {/* ── Por qué es una inversión ── */}
      {valor_negocio && (
        <section>
          <MessageAnimator delay={0.3}>
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-5 text-white">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-100">
                <HeartHandshake className="h-4 w-4" />
                Piensa en esto
              </p>
              <p className="text-[15px] leading-relaxed">{valor_negocio}</p>
            </div>
          </MessageAnimator>
        </section>
      )}

      {/* ── Costo de omisión ── */}
      {costo_omision && (
        <section>
          <MessageAnimator delay={0.34}>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm leading-relaxed text-amber-900">
                <span className="font-semibold">Para que lo tengas presente: </span>
                {costo_omision}
              </p>
            </div>
          </MessageAnimator>
        </section>
      )}
    </div>
  );
}
