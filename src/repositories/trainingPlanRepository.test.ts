import { afterEach, describe, expect, it } from 'vitest';
import { validGeneratedTrainingPlan, validPlanGenerationInput } from '../test/planTestUtils';
import { guestStorageContext, storageKey, trainingPlansStorageResource } from './storageKeys';
import { getActiveTrainingPlan, getTrainingPlans, saveTrainingPlan } from './trainingPlanRepository';

describe('trainingPlanRepository', () => {
  const trainingPlansStorageKey = storageKey(guestStorageContext, trainingPlansStorageResource);
  afterEach(() => {
    window.localStorage.clear();
  });

  it('filters persisted plans whose planJson no longer matches the contract', async () => {
    const valid = await saveTrainingPlan(validGeneratedTrainingPlan, validPlanGenerationInput, 'user-1');

    window.localStorage.setItem(trainingPlansStorageKey, JSON.stringify({
      [valid.id]: valid,
      corrupt: {
        id: 'corrupt',
        userId: 'user-1',
        title: 'Corrupto',
        status: 'active',
        targetRaceDate: '2026-11-22',
        generatedAt: '2026-07-09T10:00:00.000Z',
        inputSnapshotJson: validPlanGenerationInput,
        planJson: { ...validGeneratedTrainingPlan, generatedWeeks: 1 },
        createdAt: '2026-07-09T10:00:00.000Z',
        updatedAt: '2026-07-09T10:00:00.000Z',
      },
    }));

    await expect(getTrainingPlans()).resolves.toEqual([expect.objectContaining({ id: valid.id, title: validGeneratedTrainingPlan.title })]);
    await expect(getActiveTrainingPlan()).resolves.toMatchObject({ id: valid.id });
  });

  it('supports legacy array storage while dropping invalid entries safely', async () => {
    window.localStorage.setItem(trainingPlansStorageKey, JSON.stringify([
      {
        id: 'legacy-valid',
        userId: 'user-1',
        title: validGeneratedTrainingPlan.title,
        status: 'active',
        targetRaceDate: validGeneratedTrainingPlan.targetRaceDate,
        generatedAt: validGeneratedTrainingPlan.generatedAt,
        inputSnapshotJson: validPlanGenerationInput,
        planJson: validGeneratedTrainingPlan,
        createdAt: '2026-07-09T10:00:00.000Z',
        updatedAt: '2026-07-09T10:00:00.000Z',
      },
      {
        id: 'legacy-invalid',
        userId: 'user-1',
        title: 'Legacy corrupto',
        status: 'active',
        targetRaceDate: validGeneratedTrainingPlan.targetRaceDate,
        generatedAt: validGeneratedTrainingPlan.generatedAt,
        inputSnapshotJson: validPlanGenerationInput,
        planJson: { weeks: [] },
        createdAt: '2026-07-09T10:00:00.000Z',
        updatedAt: '2026-07-09T10:00:00.000Z',
      },
    ]));

    await expect(getTrainingPlans()).resolves.toEqual([expect.objectContaining({ id: 'legacy-valid' })]);
    await expect(getActiveTrainingPlan()).resolves.toMatchObject({ id: 'legacy-valid' });
  });
});
