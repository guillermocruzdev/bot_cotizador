import { cn } from "@/lib/utils";

export type SectionHeaderProps = {
  /** Eyebrow mono (estilo terminal), p. ej. "servicios". */
  eyebrow?: string;
  /** Título en Space Grotesk. */
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
};

/** Encabezado de sección con ritmo: eyebrow + título + subtítulo. */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {eyebrow ? (
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-brand-600">
          &gt; {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-night-900 sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
