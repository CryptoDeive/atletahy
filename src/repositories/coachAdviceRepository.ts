import type { CoachAdvice } from '../types/coach';
import { readFromLocalStorage, writeToLocalStorage } from '../utils/persistence';
import { coachAdviceStorageResource, guestStorageContext, storageKey, type StorageContext } from './storageKeys';

function readCoachAdviceRecord(context: StorageContext): Record<string, CoachAdvice> {
  return readFromLocalStorage<Record<string, CoachAdvice>>(storageKey(context, coachAdviceStorageResource), {});
}

export async function getCoachAdvice(key: string, context: StorageContext = guestStorageContext): Promise<CoachAdvice | null> {
  return readCoachAdviceRecord(context)[key] ?? null;
}

export async function saveCoachAdvice(key: string, advice: CoachAdvice, context: StorageContext = guestStorageContext): Promise<void> {
  writeToLocalStorage(storageKey(context, coachAdviceStorageResource), {
    ...readCoachAdviceRecord(context),
    [key]: advice,
  });
}
