import { readFileSync } from 'node:fs';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Database } from './database';

type ConsentEvents = Database['public']['Tables']['consent_events'];
type RecordHealthConsents = Database['public']['Functions']['record_health_consents'];
const databaseSource = readFileSync('src/types/database.ts', 'utf8');

describe('consent database contract types', () => {
  it('represents every persisted consent purpose', () => {
    expectTypeOf<ConsentEvents['Row']['purpose']>().toEqualTypeOf<
      'health_data' | 'health_data_ai' | 'legal_terms' | 'adult_declaration'
    >();
  });

  it('does not expose direct client insert or update contracts for append-only events', () => {
    expectTypeOf<ConsentEvents['Insert']>().toEqualTypeOf<never>();
    expectTypeOf<ConsentEvents['Update']>().toEqualTypeOf<never>();
  });

  it('keeps the source contract explicitly read-only for consent_events', () => {
    expect(databaseSource).toContain("purpose: 'health_data' | 'health_data_ai' | 'legal_terms' | 'adult_declaration'");
    expect(databaseSource).toContain('consent_events: TableDefinition<ConsentEventRow, never, never>');
    expect(databaseSource).not.toContain('type ConsentEventInsert');
  });

  it('exposes only consent decisions and policy version through the write RPC', () => {
    expectTypeOf<RecordHealthConsents['Args']>().toEqualTypeOf<{
      p_health_data: boolean;
      p_health_data_ai: boolean;
      p_policy_version: string;
    }>();
    expectTypeOf<RecordHealthConsents['Returns']>().toEqualTypeOf<undefined>();
  });
});
