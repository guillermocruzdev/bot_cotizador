"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initTheme, isLightOnlyPath } from "@/lib/theme";

/**
 * Guarda de tema de la vitrina (2026-08-11).
 * En rutas de la vitrina aplica el tema guardado/sistema; al navegar fuera
 * (chat, results, dashboard…) fuerza CLARO para no alterar su aspecto actual.
 * El pre-paint script del root layout ya evitó el flash en el primer render.
 */
export function ThemeGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (isLightOnlyPath(pathname)) {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      return;
    }
    initTheme();
  }, [pathname]);

  return null;
}
