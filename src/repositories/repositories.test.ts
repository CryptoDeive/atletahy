import { afterEach, describe, expect, it } from 'vitest';
import {
  defaultAthleteProfile,
  defaultEquipmentAvailability,
  defaultNutritionPreferences,
  defaultPhysiologyMetrics,
  defaultTrainingAvailability,
} from '../data/defaultAthleteState';
import type { AthleteState, DailyReadiness, WorkoutLog } from '../types/athlete';
import type { CoachAdvice } from '../types/coach';
import { getAthleteState, saveAthleteState } from './athleteRepository';
import { getCoachAdvice, saveCoachAdvice } from './coachAdviceRepository';
import { getDailyReadiness, saveDailyReadiness } from './readinessRepository';
import { getWorkoutLogs, saveWorkoutLog } from './workoutLogRepository';
import { storageContextForUser } from './storageKeys';

describe('local repositories', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('saves and gets athlete state through existing localStorage keys', async () => {
    const athleteState: AthleteState = {
      profile: { ...defaultAthleteProfile, name: 'Deivi', weightKg: 78, targetDate: '2026-11-22' },
      physiology: { ...defaultPhysiologyMetrics, restingHrBaseline: 48 },
      availability: { ...defaultTrainingAvailability, availableDays: ['Lunes', 'Miércoles'] },
      equipment: { ...defaultEquipmentAvailability, skiErg: true, sled: true },
      injuries: [{ id: 'injury-1', body_area: 'rodilla', side: 'derecha', pain_level_0_10: 2, status: 'improving', movement_restrictions: '', notes: '' }],
      nutrition: { ...defaultNutritionPreferences, dietType: 'omnivora' },
    };

    await saveAthleteState(athleteState);

    await expect(getAthleteState()).resolves.toEqual(athleteState);
    expect(JSON.parse(window.localStorage.getItem('atletahy:guest:athlete-profile') ?? '{}')).toMatchObject({ name: 'Deivi' });
  });

  it('saves workout logs as a keyed localStorage record and returns a list', async () => {
    const log: WorkoutLog = {
      id: 'week-6-day-2-2026-07-08',
      date: '2026-07-08',
      weekId: 'week-6',
      dayId: 'day-2',
      status: 'completado',
      durationMinutes: 62,
      sessionRpe1To10: 8,
      averageHr: 148,
      maxHr: 171,
      completionPercent: 95,
      notes: 'Bien',
      wentWell: 'Ritmo estable',
      wentWrong: '',
    };

    await saveWorkoutLog(log);

    await expect(getWorkoutLogs()).resolves.toEqual([log]);
    expect(JSON.parse(window.localStorage.getItem('atletahy:guest:workout-logs') ?? '{}')).toEqual({ 'week-6:day-2:2026-07-08': log });
  });

  it('replaces workout logs with the same week, day, and date while keeping different dates', async () => {
    const baseLog: WorkoutLog = {
      id: 'week-6-day-2-2026-07-08',
      date: '2026-07-08',
      weekId: 'week-6',
      dayId: 'day-2',
      status: 'completado',
      durationMinutes: 62,
      sessionRpe1To10: 8,
      averageHr: 148,
      maxHr: 171,
      completionPercent: 95,
      notes: 'Primer registro',
      wentWell: 'Ritmo estable',
      wentWrong: '',
    };
    const replacementLog: WorkoutLog = {
      ...baseLog,
      id: 'different-client-id-same-logical-key',
      status: 'adaptado',
      notes: 'Registro actualizado',
    };
    const otherDateLog: WorkoutLog = {
      ...baseLog,
      id: 'week-6-day-2-2026-07-09',
      date: '2026-07-09',
      status: 'parcial',
    };

    await saveWorkoutLog(baseLog);
    await saveWorkoutLog(replacementLog);
    await saveWorkoutLog(otherDateLog);

    const stored = JSON.parse(window.localStorage.getItem('atletahy:guest:workout-logs') ?? '{}');
    expect(Object.keys(stored)).toEqual(['week-6:day-2:2026-07-08', 'week-6:day-2:2026-07-09']);
    expect(stored['week-6:day-2:2026-07-08']).toMatchObject({ status: 'adaptado', notes: 'Registro actualizado' });
    expect(stored['week-6:day-2:2026-07-09']).toMatchObject({ status: 'parcial' });
    await expect(getWorkoutLogs()).resolves.toHaveLength(2);
  });

  it('keeps guest and authenticated local repository values isolated', async () => {
    const userA = storageContextForUser('user-a');
    const userB = storageContextForUser('user-b');
    await saveAthleteState({
      profile: { ...defaultAthleteProfile, name: 'Guest' }, physiology: defaultPhysiologyMetrics,
      availability: defaultTrainingAvailability, equipment: defaultEquipmentAvailability,
      injuries: [], nutrition: defaultNutritionPreferences,
    });
    await saveAthleteState({
      profile: { ...defaultAthleteProfile, name: 'A' }, physiology: defaultPhysiologyMetrics,
      availability: defaultTrainingAvailability, equipment: defaultEquipmentAvailability,
      injuries: [], nutrition: defaultNutritionPreferences,
    }, userA);

    await expect(getAthleteState()).resolves.toMatchObject({ profile: { name: 'Guest' } });
    await expect(getAthleteState(userA)).resolves.toMatchObject({ profile: { name: 'A' } });
    await expect(getAthleteState(userB)).resolves.toMatchObject({ profile: { name: '' } });
  });

  it('saves and gets readiness by date', async () => {
    const readiness: DailyReadiness = {
      date: '2026-07-08',
      sleepHours: 7.5,
      sleepQuality1To5: 4,
      stress1To5: 2,
      fatigue1To5: 2,
      muscleSoreness1To5: 2,
      legSoreness1To5: 3,
      upperSoreness1To5: 1,
      motivation1To5: 5,
      hydration1To5: 4,
      pain0To10: 0,
      painLocation: '',
      notes: 'Listo',
    };

    await saveDailyReadiness(readiness);

    await expect(getDailyReadiness('2026-07-08')).resolves.toEqual(readiness);
    await expect(getDailyReadiness('2026-07-09')).resolves.toBeNull();
  });

  it('saves and gets coach advice by key', async () => {
    const advice: CoachAdvice = {
      readinessStatus: 'green',
      summary: 'Estado verde.',
      objective: 'Completar el estímulo.',
      strategy: ['Mantener control'],
      pacing: ['Progresivo'],
      techniqueFocus: ['Respirar'],
      warmupAdjustments: ['Movilidad'],
      riskWarnings: [],
      modifications: [],
      nutrition: {
        preWorkout: ['Carbohidrato fácil'],
        intraWorkout: ['Agua'],
        postWorkout: ['Proteína'],
        hydration: ['Sales si hace calor'],
      },
      scheduling: {
        bestTimeWindow: 'any',
        reason: 'Sin preferencia',
        doubleSessionRecommended: false,
      },
      checklist: ['Registrar RPE'],
    };

    await saveCoachAdvice('week-6:day-2:2026-07-08', advice);

    await expect(getCoachAdvice('week-6:day-2:2026-07-08')).resolves.toEqual(advice);
    await expect(getCoachAdvice('missing')).resolves.toBeNull();
  });
});
