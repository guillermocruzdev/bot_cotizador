-- ============================================================
-- Esquema de Supabase para el Bot Cotizador
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase.
-- ============================================================

-- Extensiones
create extension if not exists "pgcrypto";

-- Tabla de leads (conversaciones sin propuesta final)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  client_name text,
  client_email text,
  category text,
  nivel text,
  presupuesto text,
  fecha_entrega text,
  contexto jsonb,
  transcript text,
  created_at timestamptz not null default now()
);

-- Tabla de propuestas finales
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_email text,
  categoria text not null,
  nivel text not null,
  precio_min integer not null,
  precio_max integer not null,
  tiempo_estimado text,
  contexto jsonb,
  resultado jsonb,
  transcript text,
  created_at timestamptz not null default now()
);

-- Índices útiles
create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_proposals_created_at on public.proposals (created_at desc);
create index if not exists idx_proposals_email on public.proposals (client_email);

-- RLS: por defecto, nadie puede leer/escribir desde el cliente anónimo.
-- Se recomienda habilitar RLS y solo acceder con la service_role_key (servidor).
alter table public.leads enable row level security;
alter table public.proposals enable row level security;

-- Políticas mínimas (todo el acceso se hace desde el servidor con service role,
-- que ignora RLS). Para mayor seguridad puedes crear policies específicas.
create policy "No public access to leads" on public.leads for all using (false) with check (false);
create policy "No public access to proposals" on public.proposals for all using (false) with check (false);
