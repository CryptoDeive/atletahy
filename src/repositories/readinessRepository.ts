import type { DailyReadiness } from '../types/athlete';
import { readFromLocalStorage, writeToLocalStorage } from '../utils/persistence';
import { guestStorageContext, readinessStorageResource, storageKey, type StorageContext } from './storageKeys';

function readReadinessRecord(context: StorageContext): Record<string, DailyReadiness> {
  return readFromLocalStorage<Record<string, DailyReadiness>>(storageKey(context, readinessStorageResource), {});
}

export async function getDailyReadiness(date: string, context: StorageContext = guestStorageContext): Promise<DailyReadiness | null> {
  return readReadinessRecord(context)[date] ?? null;
}

export async function saveDailyReadiness(readiness: DailyReadiness, context: StorageContext = guestStorageContext): Promise<void> {
  writeToLocalStorage(storageKey(context, readinessStorageResource), {
    ...readReadinessRecord(context),
    [readiness.date]: readiness,
  });
}
