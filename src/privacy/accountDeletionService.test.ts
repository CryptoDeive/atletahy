import { describe, expect, it, vi } from 'vitest';
import { ACCOUNT_DELETION_CONFIRMATION } from './accountPrivacy';
import { requestAccountDeletion } from './accountDeletionService';

describe('requestAccountDeletion', () => {
  it('invokes the server function and clears only the local auth session after confirmed deletion', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { code: 'ACCOUNT_DELETED', deleted: true }, error: null });
    const signOut = vi.fn().mockResolvedValue({ error: null });

    const result = await requestAccountDeletion(
      { confirmation: ACCOUNT_DELETION_CONFIRMATION, currentPassword: 'password-123' },
      { client: { functions: { invoke }, auth: { signOut } } },
    );

    expect(invoke).toHaveBeenCalledWith('delete-account', { body: { confirmation: ACCOUNT_DELETION_CONFIRMATION, currentPassword: 'password-123' } });
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(result).toEqual({ ok: true, code: 'ACCOUNT_DELETED', message: 'Tu cuenta y sus datos asociados se han eliminado.' });
  });

  it('returns a safe explicit failure and preserves the local session when deletion is unavailable', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { code: 'ACCOUNT_DELETION_FAILED', error: 'safe' }, error: { message: 'internal endpoint details' } });
    const signOut = vi.fn();

    const result = await requestAccountDeletion(
      { confirmation: ACCOUNT_DELETION_CONFIRMATION, currentPassword: 'password-123' },
      { client: { functions: { invoke }, auth: { signOut } } },
    );

    expect(result).toMatchObject({ ok: false, code: 'ACCOUNT_DELETION_FAILED' });
    expect(JSON.stringify(result)).not.toContain('internal endpoint details');
    expect(signOut).not.toHaveBeenCalled();
  });
});
