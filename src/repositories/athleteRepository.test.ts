import { beforeEach, describe, expect, it } from 'vitest';
import { defaultAthleteProfile } from '../data/defaultAthleteState';
import { getAthleteState } from './athleteRepository';
import { athleteStorageResources, guestStorageContext, storageKey } from './storageKeys';

describe('athlete legacy hydration', () => {
  beforeEach(() => localStorage.clear());

  it('preserves an ambiguous HYROX value as correction-required instead of erasing it', async () => {
    localStorage.setItem(storageKey(guestStorageContext, athleteStorageResources.profile), JSON.stringify({ ...defaultAthleteProfile, hyroxCategory: 'Legacy Elite' }));
    const state = await getAthleteState();
    expect(state.profile.hyroxCategory).toBe('');
    expect(state.profile.hyroxCategoryLegacy).toEqual(expect.objectContaining({ value: 'Legacy Elite', ambiguous: true }));
  });

  it('normalizes only an unambiguous Open value when sex is known', async () => {
    localStorage.setItem(storageKey(guestStorageContext, athleteStorageResources.profile), JSON.stringify({ ...defaultAthleteProfile, sex: 'female', hyroxCategory: 'Open' }));
    const state = await getAthleteState();
    expect(state.profile.hyroxCategory).toBe('women_open');
    expect(state.profile.hyroxCategoryLegacy).toBeUndefined();
  });

  it('preserves a legacy diet as correction-required without losing its label', async () => {
    localStorage.setItem(storageKey(guestStorageContext, athleteStorageResources.nutrition), JSON.stringify({ dietType: 'Paleo histórica' }));
    const state = await getAthleteState();
    expect(state.nutrition.dietType).toBe('');
    expect(state.nutrition.dietTypeLegacy).toEqual(expect.objectContaining({ value: 'Paleo histórica', ambiguous: true }));
  });
});
