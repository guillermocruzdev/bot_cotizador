/**
 * Verificación de sitios web (`hasWebsite`).
 *
 * Comprueba si una URL realmente existe y está "viva":
 *  - HTTP 2xx + content-type HTML + título válido.
 *  - Descarta dominios parqueados / sitios "en construcción" / "coming soon".
 *  - Errores de red, timeouts o 4xx/5xx → false (se trata como "sin sitio web").
 */

import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** Señales de dominio parqueado / sitio en construcción / próximamente. */
const NOT_LIVE =
  /under construction|domain (is )?(for sale|parked)|coming soon|website (is )?(being )?(built|developed)|sitio (en )?(construcci[oó]n)|en construcci[oó]n|pr[oó]ximamente|dominio (en venta|parqueado)/i;

/** Normaliza una URL añadiendo https:// si no trae esquema. */
export function normalizeUrl(url: string): string {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * ¿Existe un sitio web vivo en `url`?
 * Devuelve `true` solo si se verifica una página HTML real (2xx + título).
 */
export async function hasWebsite(url: string): Promise<boolean> {
  const normalized = normalizeUrl(url);
  if (!normalized) return false;

  try {
    const res = await fetch(normalized, {
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "es-MX,es;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return false;

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    // Respuesta 2xx no-HTML (PDF, imagen, redirección): cuenta como sitio existente.
    if (!contentType.includes("text/html") && !contentType.includes("xhtml")) {
      return true;
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").first().text().trim();
    const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 600);

    // Página vacía o sin título → no cuenta como sitio real.
    if (!title && bodyText.length < 10) return false;
    // Dominio parqueado / en construcción → no cuenta como sitio real.
    if (NOT_LIVE.test(title) || NOT_LIVE.test(bodyText)) return false;

    return true;
  } catch {
    // Error de red / timeout → no verificable → se trata como sin sitio.
    return false;
  }
}
