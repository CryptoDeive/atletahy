import { beforeEach, describe, expect, it } from 'vitest';
import { storageContextForUser, storageKey } from '../repositories/storageKeys';
import {
  ACCOUNT_DELETION_CONFIRMATION,
  buildLocalAccountExport,
  clearLocalAccountData,
  prepareAccountDeletion,
} from './accountPrivacy';

describe('local account export', () => {
  beforeEach(() => window.localStorage.clear());

  it('exports only whitelisted resources from the selected account namespace', () => {
    const selected = storageContextForUser('user-a');
    const other = storageContextForUser('user-b');
    window.localStorage.setItem(storageKey(selected, 'athlete-profile'), JSON.stringify({ name: 'Ana' }));
    window.localStorage.setItem(storageKey(other, 'athlete-profile'), JSON.stringify({ name: 'Bea' }));
    window.localStorage.setItem('sb-project-auth-token', 'SUPER_SECRET_TOKEN');
    window.localStorage.setItem(storageKey(selected, 'unknown-private-cache'), 'hidden');

    const exported = buildLocalAccountExport(selected, new Date('2026-07-15T12:00:00.000Z'));
    const serialized = JSON.stringify(exported);

    expect(exported).toMatchObject({
      format: 'atletahy-local-export',
      version: 1,
      scope: 'user',
      exportedAt: '2026-07-15T12:00:00.000Z',
      data: { 'athlete-profile': { name: 'Ana' } },
    });
    expect(serialized).not.toContain('Bea');
    expect(serialized).not.toContain('SUPER_SECRET_TOKEN');
    expect(serialized).not.toContain('hidden');
    expect(serialized).not.toContain('user-a');
  });
});

describe('local account cleanup', () => {
  it('removes only whitelisted resources from the deleted account namespace', () => {
    const selected = storageContextForUser('user-a');
    const other = storageContextForUser('user-b');
    window.localStorage.setItem(storageKey(selected, 'athlete-profile'), JSON.stringify({ name: 'Ana' }));
    window.localStorage.setItem(storageKey(other, 'athlete-profile'), JSON.stringify({ name: 'Bea' }));
    window.localStorage.setItem('sb-project-auth-token', 'preserved-by-app-cleanup');

    clearLocalAccountData(selected);

    expect(window.localStorage.getItem(storageKey(selected, 'athlete-profile'))).toBeNull();
    expect(window.localStorage.getItem(storageKey(other, 'athlete-profile'))).toContain('Bea');
    expect(window.localStorage.getItem('sb-project-auth-token')).toBe('preserved-by-app-cleanup');
  });
});

describe('account deletion preparation', () => {
  it('requires an authenticated account, acknowledgement and exact phrase', () => {
    expect(prepareAccountDeletion({ authenticated: false, acknowledged: true, phrase: ACCOUNT_DELETION_CONFIRMATION }).status).toBe('blocked');
    expect(prepareAccountDeletion({ authenticated: true, acknowledged: false, phrase: ACCOUNT_DELETION_CONFIRMATION }).status).toBe('blocked');
    expect(prepareAccountDeletion({ authenticated: true, acknowledged: true, phrase: 'eliminar mi cuenta' }).status).toBe('blocked');
  });

  it('never claims remote deletion succeeded when the server operation is unavailable', () => {
    const result = prepareAccountDeletion({
      authenticated: true,
      acknowledged: true,
      phrase: ACCOUNT_DELETION_CONFIRMATION,
    });

    expect(result).toEqual({
      status: 'prepared',
      executed: false,
      code: 'ACCOUNT_DELETION_SERVER_REQUIRED',
      message: 'Solicitud preparada. La cuenta no se ha eliminado: esta operación requiere un servicio seguro en el servidor.',
    });
  });
});
