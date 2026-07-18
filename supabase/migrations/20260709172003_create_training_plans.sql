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

alter table public.training_plans enable row level security;

grant select, insert, update, delete on public.training_plans to authenticated;

drop policy if exists "training_plans_select_own" on public.training_plans;
drop policy if exists "training_plans_insert_own" on public.training_plans;
drop policy if exists "training_plans_update_own" on public.training_plans;
drop policy if exists "training_plans_delete_own" on public.training_plans;
create policy "training_plans_select_own" on public.training_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "training_plans_insert_own" on public.training_plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "training_plans_update_own" on public.training_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "training_plans_delete_own" on public.training_plans for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists set_training_plans_updated_at on public.training_plans;
create trigger set_training_plans_updated_at before update on public.training_plans for each row execute function public.set_updated_at();
