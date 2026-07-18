import { beforeEach, describe, expect, it } from 'vitest';
import { deleteTrainingTestResult, getTrainingTestResults, saveTrainingTestResult } from './trainingTestRepository';
import type { TrainingTestResult } from '../types/tests';

const result: TrainingTestResult = {
  id: 'result-1', testId: 'vam', performedAt: '2026-07-15T10:00:00.000Z',
  result: { protocol: '6 minutos', distanceMeters: 3000, totalTime: '06:00' }, calculated: { vamKmh: 15 }, notes: '',
  createdAt: '2026-07-15T10:00:00.000Z', updatedAt: '2026-07-15T10:00:00.000Z',
};

describe('trainingTestRepository', () => {
  beforeEach(() => window.localStorage.clear());

  it('uses localStorage and updates an existing result by id', async () => {
    await saveTrainingTestResult(result);
    await saveTrainingTestResult({ ...result, notes: 'Mejor control' });
    await expect(getTrainingTestResults()).resolves.toEqual([expect.objectContaining({ id: 'result-1', notes: 'Mejor control' })]);
    expect(JSON.parse(window.localStorage.getItem('atletahy:guest:training-test-results') ?? '[]')).toHaveLength(1);
  });

  it('deletes a stored result', async () => {
    await saveTrainingTestResult(result);
    await deleteTrainingTestResult(result.id);
    await expect(getTrainingTestResults()).resolves.toEqual([]);
  });

  it('keeps a legacy result visible but rejects the same payload as a new write', async () => {
    const legacy = { ...result, id: 'legacy', testId: 'jim-vance-30' as const, result: { blockMinutes: 30, distanceMeters: 6000, averagePace: '00:14:30', last20AverageHr: 170 } };
    localStorage.setItem('atletahy:guest:training-test-results', JSON.stringify([legacy]));
    await expect(getTrainingTestResults()).resolves.toContainEqual(legacy);
    await expect(saveTrainingTestResult(legacy)).rejects.toThrow();
  });
});
