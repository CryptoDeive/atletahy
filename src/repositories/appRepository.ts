import { isSupabaseConfigured } from '../lib/supabaseClient';
import type { AthleteState, DailyReadiness, WorkoutLog } from '../types/athlete';
import type { CoachAdvice } from '../types/coach';
import type { GeneratedTrainingPlan, StoredTrainingPlan } from '../types/plan';
import type { PlanGenerationInput } from '../utils/planInput';
import type { TrainingTestId, TrainingTestResult } from '../types/tests';
import { readFromLocalStorage } from '../utils/persistence';
import { getAthleteState as getLocalAthleteState, saveAthleteState as saveLocalAthleteState } from './athleteRepository';
import { getCoachAdvice as getLocalCoachAdvice, saveCoachAdvice as saveLocalCoachAdvice } from './coachAdviceRepository';
import { getDailyReadiness as getLocalDailyReadiness, saveDailyReadiness as saveLocalDailyReadiness } from './readinessRepository';
import { coachAdviceStorageResource, importLegacyAndGuestData, readinessStorageResource, storageContextFor, storageContextForUser, storageKey } from './storageKeys';
import { getAthleteStateFromSupabase, saveAthleteStateToSupabase } from './supabase/supabaseAthleteRepository';
import { getCoachAdviceFromSupabase, saveCoachAdviceFeedbackToSupabase, saveCoachAdviceToSupabase, type SaveCoachAdviceMetadata } from './supabase/supabaseCoachAdviceRepository';
import { getDailyReadinessFromSupabase, saveDailyReadinessToSupabase } from './supabase/supabaseReadinessRepository';
import { getActiveTrainingPlanFromSupabase, getTrainingPlansFromSupabase, saveTrainingPlanToSupabase, setActiveTrainingPlanInSupabase } from './supabase/supabaseTrainingPlanRepository';
import { getWorkoutLogsFromSupabase, saveWorkoutLogToSupabase } from './supabase/supabaseWorkoutLogRepository';
import { getWorkoutLogs as getLocalWorkoutLogs, saveWorkoutLog as saveLocalWorkoutLog } from './workoutLogRepository';
import { getActiveTrainingPlan as getLocalActiveTrainingPlan, getTrainingPlans as getLocalTrainingPlans, saveTrainingPlan as saveLocalTrainingPlan, setActiveTrainingPlan as setLocalActiveTrainingPlan } from './trainingPlanRepository';
import { deleteTrainingTestResult as deleteLocalTrainingTestResult, getLatestTrainingTestResult as getLatestLocalTrainingTestResult, getTrainingTestResults as getLocalTrainingTestResults, getTrainingTestResultsByTestId as getLocalTrainingTestResultsByTestId, saveTrainingTestResult as saveLocalTrainingTestResult } from './trainingTestRepository';
import { deleteTrainingTestResultFromSupabase, getTrainingTestResultsFromSupabase, saveTrainingTestResultToSupabase } from './supabase/supabaseTrainingTestRepository';
import { readRemote, unwrapRemote } from './remoteResult';

function shouldUseSupabase(userId?: string | null) {
  return Boolean(isSupabaseConfigured && userId);
}

export async function getAthleteState(userId?: string | null): Promise<AthleteState | null> {
  if (shouldUseSupabase(userId)) {
    const result = await readRemote(() => getAthleteStateFromSupabase(userId as string), (value) => value !== null);
    return unwrapRemote(result, null);
  }

  return getLocalAthleteState(storageContextFor(userId));
}

export async function saveAthleteState(userId: string | null | undefined, state: AthleteState): Promise<void> {
  if (shouldUseSupabase(userId)) {
    await saveAthleteStateToSupabase(userId as string, state);
    return;
  }

  await saveLocalAthleteState(state, storageContextFor(userId));
}

export async function getWorkoutLogs(userId?: string | null): Promise<WorkoutLog[]> {
  if (shouldUseSupabase(userId)) {
    const result = await readRemote(() => getWorkoutLogsFromSupabase(userId as string), (value) => value.length > 0);
    return unwrapRemote(result, []);
  }

  return getLocalWorkoutLogs(storageContextFor(userId));
}

export async function saveWorkoutLog(userId: string | null | undefined, log: WorkoutLog): Promise<void> {
  if (shouldUseSupabase(userId)) {
    await saveWorkoutLogToSupabase(userId as string, log);
    return;
  }

  await saveLocalWorkoutLog(log, storageContextFor(userId));
}

export async function getDailyReadiness(userId: string | null | undefined, date: string): Promise<DailyReadiness | null> {
  if (shouldUseSupabase(userId)) {
    const result = await readRemote(() => getDailyReadinessFromSupabase(userId as string, date), (value) => value !== null);
    return unwrapRemote(result, null);
  }

  return getLocalDailyReadiness(date, storageContextFor(userId));
}

export async function saveDailyReadiness(userId: string | null | undefined, readiness: DailyReadiness): Promise<void> {
  if (shouldUseSupabase(userId)) {
    await saveDailyReadinessToSupabase(userId as string, readiness);
    return;
  }

  await saveLocalDailyReadiness(readiness, storageContextFor(userId));
}

export async function getCoachAdvice(userId: string | null | undefined, key: string): Promise<CoachAdvice | null> {
  if (shouldUseSupabase(userId)) {
    const result = await readRemote(() => getCoachAdviceFromSupabase(userId as string, key), (value) => value !== null);
    return unwrapRemote(result, null);
  }

  return getLocalCoachAdvice(key, storageContextFor(userId));
}

