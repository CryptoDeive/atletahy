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
  target_time text not null default '',
  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz,
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
  current_running_volume_km numeric,
  current_long_run_km numeric,
  hyrox_experience text not null default '',
  strength_experience text not null default '',
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
  unique (user_id, training_week_id, training_day_id, date)
);

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  status text not null default 'active',
  target_race_date date,
  generated_at timestamptz,
  input_snapshot_json jsonb not null default '{}'::jsonb,
  plan_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_plans_user_id_status_created_at_idx on public.training_plans (user_id, status, created_at desc);
create unique index if not exists training_plans_one_active_per_user_idx on public.training_plans (user_id) where status = 'active';

create or replace function public.save_training_plan_atomic(
  p_title text,
  p_target_race_date date default null,
  p_generated_at timestamptz default null,
  p_input_snapshot_json jsonb default '{}'::jsonb,
  p_plan_json jsonb default '{}'::jsonb
)
returns setof public.training_plans
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('training_plans_active'), hashtext(current_user_id::text));

  update public.training_plans
  set status = 'archived',
      updated_at = now()
  where user_id = current_user_id
    and status = 'active';

  return query
  insert into public.training_plans (
    user_id,
    title,
    status,
    target_race_date,
    generated_at,
    input_snapshot_json,
    plan_json
  )
  values (
    current_user_id,
    coalesce(p_title, ''),
    'active',
    p_target_race_date,
    coalesce(p_generated_at, now()),
    coalesce(p_input_snapshot_json, '{}'::jsonb),
    p_plan_json
  )
  returning *;
end;
$$;

create or replace function public.set_active_training_plan_atomic(
  p_plan_id uuid
)
returns setof public.training_plans
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('training_plans_active'), hashtext(current_user_id::text));

  if not exists (
    select 1
    from public.training_plans
    where id = p_plan_id
      and user_id = current_user_id
  ) then
    raise exception 'Training plan not found for this user.'
      using errcode = 'P0002';
  end if;

  update public.training_plans
  set status = 'archived',
      updated_at = now()
  where user_id = current_user_id
    and status = 'active'
    and id <> p_plan_id;

  return query
  update public.training_plans
  set status = 'active',
      updated_at = now()
  where id = p_plan_id
    and user_id = current_user_id
  returning *;
end;
$$;

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

create table if not exists public.training_test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null,
  performed_at timestamptz not null,
  result_json jsonb not null default '{}'::jsonb,
  calculated_json jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_test_results_user_id_idx on public.training_test_results (user_id);
create index if not exists training_test_results_user_test_idx on public.training_test_results (user_id, test_id);
create index if not exists training_test_results_user_performed_idx on public.training_test_results (user_id, performed_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
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
    'coach_advices',
    'training_plans'
    ,'training_test_results'
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
alter table public.training_plans enable row level security;
alter table public.training_test_results enable row level security;

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
grant select, insert, update, delete on public.training_plans to authenticated;
grant select, insert, update, delete on public.training_test_results to authenticated;
revoke execute on function public.save_training_plan_atomic(text, date, timestamptz, jsonb, jsonb) from public;
revoke execute on function public.save_training_plan_atomic(text, date, timestamptz, jsonb, jsonb) from anon;
revoke execute on function public.set_active_training_plan_atomic(uuid) from public;
revoke execute on function public.set_active_training_plan_atomic(uuid) from anon;
grant execute on function public.save_training_plan_atomic(text, date, timestamptz, jsonb, jsonb) to authenticated;
grant execute on function public.set_active_training_plan_atomic(uuid) to authenticated;

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


drop policy if exists "training_plans_select_own" on public.training_plans;
drop policy if exists "training_plans_insert_own" on public.training_plans;
drop policy if exists "training_plans_update_own" on public.training_plans;
drop policy if exists "training_plans_delete_own" on public.training_plans;
create policy "training_plans_select_own" on public.training_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "training_plans_insert_own" on public.training_plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "training_plans_update_own" on public.training_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "training_plans_delete_own" on public.training_plans for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "training_test_results_select_own" on public.training_test_results;
drop policy if exists "training_test_results_insert_own" on public.training_test_results;
drop policy if exists "training_test_results_update_own" on public.training_test_results;
drop policy if exists "training_test_results_delete_own" on public.training_test_results;
create policy "training_test_results_select_own" on public.training_test_results for select to authenticated using ((select auth.uid()) = user_id);
create policy "training_test_results_insert_own" on public.training_test_results for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "training_test_results_update_own" on public.training_test_results for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "training_test_results_delete_own" on public.training_test_results for delete to authenticated using ((select auth.uid()) = user_id);

-- AI usage is writable only through the authenticated, atomic consume RPC.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('coach_advice', 'training_plan')),
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (user_id, feature, usage_date)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from public, anon, authenticated;

create or replace function public.consume_ai_quota(p_feature text)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql security definer set search_path = public, pg_catalog
as $$
declare current_user_id uuid := auth.uid(); feature_limit integer; consumed integer;
begin
  if current_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  feature_limit := case p_feature when 'coach_advice' then 10 when 'training_plan' then 3 else null end;
  if feature_limit is null then raise exception 'Unsupported AI feature' using errcode = '22023'; end if;
  insert into public.ai_usage (user_id, feature, usage_date, request_count) values (current_user_id, p_feature, current_date, 1)
  on conflict (user_id, feature, usage_date) do update set request_count = public.ai_usage.request_count + 1, updated_at = statement_timestamp()
    where public.ai_usage.request_count < feature_limit returning request_count into consumed;
  if consumed is null then
    return query select false, 0, greatest(1, extract(epoch from (date_trunc('day', statement_timestamp()) + interval '1 day' - statement_timestamp()))::integer);
  else return query select true, greatest(feature_limit - consumed, 0), 0; end if;
end;
$$;
revoke execute on function public.consume_ai_quota(text) from public, anon;
grant execute on function public.consume_ai_quota(text) to authenticated;
