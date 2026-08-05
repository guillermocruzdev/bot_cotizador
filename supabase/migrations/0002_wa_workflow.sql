-- ============================================================
-- 0002_wa_workflow.sql · Estado del lead + log de envíos WhatsApp
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase.
-- ============================================================
-- Amplía el enum prospect_status con los estados del estado-máquina
-- de la prospección (ALTER ADD VALUE IF NOT EXISTS es idempotente).

alter type public.prospect_status add value if not exists 'sent';
alter type public.prospect_status add value if not exists 'responded';
alter type public.prospect_status add value if not exists 'interested';
alter type public.prospect_status add value if not exists 'meeting';
alter type public.prospect_status add value if not exists 'client';
alter type public.prospect_status add value if not exists 'no_response';
alter type public.prospect_status add value if not exists 'blacklist';

-- Auditoría de envíos (también sirve para contar el límite diario).
create table if not exists public.wa_send_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.prospect_leads(id) on delete cascade,
  wa_number text not null,
  message text not null,
  status text not null default 'sent', -- sent | failed
  sent_at timestamptz not null default now()
);

create index if not exists idx_wa_send_log_number_date
  on public.wa_send_log (wa_number, sent_at desc);
create index if not exists idx_wa_send_log_lead
  on public.wa_send_log (lead_id);

alter table public.wa_send_log enable row level security;
create policy "No public access to wa_send_log"
  on public.wa_send_log for all using (false) with check (false);
