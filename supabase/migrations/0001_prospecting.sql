-- ============================================================
-- 0001_prospecting.sql · Lead Discovery Agent
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase.
-- ============================================================
-- NOTA: la tabla se llama `prospect_leads` (NO `leads`) porque
-- `public.leads` ya existe en schema.sql (leads del Bot Cotizador).
-- [DECISION_NEEDED]: si prefieres `leads`, renombra y borra la vieja.

create extension if not exists "vector";
create extension if not exists "pgcrypto";

-- Estado del pipeline de prospección.
create type public.prospect_status as enum (
  'pending',
  'contacted',
  'converted',
  'skipped'
);

-- Leads descubiertos (negocios sin sitio web).
create table if not exists public.prospect_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  category text,
  location text not null,
  website text,
  status public.prospect_status not null default 'pending',
  source text not null default 'google_search',
  dedupe_key text unique,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists idx_prospect_leads_status on public.prospect_leads (status);
create index if not exists idx_prospect_leads_location on public.prospect_leads (location);
create index if not exists idx_prospect_leads_created_at on public.prospect_leads (created_at desc);

-- Cache de búsquedas (TTL 24 h gestionado en código).
create table if not exists public.search_cache (
  query_hash text primary key,
  query jsonb not null,
  results jsonb not null,
  fetched_at timestamptz not null default now()
);

-- RLS: acceso solo por service role (servidor). Sin acceso público.
alter table public.prospect_leads enable row level security;
create policy "No public access to prospect_leads"
  on public.prospect_leads for all using (false) with check (false);

alter table public.search_cache enable row level security;
create policy "No public access to search_cache"
  on public.search_cache for all using (false) with check (false);
