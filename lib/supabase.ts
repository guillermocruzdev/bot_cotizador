/**
 * Clientes de Supabase.
 * - `supabaseAdmin`: usa SERVICE_ROLE_KEY (SOLO servidor, nunca exponer).
 * - `supabaseBrowser`: usa las NEXT_PUBLIC_* (solo cliente).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Cliente del lado servidor (API routes) con permisos totales.
export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

// Cliente del lado cliente (navegador). Solo se crea si hay credenciales.
export const supabaseBrowser: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      })
    : null;

/** ¿Las credenciales de Supabase están configuradas? */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && (supabaseAnonKey || serviceRoleKey));
}
