import { cn } from "@/lib/utils";

export type StatProps = {
  value: string;
  label: string;
  sub?: string;
  className?: string;
};

/** Métrica de prueba social (valor grande + etiqueta). */
export function Stat({ value, label, sub, className }: StatProps) {
  return (
    <div className={cn("text-center", className)}>
      <p className="font-heading text-3xl font-bold text-night-900 dark:text-white sm:text-4xl">
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-night-700 dark:text-slate-300">{label}</p>
      {sub ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}
