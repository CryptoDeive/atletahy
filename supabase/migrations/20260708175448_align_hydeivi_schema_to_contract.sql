-- Align HyDeivi core schema to the exact requested contract.
-- Safe corrective migration: verified tables were empty before this change.

drop table if exists public.coach_advices cascade;
drop table if exists public.workout_logs cascade;
drop table if exists public.daily_readiness cascade;
drop table if exists public.nutrition_preferences cascade;
drop table if exists public.injuries cascade;
drop table if exists public.athlete_equipment cascade;
drop table if exists public.athlete_availability cascade;
drop table if exists public.athlete_metrics cascade;
drop table if exists public.profiles cascade;

-- HyDeivi Supabase schema for progressive browser persistence.
-- Safe for frontend use with anon/publishable keys plus authenticated RLS.

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  birth_date date,
  height_cm numeric,
  weight_kg numeric,
  sex text,
  hyrox_category text not null default '',
  target_race_date date,
  main_goal text not null default 'terminar' check (main_goal in ('terminar', 'mejorar_marca', 'competir')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.athlete_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resting_hr_baseline numeric,
  resting_hr_today numeric,
  max_hr numeric,
  lthr numeric,
  rftp text not null default '',
  z2_pace_low text not null default '',
  z2_pace_high text not null default '',
  five_k_pace text not null default '',
  ten_k_pace text not null default '',
  hrv_baseline numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.athlete_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  available_days jsonb not null default '[]'::jsonb,
  preferred_training_time text not null default '',
  max_session_minutes numeric,
  double_session_available boolean not null default false,
  min_hours_between_sessions numeric,
  agenda_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.athlete_equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  equipment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.injuries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  injury_id text not null,
  body_area text not null default '',
  side text not null default '',
  pain_level_0_10 numeric,
  status text not null default 'active' check (status in ('active', 'improving', 'resolved')),
  started_at date,
  resolved_at date,
  movement_restrictions text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, injury_id)
);

create table if not exists public.nutrition_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null default 'rendimiento' check (goal in ('rendimiento', 'mantenimiento', 'perdida_grasa')),
  diet_type text not null default '',
  allergies text not null default '',
  intolerances text not null default '',
  caffeine_tolerance text not null default '',
  fasted_training_preference text not null default '',
  usual_meal_times text not null default '',
  supplements text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.daily_readiness (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  sleep_hours numeric,
  sleep_quality_1_5 numeric,
  stress_1_5 numeric,
  fatigue_1_5 numeric,
  muscle_soreness_1_5 numeric,
  leg_soreness_1_5 numeric,
  upper_soreness_1_5 numeric,
  motivation_1_5 numeric,
  hydration_1_5 numeric,
  pain_0_10 numeric,
  resting_hr integer,
  hrv numeric,
  pain_location text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_log_id text not null,
  date date not null,
  training_week_id text not null,
  training_day_id text not null,
  status text not null default 'completado' check (status in ('completado', 'parcial', 'saltado', 'adaptado')),
  started_at timestamptz,
  finished_at timestamptz,
  duration_minutes numeric,
  session_rpe numeric,
  avg_hr integer,
  max_hr integer,
  calories numeric,
  completed_percentage numeric,
  notes text not null default '',
  what_went_well text not null default '',
  what_went_wrong text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workout_log_id),
  unique (user_id, training_week_id, training_day_id)
);

create table if not exists public.coach_advices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  advice_key text not null,
  model text not null default 'local',
  input_snapshot_json jsonb not null default '{}'::jsonb,
  advice_json jsonb not null,
  was_useful boolean,
  user_feedback text not null default '',
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, advice_key)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'athlete_metrics',
    'athlete_availability',
    'athlete_equipment',
    'injuries',
    'nutrition_preferences',
    'daily_readiness',
    'workout_logs',
    'coach_advices'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.athlete_metrics enable row level security;
alter table public.athlete_availability enable row level security;
alter table public.athlete_equipment enable row level security;
alter table public.injuries enable row level security;
alter table public.nutrition_preferences enable row level security;
alter table public.daily_readiness enable row level security;
alter table public.workout_logs enable row level security;
alter table public.coach_advices enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.athlete_metrics to authenticated;
grant select, insert, update, delete on public.athlete_availability to authenticated;
grant select, insert, update, delete on public.athlete_equipment to authenticated;
grant select, insert, update, delete on public.injuries to authenticated;
grant select, insert, update, delete on public.nutrition_preferences to authenticated;
grant select, insert, update, delete on public.daily_readiness to authenticated;
grant select, insert, update, delete on public.workout_logs to authenticated;
grant select, insert, update, delete on public.coach_advices to authenticated;

