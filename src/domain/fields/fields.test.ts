import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HYROX_CATEGORIES, HEIGHT_OPTIONS, WEIGHT_OPTIONS } from './options';
import { parseBoundedNumber } from './numbers';
import { parseDuration, parsePace } from './durations';
import { validateAdultBirthDate, validateNotFutureDate } from './dates';
import { validateAthleteState, validateWorkoutLog, validateTrainingTestResult } from './schemas';
import { normalizeHyroxCategory } from './legacy';
import { defaultAthleteProfile, defaultEquipmentAvailability, defaultNutritionPreferences, defaultPhysiologyMetrics, defaultTrainingAvailability } from '../../data/defaultAthleteState';
import { isPaceString } from '../../../supabase/functions/_shared/inputDomains';

describe('field contracts', () => {
  it('publishes stable official HYROX keys and bounded height/weight options', () => {
    expect(HYROX_CATEGORIES.map((item) => item.value)).toEqual([
      'women_open', 'men_open', 'women_pro', 'men_pro', 'doubles_women', 'doubles_men',
      'doubles_mixed', 'doubles_women_pro', 'doubles_men_pro', 'relay_women', 'relay_men', 'relay_mixed',
    ]);
    expect([HEIGHT_OPTIONS[0].value, HEIGHT_OPTIONS.at(-1)?.value]).toEqual([120, 230]);
    expect([WEIGHT_OPTIONS[0].value, WEIGHT_OPTIONS.at(-1)?.value]).toEqual([35, 250]);
  });

  it('accepts comma decimals and exact bounds but rejects non-finite, off-step and out-of-range values', () => {
    expect(parseBoundedNumber('72,5', { min: 35, max: 250, step: 0.5 })).toEqual({ ok: true, value: 72.5 });
    expect(parseBoundedNumber('250', { min: 35, max: 250, step: 0.5 }).ok).toBe(true);
    expect(parseBoundedNumber('72.2', { min: 35, max: 250, step: 0.5 }).ok).toBe(false);
    expect(parseBoundedNumber('Infinity', { min: 0, max: 10 }).ok).toBe(false);
    expect(parseBoundedNumber('251', { min: 35, max: 250 }).ok).toBe(false);
  });

  it('parses strict durations and paces without truncation', () => {
    expect(parseDuration('01:30:00', { minSeconds: 1800, maxSeconds: 21600 })).toEqual({ ok: true, value: 5400 });
    expect(parseDuration('1:70:00', { minSeconds: 0, maxSeconds: 21600 }).ok).toBe(false);
    expect(parsePace('04:30')).toEqual({ ok: true, value: '04:30' });
    expect(parsePace('1:2').ok).toBe(false);
    expect(isPaceString('02:00')).toBe(true);
    expect(isPaceString('15:01')).toBe(false);
  });

  it('enforces adulthood and non-future dates', () => {
    expect(validateAdultBirthDate('2010-01-01', new Date('2026-07-18T12:00:00Z')).ok).toBe(false);
    expect(validateAdultBirthDate('2000-07-18', new Date('2026-07-18T12:00:00Z')).ok).toBe(true);
    expect(validateNotFutureDate('2026-07-19', new Date('2026-07-18T12:00:00Z')).ok).toBe(false);
  });
});

