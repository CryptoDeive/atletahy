import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schemaPath = resolve(process.cwd(), 'supabase/schema.sql');
const correctivePlanMigrationPath = resolve(process.cwd(), 'supabase/migrations/20260715200000_harden_training_plan_atomic_rpc.sql');
const concurrentDatabaseTestPath = resolve(process.cwd(), 'supabase/tests/database/concurrent_plan_and_quota.sql');

describe('Supabase schema', () => {
  it('contains the main HyDeivi persistence tables', () => {
    const sql = readFileSync(schemaPath, 'utf8').toLowerCase();

    for (const table of ['profiles', 'athlete_metrics', 'athlete_availability', 'athlete_equipment', 'injuries', 'nutrition_preferences', 'daily_readiness', 'workout_logs', 'coach_advices', 'training_plans', 'training_test_results']) {
      expect(sql).toContain(`create table if not exists public.${table}`);
    }
  });

  it('protects training test results with complete own-row RLS policies', () => {
    const sql = readFileSync(schemaPath, 'utf8').toLowerCase();
    expect(sql).toContain('alter table public.training_test_results enable row level security');
    for (const operation of ['select', 'insert', 'update', 'delete']) {
      expect(sql).toContain(`training_test_results_${operation}_own`);
    }
    expect(sql).toContain('(select auth.uid()) = user_id');
  });

  it('enables RLS and uses auth.uid ownership policies', () => {
    const sql = readFileSync(schemaPath, 'utf8').toLowerCase();

    expect(sql).toContain('enable row level security');
    expect(sql).toContain('(select auth.uid()) = user_id');
    expect(sql).not.toContain('auth.role');
    const securityDefiners = sql.match(/security definer/g) ?? [];
    expect(securityDefiners).toHaveLength(1);
    expect(sql).toMatch(/consume_ai_quota[\s\S]*auth\.uid\(\)[\s\S]*revoke execute on function public\.consume_ai_quota/i);
  });

  it('uses the exact Supabase contract column names and storage shapes', () => {
    const sql = readFileSync(schemaPath, 'utf8').toLowerCase();

    expect(sql).toContain('birth_date date');
    expect(sql).toContain('target_race_date date');
    expect(sql).not.toContain('target_date');

    expect(sql).toContain("available_days jsonb not null default '[]'::jsonb");
    expect(sql).toContain('double_session_available boolean');
    expect(sql).toContain('agenda_notes text');
    expect(sql).not.toContain('can_double_session');
    expect(sql).not.toContain('schedule_notes');

    expect(sql).toContain("equipment jsonb not null default '{}'::jsonb");
    expect(sql).not.toContain('ski_erg boolean');

    expect(sql).toContain('started_at date');
    expect(sql).toContain('resolved_at date');
    expect(sql).toContain('body_area text not null');

    expect(sql).toContain('usual_meal_times text');
    expect(sql).not.toContain('meal_timing');

    for (const column of [
      'sleep_quality_1_5',
      'stress_1_5',
      'fatigue_1_5',
      'muscle_soreness_1_5',
      'leg_soreness_1_5',
      'upper_soreness_1_5',
      'motivation_1_5',
      'hydration_1_5',
      'pain_0_10',
      'resting_hr integer',
      'hrv numeric',
    ]) {
      expect(sql).toContain(column);
    }
    expect(sql).not.toContain('_1_to_5');
    expect(sql).not.toContain('pain_0_to_10');

    for (const column of [
      'training_week_id text',
      'training_day_id text',
      'session_rpe numeric',
      'avg_hr integer',
      'completed_percentage numeric',
      'what_went_well text',
      'what_went_wrong text',
      'started_at timestamptz',
      'finished_at timestamptz',
      'calories numeric',
    ]) {
      expect(sql).toContain(column);
    }
    expect(sql).not.toMatch(/^\s+week_id\s+text/m);
    expect(sql).not.toMatch(/^\s+day_id\s+text/m);
    expect(sql).not.toContain('session_rpe_1_to_10');
    expect(sql).not.toContain('average_hr');
    expect(sql).not.toContain('completion_percent');
    expect(sql).not.toMatch(/^\s+went_well\s+text/m);
    expect(sql).not.toMatch(/^\s+went_wrong\s+text/m);
    expect(sql).toContain('unique (user_id, training_week_id, training_day_id, date)');
    expect(sql).not.toMatch(/^\s+unique \(user_id, training_week_id, training_day_id\)\s*[,)]/m);

    for (const column of [
      'model text',
      'input_snapshot_json jsonb',
      'advice_json jsonb',
      'was_useful boolean',
      'user_feedback text',
      'generated_at timestamptz',
    ]) {
      expect(sql).toContain(column);
    }
    expect(sql).not.toContain('advice jsonb');

    for (const column of [
      'create table if not exists public.training_plans',
      'status text',
      'target_race_date date',
      'input_snapshot_json jsonb',
      'plan_json jsonb not null',
    ]) {
      expect(sql).toContain(column);
    }
  });

  it('enforces one active training plan per user via transactional RPC helpers', () => {
    const sql = readFileSync(schemaPath, 'utf8').toLowerCase();

    expect(sql).toContain("create unique index if not exists training_plans_one_active_per_user_idx on public.training_plans (user_id) where status = 'active'");
    expect(sql).toContain('create or replace function public.save_training_plan_atomic');
    expect(sql).toContain('create or replace function public.set_active_training_plan_atomic');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('auth.uid()');
    expect(sql).toContain('grant execute on function public.save_training_plan_atomic');
    expect(sql).toContain('grant execute on function public.set_active_training_plan_atomic');
  });

  it('training plan RPCs use SECURITY INVOKER and revoke execute from public and anon', () => {
    const sql = readFileSync(schemaPath, 'utf8').toLowerCase();

    const securityInvokerCount = (sql.match(/\bsecurity invoker\b/g) ?? []).length;
    expect(securityInvokerCount).toBeGreaterThanOrEqual(2);

    expect(sql).toContain('revoke execute on function public.save_training_plan_atomic(text, date, timestamptz, jsonb, jsonb) from public');
    expect(sql).toContain('revoke execute on function public.set_active_training_plan_atomic(uuid) from public');

    expect(sql).toContain('revoke execute on function public.save_training_plan_atomic(text, date, timestamptz, jsonb, jsonb) from anon');
    expect(sql).toContain('revoke execute on function public.set_active_training_plan_atomic(uuid) from anon');
    expect(sql).not.toContain('p_expected_user_id');
  });

  it('adds a forward-only corrective migration with auth-derived ownership, rollback and concurrency guarantees', () => {
    const sql = readFileSync(correctivePlanMigrationPath, 'utf8').toLowerCase();

    expect(sql).toContain('create or replace function public.save_training_plan_atomic');
    expect(sql).toContain('create or replace function public.set_active_training_plan_atomic');
    expect(sql).toContain('security invoker');
    expect(sql).toContain('current_user_id uuid := auth.uid()');
    expect(sql).not.toContain('p_expected_user_id');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain("where user_id = current_user_id\n    and status = 'active'");
    expect(sql).toContain('insert into public.training_plans');
    expect(sql).toContain('where id = p_plan_id\n      and user_id = current_user_id');
    expect(sql).toContain('revoke execute on function public.save_training_plan_atomic(uuid, text, date, timestamptz, jsonb, jsonb) from authenticated');
    expect(sql).toContain('revoke execute on function public.set_active_training_plan_atomic(uuid, uuid) from authenticated');
    expect(sql).not.toMatch(/\b(delete|truncate|drop table|drop column)\b/);
  });

  it('keeps an opt-in two-session PostgreSQL race test for plan and quota atomicity', () => {
    const sql = readFileSync(concurrentDatabaseTestPath, 'utf8').toLowerCase();

    expect(sql).toContain("dblink_connect('race_c1'");
    expect(sql).toContain("dblink_connect('race_c2'");
    expect(sql).toContain("dblink_send_query(\n    'race_c1'");
    expect(sql).toContain("dblink_send_query(\n    'race_c2'");
    expect(sql).toContain('save_training_plan_atomic');
    expect(sql).toContain('consume_ai_quota');
    expect(sql).toContain("values (10, 2)");
    expect(sql).toContain("values (3, 1)");
    expect(sql).toContain('failed save rolls its archive back');
    expect(sql).toContain("dblink_disconnect('race_c1'");
    expect(sql).toContain("dblink_disconnect('race_c2'");
  });
});
