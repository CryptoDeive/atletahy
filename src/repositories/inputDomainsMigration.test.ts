import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DAY_VALUES, INJURY_AREA_VALUES, TRAINING_TIME_VALUES } from '../../supabase/functions/_shared/inputDomains';

const sql = readFileSync('supabase/migrations/20260718150400_harden_user_input_domains.sql', 'utf8');

describe('input-domain migration rollout contract', () => {
  it('contains real UTF-8 canonical catalogs byte-for-byte', () => {
    for (const value of [...DAY_VALUES, ...TRAINING_TIME_VALUES, ...INJURY_AREA_VALUES]) expect(sql).toContain(`'${value}'`);
    expect(sql).not.toMatch(/Mi\?rcoles|S\?bado|ma\?ana|mediod\?a|Mu\?eca|Ã|Â|�/);
  });

  it('adds future-write constraints as NOT VALID and never validates legacy rows', () => {
    expect(sql).toMatch(/add constraint[\s\S]+not valid/i);
    expect(sql).not.toMatch(/^\s*alter\s+table[^;]+validate\s+constraint/im);
    expect(sql).not.toMatch(/raise exception/i);
    expect(sql).not.toMatch(/\bdelete\s+from\b/i);
  });

  it('enforces pace and numeric steps in the SQL protocol validator', () => {
    expect(sql).toContain('private.valid_pace_text');
    for (const predicate of ['mod(numeric_value,1)<>0', 'mod(numeric_value*10,1)<>0']) expect(sql).toContain(predicate);
  });
});
