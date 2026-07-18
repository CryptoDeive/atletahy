import { describe, expect, it, vi } from 'vitest';
import { logUiError, normalizeUiError } from './uiError';

describe('UiError', () => {
  it('never exposes SQL, RLS, endpoint or stack details to the UI', () => {
    const internal = new Error('permission denied by RLS on relation athlete_profiles at https://db.example.test/rest/v1');
    internal.stack = 'Error: secret\n at privateFunction (/srv/app.ts:10:2)';

    const result = normalizeUiError(internal, { code: 'PROFILE_SAVE_FAILED' });

    expect(result).toEqual({
      code: 'PROFILE_SAVE_FAILED',
      message: 'No se pudo completar la operación. Inténtalo de nuevo.',
      action: 'retry',
      retryable: true,
    });
    expect(JSON.stringify(result)).not.toMatch(/SQL|RLS|relation|https?:|stack|privateFunction/i);
  });

  it('logs only a sanitized diagnostic envelope', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    logUiError('profile.save', new Error('JWT token=secret; relation profiles violates RLS'), {
      userId: 'user-123',
      email: 'athlete@example.test',
      prompt: 'private injury details',
    });

    expect(warn).toHaveBeenCalledWith('[AtletaHY]', {
      context: 'profile.save',
      code: 'UNEXPECTED_ERROR',
      kind: 'Error',
    });
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/secret|athlete@example|injury|relation|RLS|JWT/i);
    warn.mockRestore();
  });
});
