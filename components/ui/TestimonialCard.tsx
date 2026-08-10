import { Quote, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiftCard } from "@/components/ui/LiftCard";

export type TestimonialCardProps = {
  quote: string;
  author?: string;
  business?: string;
  /** Tipo de web contratada. */
  service?: string;
  rating?: number;
  /** Marca el placeholder de testimonio (nunca inventar reseñas reales). */
  placeholder?: boolean;
  className?: string;
};

/** Tarjeta de testimonio con estrellas y autor (placeholder marcado). */
export function TestimonialCard({
  quote,
  author,
  business,
  service,
  rating = 5,
  placeholder = false,
  className,
}: TestimonialCardProps) {
  return (
    <LiftCard className={cn("relative flex flex-col p-6", className)}>
      <Quote className="absolute right-5 top-5 h-8 w-8 text-brand-600/10" />
      <div className="flex gap-0.5" aria-label={`${rating} de 5 estrellas`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              i < rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
            )}
          />
        ))}
      </div>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-night-700">
        &ldquo;{quote}&rdquo;
        {placeholder ? (
          <span className="mt-1 block font-mono text-xs text-brand-600">
            [EJEMPLO — reemplazar por testimonio real]
          </span>
        ) : null}
      </p>
      {author || business ? (
        <div className="mt-5 border-t border-night-900/10 pt-4">
          {author ? (
            <p className="text-sm font-semibold text-night-900">{author}</p>
          ) : null}
          {business ? (
            <p className="text-xs text-muted-foreground">{business}</p>
          ) : null}
          {service ? (
            <p className="mt-1.5 inline-flex rounded-full bg-brand-600/10 px-2 py-0.5 font-mono text-[11px] font-medium text-brand-700">
              {service}
            </p>
          ) : null}
        </div>
      ) : null}
    </LiftCard>
  );
}