export async function saveCoachAdvice(userId: string | null | undefined, key: string, advice: CoachAdvice, metadata: SaveCoachAdviceMetadata = {}): Promise<void> {
  if (shouldUseSupabase(userId)) {
    await saveCoachAdviceToSupabase(userId as string, key, advice, metadata);
    return;
  }

  await saveLocalCoachAdvice(key, advice, storageContextFor(userId));
}

export async function saveCoachAdviceFeedback(userId: string | null | undefined, key: string, wasUseful: boolean, userFeedback: string): Promise<boolean> {
  if (!key || !shouldUseSupabase(userId)) {
    return false;
  }

  await saveCoachAdviceFeedbackToSupabase(userId as string, key, wasUseful, userFeedback);
  return true;
}


export async function getTrainingPlans(userId?: string | null): Promise<StoredTrainingPlan[]> {
  if (shouldUseSupabase(userId)) {
    const result = await readRemote(() => getTrainingPlansFromSupabase(userId as string), (value) => value.length > 0);
    return unwrapRemote(result, []);
  }

  return getLocalTrainingPlans(storageContextFor(userId));
}

export async function getActiveTrainingPlan(userId?: string | null): Promise<StoredTrainingPlan | null> {
  if (shouldUseSupabase(userId)) {
    const result = await readRemote(() => getActiveTrainingPlanFromSupabase(userId as string), (value) => value !== null);
    return unwrapRemote(result, null);
  }

  return getLocalActiveTrainingPlan(storageContextFor(userId));
}

export async function saveTrainingPlan(userId: string | null | undefined, plan: GeneratedTrainingPlan, inputSnapshot: PlanGenerationInput): Promise<StoredTrainingPlan> {
  if (shouldUseSupabase(userId)) {
    return saveTrainingPlanToSupabase(userId as string, plan, inputSnapshot);
  }

  return saveLocalTrainingPlan(plan, inputSnapshot, userId, storageContextFor(userId));
}

export async function setActiveTrainingPlan(userId: string | null | undefined, id: string): Promise<void> {
  if (shouldUseSupabase(userId)) {
    await setActiveTrainingPlanInSupabase(userId as string, id);
    return;
  }

  await setLocalActiveTrainingPlan(id, storageContextFor(userId));
}

export async function getTrainingTestResults(userId?: string | null): Promise<TrainingTestResult[]> {
  if (!shouldUseSupabase(userId)) return getLocalTrainingTestResults(storageContextFor(userId));
  const result = await readRemote(() => getTrainingTestResultsFromSupabase(userId as string), (value) => value.length > 0);
  return unwrapRemote(result, []);
}

export async function getTrainingTestResultsByTestId(userId: string | null | undefined, testId: TrainingTestId): Promise<TrainingTestResult[]> {
  if (!shouldUseSupabase(userId)) return getLocalTrainingTestResultsByTestId(testId, storageContextFor(userId));
  const result = await readRemote(() => getTrainingTestResultsFromSupabase(userId as string, testId), (value) => value.length > 0);
  return unwrapRemote(result, []);
}

export async function getLatestTrainingTestResult(userId: string | null | undefined, testId: TrainingTestId): Promise<TrainingTestResult | null> {
  if (shouldUseSupabase(userId)) return (await getTrainingTestResultsByTestId(userId, testId))[0] ?? null;
  return getLatestLocalTrainingTestResult(testId, storageContextFor(userId));
}

export async function saveTrainingTestResult(userId: string | null | undefined, result: TrainingTestResult): Promise<TrainingTestResult> {
  return shouldUseSupabase(userId) ? saveTrainingTestResultToSupabase(userId as string, result) : saveLocalTrainingTestResult(result, storageContextFor(userId));
}

export async function deleteTrainingTestResult(userId: string | null | undefined, id: string): Promise<void> {
  if (shouldUseSupabase(userId)) return deleteTrainingTestResultFromSupabase(userId as string, id);
  return deleteLocalTrainingTestResult(id, storageContextFor(userId));
}

export async function syncLocalDataToSupabase(userId: string): Promise<void> {
  if (!shouldUseSupabase(userId)) {
    throw new Error('Supabase no está configurado o no hay sesión activa.');
  }

  importLegacyAndGuestData(userId);
  const context = storageContextForUser(userId);
  const [athleteState, workoutLogs, trainingPlans] = await Promise.all([
    getLocalAthleteState(context),
    getLocalWorkoutLogs(context),
    getLocalTrainingPlans(context),
  ]);
  await saveAthleteStateToSupabase(userId, athleteState);

  await Promise.all(workoutLogs.map((log) => saveWorkoutLogToSupabase(userId, log)));
  await Promise.all(trainingPlans.map((storedPlan) => saveTrainingPlanToSupabase(userId, storedPlan.planJson, storedPlan.inputSnapshotJson as PlanGenerationInput)));

  const readinessByDate = readFromLocalStorage<Record<string, DailyReadiness>>(storageKey(context, readinessStorageResource), {});
  await Promise.all(Object.values(readinessByDate).map((readiness) => saveDailyReadinessToSupabase(userId, readiness)));

  const coachAdviceByKey = readFromLocalStorage<Record<string, CoachAdvice>>(storageKey(context, coachAdviceStorageResource), {});
  await Promise.all(Object.entries(coachAdviceByKey).map(([key, advice]) => saveCoachAdviceToSupabase(userId, key, advice)));
}
