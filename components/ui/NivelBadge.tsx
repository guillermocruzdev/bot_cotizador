import { cn } from "@/lib/utils";

/** Etiquetas de nivel de producto N0–N5 (consistente con la cartera). */
export const NIVEL_LABELS: Record<string, string> = {
  N0: "Entrada",
  N1: "Presencia",
  N2: "Negocio",
  N3: "Venta",
  N4: "Plataforma",
  N5: "Ecosistema",
};

const NIVEL_STYLES: Record<string, string> = {
  N0: "bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-600/60",
  N1: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30",
  N2: "bg-brand-600/10 text-brand-700 ring-brand-600/30 dark:text-brand-400 dark:ring-brand-400/30",
  N3: "bg-emerald-50 text-emerald-700 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  N4: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30",
  N5: "bg-night-900 text-white ring-night-900 dark:bg-white dark:text-night-900 dark:ring-white",
};

export type NivelBadgeProps = {
  /** Nivel, p. ej. "N2" o "N2 · Negocio". */
  nivel: string;
  className?: string;
  /** Muestra también la etiqueta ("N2 · Negocio"). Default true. */
  withLabel?: boolean;
};

/** Extrae el código N0–N5 de cualquier string de nivel. */
export function nivelKey(nivel: string): string {
  const match = /N[0-5]/.exec(nivel);
  return match?.[0] ?? nivel;
}

/** Badge de nivel de producto N0–N5 con color por nivel. */
export function NivelBadge({
  nivel,
  className,
  withLabel = true,
}: NivelBadgeProps) {
  const key = nivelKey(nivel);
  const label = NIVEL_LABELS[key];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold ring-1 ring-inset",
        NIVEL_STYLES[key] ??
          "bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-600/60",
        className
      )}
    >
      {key}
      {withLabel && label ? ` · ${label}` : ""}
    </span>
  );
}
