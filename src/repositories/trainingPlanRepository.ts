import type { GeneratedTrainingPlan, StoredTrainingPlan } from '../types/plan';
import type { PlanGenerationInput } from '../utils/planInput';
import { readFromLocalStorage, writeToLocalStorage } from '../utils/persistence';
import { normalizeStoredTrainingPlanCollection } from './trainingPlanPersistence';
import { guestStorageContext, storageKey, trainingPlansStorageResource, type StorageContext } from './storageKeys';

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readTrainingPlanRecord(context: StorageContext): Record<string, StoredTrainingPlan> {
  const stored = readFromLocalStorage<Record<string, StoredTrainingPlan> | StoredTrainingPlan[]>(storageKey(context, trainingPlansStorageResource), {});
  return normalizeStoredTrainingPlanCollection(stored);
}

export async function getTrainingPlans(context: StorageContext = guestStorageContext): Promise<StoredTrainingPlan[]> {
  return Object.values(readTrainingPlanRecord(context)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getActiveTrainingPlan(context: StorageContext = guestStorageContext): Promise<StoredTrainingPlan | null> {
  return (await getTrainingPlans(context)).find((plan) => plan.status === 'active') ?? null;
}

export async function saveTrainingPlan(plan: GeneratedTrainingPlan, inputSnapshot: PlanGenerationInput, userId?: string | null, context: StorageContext = guestStorageContext): Promise<StoredTrainingPlan> {
  const now = new Date().toISOString();
  const record: StoredTrainingPlan = {
    id: createId(),
    userId: userId ?? null,
    title: plan.title,
    status: 'active',
    targetRaceDate: plan.targetRaceDate,
    generatedAt: plan.generatedAt || now,
    inputSnapshotJson: inputSnapshot,
    planJson: plan,
    createdAt: now,
    updatedAt: now,
  };

  const current = readTrainingPlanRecord(context);
  const next = Object.fromEntries(Object.entries(current).map(([id, stored]) => [id, { ...stored, status: stored.status === 'active' ? 'archived' : stored.status, updatedAt: now }]));
  writeToLocalStorage(storageKey(context, trainingPlansStorageResource), { ...next, [record.id]: record });
  return record;
}

export async function setActiveTrainingPlan(id: string, context: StorageContext = guestStorageContext): Promise<void> {
  const now = new Date().toISOString();
  const current = readTrainingPlanRecord(context);
  writeToLocalStorage(
    storageKey(context, trainingPlansStorageResource),
    Object.fromEntries(Object.entries(current).map(([planId, plan]) => [planId, { ...plan, status: planId === id ? 'active' : 'archived', updatedAt: now }])),
  );
}
