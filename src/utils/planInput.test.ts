import { describe, expect, it } from 'vitest';
import { defaultAthleteProfile, defaultEquipmentAvailability, defaultNutritionPreferences, defaultPhysiologyMetrics, defaultTrainingAvailability } from '../data/defaultAthleteState';
import type { WorkoutLog } from '../types/athlete';
import { validPlanGenerationInput } from '../test/planTestUtils';
import { buildPlanGenerationInput, validatePlanGenerationInput } from './planInput';

function log(overrides: Partial<WorkoutLog>): WorkoutLog {
  return {
    id: overrides.id ?? 'log',
    date: overrides.date ?? '2026-07-08',
    weekId: overrides.weekId ?? 'week-6',
    dayId: overrides.dayId ?? 'day-3',
    status: overrides.status ?? 'completado',
    durationMinutes: overrides.durationMinutes ?? 60,
    sessionRpe1To10: overrides.sessionRpe1To10 ?? 7,
    averageHr: overrides.averageHr ?? '',
    maxHr: overrides.maxHr ?? '',
    startedAt: overrides.startedAt,
    finishedAt: overrides.finishedAt,
    completionPercent: overrides.completionPercent ?? 100,
    notes: overrides.notes ?? '',
    wentWell: overrides.wentWell ?? '',
    wentWrong: overrides.wentWrong ?? '',
  };
}

describe('buildPlanGenerationInput', () => {
  it('returns objective, availability, equipment and injuries', () => {
    const input = buildPlanGenerationInput({
      athleteState: {
        profile: { ...defaultAthleteProfile, targetDate: '2026-11-22', mainGoal: 'competir', hyroxCategory: 'women_open', targetTime: '01:18:00' },
        physiology: { ...defaultPhysiologyMetrics, currentRunningVolumeKm: 30, currentLongRunKm: 12, hyroxExperience: '1-2 carreras', strengthExperience: 'media' },
        availability: { ...defaultTrainingAvailability, availableDays: ['Lunes', 'Miércoles', 'Viernes'], maxSessionMinutes: 75, preferredTrainingTime: 'mañana' },
        equipment: { ...defaultEquipmentAvailability, skiErg: true, sled: true },
        injuries: [{ id: 'injury-1', body_area: 'rodilla', side: '', pain_level_0_10: 3, status: 'active', movement_restrictions: 'sentadilla profunda', notes: 'vigilar volumen' }],
        nutrition: defaultNutritionPreferences,
      },
      recentWorkoutLogs: [log({ id: 'log-1' })],
    });

    expect(input.objective).toMatchObject({ targetRaceDate: '2026-11-22', mainGoal: 'competir', category: 'women_open', targetTime: '01:18:00' });
    expect(input.currentLevel).toMatchObject({ currentRunningVolumeKm: 30, currentLongRunKm: 12, hyroxExperience: '1-2 carreras', strengthExperience: 'media' });
    expect(input.availability).toMatchObject({ availableDays: ['Lunes', 'Miércoles', 'Viernes'], maxSessionMinutes: 75, preferredTrainingTime: 'mañana' });
    expect(input.equipment.available).toEqual(expect.arrayContaining(['SkiErg', 'Sled']));
    expect(input.injuries).toHaveLength(1);
    expect(input.recentWorkoutLogs).toHaveLength(1);
  });

  it('keeps only 7 recent deduped workout logs and trims empty text noise', () => {
    const input = buildPlanGenerationInput({
      athleteState: {
        profile: defaultAthleteProfile,
        physiology: defaultPhysiologyMetrics,
        availability: defaultTrainingAvailability,
        equipment: defaultEquipmentAvailability,
        injuries: [],
        nutrition: defaultNutritionPreferences,
      },
      recentWorkoutLogs: [
        log({ id: 'older-dup', date: '2026-07-03', weekId: 'week-1', dayId: 'day-1', finishedAt: '2026-07-03T08:00:00.000Z', notes: ' viejo ' }),
        log({ id: 'newer-dup', date: '2026-07-03', weekId: 'week-1', dayId: 'day-1', finishedAt: '2026-07-03T09:00:00.000Z', notes: '  nuevo  ' }),
        log({ id: '4', date: '2026-07-04' }),
        log({ id: '5', date: '2026-07-05' }),
        log({ id: '6', date: '2026-07-06' }),
        log({ id: '7', date: '2026-07-07' }),
        log({ id: '8', date: '2026-07-08', notes: '  ' }),
        log({ id: '9', date: '2026-07-09' }),
      ],
    });

    expect(input.recentWorkoutLogs).toHaveLength(7);
    expect(input.recentWorkoutLogs[0].date).toBe('2026-07-09');
    expect(input.recentWorkoutLogs.at(-1)?.id).toBe('newer-dup');
    expect(input.recentWorkoutLogs.find((item) => item.id === 'newer-dup')?.notes).toBe('nuevo');
    expect(input.recentWorkoutLogs.find((item) => item.id === 'older-dup')).toBeUndefined();
  });

  it('drops malformed and incomplete status-only logs before sending a snapshot to IA', () => {
    const input = buildPlanGenerationInput({
      athleteState: {
        profile: defaultAthleteProfile,
        physiology: defaultPhysiologyMetrics,
        availability: defaultTrainingAvailability,
        equipment: defaultEquipmentAvailability,
        injuries: [],
        nutrition: defaultNutritionPreferences,
      },
      recentWorkoutLogs: [
        log({ id: 'status-only', date: '2026-07-10', weekId: 'week-2', dayId: 'day-1', status: 'saltado', durationMinutes: '', sessionRpe1To10: '', completionPercent: '', notes: '   ', wentWell: '   ', wentWrong: '   ' }),
        log({ id: 'invalid-key', date: '', weekId: '', dayId: '', durationMinutes: '', sessionRpe1To10: '', completionPercent: '', notes: '   ', wentWell: '   ', wentWrong: '   ' }),
      ],
    });

    expect(input.recentWorkoutLogs).toEqual([]);
  });
});

