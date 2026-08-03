"use client";

import { Clock, Gauge, Sparkles, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessageAnimator } from "@/components/chat/MessageAnimator";
import { formatMXN } from "@/lib/utils";

interface PriceCardProps {
  categoria: string;
  nivel: string;
  precio_min: number;
  precio_max: number;
  tiempo_estimado: string;
  giro?: string;
  cuota_mensual?: number;
  alcance_ajustado?: boolean;
  mensaje_alcance?: string | null;
}

export function PriceCard({
  categoria,
  nivel,
  precio_min,
  precio_max,
  tiempo_estimado,
  giro,
  cuota_mensual,
  alcance_ajustado,
  mensaje_alcance,
}: PriceCardProps) {
  return (
    <MessageAnimator>
      <Card className="overflow-hidden border-0 shadow-lg shadow-blue-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="border-transparent bg-white/20 text-white hover:bg-white/20"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              {categoria}
            </Badge>
            {giro && (
              <Badge
                variant="secondary"
                className="border-transparent bg-white/10 text-blue-50 hover:bg-white/10"
              >
                Para: {giro}
              </Badge>
            )}
          </div>

          <p className="text-3xl font-bold tracking-tight sm:text-4xl">
            {formatMXN(precio_min)} - {formatMXN(precio_max)}
            <span className="ml-1 text-lg font-medium text-blue-100">MXN</span>
          </p>

          {cuota_mensual ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white">
              <TrendingDown className="h-4 w-4" />
              Desde {formatMXN(cuota_mensual)} al mes
              <span className="font-normal text-blue-100">
                (es más de lo que gastas en publicidad en un mes)
              </span>
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-blue-100">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {tiempo_estimado}
            </span>
            <span className="flex items-center gap-1.5">
              <Gauge className="h-4 w-4" />
              Nivel {nivel}
            </span>
          </div>
        </div>
        <CardContent className="bg-white p-5">
          {alcance_ajustado && mensaje_alcance ? (
            <p className="text-sm text-gray-700">{mensaje_alcance}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Este rango está pensado para tu tipo de negocio y lo que
              normalmente se invierte en él. El precio final se confirma al
              detallar el alcance, pero no se moverá de aquí para arriba.
            </p>
          )}
        </CardContent>
      </Card>
    </MessageAnimator>
  );
}