-- Recreate ownership policies with explicit SELECT/INSERT/UPDATE/DELETE coverage.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "athlete_metrics_select_own" on public.athlete_metrics;
drop policy if exists "athlete_metrics_insert_own" on public.athlete_metrics;
drop policy if exists "athlete_metrics_update_own" on public.athlete_metrics;
drop policy if exists "athlete_metrics_delete_own" on public.athlete_metrics;
create policy "athlete_metrics_select_own" on public.athlete_metrics for select to authenticated using ((select auth.uid()) = user_id);
create policy "athlete_metrics_insert_own" on public.athlete_metrics for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "athlete_metrics_update_own" on public.athlete_metrics for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "athlete_metrics_delete_own" on public.athlete_metrics for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "athlete_availability_select_own" on public.athlete_availability;
drop policy if exists "athlete_availability_insert_own" on public.athlete_availability;
drop policy if exists "athlete_availability_update_own" on public.athlete_availability;
drop policy if exists "athlete_availability_delete_own" on public.athlete_availability;
create policy "athlete_availability_select_own" on public.athlete_availability for select to authenticated using ((select auth.uid()) = user_id);
create policy "athlete_availability_insert_own" on public.athlete_availability for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "athlete_availability_update_own" on public.athlete_availability for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "athlete_availability_delete_own" on public.athlete_availability for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "athlete_equipment_select_own" on public.athlete_equipment;
drop policy if exists "athlete_equipment_insert_own" on public.athlete_equipment;
drop policy if exists "athlete_equipment_update_own" on public.athlete_equipment;
drop policy if exists "athlete_equipment_delete_own" on public.athlete_equipment;
create policy "athlete_equipment_select_own" on public.athlete_equipment for select to authenticated using ((select auth.uid()) = user_id);
create policy "athlete_equipment_insert_own" on public.athlete_equipment for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "athlete_equipment_update_own" on public.athlete_equipment for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "athlete_equipment_delete_own" on public.athlete_equipment for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "injuries_select_own" on public.injuries;
drop policy if exists "injuries_insert_own" on public.injuries;
drop policy if exists "injuries_update_own" on public.injuries;
drop policy if exists "injuries_delete_own" on public.injuries;
create policy "injuries_select_own" on public.injuries for select to authenticated using ((select auth.uid()) = user_id);
create policy "injuries_insert_own" on public.injuries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "injuries_update_own" on public.injuries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "injuries_delete_own" on public.injuries for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "nutrition_preferences_select_own" on public.nutrition_preferences;
drop policy if exists "nutrition_preferences_insert_own" on public.nutrition_preferences;
drop policy if exists "nutrition_preferences_update_own" on public.nutrition_preferences;
drop policy if exists "nutrition_preferences_delete_own" on public.nutrition_preferences;
create policy "nutrition_preferences_select_own" on public.nutrition_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "nutrition_preferences_insert_own" on public.nutrition_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "nutrition_preferences_update_own" on public.nutrition_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "nutrition_preferences_delete_own" on public.nutrition_preferences for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "daily_readiness_select_own" on public.daily_readiness;
drop policy if exists "daily_readiness_insert_own" on public.daily_readiness;
drop policy if exists "daily_readiness_update_own" on public.daily_readiness;
drop policy if exists "daily_readiness_delete_own" on public.daily_readiness;
create policy "daily_readiness_select_own" on public.daily_readiness for select to authenticated using ((select auth.uid()) = user_id);
create policy "daily_readiness_insert_own" on public.daily_readiness for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "daily_readiness_update_own" on public.daily_readiness for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "daily_readiness_delete_own" on public.daily_readiness for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "workout_logs_select_own" on public.workout_logs;
drop policy if exists "workout_logs_insert_own" on public.workout_logs;
drop policy if exists "workout_logs_update_own" on public.workout_logs;
drop policy if exists "workout_logs_delete_own" on public.workout_logs;
create policy "workout_logs_select_own" on public.workout_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy "workout_logs_insert_own" on public.workout_logs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "workout_logs_update_own" on public.workout_logs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "workout_logs_delete_own" on public.workout_logs for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "coach_advices_select_own" on public.coach_advices;
drop policy if exists "coach_advices_insert_own" on public.coach_advices;
drop policy if exists "coach_advices_update_own" on public.coach_advices;
drop policy if exists "coach_advices_delete_own" on public.coach_advices;
create policy "coach_advices_select_own" on public.coach_advices for select to authenticated using ((select auth.uid()) = user_id);
create policy "coach_advices_insert_own" on public.coach_advices for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "coach_advices_update_own" on public.coach_advices for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "coach_advices_delete_own" on public.coach_advices for delete to authenticated using ((select auth.uid()) = user_id);
