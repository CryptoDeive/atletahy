import type { StoredTrainingPlan } from '../types/plan';
import { validateGeneratedTrainingPlan } from '../utils/planValidation';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function sanitizeStoredTrainingPlan(value: unknown): StoredTrainingPlan | null {
  if (!isRecord(value)) return null;

  const validation = validateGeneratedTrainingPlan(value.planJson);
  if (!validation.ok) return null;

  const id = value.id;
  if (!isNonEmptyString(id)) return null;

  const createdAt = isNonEmptyString(value.createdAt) ? value.createdAt : validation.plan.generatedAt;
  const generatedAt = isNonEmptyString(value.generatedAt) ? value.generatedAt : validation.plan.generatedAt;
  const userId = typeof value.userId === 'string' ? value.userId : null;
  const title = isNonEmptyString(value.title) ? value.title : validation.plan.title;
  const status = isNonEmptyString(value.status) ? value.status : 'archived';
  const targetRaceDate = isNonEmptyString(value.targetRaceDate) ? value.targetRaceDate : validation.plan.targetRaceDate;
  const updatedAt = isNonEmptyString(value.updatedAt) ? value.updatedAt : createdAt;

  return {
    id,
    userId,
    title,
    status,
    targetRaceDate,
    generatedAt,
    inputSnapshotJson: 'inputSnapshotJson' in value ? value.inputSnapshotJson : {},
    planJson: validation.plan,
    createdAt,
    updatedAt,
  };
}

export function normalizeStoredTrainingPlanCollection(value: unknown): Record<string, StoredTrainingPlan> {
  if (Array.isArray(value)) {
    return Object.fromEntries(
      value
        .map((plan) => sanitizeStoredTrainingPlan(plan))
        .filter((plan): plan is StoredTrainingPlan => plan !== null)
        .map((plan) => [plan.id, plan]),
    );
  }

  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.values(value)
      .map((plan) => sanitizeStoredTrainingPlan(plan))
      .filter((plan): plan is StoredTrainingPlan => plan !== null)
      .map((plan) => [plan.id, plan]),
  );
}
