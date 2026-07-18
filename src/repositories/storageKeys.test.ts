import { afterEach, describe, expect, it } from 'vitest';
import {
  guestStorageContext,
  importLegacyAndGuestData,
  storageContextForUser,
  storageKey,
} from './storageKeys';

describe('identity-scoped local storage', () => {
  afterEach(() => window.localStorage.clear());

  it('creates isolated keys for guest and each authenticated user', () => {
    expect(storageKey(guestStorageContext, 'workout-logs')).toBe('atletahy:guest:workout-logs');
    expect(storageKey(storageContextForUser('user-a'), 'workout-logs')).toBe('atletahy:user-a:workout-logs');
    expect(storageKey(storageContextForUser('user-b'), 'workout-logs')).toBe('atletahy:user-b:workout-logs');
  });

  it('copies guest and legacy values explicitly without deleting their origins', () => {
    localStorage.setItem('atletahy:guest:workout-logs', JSON.stringify({ guest: true }));
    localStorage.setItem('hyrox:athlete-profile', JSON.stringify({ name: 'Legacy' }));

    const result = importLegacyAndGuestData('user-a');

    expect(result.imported).toBe(true);
    expect(JSON.parse(localStorage.getItem('atletahy:user-a:workout-logs') ?? '{}')).toEqual({ guest: true });
    expect(JSON.parse(localStorage.getItem('atletahy:user-a:athlete-profile') ?? '{}')).toEqual({ name: 'Legacy' });
    expect(localStorage.getItem('atletahy:guest:workout-logs')).not.toBeNull();
    expect(localStorage.getItem('hyrox:athlete-profile')).not.toBeNull();
  });

  it('is idempotent and never overwrites existing user data', () => {
    localStorage.setItem('atletahy:guest:workout-logs', JSON.stringify({ source: 'guest' }));
    localStorage.setItem('atletahy:user-a:workout-logs', JSON.stringify({ source: 'user' }));

    expect(importLegacyAndGuestData('user-a').imported).toBe(true);
    localStorage.setItem('atletahy:guest:workout-logs', JSON.stringify({ source: 'changed' }));
    expect(importLegacyAndGuestData('user-a').imported).toBe(false);
    expect(JSON.parse(localStorage.getItem('atletahy:user-a:workout-logs') ?? '{}')).toEqual({ source: 'user' });
  });
});
