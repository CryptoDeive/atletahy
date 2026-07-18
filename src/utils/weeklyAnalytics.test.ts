import { describe, expect, it } from 'vitest';
import type { DailyReadiness, WorkoutLog } from '../types/athlete';
import type { TrainingDay } from '../types/training';
import {
  calculateAverageSessionRpe,
  calculateWeeklyCompletion,
  calculateWeeklyLoad,
  getLogForTrainingDay,
  getWeeklyReadinessWarning,
} from './weeklyAnalytics';

function day(id: string, dayNumber: number): TrainingDay {
  return {
    id,
    dateLabel: `Día ${dayNumber}`,
    weekday: `Día ${dayNumber}`,
    dayNumber,
    title: `Entreno ${dayNumber}`,
    summary: '',
    phase: 'PRETEMPORADA',
    block: 'Test',
    weekNumber: 6,
    isCompleted: false,
    sections: [],
  };
}

function log(overrides: Partial<WorkoutLog>): WorkoutLog {
  return {
    id: `${overrides.weekId ?? 'week-6'}-${overrides.dayId ?? 'day-1'}-${overrides.date ?? '2026-07-06'}`,
    date: overrides.date ?? '2026-07-06',
    weekId: overrides.weekId ?? 'week-6',
    dayId: overrides.dayId ?? 'day-1',
    status: overrides.status ?? 'completado',
    durationMinutes: overrides.durationMinutes ?? '',
    sessionRpe1To10: overrides.sessionRpe1To10 ?? '',
    averageHr: '',
    maxHr: '',
    completionPercent: overrides.completionPercent ?? '',
    notes: '',
    wentWell: '',
    wentWrong: '',
    startedAt: overrides.startedAt,
    finishedAt: overrides.finishedAt,
  };
}

function readiness(overrides: Partial<DailyReadiness>): DailyReadiness {
  return {
    date: '2026-07-09',
    sleepHours: 8,
    sleepQuality1To5: 4,
    stress1To5: 2,
    fatigue1To5: 2,
    muscleSoreness1To5: 1,
    legSoreness1To5: 1,
    upperSoreness1To5: 1,
    motivation1To5: 4,
    hydration1To5: 4,
    pain0To10: 0,
    painLocation: '',
    notes: '',
    ...overrides,
  };
}

describe('weeklyAnalytics', () => {
  it('counts completed, partial, skipped, adapted, active and pending days correctly', () => {
    const days = [day('day-1', 1), day('day-2', 2), day('day-3', 3), day('day-4', 4), day('day-5', 5), day('day-6', 6), day('day-7', 7)];
    const logs = [
      log({ dayId: 'day-1', date: '2026-07-06', status: 'completado' }),
      log({ dayId: 'day-2', date: '2026-07-07', status: 'parcial' }),
      log({ dayId: 'day-3', date: '2026-07-08', status: 'saltado' }),
      log({ dayId: 'day-4', date: '2026-07-09', status: 'adaptado' }),
    ];

    expect(calculateWeeklyCompletion(days, logs, { weekId: 'week-6', activeDayId: 'day-5', getDateForDay: (_trainingDay, index) => `2026-07-${String(index + 6).padStart(2, '0')}` })).toMatchObject({
      completed: 1,
      partial: 1,
      skipped: 1,
      adapted: 1,
      active: 1,
      pending: 2,
      totalDays: 7,
    });
  });

  it('calculates weekly load as duration multiplied by RPE and ignores incomplete logs', () => {
    expect(calculateWeeklyLoad([
      log({ durationMinutes: 60, sessionRpe1To10: 8 }),
      log({ durationMinutes: 30, sessionRpe1To10: 5 }),
      log({ durationMinutes: '', sessionRpe1To10: 7 }),
      log({ durationMinutes: 45, sessionRpe1To10: '' }),
    ])).toBe(630);
  });

  it('calculates average session RPE and ignores empty values', () => {
    expect(calculateAverageSessionRpe([
      log({ sessionRpe1To10: 8 }),
      log({ sessionRpe1To10: '' }),
      log({ sessionRpe1To10: 6 }),
    ])).toBe(7);
  });

  it('returns red warning when pain is at least 7', () => {
    expect(getWeeklyReadinessWarning(readiness({ pain0To10: 7 }), [])).toBe('red');
  });

  it('returns yellow warning when stress is at least 4', () => {
    expect(getWeeklyReadinessWarning(readiness({ stress1To5: 4 }), [])).toBe('yellow');
  });

  it('returns green warning under normal readiness and load', () => {
    expect(getWeeklyReadinessWarning(readiness({ pain0To10: 1, stress1To5: 2, fatigue1To5: 2 }), [log({ durationMinutes: 40, sessionRpe1To10: 5 })])).toBe('green');
  });

  it('finds the matching log by week, day and date and uses the most recent duplicate', () => {
    const older = log({ id: 'older', dayId: 'day-2', date: '2026-07-07', status: 'parcial', finishedAt: '2026-07-07T10:00:00.000Z' });
    const newer = log({ id: 'newer', dayId: 'day-2', date: '2026-07-07', status: 'completado', finishedAt: '2026-07-07T11:00:00.000Z' });

    expect(getLogForTrainingDay([older, newer], 'week-6', 'day-2', '2026-07-07')).toEqual(newer);
  });
});