import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deletionResults: new Map<string, { error: unknown }>(),
  insert: vi.fn(async () => ({ error: null })),
  rpc: vi.fn(async () => ({ error: null })),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: (table: string) => table === 'consent_events'
      ? { insert: mocks.insert }
      : {
          delete: () => ({
            eq: async () => mocks.deletionResults.get(table) ?? { error: null },
          }),
        },
  },
}));

import { saveConsent, withdrawHealthConsent } from './consentRepository';

describe('withdrawHealthConsent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.deletionResults.clear();
    mocks.insert.mockClear();
    mocks.rpc.mockClear();
  });

  it('writes health choices through the server-owned RPC without user or timestamp fields', async () => {
    const result = await saveConsent(
      { kind: 'user', userId: 'user-1' },
      { healthData: true, healthDataWithAi: false },
    );

    expect(result.remotelyAudited).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('record_health_consents', {
      p_health_data: true,
      p_health_data_ai: false,
      p_policy_version: result.record.policyVersion,
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('does not report complete remote deletion when any table deletion fails', async () => {
    mocks.deletionResults.set('injuries', { error: { message: 'delete denied' } });

    const result = await withdrawHealthConsent({ kind: 'user', userId: 'user-1' });

    expect(result.remotelyAudited).toBe(true);
    expect(result.remoteHealthDataDeleted).toBe(false);
    expect(result.deletionErrors).toEqual(['injuries']);
  });

  it('reports complete remote deletion only after every deletion succeeds', async () => {
    const result = await withdrawHealthConsent({ kind: 'user', userId: 'user-1' });

    expect(result.remoteHealthDataDeleted).toBe(true);
    expect(result.deletionErrors).toEqual([]);
  });
});
