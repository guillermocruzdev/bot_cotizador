import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChecklistProps = {
  items: ReactNode[];
  className?: string;
  iconClassName?: string;
};

/** Lista de "incluye" con check verde (accesible: lista semántica). */
export function Checklist({ items, className, iconClassName }: ChecklistProps) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-night-700 dark:text-slate-300">
          <span
            className={cn(
              "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
              iconClassName
            )}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
