-- Forward-only correction: authenticated callers no longer provide a plan owner.
-- Keep the historical overloads installed but make them unreachable to API roles.
revoke execute on function public.save_training_plan_atomic(uuid, text, date, timestamptz, jsonb, jsonb) from public;
revoke execute on function public.save_training_plan_atomic(uuid, text, date, timestamptz, jsonb, jsonb) from anon;
revoke execute on function public.save_training_plan_atomic(uuid, text, date, timestamptz, jsonb, jsonb) from authenticated;
revoke execute on function public.set_active_training_plan_atomic(uuid, uuid) from public;
revoke execute on function public.set_active_training_plan_atomic(uuid, uuid) from anon;
revoke execute on function public.set_active_training_plan_atomic(uuid, uuid) from authenticated;

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

  -- The transaction-scoped lock serializes concurrent saves for this identity.
  perform pg_advisory_xact_lock(hashtext('training_plans_active'), hashtext(current_user_id::text));

  update public.training_plans
  set status = 'archived',
      updated_at = now()
  where user_id = current_user_id
    and status = 'active';

  -- Any insert/RLS failure aborts the function transaction and rolls back the archive.
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

revoke execute on function public.save_training_plan_atomic(text, date, timestamptz, jsonb, jsonb) from public;
revoke execute on function public.save_training_plan_atomic(text, date, timestamptz, jsonb, jsonb) from anon;
revoke execute on function public.set_active_training_plan_atomic(uuid) from public;
revoke execute on function public.set_active_training_plan_atomic(uuid) from anon;
grant execute on function public.save_training_plan_atomic(text, date, timestamptz, jsonb, jsonb) to authenticated;
grant execute on function public.set_active_training_plan_atomic(uuid) to authenticated;
