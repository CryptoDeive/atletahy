-- Opt-in local-only integration tests. Run with `npm run test:db:require` after
-- starting an isolated Supabase stack. Never point this harness at a remote DB.
begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(27);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'db-test-a@example.invalid', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'db-test-b@example.invalid', now(), now())
on conflict (id) do nothing;

delete from public.ai_usage
where user_id in ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');
delete from public.training_plans
where user_id in ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');

insert into public.training_plans (id, user_id, title, status, plan_json)
values
  ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'A original', 'active', '{}'),
  ('20000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000002', 'B original', 'active', '{}');

select has_function(
  'public', 'save_training_plan_atomic', array['text', 'date', 'timestamp with time zone', 'jsonb', 'jsonb'],
  'forward migrations install the owner-derived save RPC'
);
select has_function(
  'public', 'set_active_training_plan_atomic', array['uuid'],
  'forward migrations install the owner-derived activation RPC'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.save_training_plan_atomic(text,date,timestamp with time zone,jsonb,jsonb)'::regprocedure),
  false,
  'plan save RPC remains SECURITY INVOKER'
);
select ok(
  not has_function_privilege('authenticated', 'public.save_training_plan_atomic(uuid,text,date,timestamp with time zone,jsonb,jsonb)', 'execute'),
  'authenticated cannot execute the historical arbitrary-owner overload'
);
select throws_ok(
  $$ select * from public.save_training_plan_atomic('no session', null, null, '{}', '{}') $$,
  '42501', null,
  'plan save rejects callers without auth.uid()'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*)::integer from public.training_plans), 1,
  'RLS exposes only the authenticated owner plans'
);
select throws_ok(
  $$ insert into public.training_plans (user_id, title, status, plan_json)
     values ('20000000-0000-0000-0000-000000000002', 'cross-owner', 'archived', '{}') $$,
  '42501', null,
  'RLS rejects cross-owner plan inserts'
);
select throws_ok(
  $$ select * from public.save_training_plan_atomic('must roll back', null, null, '{}', null) $$,
  '23502', null,
  'a failed replacement insert raises a not-null violation'
);
select is(
  (select count(*)::integer from public.training_plans
   where id = '10000000-0000-0000-0000-000000000011' and status = 'active'),
  1,
  'failed replacement rolls the archive back and preserves the old active plan'
);
select lives_ok(
  $$ select * from public.save_training_plan_atomic('A replacement', null, null, '{}', '{}') $$,
  'authenticated owner can save a replacement atomically'
);
select is(
  (select count(*)::integer from public.training_plans where status = 'active'), 1,
  'the owner has exactly one active plan after replacement'
);
select is(
  (select status from public.training_plans where id = '10000000-0000-0000-0000-000000000011'),
  'archived',
  'the previous plan is archived only after a successful replacement'
);
select throws_ok(
  $$ select * from public.set_active_training_plan_atomic('20000000-0000-0000-0000-000000000022') $$,
  'P0002', null,
  'an owner cannot activate another users plan'
);
select throws_ok(
  $$ select count(*) from public.ai_usage $$,
  '42501', null,
  'authenticated callers cannot read the quota table directly'
);
select throws_ok(
  $$ insert into public.ai_usage (user_id, feature) values
     ('10000000-0000-0000-0000-000000000001', 'coach_advice') $$,
  '42501', null,
  'authenticated callers cannot forge quota rows'
);

do $$
begin
  for i in 1..9 loop
    perform * from public.consume_ai_quota('coach_advice');
  end loop;
end
$$;
select results_eq(
  $$ select allowed, remaining from public.consume_ai_quota('coach_advice') $$,
  $$ values (true, 0) $$,
  'the tenth Coach request is allowed and exhausts the daily quota'
);
select results_eq(
  $$ select allowed, remaining from public.consume_ai_quota('coach_advice') $$,
  $$ values (false, 0) $$,
  'the eleventh Coach request is denied'
);
select ok(
  (select retry_after_seconds > 0 from public.consume_ai_quota('coach_advice')),
  'a denied Coach request reports a positive Retry-After interval'
);

do $$
begin
  for i in 1..2 loop
    perform * from public.consume_ai_quota('training_plan');
  end loop;
end
$$;
select results_eq(
  $$ select allowed, remaining from public.consume_ai_quota('training_plan') $$,
  $$ values (true, 0) $$,
  'the third plan request is allowed and exhausts the daily quota'
);
select results_eq(
  $$ select allowed, remaining from public.consume_ai_quota('training_plan') $$,
  $$ values (false, 0) $$,
  'the fourth plan request is denied'
);
select throws_ok(
  $$ select * from public.consume_ai_quota('unknown') $$,
  '22023', null,
  'unsupported quota features are rejected'
);

reset role;
select is(
  (select request_count from public.ai_usage
   where user_id = '10000000-0000-0000-0000-000000000001'
     and feature = 'coach_advice' and usage_date = current_date),
  10,
  'denied calls never increment the persisted Coach count above ten'
);
select is(
  (select request_count from public.ai_usage
   where user_id = '10000000-0000-0000-0000-000000000001'
     and feature = 'training_plan' and usage_date = current_date),
  3,
  'denied calls never increment the persisted plan count above three'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select results_eq(
  $$ select allowed, remaining from public.consume_ai_quota('coach_advice') $$,
  $$ values (true, 9) $$,
  'quota ownership is isolated per authenticated user'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$ select * from public.consume_ai_quota('coach_advice') $$,
  '42501', null,
  'quota consumption rejects callers without auth.uid()'
);
select ok(
  not has_function_privilege('anon', 'public.save_training_plan_atomic(text,date,timestamp with time zone,jsonb,jsonb)', 'execute'),
  'anon cannot execute plan save RPC'
);
select ok(
  not has_function_privilege('anon', 'public.consume_ai_quota(text)', 'execute'),
  'anon cannot execute quota RPC'
);

select * from finish();
rollback;
