// Auth ligera del dashboard de prospección (sesión firmada con HMAC).
// [DECISION_NEEDED]: sustituible por NextAuth.js / Clerk si se quiere OAuth.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "prospecting_session";
const MAX_AGE_S = 12 * 60 * 60; // 12 h

function secret(): string {
  return process.env.AUTH_SECRET ?? "prospecting-dev-secret-change-me";
}

export function createSessionToken(): string {
  const payload = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}:${parts[1]}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  const issued = Number(parts[0]);
  if (Number.isNaN(issued) || Date.now() - issued > MAX_AGE_S * 1000) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts[2], "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Llamar SOLO en Route Handlers / Server Actions (cookies().set). */
export function setSessionCookie(opts?: { secure?: boolean }): void {
  cookies().set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    // Secure solo si la petición va por HTTPS (evita bloquear el login local
    // con http:// en pruebas/desarrollo).
    secure: opts?.secure ?? process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_S,
    path: "/",
  });
}

/** ¿La petición es HTTPS? (x-forwarded-proto en Vercel, o el protocolo de la URL). */
export function isHttpsRequest(req: Request): boolean {
  return (
    req.headers.get("x-forwarded-proto") === "https" ||
    new URL(req.url).protocol === "https:"
  );
}

export function clearSessionCookie(): void {
  cookies().delete(SESSION_COOKIE);
}

/** Lectura segura (Server Components / Route Handlers). */
export function hasSession(): boolean {
  return verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
}

export function isAuthenticated(req: Request): boolean {
  const header = req.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]+)`));
  if (!match?.[1]) return false;
  // El header viene URL-encoded (%3A); cookies() lo decodifica, aquí no.
  return verifySessionToken(decodeURIComponent(match[1]));
}
