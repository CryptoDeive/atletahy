import type { TrainingTestId, TrainingTestResult } from '../types/tests';
import { readFromLocalStorage, writeToLocalStorage } from '../utils/persistence';
import { validateTrainingTestResult } from '../domain/fields/schemas';
import { guestStorageContext, storageKey, trainingTestResultsStorageResource, type StorageContext } from './storageKeys';

function readResults(context: StorageContext): TrainingTestResult[] {
  return readFromLocalStorage<TrainingTestResult[]>(storageKey(context, trainingTestResultsStorageResource), []);
}

export async function getTrainingTestResults(context: StorageContext = guestStorageContext): Promise<TrainingTestResult[]> {
  return readResults(context).sort((a, b) => b.performedAt.localeCompare(a.performedAt));
}

export async function getTrainingTestResultsByTestId(testId: TrainingTestId, context: StorageContext = guestStorageContext): Promise<TrainingTestResult[]> {
  return (await getTrainingTestResults(context)).filter((item) => item.testId === testId);
}

export async function getLatestTrainingTestResult(testId: TrainingTestId, context: StorageContext = guestStorageContext): Promise<TrainingTestResult | null> {
  return (await getTrainingTestResultsByTestId(testId, context))[0] ?? null;
}

export async function saveTrainingTestResult(result: TrainingTestResult, context: StorageContext = guestStorageContext): Promise<TrainingTestResult> {
  const validation = validateTrainingTestResult(result.testId, result.performedAt.slice(0, 10), result.result); if (!validation.ok) throw new Error(validation.issues[0]?.message ?? 'Resultado no válido.');
  result = { ...result, result: validation.value, notes: result.notes?.trim() };
  const results = readResults(context);
  const index = results.findIndex((item) => item.id === result.id);
  const nextResult = { ...result, updatedAt: new Date().toISOString() };
  if (index >= 0) results[index] = nextResult;
  else results.push(nextResult);
  writeToLocalStorage(storageKey(context, trainingTestResultsStorageResource), results);
  return nextResult;
}

export async function deleteTrainingTestResult(id: string, context: StorageContext = guestStorageContext): Promise<void> {
  writeToLocalStorage(storageKey(context, trainingTestResultsStorageResource), readResults(context).filter((item) => item.id !== id));
}
