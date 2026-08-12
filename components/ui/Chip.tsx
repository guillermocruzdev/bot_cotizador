"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChipProps = {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

/** Chip/píldora interactivo (filtros, selección de nivel, etc.). */
export function Chip({
  children,
  active = false,
  onClick,
  disabled = false,
  className,
}: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-night-900/15 bg-white text-night-700 hover:border-brand-600/40 hover:text-brand-700 dark:border-white/15 dark:bg-night-900 dark:text-slate-300 dark:hover:border-brand-400/40 dark:hover:text-brand-400",
        className
      )}
    >
      {children}
    </button>
  );
}