describe('validatePlanGenerationInput', () => {
  it('accepts the complete bounded Plan IA input', () => {
    expect(validatePlanGenerationInput(validPlanGenerationInput)).toBe(true);
  });

  it('rejects records without the required objective structure', () => {
    expect(validatePlanGenerationInput({ ...validPlanGenerationInput, objective: {} })).toBe(false);
  });

  it('rejects malformed nested availability and equipment values', () => {
    expect(validatePlanGenerationInput({
      ...validPlanGenerationInput,
      availability: { ...validPlanGenerationInput.availability, availableDays: 'lunes' },
    })).toBe(false);
    expect(validatePlanGenerationInput({
      ...validPlanGenerationInput,
      equipment: { ...validPlanGenerationInput.equipment, available: [42] },
    })).toBe(false);
  });

  it.each([
    ['category', (input: typeof validPlanGenerationInput) => ({ ...input, objective: { ...input.objective, category: 'hacked' } })],
    ['goal', (input: typeof validPlanGenerationInput) => ({ ...input, objective: { ...input.objective, mainGoal: 'hacked' } })],
    ['running volume', (input: typeof validPlanGenerationInput) => ({ ...input, currentLevel: { ...input.currentLevel, currentRunningVolumeKm: Number.POSITIVE_INFINITY } })],
    ['day', (input: typeof validPlanGenerationInput) => ({ ...input, availability: { ...input.availability, availableDays: ['Funday'] } })],
    ['time', (input: typeof validPlanGenerationInput) => ({ ...input, availability: { ...input.availability, preferredTrainingTime: 'later' } })],
    ['equipment', (input: typeof validPlanGenerationInput) => ({ ...input, equipment: { ...input.equipment, raw: { ...input.equipment.raw, skiErg: 'yes' } } })],
    ['injury pain', (input: typeof validPlanGenerationInput) => ({ ...input, injuries: [{ ...input.injuries[0], pain_level_0_10: 99 }] })],
    ['readiness', (input: typeof validPlanGenerationInput) => ({ ...input, dailyReadiness: { ...input.dailyReadiness!, stress1To5: 99 } })],
    ['workout status', (input: typeof validPlanGenerationInput) => ({ ...input, recentWorkoutLogs: [{ ...input.recentWorkoutLogs[0], status: 'hacked' }] })],
  ] as const)('rejects semantically invalid server input: %s', (_label, mutate) => {
    expect(validatePlanGenerationInput(mutate(validPlanGenerationInput) as never)).toBe(false);
  });
});
