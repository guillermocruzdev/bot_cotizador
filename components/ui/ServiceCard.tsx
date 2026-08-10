import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn, formatMXN } from "@/lib/utils";
import { LiftCard } from "@/components/ui/LiftCard";
import { NivelBadge } from "@/components/ui/NivelBadge";

export type ServiceCardProps = {
  nombre: string;
  descripcion: string;
  /** Nivel N0–N5 para el badge. */
  nivel?: string;
  /** Precio "desde" en MXN (fuente: precioDesde). */
  precioDesde?: number;
  /** Enlace del CTA de la tarjeta (por defecto → cotizador Alex). */
  href?: string;
  /** Enlace opcional al detalle del servicio (ancla o ruta). El nombre se vuelve un link. */
  detalleHref?: string;
  className?: string;
};

/** Tarjeta de servicio con badge de nivel y precio "desde". */
export function ServiceCard({
  nombre,
  descripcion,
  nivel,
  precioDesde,
  href = "/chat",
  detalleHref,
  className,
}: ServiceCardProps) {
  return (
    <LiftCard className={cn("flex flex-col p-6", className)}>
      <div className="flex items-center justify-between gap-2">
        {nivel ? <NivelBadge nivel={nivel} /> : <span />}
        {precioDesde != null ? (
          <span className="font-mono text-sm font-semibold text-brand-700">
            desde {formatMXN(precioDesde)}
          </span>
        ) : null}
      </div>
      {detalleHref ? (
        <Link
          href={detalleHref}
          className="mt-4 font-heading text-lg font-bold text-night-900 transition hover:text-brand-700"
        >
          {nombre}
        </Link>
      ) : (
        <h3 className="mt-4 font-heading text-lg font-bold text-night-900">
          {nombre}
        </h3>
      )}
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{descripcion}</p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:gap-2.5 hover:text-brand-700"
      >
        Cotizar esta web <ArrowRight className="h-4 w-4" />
      </Link>
    </LiftCard>
  );
}
