import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260718130000_create_consent_audit_log.sql', 'utf8');

describe('consent audit migration', () => {
  it('supports append-only legal and adult declaration events', () => {
    expect(migration).toContain("'legal_terms'");
    expect(migration).toContain("'adult_declaration'");
    expect(migration).toContain('capture_signup_legal_acceptance');
    expect(migration).toContain('after insert on auth.users');
    expect(migration).toContain('new.raw_user_meta_data');
    expect(migration).toContain("insert into public.consent_events");
  });

  it('evaluates the globally latest event before requiring the current policy version', () => {
    const functionSql = migration.slice(
      migration.indexOf('create or replace function public.has_current_ai_health_consent'),
      migration.indexOf('revoke execute on function public.has_current_ai_health_consent'),
    );
    const latestSelectionSql = functionSql.slice(
      functionSql.indexOf('with latest_by_purpose'),
      functionSql.indexOf('select count(*)'),
    );

    expect(functionSql).toContain('select distinct on (purpose) purpose, granted, policy_version');
    expect(functionSql).toContain('order by purpose, recorded_at desc, created_at desc, id desc');
    expect(latestSelectionSql).not.toContain('policy_version = p_policy_version');
    expect(functionSql).toContain('bool_and(granted and policy_version = p_policy_version)');
  });

  it('only accepts health consent writes through a server-timestamped authenticated RPC', () => {
    expect(migration).toContain('create or replace function public.record_health_consents');
    expect(migration).toContain('security definer');
    expect(migration).toContain('set search_path = public, pg_catalog');
    expect(migration).toContain('auth.uid()');
    expect(migration).toContain('clock_timestamp()');
    expect(migration).toContain('grant execute on function public.record_health_consents(boolean, boolean, text) to authenticated');
    expect(migration).not.toContain('grant select, insert on public.consent_events');
    expect(migration).not.toContain('create policy "consent_events_insert_own"');
  });
});
