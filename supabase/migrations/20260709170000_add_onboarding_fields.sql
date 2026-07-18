-- Add onboarding fields used by the private first-run HYROX setup flow.
-- Existing columns still hold the core objective, availability, equipment and injury data.

alter table public.profiles
  add column if not exists target_time text not null default '',
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz;

alter table public.athlete_metrics
  add column if not exists current_running_volume_km numeric,
  add column if not exists current_long_run_km numeric,
  add column if not exists hyrox_experience text not null default '',
  add column if not exists strength_experience text not null default '';
