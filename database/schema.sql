-- ============================================================================
-- AcController — Supabase schema
-- ============================================================================
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh
-- project. Safe to re-run: every statement is guarded with IF NOT EXISTS /
-- CREATE OR REPLACE / DROP ... IF EXISTS where applicable.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- settings — one row per user, upserted from the Settings page
-- ============================================================================
create table if not exists public.settings (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  theme                text not null default 'system' check (theme in ('light', 'dark', 'system')),
  timezone             text not null default 'UTC',
  language             text not null default 'en',
  -- Mode/fan/temperature are restricted to exactly what the real Carrier
  -- hardware supports (confirmed via IR capture analysis) — no fan-only
  -- mode, no auto fan speed, no temperature outside 20-28C. "eco" is a
  -- confirmed 5th fan-speed bitmask value (see backend carrier_ac.py's
  -- FAN_CODES + module docstring for the capture evidence).
  -- carrier_frequency/duty_cycle/gpio_pin were removed entirely: the
  -- production CarrierAC library ignores them (it derives timing from a
  -- captured base.txt), so they were never real, user-controllable settings.
  default_temperature  integer not null default 24 check (default_temperature between 20 and 28),
  default_mode         text not null default 'cool' check (default_mode in ('cool', 'heat', 'dry')),
  default_fan          text not null default 'low' check (default_fan in ('eco', 'low', 'medium', 'high')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id)
);

drop trigger if exists set_settings_updated_at on public.settings;
create trigger set_settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

alter table public.settings enable row level security;

drop policy if exists "settings_select_own" on public.settings;
create policy "settings_select_own" on public.settings
  for select using (auth.uid() = user_id);

drop policy if exists "settings_insert_own" on public.settings;
create policy "settings_insert_own" on public.settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "settings_update_own" on public.settings;
create policy "settings_update_own" on public.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "settings_delete_own" on public.settings;
create policy "settings_delete_own" on public.settings
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- schedules — recurring or one-off AC actions
-- ============================================================================
create table if not exists public.schedules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  enabled      boolean not null default true,
  time         time not null,
  repeat       text not null check (repeat in ('once', 'daily', 'weekdays', 'weekends', 'custom')),
  -- 0 = Sunday .. 6 = Saturday, only populated when repeat = 'custom'
  custom_days  smallint[] not null default '{}',
  -- only populated when repeat = 'once'; the calendar date the schedule fires
  run_date     date,
  action       jsonb not null,
  last_run_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint schedules_custom_days_valid check (
    custom_days <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  constraint schedules_action_shape check (
    action ? 'power'
  )
);

create index if not exists schedules_user_id_idx on public.schedules (user_id);
create index if not exists schedules_enabled_idx on public.schedules (user_id, enabled);

drop trigger if exists set_schedules_updated_at on public.schedules;
create trigger set_schedules_updated_at
  before update on public.schedules
  for each row execute function public.set_updated_at();

alter table public.schedules enable row level security;

drop policy if exists "schedules_select_own" on public.schedules;
create policy "schedules_select_own" on public.schedules
  for select using (auth.uid() = user_id);

drop policy if exists "schedules_insert_own" on public.schedules;
create policy "schedules_insert_own" on public.schedules
  for insert with check (auth.uid() = user_id);

drop policy if exists "schedules_update_own" on public.schedules;
create policy "schedules_update_own" on public.schedules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "schedules_delete_own" on public.schedules;
create policy "schedules_delete_own" on public.schedules
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- timers — one-shot countdown actions ("turn off in 30 min", "turn on in 2h")
-- ============================================================================
create table if not exists public.timers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  label        text not null default '',
  action       text not null check (action in ('turn_off', 'turn_on')),
  fires_at     timestamptz not null,
  status       text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists timers_user_id_idx on public.timers (user_id);
create index if not exists timers_pending_idx on public.timers (status, fires_at) where status = 'pending';

alter table public.timers enable row level security;

drop policy if exists "timers_select_own" on public.timers;
create policy "timers_select_own" on public.timers
  for select using (auth.uid() = user_id);

drop policy if exists "timers_insert_own" on public.timers;
create policy "timers_insert_own" on public.timers
  for insert with check (auth.uid() = user_id);

drop policy if exists "timers_update_own" on public.timers;
create policy "timers_update_own" on public.timers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "timers_delete_own" on public.timers;
create policy "timers_delete_own" on public.timers
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- command_history — every command sent to the AC, and its result
-- ============================================================================
create table if not exists public.command_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  power        boolean not null,
  temperature  integer check (temperature between 20 and 28 or temperature is null),
  mode         text check (mode in ('cool', 'heat', 'dry') or mode is null),
  fan          text check (fan in ('eco', 'low', 'medium', 'high') or fan is null),
  source       text not null default 'manual' check (source in ('manual', 'schedule', 'timer', 'system')),
  result       text not null check (result in ('success', 'failure')),
  error        text,
  created_at   timestamptz not null default now()
);

create index if not exists command_history_user_id_idx on public.command_history (user_id, created_at desc);

alter table public.command_history enable row level security;

drop policy if exists "command_history_select_own" on public.command_history;
create policy "command_history_select_own" on public.command_history
  for select using (auth.uid() = user_id);

drop policy if exists "command_history_insert_own" on public.command_history;
create policy "command_history_insert_own" on public.command_history
  for insert with check (auth.uid() = user_id);

drop policy if exists "command_history_delete_own" on public.command_history;
create policy "command_history_delete_own" on public.command_history
  for delete using (auth.uid() = user_id);

-- Service role (used by the FastAPI backend on the Pi) bypasses RLS by
-- default via the service_role key, so no additional policy is needed for
-- the backend's own writes (schedule/timer execution, history logging).

-- ============================================================================
-- Realtime — let the frontend subscribe to live changes
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'schedules'
  ) then
    alter publication supabase_realtime add table public.schedules;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'timers'
  ) then
    alter publication supabase_realtime add table public.timers;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'command_history'
  ) then
    alter publication supabase_realtime add table public.command_history;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'settings'
  ) then
    alter publication supabase_realtime add table public.settings;
  end if;
end $$;

-- ============================================================================
-- Seed a default settings row automatically when a user first signs up
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth