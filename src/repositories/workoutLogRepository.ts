import type { WorkoutLog } from '../types/athlete';
import { readFromLocalStorage, writeToLocalStorage } from '../utils/persistence';
import { guestStorageContext, storageKey, workoutLogStorageId, workoutLogsStorageResource, type StorageContext } from './storageKeys';

function readWorkoutLogRecord(context: StorageContext): Record<string, WorkoutLog> {
  const stored = readFromLocalStorage<Record<string, WorkoutLog> | WorkoutLog[]>(storageKey(context, workoutLogsStorageResource), {});
  if (Array.isArray(stored)) {
    return Object.fromEntries(stored.map((log) => [workoutLogStorageId(log.weekId, log.dayId, log.date), log]));
  }
  return stored;
}

export async function getWorkoutLogs(context: StorageContext = guestStorageContext): Promise<WorkoutLog[]> {
  return Object.values(readWorkoutLogRecord(context));
}

export async function saveWorkoutLog(log: WorkoutLog, context: StorageContext = guestStorageContext): Promise<void> {
  const current = readWorkoutLogRecord(context);
  writeToLocalStorage(storageKey(context, workoutLogsStorageResource), {
    ...current,
    [workoutLogStorageId(log.weekId, log.dayId, log.date)]: log,
  });
}
