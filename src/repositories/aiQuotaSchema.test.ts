import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20260715210000_add_atomic_ai_usage_quota.sql'), 'utf8');

describe('AI quota migration contract', () => {
  it('is forward-only and exposes only an atomic authenticated consume RPC', () => {
    expect(migration).toMatch(/create table if not exists public\.ai_usage/i);
    expect(migration).toMatch(/security definer/i);
    expect(migration).toMatch(/auth\.uid\(\)/i);
    expect(migration).toMatch(/current_date/i);
    expect(migration).toMatch(/coach_advice[\s\S]*10/i);
    expect(migration).toMatch(/training_plan[\s\S]*3/i);
    expect(migration).toMatch(/revoke all on public\.ai_usage from anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.consume_ai_quota\(text\) to authenticated/i);
    expect(migration).not.toMatch(/drop table|truncate|delete from public\.ai_usage/i);
  });
});
