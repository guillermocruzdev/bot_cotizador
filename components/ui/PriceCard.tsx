import Link from "next/link";
import { cn, formatMXN } from "@/lib/utils";
import { whatsappLink } from "@/lib/site";
import { CTAButton } from "@/components/ui/CTAButton";
import { Checklist } from "@/components/ui/Checklist";
import { LiftCard } from "@/components/ui/LiftCard";

export type PriceCardProps = {
  title: string;
  /** Precio "desde" en MXN (regla #7: fuente = precioDesde). */
  priceFrom: number;
  description?: string;
  includes: string[];
  ctaLabel?: string;
  ctaHref?: string;
  /** Badge opcional, p. ej. "Más popular". */
  badge?: string;
  /** Destaca la tarjeta (borde brand + sombra). */
  featured?: boolean;
  /** CTA de WhatsApp en vez de enlace interno. */
  whatsappCta?: boolean;
};

/** Tarjeta de precio "desde $X" con lista de includes y CTA. */
export function PriceCard({
  title,
  priceFrom,
  description,
  includes,
  ctaLabel = "Cotizar esta web",
  ctaHref = "/chat",
  badge,
  featured = false,
  whatsappCta = false,
}: PriceCardProps) {
  return (
    <LiftCard
      className={cn(
        "flex flex-col p-6",
        featured && "border-brand-600/40 shadow-lg shadow-brand-600/5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-lg font-bold text-night-900">
          {title}
        </h3>
        {badge ? (
          <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">
            {badge}
          </span>
        ) : null}
      </div>
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      ) : null}
      <p className="mt-5">
        <span className="font-heading text-3xl font-bold text-night-900">
          {formatMXN(priceFrom)}
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {" "}
          MXN desde
        </span>
      </p>
      <div className="mt-6 flex-1">
        <Checklist items={includes} />
      </div>
      <div className="mt-6">
        <CTAButton
          asChild
          variant={whatsappCta ? "whatsapp" : "primary"}
          className="w-full"
        >
          <Link href={whatsappCta ? whatsappLink : ctaHref}>
            {ctaLabel}
          </Link>
        </CTAButton>
      </div>
    </LiftCard>
  );
}
