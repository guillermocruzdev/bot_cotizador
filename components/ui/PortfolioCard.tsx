import Link from "next/link";
import { ExternalLink, Github } from "lucide-react";
import { cn, formatMXN } from "@/lib/utils";
import { LiftCard } from "@/components/ui/LiftCard";
import { NivelBadge } from "@/components/ui/NivelBadge";

export type PortfolioCardProps = {
  /** Código de registro, p. ej. "PK-001". */
  codigo: string;
  nombre: string;
  nivel?: string;
  descripcion: string;
  /** Precio "desde" en MXN. */
  precioDesde?: number;
  /** URL de la demo desplegada. */
  urlDemo?: string;
  /** URL del repo GitHub. */
  repo?: string;
  estado?: "disponible" | "proximamente";
  /** Enlace opcional al detalle del PACK (/portafolio/[codigo]). El nombre se vuelve un link. */
  detalleHref?: string;
  className?: string;
};

/** Tarjeta del portafolio/vitrina de PACKs (código PK, nivel, demo, repo). */
export function PortfolioCard({
  codigo,
  nombre,
  nivel,
  descripcion,
  precioDesde,
  urlDemo,
  repo,
  estado = "disponible",
  detalleHref,
  className,
}: PortfolioCardProps) {
  const disponible = estado === "disponible" && !!urlDemo;
  return (
    <LiftCard className={cn("flex flex-col p-6", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold tracking-widest text-muted-foreground">
          {codigo}
        </span>
        {nivel ? <NivelBadge nivel={nivel} /> : null}
      </div>
      {detalleHref ? (
        <Link
          href={detalleHref}
          className="mt-3 font-heading text-lg font-bold text-night-900 transition hover:text-brand-700"
        >
          {nombre}
        </Link>
      ) : (
        <h3 className="mt-3 font-heading text-lg font-bold text-night-900">
          {nombre}
        </h3>
      )}
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{descripcion}</p>
      {precioDesde != null ? (
        <p className="mt-4 font-mono text-sm font-semibold text-brand-700">
          Desde {formatMXN(precioDesde)} MXN
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {repo ? (
          <a
            href={repo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-night-900/15 px-3 py-2 text-xs font-semibold text-night-700 transition hover:border-brand-600/40 hover:bg-surface-50"
          >
            <Github className="h-3.5 w-3.5" /> Código
          </a>
        ) : null}
        {disponible ? (
          <a
            href={urlDemo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Ver demo
          </a>
        ) : (
          <span className="inline-flex items-center rounded-lg bg-night-900/5 px-3 py-2 text-xs font-semibold text-night-700">
            Próximamente
          </span>
        )}
      </div>
    </LiftCard>
  );
}
