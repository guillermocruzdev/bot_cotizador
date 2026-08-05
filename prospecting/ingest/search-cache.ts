/**
 * Cache de resultados de búsqueda (TTL 24 h) — optimización de tokens/coste.
 *
 * - Primero memoria (Map del proceso).
 * - Si Supabase está configurado, persiste en `search_cache` (query_hash PK)
 *   para que el cache sobreviva entre reinicios del worker.
 */

import { isSupabaseConfigured, supabaseAdmin } from "../../lib/supabase";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  results: unknown;
  fetchedAt: string;
}

const memCache = new Map<string, CacheEntry>();

/** Hash estable y compacto (FNV-1a) para la clave de cache. */
export function cacheKey(...parts: string[]): string {
  const input = parts.join("|").toLowerCase().trim();
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export async function getCachedSearch<T>(key: string): Promise<T | null> {
  const mem = memCache.get(key);
  if (mem && isFresh(mem.fetchedAt)) {
    return mem.results as T;
  }

  if (isSupabaseConfigured() && supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("search_cache")
      .select("results, fetched_at")
      .eq("query_hash", key)
      .maybeSingle();
    if (data && isFresh(data.fetched_at)) {
      memCache.set(key, { results: data.results, fetchedAt: data.fetched_at });
      return data.results as T;
    }
  }
  return null;
}

export async function setCachedSearch(
  key: string,
  results: unknown
): Promise<void> {
  const fetchedAt = new Date().toISOString();
  memCache.set(key, { results, fetchedAt });
  if (isSupabaseConfigured() && supabaseAdmin) {
    await supabaseAdmin
      .from("search_cache")
      .upsert(
        { query_hash: key, results, fetched_at: fetchedAt },
        { onConflict: "query_hash" }
      );
  }
}

function isFresh(fetchedAt: string): boolean {
  return Date.now() - new Date(fetchedAt).getTime() < CACHE_TTL_MS;
}
