import { describe, expect, it, vi } from 'vitest';
import { hasCurrentAiHealthConsent } from './aiConsentGuard';

describe('AI health consent guard', () => {
  it('accepts only an explicit true result for the current legal version', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    await expect(hasCurrentAiHealthConsent({ rpc })).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('has_current_ai_health_consent', { p_policy_version: '2026-07-18' });
  });

  it.each([
    ['revoked or missing', false, null],
    ['unexpected null', null, null],
    ['database error', null, { message: 'missing migration' }],
  ])('fails closed for %s', async (_case, data, error) => {
    await expect(hasCurrentAiHealthConsent({ rpc: vi.fn().mockResolvedValue({ data, error }) })).resolves.toBe(false);
  });
});
