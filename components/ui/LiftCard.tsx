import * as React from "react";
import { cn } from "@/lib/utils";

export type LiftCardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Elevación al pasar el cursor. Default true. */
  hover?: boolean;
};

/** Tarjeta base de la vitrina con elevación al hover. */
export function LiftCard({
  className,
  hover = true,
  ...props
}: LiftCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-night-900/10 bg-white shadow-sm transition-all duration-300 dark:border-white/10 dark:bg-night-900",
        hover &&
          "hover:-translate-y-1 hover:border-brand-600/30 hover:shadow-lg hover:shadow-brand-600/5 dark:hover:border-brand-400/30 dark:hover:shadow-brand-400/5",
        className
      )}
      {...props}
    />
  );
}
