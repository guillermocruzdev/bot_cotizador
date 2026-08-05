/**
 * Repositorio de prospect_leads (Supabase) con inserción por lotes.
 *
 * - Upsert por `dedupe_key` (nombre + ubicación normalizados) → no duplicar.
 * - Inserción en chunks de 100 (optimización de llamadas a la API).
 */

import { isSupabaseConfigured, supabaseAdmin } from "../../lib/supabase";
import type { LeadCandidate } from "../ingest/search-agent";
import type { LeadStatus } from "../whatsapp/state-manager";

export interface ProspectLeadRow {
  name: string;
  phone: string | null;
  address: string | null;
  category: string | null;
  website: string | null;
  location: string;
  status: "pending";
  source: string;
  dedupe_key: string;
}

/** Clave de dedupe: nombre + ubicación normalizados (sin tildes, minúsculas). */
export function dedupeKey(name: string, location: string): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${norm(name)}|${norm(location)}`;
}

export interface BatchInsertResult {
  written: number;
  skipped: number;
}

export async function batchInsertLeads(
  leads: LeadCandidate[],
  opts: { location: string; source?: string }
): Promise<BatchInsertResult> {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    throw new Error(
      "Supabase no está configurado (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  const source = opts.source ?? "google_search";
  const rows: ProspectLeadRow[] = leads.map((lead) => ({
    name: lead.name,
    phone: lead.phone,
    address: lead.address,
    category: lead.category,
    website: lead.website,
    location: opts.location,
    status: "pending",
    source,
    dedupe_key: dedupeKey(lead.name, opts.location),
  }));

  let written = 0;
  let skipped = 0;
  for (const chunk of chunkArray(rows, 100)) {
    const { data, error } = await supabaseAdmin
      .from("prospect_leads")
      .upsert(chunk, { onConflict: "dedupe_key", ignoreDuplicates: false })
      .select("id");
    if (error) {
      throw new Error(`upsert prospect_leads falló: ${error.message}`);
    }
    written += data?.length ?? 0;
    skipped += chunk.length - (data?.length ?? 0);
  }
  return { written, skipped };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// --- Workflow WhatsApp (Chat 4) ---

export interface PendingLeadRow {
  id: string;
  name: string;
  category: string | null;
  location: string;
  phone: string | null;
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<void> {
  if (!isSupabaseConfigured() || !supabaseAdmin) return;
  const { error } = await supabaseAdmin
    .from("prospect_leads")
    .update({ status })
    .eq("id", leadId);
  if (error) throw new Error(`update prospect_leads falló: ${error.message}`);
}

export async function listPendingLeads(limit = 50): Promise<PendingLeadRow[]> {
  if (!isSupabaseConfigured() || !supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("prospect_leads")
    .select("id, name, category, location, phone")
    .eq("status", "pending")
    .not("phone", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`list prospect_leads falló: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    category: r.category ? String(r.category) : null,
    location: String(r.location),
    phone: r.phone ? String(r.phone) : null,
  }));
}

export async function listSentOlderThan(days: number): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabaseAdmin) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("prospect_leads")
    .select("id")
    .eq("status", "sent")
    .lt("created_at", cutoff)
    .limit(500);
  if (error) throw new Error(`list sent older than falló: ${error.message}`);
  return (data ?? []).map((r) => String(r.id));
}

export async function getLeadByPhone(
  phone: string
): Promise<{ id: string } | null> {
  if (!isSupabaseConfigured() || !supabaseAdmin) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const { data, error } = await supabaseAdmin
    .from("prospect_leads")
    .select("id")
    .ilike("phone", `%${digits}%`)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data ? { id: String(data.id) } : null;
}

export async function logSend(job: {
  leadId: string;
  number: string;
  message: string;
}): Promise<void> {
  if (!isSupabaseConfigured() || !supabaseAdmin) return;
  const { error } = await supabaseAdmin.from("wa_send_log").insert({
    lead_id: job.leadId,
    wa_number: job.number,
    message: job.message,
    status: "sent",
  });
  if (error) throw new Error(`log wa_send_log falló: ${error.message}`);
}