describe('aggregate schemas', () => {
  const validState = {
    profile: { ...defaultAthleteProfile, name: 'Ana', birthDate: '1990-01-01', heightCm: 170, weightKg: 65, sex: 'female', hyroxCategory: 'women_open', targetDate: '2027-01-01', mainGoal: 'terminar' as const },
    physiology: { ...defaultPhysiologyMetrics, currentRunningVolumeKm: 30, currentLongRunKm: 12 },
    availability: { ...defaultTrainingAvailability, availableDays: ['Lunes'], maxSessionMinutes: 60, minHoursBetweenSessions: 8 },
    equipment: defaultEquipmentAvailability,
    injuries: [],
    nutrition: defaultNutritionPreferences,
  };

  it('rejects incoherent athlete and workout aggregates', () => {
    expect(validateAthleteState({ ...validState, physiology: { ...validState.physiology, currentLongRunKm: 31 } }).ok).toBe(false);
    expect(validateWorkoutLog({ id: 'x', date: '2026-07-18', weekId: 'w', dayId: 'd', status: 'completado', durationMinutes: 60, sessionRpe1To10: 5, averageHr: 181, maxHr: 180, completionPercent: 100, notes: '', wentWell: '', wentWrong: '' }).ok).toBe(false);
  });

  it('rejects manipulated training-test values', () => {
    expect(validateTrainingTestResult('erg-power', '2026-07-18', { protocolSeconds: 60, maxWatts: 3001, averageWatts: 400, ergometer: 'SkiErg' }).ok).toBe(false);
    expect(validateTrainingTestResult('erg-power', '2026-07-18', { protocolSeconds: 60, maxWatts: 800, averageWatts: 900, ergometer: 'SkiErg' }).ok).toBe(false);
  });

  it.each([
    ['main goal', (state: typeof validState) => ({ ...state, profile: { ...state.profile, mainGoal: 'MANIPULATED' } })],
    ['sex', (state: typeof validState) => ({ ...state, profile: { ...state.profile, sex: 'bogus' } })],
    ['HYROX experience', (state: typeof validState) => ({ ...state, physiology: { ...state.physiology, hyroxExperience: 'elite-ish' } })],
    ['strength experience', (state: typeof validState) => ({ ...state, physiology: { ...state.physiology, strengthExperience: 'enorme' } })],
    ['pace', (state: typeof validState) => ({ ...state, physiology: { ...state.physiology, fiveKPace: 'rapidito' } })],
    ['available day', (state: typeof validState) => ({ ...state, availability: { ...state.availability, availableDays: ['Funday'] } })],
    ['training time', (state: typeof validState) => ({ ...state, availability: { ...state.availability, preferredTrainingTime: 'whenever' } })],
    ['equipment boolean', (state: typeof validState) => ({ ...state, equipment: { ...state.equipment, skiErg: 'yes' } })],
    ['diet', (state: typeof validState) => ({ ...state, nutrition: { ...state.nutrition, dietType: 'air-only' } })],
    ['injury status', (state: typeof validState) => ({ ...state, injuries: [{ id: 'i', body_area: 'Rodilla', side: 'left', pain_level_0_10: 2, status: 'unknown', movement_restrictions: '', notes: '' }] })],
  ] as const)('rejects a manipulated %s catalog value', (_label, mutate) => {
    expect(validateAthleteState(mutate(validState) as never).ok).toBe(false);
  });

  it('rejects manipulated workout identity, status, chronology and calories', () => {
    const validWorkout = { id: 'x', date: '2026-07-18', weekId: 'w', dayId: 'd', status: 'completado', durationMinutes: 60, sessionRpe1To10: 5, averageHr: 160, maxHr: 180, calories: 500, completionPercent: 100, notes: '', wentWell: '', wentWrong: '' } as const;
    expect(validateWorkoutLog({ ...validWorkout, id: '' }).ok).toBe(false);
    expect(validateWorkoutLog({ ...validWorkout, status: 'hacked' } as never).ok).toBe(false);
    expect(validateWorkoutLog({ ...validWorkout, calories: Number.POSITIVE_INFINITY }).ok).toBe(false);
    expect(validateWorkoutLog({ ...validWorkout, startedAt: '2026-07-18T12:00:00Z', finishedAt: '2026-07-18T11:00:00Z' }).ok).toBe(false);
  });

  it('validates required fields and exact protocol for each training test', () => {
    expect(validateTrainingTestResult('unknown' as never, '2026-07-18', {}).ok).toBe(false);
    expect(validateTrainingTestResult('erg-power', '2026-07-18', {}).ok).toBe(false);
    expect(validateTrainingTestResult('erg-power', '2026-07-18', { ergometer: 'Treadmill', protocolSeconds: 60, maxWatts: 800, averageWatts: 700 }).ok).toBe(false);
    expect(validateTrainingTestResult('ski-2k', '2026-07-18', { totalTime: '07:40', damper: 6, injected: true }).ok).toBe(false);
  });

  it('treats Jim Vance averagePace as a strict 02:00-15:00 pace', () => {
    const base = { blockMinutes: 30, distanceMeters: 6000, last20AverageHr: 170 };
    expect(validateTrainingTestResult('jim-vance-30', '2026-07-18', { ...base, averagePace: '02:00' }).ok).toBe(true);
    expect(validateTrainingTestResult('jim-vance-30', '2026-07-18', { ...base, averagePace: '15:00' }).ok).toBe(true);
    expect(validateTrainingTestResult('jim-vance-30', '2026-07-18', { ...base, averagePace: '01:59' }).ok).toBe(false);
    expect(validateTrainingTestResult('jim-vance-30', '2026-07-18', { ...base, averagePace: '15:01' }).ok).toBe(false);
    expect(validateTrainingTestResult('jim-vance-30', '2026-07-18', { ...base, averagePace: '00:14:30' }).ok).toBe(false);
  });

  it('returns canonically trimmed narratives instead of persisting surrounding whitespace', () => {
    const result = validateAthleteState({ ...validState, profile: { ...validState.profile, name: '  Ana  ' }, availability: { ...validState.availability, scheduleNotes: '  tardes  ' } });
    expect(result.ok && result.value.profile.name).toBe('Ana');
    expect(result.ok && result.value.availability.scheduleNotes).toBe('tardes');
  });

  it('preserves ambiguous HYROX legacy values as explicit correction-required data', () => {
    expect(normalizeHyroxCategory('Open')).toEqual(expect.objectContaining({ value: 'Open', ambiguous: true }));
  });

  it('keeps every exported validation message as clean UTF-8 human text', () => {
    const source = readFileSync('src/domain/fields/schemas.ts', 'utf8');
    const messages = [...source.matchAll(/message:\s*(?:'([^']*)'|`([^`]*)`)/g)].map((match) => match[1] ?? match[2]);

    expect(messages.length).toBeGreaterThanOrEqual(25);
    for (const message of messages) {
      expect(message).not.toMatch(/[\u00c3\u00c2\ufffd]/);
      expect(message).not.toContain('?');
    }
  });
});
