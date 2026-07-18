-- Align workout_logs with the app/localStorage logical key:
-- one log per user + training week + training day + calendar date.
--
-- Keep the existing user_id + workout_log_id unique constraint for
-- compatibility with already generated client ids, but make Supabase upserts
-- target the logical key that can represent the same training day on different
-- dates.

with ranked_workout_logs as (
  select
    id,
    row_number() over (
      partition by user_id, training_week_id, training_day_id, date
      order by updated_at desc, created_at desc, id desc
    ) as duplicate_rank
  from public.workout_logs
)
delete from public.workout_logs workout_logs
using ranked_workout_logs
where workout_logs.id = ranked_workout_logs.id
  and ranked_workout_logs.duplicate_rank > 1;

alter table public.workout_logs
  drop constraint if exists workout_logs_user_id_training_week_id_training_day_id_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workout_logs'::regclass
      and conname = 'workout_logs_user_id_training_week_id_training_day_id_date_key'
  ) then
    alter table public.workout_logs
      add constraint workout_logs_user_id_training_week_id_training_day_id_date_key
      unique (user_id, training_week_id, training_day_id, date);
  end if;
end $$;
