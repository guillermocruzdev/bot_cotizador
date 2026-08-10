import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { cn, formatMXN } from "@/lib/utils";
import { whatsappLink } from "@/lib/site";
import { CTAButton } from "@/components/ui/CTAButton";
import { Checklist } from "@/components/ui/Checklist";
import { LiftCard } from "@/components/ui/LiftCard";
import { NivelBadge } from "@/components/ui/NivelBadge";

export type TierCardProps = {
  /** Niveles N0–N5 que agrupa el tier (para badges). */
  niveles: string[];
  titulo: string;
  descripcion: string;
  /** Precio desde mínimo del tier (MXN IVA incl.). */
  desde: number;
  /** Precio máximo del tier (MXN IVA incl.). */
  hasta: number;
  /** Cuota mensual desde = desde/24. */
  cuota: number;
  includes: string[];
  ejemplos: string[];
  /** Badge de "más popular" en la tarjeta. */
  featured?: boolean;
  /** N5: se cotiza con propuesta formal, no precio cerrado. */
  propuestaFormal?: boolean;
  className?: string;
};

/** Tarjeta de tier de precio N0–N5 (data-driven desde lib/pricing-tiers.ts). */
export function TierCard({
  niveles,
  titulo,
  descripcion,
  desde,
  hasta,
  cuota,
  includes,
  ejemplos,
  featured = false,
  propuestaFormal = false,
  className,
}: TierCardProps) {
  return (
    <LiftCard
      className={cn(
        "flex flex-col p-6",
        featured && "border-brand-600/40 shadow-lg shadow-brand-600/5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {niveles.map((n) => (
            <NivelBadge key={n} nivel={n} withLabel={false} />
          ))}
        </div>
        {featured ? (
          <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">
            Más popular
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 font-heading text-lg font-bold text-night-900">
        {titulo}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">{descripcion}</p>

      <div className="mt-5 rounded-xl border border-night-900/10 bg-surface-50 p-4">
        <p className="font-mono text-xs uppercase tracking-widest text-brand-700">
          Desde
        </p>
        <p className="mt-1 font-heading text-3xl font-bold text-night-900">
          {formatMXN(desde)}{" "}
          <span className="text-sm font-medium text-muted-foreground">MXN</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasta > desde ? `hasta ${formatMXN(hasta)}` : formatMXN(hasta)} · o{" "}
          <span className="font-semibold text-night-700">
            {formatMXN(cuota)}/mes
          </span>{" "}
          a 24 meses
        </p>
        {propuestaFormal ? (
          <p className="mt-2 inline-flex items-start gap-1.5 rounded-lg bg-brand-600/10 px-2.5 py-1.5 text-xs font-medium text-brand-700">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Se cotiza con propuesta formal, no precio cerrado.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex-1">
        <Checklist items={includes} />
      </div>

      <div className="mt-5 border-t border-night-900/10 pt-4">
        <p className="font-mono text-xs uppercase tracking-widest text-brand-700">
          Incluye
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ejemplos.slice(0, 4).map((e) => (
            <span
              key={e}
              className="rounded-full bg-night-900/5 px-2.5 py-1 font-mono text-[11px] text-night-700"
            >
              {e}
            </span>
          ))}
          {ejemplos.length > 4 ? (
            <span className="rounded-full bg-night-900/5 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
              +{ejemplos.length - 4}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        {propuestaFormal ? (
          <CTAButton asChild variant="whatsapp" className="w-full">
            <a
              href={`${whatsappLink}?text=${encodeURIComponent(
                "Hola Nexora, quiero una propuesta formal para una plataforma (marketplace, SaaS o ERP)"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Pedir propuesta formal
            </a>
          </CTAButton>
        ) : (
          <CTAButton asChild className="w-full">
            <Link href="/chat">
              Cotizar esta web <ArrowRight className="h-4 w-4" />
            </Link>
          </CTAButton>
        )}
      </div>
    </LiftCard>
  );
}
