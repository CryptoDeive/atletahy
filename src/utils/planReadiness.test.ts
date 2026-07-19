import { describe, expect, it } from 'vitest';
import { defaultAthleteProfile, defaultEquipmentAvailability, defaultNutritionPreferences, defaultPhysiologyMetrics, defaultTrainingAvailability } from '../data/defaultAthleteState';
import type { AthleteState } from '../types/athlete';
import { getPlanReadiness } from './planReadiness';

function state(overrides: Partial<AthleteState> = {}): AthleteState {
  return {
    profile: { ...defaultAthleteProfile, targetDate: '2026-11-22', mainGoal: 'competir', hyroxCategory: 'women_open', ...overrides.profile },
    physiology: { ...defaultPhysiologyMetrics, ...overrides.physiology },
    availability: { ...defaultTrainingAvailability, availableDays: ['Lunes'], preferredTrainingTime: 'mañana', maxSessionMinutes: 60, ...overrides.availability },
    equipment: { ...defaultEquipmentAvailability, ...overrides.equipment },
    injuries: overrides.injuries ?? [],
    nutrition: { ...defaultNutritionPreferences, ...overrides.nutrition },
  };
}

describe('getPlanReadiness', () => {
  it('returns safe, actionable blockers for each missing required field', () => {
    const result = getPlanReadiness(state({
      profile: { ...defaultAthleteProfile, targetDate: '', mainGoal: '' as never, hyroxCategory: '' },
      availability: defaultTrainingAvailability,
    }), { requireAiConsent: true, aiConsentGranted: false });

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'profile.targetDate', label: 'Fecha de competición', tab: 'profile' }),
      expect.objectContaining({ path: 'profile.mainGoal', label: 'Objetivo principal', tab: 'profile' }),
      expect.objectContaining({ path: 'profile.hyroxCategory', label: 'Categoría HYROX', tab: 'profile' }),
      expect.objectContaining({ path: 'availability.availableDays', label: 'Días disponibles', tab: 'availability' }),
      expect.objectContaining({ path: 'availability.maxSessionMinutes', label: 'Tiempo máximo por sesión', tab: 'availability' }),
      expect.objectContaining({ path: 'availability.preferredTrainingTime', label: 'Hora preferida', tab: 'availability' }),
      expect.objectContaining({ path: 'consent.healthDataWithAi', label: 'Consentimiento para IA', tab: 'privacy' }),
    ]));
    expect(JSON.stringify(result)).not.toMatch(/lesi|dolor|nutric/i);
  });

  it('accepts a fully configured profile', () => {
    expect(getPlanReadiness(state(), { requireAiConsent: true, aiConsentGranted: true })).toEqual({ ready: true, blockers: [] });
  });
});
