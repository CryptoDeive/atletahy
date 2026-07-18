import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultAthleteProfile } from '../data/defaultAthleteState';
import type { WorkoutLog } from '../types/athlete';
import { validGeneratedTrainingPlan, validPlanGenerationInput } from '../test/planTestUtils';

const supabaseSaveWorkoutLog = vi.fn();
const supabaseGetWorkoutLogs = vi.fn();
const supabaseSaveAthleteState = vi.fn();
const supabaseGetAthleteState = vi.fn();
const supabaseSaveTrainingTestResult = vi.fn();
const supabaseGetTrainingTestResults = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}));

vi.mock('./supabase/supabaseWorkoutLogRepository', () => ({
  getWorkoutLogsFromSupabase: supabaseGetWorkoutLogs,
  saveWorkoutLogToSupabase: supabaseSaveWorkoutLog,
}));

vi.mock('./supabase/supabaseAthleteRepository', () => ({
  getAthleteStateFromSupabase: supabaseGetAthleteState,
  saveAthleteStateToSupabase: supabaseSaveAthleteState,
}));

vi.mock('./supabase/supabaseTrainingTestRepository', () => ({
  getTrainingTestResultsFromSupabase: supabaseGetTrainingTestResults,
  saveTrainingTestResultToSupabase: supabaseSaveTrainingTestResult,
  deleteTrainingTestResultFromSupabase: vi.fn(),
}));

