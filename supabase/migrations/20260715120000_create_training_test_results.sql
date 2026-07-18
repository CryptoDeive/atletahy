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

drop trigger if exists set_training_test_results_updated_at on public.training_test_results;
create trigger set_training_test_results_updated_at before update on public.training_test_results
for each row execute function public.set_updated_at();

alter table public.training_test_results enable row level security;
grant select, insert, update, delete on public.training_test_results to authenticated;

drop policy if exists "training_test_results_select_own" on public.training_test_results;
drop policy if exists "training_test_results_insert_own" on public.training_test_results;
drop policy if exists "training_test_results_update_own" on public.training_test_results;
drop policy if exists "training_test_results_delete_own" on public.training_test_results;
create policy "training_test_results_select_own" on public.training_test_results for select to authenticated using ((select auth.uid()) = user_id);
create policy "training_test_results_insert_own" on public.training_test_results for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "training_test_results_update_own" on public.training_test_results for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "training_test_results_delete_own" on public.training_test_results for delete to authenticated using ((select auth.uid()) = user_id);
