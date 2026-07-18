-- Real concurrency test: dblink opens two independent PostgreSQL sessions.
-- This file is local-only and is reached through `npm run test:db[:require]`.
-- Fixed test identities are cleaned before and after the run; no remote target is used.

create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
set search_path = public, extensions;

select plan(13);

delete from public.ai_usage
where user_id in ('30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004');
delete from public.training_plans
where user_id in ('30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004');
delete from auth.users
where id in ('30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004');

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('30000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'db-race-a@example.invalid', now(), now()),
  ('40000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'db-race-b@example.invalid', now(), now());

insert into public.training_plans (id, user_id, title, status, plan_json)
values (
  '30000000-0000-0000-0000-000000000033',
  '30000000-0000-0000-0000-000000000003',
  'race original',
  'active',
  '{}'
);

select dblink_connect('race_c1', format('dbname=%s', current_database()));
select dblink_connect('race_c2', format('dbname=%s', current_database()));
select dblink_exec('race_c1', 'set request.jwt.claim.sub = ''30000000-0000-0000-0000-000000000003''');
select dblink_exec('race_c2', 'set request.jwt.claim.sub = ''30000000-0000-0000-0000-000000000003''');
select dblink_exec('race_c1', 'set role authenticated');
select dblink_exec('race_c2', 'set role authenticated');

create temporary table plan_race_results (
  worker text not null,
  id uuid not null,
  title text not null
);

select is(
  dblink_send_query(
    'race_c1',
    $$ with delay as materialized (select pg_sleep(0.20))
       select saved.id, saved.title
       from delay, lateral public.save_training_plan_atomic('race worker 1', null, null, '{}', '{}') saved $$
  ),
  1,
  'first plan save is dispatched asynchronously'
);
select is(
  dblink_send_query(
    'race_c2',
    $$ with delay as materialized (select pg_sleep(0.20))
       select saved.id, saved.title
       from delay, lateral public.save_training_plan_atomic('race worker 2', null, null, '{}', '{}') saved $$
  ),
  1,
  'second plan save is dispatched before collecting the first result'
);

insert into plan_race_results
select 'race_c1', id, title
from dblink_get_result('race_c1') as result(id uuid, title text);
insert into plan_race_results
select 'race_c2', id, title
from dblink_get_result('race_c2') as result(id uuid, title text);

select is(
  (select count(*)::integer from plan_race_results),
  2,
  'both concurrent plan save sessions complete'
);
select is(
  (select count(*)::integer from public.training_plans
   where user_id = '30000000-0000-0000-0000-000000000003' and status = 'active'),
  1,
  'advisory locking and the unique index leave exactly one active plan'
);
select is(
  (select count(*)::integer from public.training_plans
   where user_id = '30000000-0000-0000-0000-000000000003'),
  3,
  'both saves persist while the original and losing save are archived'
);

select is(
  dblink_exec(
    'race_c1',
    $$ do $block$
       begin
         begin
           perform * from public.save_training_plan_atomic('rollback candidate', null, null, '{}', null);
           raise exception 'expected not-null violation was not raised';
         exception when not_null_violation then
           null;
         end;
       end
       $block$ $$
  ),
  'DO',
  'a controlled failed save is caught in its own database subtransaction'
);
select is(
  (select count(*)::integer from public.training_plans
   where user_id = '30000000-0000-0000-0000-000000000003' and status = 'active'),
  1,
  'failed save rolls its archive back after the concurrent race'
);

create temporary table quota_race_results (
  worker text not null,
  feature text not null,
  allowed boolean not null,
  remaining integer not null,
  retry_after_seconds integer not null
);

select dblink_send_query(
  'race_c1',
  $$ with delay as materialized (select pg_sleep(0.20))
     select quota.allowed, quota.remaining, quota.retry_after_seconds
     from delay, generate_series(1, 6) request_number
     cross join lateral public.consume_ai_quota(
       case when request_number > 0 then 'coach_advice' else 'coach_advice' end
     ) quota $$
);
select dblink_send_query(
  'race_c2',
  $$ with delay as materialized (select pg_sleep(0.20))
     select quota.allowed, quota.remaining, quota.retry_after_seconds
     from delay, generate_series(1, 6) request_number
     cross join lateral public.consume_ai_quota(
       case when request_number > 0 then 'coach_advice' else 'coach_advice' end
     ) quota $$
);

insert into quota_race_results
select 'race_c1', 'coach_advice', allowed, remaining, retry_after_seconds
from dblink_get_result('race_c1') as result(allowed boolean, remaining integer, retry_after_seconds integer);
insert into quota_race_results
select 'race_c2', 'coach_advice', allowed, remaining, retry_after_seconds
from dblink_get_result('race_c2') as result(allowed boolean, remaining integer, retry_after_seconds integer);

select is(
  (select count(*)::integer from quota_race_results where feature = 'coach_advice'),
  12,
  'both sessions return all twelve concurrent Coach decisions'
);
select results_eq(
  $$ select count(*) filter (where allowed)::integer,
            count(*) filter (where not allowed)::integer
     from quota_race_results where feature = 'coach_advice' $$,
  $$ values (10, 2) $$,
  'concurrent Coach consumption allows ten and denies two'
);
select ok(
  (select bool_and(retry_after_seconds > 0)
   from quota_race_results where feature = 'coach_advice' and not allowed),
  'all concurrent Coach denials provide Retry-After'
);
select is(
  (select request_count from public.ai_usage
   where user_id = '30000000-0000-0000-0000-000000000003'
     and feature = 'coach_advice' and usage_date = current_date),
  10,
  'atomic upsert caps the persisted concurrent Coach count at ten'
);

select dblink_send_query(
  'race_c1',
  $$ with delay as materialized (select pg_sleep(0.20))
     select quota.allowed, quota.remaining, quota.retry_after_seconds
     from delay, generate_series(1, 2) request_number
     cross join lateral public.consume_ai_quota(
       case when request_number > 0 then 'training_plan' else 'training_plan' end
     ) quota $$
);
select dblink_send_query(
  'race_c2',
  $$ with delay as materialized (select pg_sleep(0.20))
     select quota.allowed, quota.remaining, quota.retry_after_seconds
     from delay, generate_series(1, 2) request_number
     cross join lateral public.consume_ai_quota(
       case when request_number > 0 then 'training_plan' else 'training_plan' end
     ) quota $$
);

insert into quota_race_results
select 'race_c1', 'training_plan', allowed, remaining, retry_after_seconds
from dblink_get_result('race_c1') as result(allowed boolean, remaining integer, retry_after_seconds integer);
insert into quota_race_results
select 'race_c2', 'training_plan', allowed, remaining, retry_after_seconds
from dblink_get_result('race_c2') as result(allowed boolean, remaining integer, retry_after_seconds integer);

select results_eq(
  $$ select count(*) filter (where allowed)::integer,
            count(*) filter (where not allowed)::integer
     from quota_race_results where feature = 'training_plan' $$,
  $$ values (3, 1) $$,
  'concurrent plan quota consumption allows three and denies one'
);
select is(
  (select request_count from public.ai_usage
   where user_id = '30000000-0000-0000-0000-000000000003'
     and feature = 'training_plan' and usage_date = current_date),
  3,
  'atomic upsert caps the persisted concurrent plan count at three'
);

select dblink_disconnect('race_c1');
select dblink_disconnect('race_c2');

delete from public.ai_usage
where user_id in ('30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004');
delete from public.training_plans
where user_id in ('30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004');
delete from auth.users
where id in ('30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004');

select * from finish();
