// Consultas del dashboard de prospección (leads, stats, mensajes, campañas).
// Si Supabase no está configurado devuelve vacíos seguros (dashboard "demo").
import { isSupabaseConfigured, supabaseAdmin } from "../../lib/supabase";
import type { LeadStatus } from "../whatsapp/state-manager";

export interface LeadRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  category: string | null;
  location: string;
  website: string | null;
  status: LeadStatus;
  source: string | null;
  created_at: string;
}

export interface LeadFilters {
  status?: string;
  category?: string;
  location?: string;
  limit?: number;
  offset?: number;
}

export async function listLeads(
  filters: LeadFilters = {}
): Promise<{ data: LeadRow[]; total: number }> {
  if (!isSupabaseConfigured() || !supabaseAdmin) return { data: [], total: 0 };
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  let query = supabaseAdmin
    .from("prospect_leads")
    .select(
      "id,name,phone,address,category,location,website,status,source,created_at",
      { count: "exact" }
    );
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.category) query = query.ilike("category", `%${filters.category}%`);
  if (filters.location) query = query.ilike("location", `%${filters.location}%`);
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`listLeads falló: ${error.message}`);
  return {
    data: (data ?? []).map((r) => normalizeLead(r)),
    total: count ?? 0,
  };
}

export async function getLeadsByIds(ids: string[]): Promise<LeadRow[]> {
  if (!isSupabaseConfigured() || !supabaseAdmin || ids.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("prospect_leads")
    .select("id,name,phone,address,category,location,website,status,source,created_at")
    .in("id", ids);
  if (error) throw new Error(`getLeadsByIds falló: ${error.message}`);
  return (data ?? []).map((r) => normalizeLead(r));
}

export interface StatsResponse {
  configured: boolean;
  counts: Record<LeadStatus, number>;
  sentToday: number;
  conversionRate: number;
  meetings: number;
  byDay: Array<{ date: string; sent: number }>;
  recent: Array<{ id: string; direction: string; text: string; created_at: string }>;
}

const EMPTY_STATS: StatsResponse = {
  configured: false,
  counts: {
    pending: 0, sent: 0, responded: 0, interested: 0,
    meeting: 0, client: 0, no_response: 0, blacklist: 0,
  },
  sentToday: 0,
  conversionRate: 0,
  meetings: 0,
  byDay: [],
  recent: [],
};

export async function getStats(): Promise<StatsResponse> {
  if (!isSupabaseConfigured() || !supabaseAdmin) return EMPTY_STATS;

  const counts = {
    pending: 0, sent: 0, responded: 0, interested: 0,
    meeting: 0, client: 0, no_response: 0, blacklist: 0,
  } as Record<LeadStatus, number>;

  const { data: statusRows } = await supabaseAdmin
    .from("prospect_leads")
    .select("status");
  for (const row of statusRows ?? []) {
    const s = String(row.status) as LeadStatus;
    if (s in counts) counts[s] += 1;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: sends } = await supabaseAdmin
    .from("wa_send_log")
    .select("sent_at")
    .gte("sent_at", `${today}T00:00:00`);
  const sentToday = (sends ?? []).length;

  // Envíos por día (últimos 7 días)
  const byDayMap = new Map<string, number>();
  const dayKey = (iso: string) => iso.slice(0, 10);
  for (const row of sends ?? []) {
    const key = dayKey(String(row.sent_at ?? ""));
    byDayMap.set(key, (byDayMap.get(key) ?? 0) + 1);
  }
  const byDay: Array<{ date: string; sent: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    byDay.push({ date: d, sent: byDayMap.get(d) ?? 0 });
  }

  const converted = counts.interested + counts.meeting + counts.client;
  const conversionRate = counts.sent > 0 ? Math.round((converted / counts.sent) * 100) : 0;

  const { data: recent } = await supabaseAdmin
    .from("conversation_messages")
    .select("id,direction,text,created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    configured: true,
    counts,
    sentToday,
    conversionRate,
    meetings: counts.meeting,
    byDay,
    recent: (recent ?? []).map((r) => ({
      id: String(r.id),
      direction: String(r.direction),
      text: String(r.text),
      created_at: String(r.created_at),
    })),
  };
}

export interface MessageRow {
  id: string;
  direction: "inbound" | "outbound";
  text: string;
  created_at: string;
}

export async function getLeadMessages(leadId: string): Promise<{
  lead: LeadRow | null;
  messages: MessageRow[];
}> {
  if (!isSupabaseConfigured() || !supabaseAdmin) return { lead: null, messages: [] };
  const { data: lead } = await supabaseAdmin
    .from("prospect_leads")
    .select("id,name,phone,address,category,location,website,status,source,created_at")
    .eq("id", leadId)
    .maybeSingle();
  const { data: messages, error } = await supabaseAdmin
    .from("conversation_messages")
    .select("id,direction,text,created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getLeadMessages falló: ${error.message}`);
  return {
    lead: lead ? normalizeLead(lead) : null,
    messages: (messages ?? []).map((m) => ({
      id: String(m.id),
      direction: (String(m.direction) === "outbound" ? "outbound" : "inbound") as MessageRow["direction"],
      text: String(m.text),
      created_at: String(m.created_at),
    })),
  };
}

export async function addMessage(
  leadId: string,
  direction: "inbound" | "outbound",
  text: string
): Promise<void> {
  if (!isSupabaseConfigured() || !supabaseAdmin) return;
  const { error } = await supabaseAdmin.from("conversation_messages").insert({
    lead_id: leadId,
    direction,
    text,
  });
  if (error) throw new Error(`addMessage falló: ${error.message}`);
}

export interface CampaignRow {
  id: string;
  name: string;
  template: string | null;
  category: string | null;
  status: string;
  lead_count: number;
  created_at: string;
}

export async function createCampaign(input: {
  name: string;
  category?: string | null;
  template?: string | null;
  items: Array<{ leadId: string; message: string }>;
}): Promise<string> {
  if (!isSupabaseConfigured() || !supabaseAdmin) return "demo-campaign";
  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      name: input.name,
      category: input.category ?? null,
      template: input.template ?? null,
      status: "active",
      lead_count: input.items.length,
    })
    .select("id")
    .single();
  if (error) throw new Error(`createCampaign falló: ${error.message}`);
  const campaignId = String(data.id);

  const links = input.items.map((it) => ({
    campaign_id: campaignId,
    lead_id: it.leadId,
    message: it.message,
    status: "queued",
  }));
  for (let i = 0; i < links.length; i += 100) {
    const { error: linkErr } = await supabaseAdmin
      .from("campaign_leads")
      .insert(links.slice(i, i + 100));
    if (linkErr) throw new Error(`campaign_leads falló: ${linkErr.message}`);
  }
  return campaignId;
}

export async function listCampaigns(): Promise<CampaignRow[]> {
  if (!isSupabaseConfigured() || !supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .select("id,name,template,category,status,lead_count,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`listCampaigns falló: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    template: r.template ? String(r.template) : null,
    category: r.category ? String(r.category) : null,
    status: String(r.status),
    lead_count: Number(r.lead_count ?? 0),
    created_at: String(r.created_at),
  }));
}

function normalizeLead(r: Record<string, unknown>): LeadRow {
  return {
    id: String(r.id),
    name: String(r.name),
    phone: r.phone ? String(r.phone) : null,
    address: r.address ? String(r.address) : null,
    category: r.category ? String(r.category) : null,
    location: String(r.location),
    website: r.website ? String(r.website) : null,
    status: (String(r.status) as LeadStatus) ?? "pending",
    source: r.source ? String(r.source) : null,
    created_at: String(r.created_at),
  };
}