describe('appRepository', () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.resetModules();
  });

  it('uses localStorage repositories when no userId is provided', async () => {
    const { saveAthleteState, getAthleteState } = await import('./appRepository');

    await saveAthleteState(undefined, {
      profile: { ...defaultAthleteProfile, name: 'Local Deivi' },
      physiology: { restingHrBaseline: '', restingHrToday: '', maxHr: '', lthr: '', rftp: '', z2PaceLow: '', z2PaceHigh: '', fiveKPace: '', tenKPace: '', hrvBaseline: '' },
      availability: { availableDays: [], preferredTrainingTime: '', maxSessionMinutes: '', canDoubleSession: false, minHoursBetweenSessions: '', scheduleNotes: '' },
      equipment: { skiErg: false, rowErg: false, bikeErg: false, assaultBike: false, sled: false, wallBall: false, sandbag: false, kettlebells: false, dumbbells: false, barbellAndPlates: false, treadmill: false, runningSpace: false, plyoBox: false },
      injuries: [],
      nutrition: { goal: 'rendimiento', dietType: '', allergies: '', intolerances: '', caffeineTolerance: '', fastedTrainingPreference: '', mealTiming: '', supplements: '', notes: '' },
    });

    await expect(getAthleteState(undefined)).resolves.toMatchObject({ profile: { name: 'Local Deivi' } });
    expect(JSON.parse(window.localStorage.getItem('atletahy:guest:athlete-profile') ?? '{}')).toMatchObject({ name: 'Local Deivi' });
  });



  it('saves and retrieves a training plan with local fallback', async () => {
    const { saveTrainingPlan, getActiveTrainingPlan, getTrainingPlans } = await import('./appRepository');

    const saved = await saveTrainingPlan(undefined, validGeneratedTrainingPlan, validPlanGenerationInput);

    await expect(getActiveTrainingPlan(undefined)).resolves.toMatchObject({ id: saved.id, title: validGeneratedTrainingPlan.title, status: 'active' });
    await expect(getTrainingPlans(undefined)).resolves.toHaveLength(1);
    expect(JSON.parse(window.localStorage.getItem('atletahy:guest:training-plans') ?? '{}')[saved.id]).toMatchObject({ title: validGeneratedTrainingPlan.title });
  });

  it('routes workout logs to Supabase when configured and userId exists', async () => {
    const log: WorkoutLog = {
      id: 'log-1',
      date: '2026-07-08',
      weekId: 'week-6',
      dayId: 'day-3',
      status: 'completado',
      durationMinutes: 55,
      sessionRpe1To10: 7,
      averageHr: '',
      maxHr: '',
      completionPercent: 100,
      notes: '',
      wentWell: 'constante',
      wentWrong: '',
    };
    const { saveWorkoutLog } = await import('./appRepository');

    await saveWorkoutLog('user-1', log);

    expect(supabaseSaveWorkoutLog).toHaveBeenCalledWith('user-1', log);
    expect(window.localStorage.getItem('atletahy:guest:workout-logs')).toBeNull();
  });

  it('does not expose guest workout logs when an authenticated remote account is empty', async () => {
    window.localStorage.setItem('atletahy:guest:workout-logs', JSON.stringify({
      guest: { id: 'guest', date: '2026-07-08', weekId: 'week-1', dayId: 'day-1' },
    }));
    supabaseGetWorkoutLogs.mockResolvedValue([]);
    const { getWorkoutLogs } = await import('./appRepository');

    await expect(getWorkoutLogs('user-a')).resolves.toEqual([]);
  });

  it('propagates remote read errors instead of falling back to guest data', async () => {
    window.localStorage.setItem('atletahy:guest:workout-logs', JSON.stringify({ guest: { id: 'guest' } }));
    supabaseGetWorkoutLogs.mockRejectedValue(new Error('network unavailable'));
    const { getWorkoutLogs } = await import('./appRepository');

    await expect(getWorkoutLogs('user-a')).rejects.toMatchObject({ name: 'RemoteReadError', kind: 'unknown' });
  });

  it('routes athlete state persistence to Supabase when configured and userId exists', async () => {
    const athleteState = {
      profile: { ...defaultAthleteProfile, name: 'Remote Deivi', targetDate: '2026-11-22', onboardingCompleted: true, onboardingCompletedAt: '2026-07-10T08:00:00.000Z' },
      physiology: { restingHrBaseline: '', restingHrToday: '', maxHr: '', lthr: '', rftp: '', z2PaceLow: '', z2PaceHigh: '', fiveKPace: '', tenKPace: '', hrvBaseline: '', currentRunningVolumeKm: 24, currentLongRunKm: 12, hyroxExperience: 'primera vez', strengthExperience: 'media' },
      availability: { availableDays: ['Lunes'], preferredTrainingTime: 'mañana', maxSessionMinutes: 75, canDoubleSession: false, minHoursBetweenSessions: '', scheduleNotes: '' },
      equipment: { skiErg: false, rowErg: false, bikeErg: false, assaultBike: false, sled: false, wallBall: false, sandbag: false, kettlebells: false, dumbbells: false, barbellAndPlates: false, treadmill: false, runningSpace: false, plyoBox: false },
      injuries: [],
      nutrition: { goal: 'rendimiento', dietType: '', allergies: '', intolerances: '', caffeineTolerance: '', fastedTrainingPreference: '', mealTiming: '', supplements: '', notes: '' },
    };
    const { saveAthleteState } = await import('./appRepository');

    await saveAthleteState('user-1', athleteState);

    expect(supabaseSaveAthleteState).toHaveBeenCalledWith('user-1', athleteState);
    expect(window.localStorage.getItem('atletahy:guest:athlete-profile')).toBeNull();
  });

  it('routes training test results to Supabase when a session exists', async () => {
    const result = {
      id: 'test-result-1', testId: 'vam' as const, performedAt: '2026-07-15T12:00:00.000Z',
      result: { distanceMeters: 3000 }, calculated: { vamKmh: 15 }, notes: '',
      createdAt: '2026-07-15T12:00:00.000Z', updatedAt: '2026-07-15T12:00:00.000Z',
    };
    supabaseSaveTrainingTestResult.mockResolvedValue(result);
    const { saveTrainingTestResult } = await import('./appRepository');
    await saveTrainingTestResult('user-1', result);
    expect(supabaseSaveTrainingTestResult).toHaveBeenCalledWith('user-1', result);
    expect(window.localStorage.getItem('atletahy:guest:training-test-results')).toBeNull();
  });
});
