/**
 * Tema oscuro de la vitrina Nexora (2026-08-11).
 *
 * Persistencia: localStorage "nexora-theme" ('light' | 'dark' | ausente = sistema).
 * El class "dark" va en <html>; un script pre-paint en app/layout.tsx lo aplica
 * antes del primer render para evitar el flash (FOUC) al recargar.
 *
 * Ámbito: SOLO la vitrina (route group app/(marketing)/). Las rutas del
 * cotizador/prospección (chat, results, demo, login, dashboard…) conservan su
 * aspecto claro actual (ver isLightOnlyPath) — ThemeGuard las fuerza a claro.
 */

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "nexora-theme";

/** Rutas que quedan SIEMPRE claras (fuera del scope del tema oscuro). */
export const LIGHT_ONLY_PATHS = [
  "/chat",
  "/results",
  "/demo",
  "/login",
  "/dashboard",
  "/leads",
  "/campaigns",
  "/conversations",
] as const;

export function isLightOnlyPath(pathname: string): boolean {
  return LIGHT_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function getStoredTheme(): ThemePreference | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : null;
}

export function getSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveDark(pref: ThemePreference | null): boolean {
  if (pref === "dark") return true;
  if (pref === "light") return false;
  return getSystemDark();
}

/**
 * Aplica el tema al <html> y sincroniza a los listeners (toggles, ThemeGuard)
 * vía el evento "nexora:theme".
 */
export function applyTheme(pref: ThemePreference | null): void {
  const dark = resolveDark(pref);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  window.dispatchEvent(new CustomEvent("nexora:theme", { detail: { dark } }));
}

export function setTheme(pref: ThemePreference): void {
  window.localStorage.setItem(STORAGE_KEY, pref);
  applyTheme(pref);
}

/** Inicializa el tema según la preferencia guardada (o el sistema). */
export function initTheme(): void {
  applyTheme(getStoredTheme());
}
