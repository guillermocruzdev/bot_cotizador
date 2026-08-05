-- ============================================================
-- 0003_dashboard.sql · Campañas + mensajes de conversación
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase.
-- ============================================================

-- Campañas de prospección.
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template text,
  category text,
  status text not null default 'draft', -- draft | active | finished
  lead_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Relación campaña → leads (con el mensaje generado por lead).
create table if not exists public.campaign_leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.prospect_leads(id) on delete cascade,
  message text,
  status text not null default 'queued', -- queued | sent | failed
  created_at timestamptz not null default now(),
  unique (campaign_id, lead_id)
);

-- Conversaciones WhatsApp (ChatView): mensajes inbound/outbound por lead.
create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.prospect_leads(id) on delete cascade,
  direction text not null default 'inbound', -- inbound | outbound
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_campaigns_created on public.campaigns (created_at desc);
create index if not exists idx_campaign_leads_campaign on public.campaign_leads (campaign_id);
create index if not exists idx_conv_messages_lead on public.conversation_messages (lead_id, created_at asc);

-- RLS: acceso solo por service role (servidor).
alter table public.campaigns enable row level security;
create policy "No public access to campaigns"
  on public.campaigns for all using (false) with check (false);

alter table public.campaign_leads enable row level security;
create policy "No public access to campaign_leads"
  on public.campaign_leads for all using (false) with check (false);

alter table public.conversation_messages enable row level security;
create policy "No public access to conversation_messages"
  on public.conversation_messages for all using (false) with check (false);
