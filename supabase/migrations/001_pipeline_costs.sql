-- Migrazione: pipeline_costs
-- Traccia il costo AI (token Gemini) di ogni recap e brief generato.

create table if not exists public.pipeline_costs (
  id                uuid primary key default uuid_generate_v4(),
  date              date not null,
  newspaper_id      uuid references public.newspapers(id) on delete cascade,
  cost_type         text not null check (cost_type in ('recap', 'brief')),
  prompt_tokens     integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens      integer not null default 0,
  created_at        timestamptz default now(),
  unique (date, newspaper_id, cost_type)
);

alter table public.pipeline_costs enable row level security;

create policy "pipeline_costs_public_read" on public.pipeline_costs
  for select using (true);
