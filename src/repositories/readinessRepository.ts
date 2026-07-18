import { validateDailyReadiness } from '../domain/fields/schemas';
import type { DailyReadiness } from '../types/athlete';
import { readFromLocalStorage, writeToLocalStorage } from '../utils/persistence';
import { guestStorageContext, readinessStorageResource, storageKey, type StorageContext } from './storageKeys';

function readReadinessRecord(context: StorageContext): Record<string, DailyReadiness> {
  return readFromLocalStorage<Record<string, DailyReadiness>>(storageKey(context, readinessStorageResource), {});
}

export async function getDailyReadiness(date: string, context: StorageContext = guestStorageContext): Promise<DailyReadiness | null> {
  const value = readReadinessRecord(context)[date];
  return value ?? null;
}

export async function saveDailyReadiness(readiness: DailyReadiness, context: StorageContext = guestStorageContext): Promise<void> {
  const validation = validateDailyReadiness(readiness); if (!validation.ok) throw new Error(validation.issues[0]?.message ?? 'Check-in no válido.');
  readiness = validation.value;
  writeToLocalStorage(storageKey(context, readinessStorageResource), {
    ...readReadinessRecord(context),
    [readiness.date]: readiness,
  });
}
