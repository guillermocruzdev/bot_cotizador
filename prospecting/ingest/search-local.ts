/**
 * Búsqueda de negocios locales vía SerpAPI (motor Google Maps).
 *
 * - Requiere `SERPAPI_API_KEY` (https://serpapi.com).
 * - Devuelve candidatos normalizados; `website` se rellena solo si Google
 *   Maps lo expone (después se verifica con `hasWebsite`).
 * - `max_results` queda acotado a 10 (optimización de tokens/coste).
 */

export interface LocalBusinessCandidate {
  name: string;
  phone: string | null;
  address: string | null;
  category: string | null;
  /** URL del sitio web si Google Maps lo reporta; si no, null. */
  website: string | null;
  rating?: number;
  reviews?: number;
  placeId?: string;
}

export interface SearchLocalOptions {
  business_type: string;
  location: string;
  max_results: number;
}

const SERPAPI_ENDPOINT =
  process.env.SERPAPI_ENDPOINT ?? "https://serpapi.com/search.json";

export async function searchLocalBusinesses(
  opts: SearchLocalOptions
): Promise<LocalBusinessCandidate[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SERPAPI_API_KEY no configurada. Agrégala en .env.local o en el dashboard de Vercel."
    );
  }

  // Se lee en tiempo de llamada para permitir override en pruebas/self-host.
  const endpoint = process.env.SERPAPI_ENDPOINT ?? SERPAPI_ENDPOINT;
  const params = new URLSearchParams({
    engine: "google_maps",
    q: `${opts.business_type} en ${opts.location}`,
    type: "search",
    api_key: apiKey,
    num: String(Math.max(1, Math.min(opts.max_results, 10))),
  });

  const url = `${endpoint}?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    throw new Error(`SerpAPI respondió HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    error?: string;
    local_results?: unknown[];
  };
  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`);
  }

  const results = Array.isArray(data.local_results) ? data.local_results : [];
  return results
    .slice(0, opts.max_results)
    .map((item) => normalizeLocalResult(item as Record<string, unknown>));
}

function normalizeLocalResult(item: Record<string, unknown>): LocalBusinessCandidate {
  const type = item.type;
  return {
    name: String(item.title ?? item.name ?? "Sin nombre"),
    phone: typeof item.phone === "string" && item.phone ? item.phone : null,
    address:
      typeof item.address === "string" && item.address ? item.address : null,
    category:
      Array.isArray(type)
        ? type.map(String).join(", ")
        : typeof type === "string"
          ? type
          : null,
    website:
      typeof item.website === "string" && item.website ? item.website : null,
    rating: typeof item.rating === "number" ? item.rating : undefined,
    reviews: typeof item.reviews === "number" ? item.reviews : undefined,
    placeId: typeof item.place_id === "string" ? item.place_id : undefined,
  };
}
