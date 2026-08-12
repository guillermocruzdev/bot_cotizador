"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { setTheme } from "@/lib/theme";

export type ThemeToggleProps = {
  className?: string;
  /** Muestra también una etiqueta de texto (para el menú móvil). */
  withLabel?: boolean;
};

/**
 * Interruptor de tema claro/oscuro de la vitrina (2026-08-11).
 * Persiste la preferencia en localStorage; sigue al sistema si nunca se tocó.
 */
export function ThemeToggle({ className, withLabel = false }: ThemeToggleProps) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () =>
      setDark(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener("nexora:theme", sync);
    return () => window.removeEventListener("nexora:theme", sync);
  }, []);

  const toggle = () => {
    const next: "dark" | "light" =
      document.documentElement.classList.contains("dark") ? "light" : "dark";
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={dark ? "Tema claro" : "Tema oscuro"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-night-900/15 bg-white text-night-700 transition hover:border-brand-600/40 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/15 dark:bg-night-900 dark:text-slate-300 dark:hover:border-brand-400/40 dark:hover:text-brand-400",
        withLabel ? "h-11 w-full px-3 text-sm font-medium" : "h-10 w-10",
        className
      )}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      {withLabel ? <span>{dark ? "Tema claro" : "Tema oscuro"}</span> : null}
    </button>
  );
}
