-- Forward-only daily AI quota. This migration is intentionally not applied automatically.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('coach_advice', 'training_plan')),
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (user_id, feature, usage_date)
);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from public;
revoke all on public.ai_usage from anon, authenticated;

create or replace function public.consume_ai_quota(p_feature text)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  current_user_id uuid := auth.uid();
  feature_limit integer;
  consumed integer;
begin
  if current_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  feature_limit := case p_feature when 'coach_advice' then 10 when 'training_plan' then 3 else null end;
  if feature_limit is null then raise exception 'Unsupported AI feature' using errcode = '22023'; end if;

  insert into public.ai_usage (user_id, feature, usage_date, request_count)
  values (current_user_id, p_feature, current_date, 1)
  on conflict (user_id, feature, usage_date) do update
    set request_count = public.ai_usage.request_count + 1,
        updated_at = statement_timestamp()
    where public.ai_usage.request_count < feature_limit
  returning request_count into consumed;

  if consumed is null then
    select request_count into consumed from public.ai_usage
      where user_id = current_user_id and feature = p_feature and usage_date = current_date;
    return query select false, 0, greatest(1, extract(epoch from (date_trunc('day', statement_timestamp()) + interval '1 day' - statement_timestamp()))::integer);
  else
    return query select true, greatest(feature_limit - consumed, 0), 0;
  end if;
end;
$$;

revoke execute on function public.consume_ai_quota(text) from public, anon;
grant execute on function public.consume_ai_quota(text) to authenticated;
