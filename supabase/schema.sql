-- EDI — Schema Supabase
-- Esegui questo file nel SQL Editor di Supabase (dashboard → SQL Editor → New query)

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── newspapers ───────────────────────────────────────────────────────────────
create table if not exists public.newspapers (
  id           uuid primary key default uuid_generate_v4(),
  slug         text unique not null,
  name         text not null,
  country      text not null,
  region       text not null check (region in ('europa','america-latina','uk-us','medio-oriente','africa','asia')),
  language     text not null,
  orientation  text not null,
  frequency    text not null,
  description  text,
  url          text not null,
  rss_url      text,
  scrape_method text not null check (scrape_method in ('rss','jina')),
  topics       text[] default '{}',
  active       boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─── user_profiles ────────────────────────────────────────────────────────────
create table if not exists public.user_profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  languages            text[] default '{}',
  regions              text[] default '{}',
  topics               text[] default '{}',
  political_position   integer check (political_position between 1 and 5),
  onboarding_completed boolean default false,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ─── user_newspapers ──────────────────────────────────────────────────────────
create table if not exists public.user_newspapers (
  user_id      uuid references auth.users(id) on delete cascade,
  newspaper_id uuid references public.newspapers(id) on delete cascade,
  added_at     timestamptz default now(),
  primary key (user_id, newspaper_id)
);

-- ─── daily_recaps ─────────────────────────────────────────────────────────────
create table if not exists public.daily_recaps (
  id            uuid primary key default uuid_generate_v4(),
  newspaper_id  uuid references public.newspapers(id) on delete cascade,
  date          date not null,
  headlines     jsonb,
  raw_content   text,
  generated_at  timestamptz default now(),
  unique (newspaper_id, date)
);

-- ─── daily_briefs ─────────────────────────────────────────────────────────────
create table if not exists public.daily_briefs (
  id              uuid primary key default uuid_generate_v4(),
  date            date unique not null,
  brief_text      text,
  topics_covered  jsonb,
  generated_at    timestamptz default now()
);

-- ─── pipeline_costs ──────────────────────────────────────────────────────────
-- Traccia il costo AI di ogni generazione (recap per testata + brief giornaliero).
-- I token vengono salvati grezzi; il costo EUR viene calcolato lato API con prezzi aggiornabili.
create table if not exists public.pipeline_costs (
  id                uuid primary key default uuid_generate_v4(),
  date              date not null,
  newspaper_id      uuid references public.newspapers(id) on delete cascade,  -- NULL per il brief
  cost_type         text not null check (cost_type in ('recap', 'brief')),
  prompt_tokens     integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens      integer not null default 0,
  created_at        timestamptz default now(),
  unique (date, newspaper_id, cost_type)
);

-- ─── RLS (Row Level Security) ─────────────────────────────────────────────────
alter table public.newspapers     enable row level security;
alter table public.user_profiles  enable row level security;
alter table public.user_newspapers enable row level security;
alter table public.daily_recaps   enable row level security;
alter table public.daily_briefs   enable row level security;

-- newspapers: lettura pubblica
create policy "newspapers_public_read" on public.newspapers
  for select using (true);

-- user_profiles: solo il proprietario
create policy "user_profiles_own" on public.user_profiles
  for all using (auth.uid() = id);

-- user_newspapers: solo il proprietario
create policy "user_newspapers_own" on public.user_newspapers
  for all using (auth.uid() = user_id);

-- daily_recaps: lettura pubblica
create policy "daily_recaps_public_read" on public.daily_recaps
  for select using (true);

-- daily_briefs: lettura pubblica
create policy "daily_briefs_public_read" on public.daily_briefs
  for select using (true);

-- pipeline_costs: lettura pubblica (trasparenza totale)
alter table public.pipeline_costs enable row level security;
create policy "pipeline_costs_public_read" on public.pipeline_costs
  for select using (true);

-- ─── Trigger: updated_at ──────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger newspapers_updated_at
  before update on public.newspapers
  for each row execute function public.handle_updated_at();

create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.handle_updated_at();

-- ─── Trigger: crea user_profile automaticamente alla registrazione ─────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
