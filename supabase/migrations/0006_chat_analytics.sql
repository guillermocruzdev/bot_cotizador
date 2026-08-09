-- 0006_chat_analytics.sql
-- Analítica del chatbot (UX/CxD): sesiones y eventos de la conversación.
-- Solo escribe el servidor (service_role bypassa RLS). Sin políticas para
-- clientes anónimos: los datos del chat nunca se leen desde el navegador.

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_node text,
  node_count int not null default 0,
  question_count int not null default 0,
  no_se_count int not null default 0,
  completed boolean not null default false,
  category text,
  nivel text,
  precio_min numeric,
  fallback boolean,
  duration_ms int,
  referrer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_events (
  id bigint generated always as identity primary key,
  session_id text not null references public.chat_sessions(session_id) on delete cascade,
  event text not null,
  node_id text,
  payload jsonb,
  ts timestamptz not null default now()
);

create index if not exists chat_events_session_idx on public.chat_events(session_id, ts);
create index if not exists chat_events_event_idx on public.chat_events(event, ts);

alter table public.chat_sessions enable row level security;
alter table public.chat_events enable row level security;
