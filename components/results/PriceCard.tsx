"use client";

import { Clock, Gauge, Sparkles } from "lucide-react";
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
}

export function PriceCard({
  categoria,
  nivel,
  precio_min,
  precio_max,
  tiempo_estimado,
}: PriceCardProps) {
  return (
    <MessageAnimator>
      <Card className="overflow-hidden border-0 shadow-lg shadow-blue-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <Badge
            variant="secondary"
            className="mb-3 border-transparent bg-white/20 text-white hover:bg-white/20"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {categoria}
          </Badge>
          <p className="text-3xl font-bold tracking-tight sm:text-4xl">
            {formatMXN(precio_min)} - {formatMXN(precio_max)}
            <span className="ml-1 text-lg font-medium text-blue-100">MXN</span>
          </p>
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
          <p className="text-sm text-muted-foreground">
            Este es un rango estimado a partir de lo que me contaste. El precio
            final se ajusta al detalle durante el arranque del proyecto.
          </p>
        </CardContent>
      </Card>
    </MessageAnimator>
  );
}
