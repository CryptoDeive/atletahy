-- Forward-only migration. Apply through the normal reviewed deployment process.
create table if not exists public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('health_data', 'health_data_ai', 'legal_terms', 'adult_declaration')),
  granted boolean not null,
  policy_version text not null,
  recorded_at timestamptz not null default statement_timestamp(),
  created_at timestamptz not null default statement_timestamp()
);

create index if not exists consent_events_user_purpose_recorded_idx
  on public.consent_events (user_id, purpose, recorded_at desc);

alter table public.consent_events enable row level security;
revoke all on public.consent_events from public, anon;
grant select on public.consent_events to authenticated;

create policy "consent_events_select_own" on public.consent_events
  for select to authenticated using ((select auth.uid()) = user_id);

-- Consent history is append-only: clients cannot update or delete audit events.

create or replace function public.record_health_consents(
  p_health_data boolean,
  p_health_data_ai boolean,
  p_policy_version text
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_recorded_at timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if coalesce(btrim(p_policy_version), '') = '' then
    raise exception 'Policy version required' using errcode = '22023';
  end if;

  insert into public.consent_events (user_id, purpose, granted, policy_version, recorded_at)
  values
    (v_user_id, 'health_data', p_health_data, p_policy_version, v_recorded_at),
    (v_user_id, 'health_data_ai', p_health_data and p_health_data_ai, p_policy_version, v_recorded_at);
end;
$$;

revoke execute on function public.record_health_consents(boolean, boolean, text) from public, anon;
grant execute on function public.record_health_consents(boolean, boolean, text) to authenticated;

create or replace function public.has_current_ai_health_consent(p_policy_version text)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  with latest_by_purpose as (
    select distinct on (purpose) purpose, granted, policy_version
    from public.consent_events
    where user_id = (select auth.uid())
      and purpose in ('health_data', 'health_data_ai')
    order by purpose, recorded_at desc, created_at desc, id desc
  )
  select count(*) = 2 and bool_and(granted and policy_version = p_policy_version)
  from latest_by_purpose;
$$;

revoke execute on function public.has_current_ai_health_consent(text) from public, anon;
grant execute on function public.has_current_ai_health_consent(text) to authenticated;

-- Capture mandatory signup declarations in an append-only server-side record. This
-- runs at auth.users creation time, so it also works when email confirmation means
-- that signUp does not return an authenticated session to the browser.
create or replace function public.capture_signup_legal_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.raw_user_meta_data ->> 'adult_declaration' = 'true'
    and new.raw_user_meta_data ->> 'legal_terms_accepted' = 'true'
    and coalesce(new.raw_user_meta_data ->> 'legal_version', '') <> ''
  then
    insert into public.consent_events (user_id, purpose, granted, policy_version, recorded_at)
    values
      (new.id, 'adult_declaration', true, new.raw_user_meta_data ->> 'legal_version', statement_timestamp()),
      (new.id, 'legal_terms', true, new.raw_user_meta_data ->> 'legal_version', statement_timestamp());
  end if;
  return new;
end;
$$;

revoke all on function public.capture_signup_legal_acceptance() from public;

create trigger capture_signup_legal_acceptance
  after insert on auth.users
  for each row execute function public.capture_signup_legal_acceptance();
