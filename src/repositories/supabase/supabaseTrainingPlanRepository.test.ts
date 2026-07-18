import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validGeneratedTrainingPlan, validPlanGenerationInput } from '../../test/planTestUtils';

const mocks = vi.hoisted(() => {
  const warnSupabaseError = vi.fn();
  const getSupabaseClient = vi.fn();

  return { warnSupabaseError, getSupabaseClient };
});

vi.mock('./supabaseRepositoryUtils', () => ({
  getSupabaseClient: mocks.getSupabaseClient,
  warnSupabaseError: mocks.warnSupabaseError,
}));

describe('supabaseTrainingPlanRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves a generated plan through the transactional RPC without sending an owner id', async () => {
    const single = vi.fn(async () => ({
      data: {
        id: 'plan-1',
        user_id: 'user-1',
        title: validGeneratedTrainingPlan.title,
        status: 'active',
        target_race_date: validGeneratedTrainingPlan.targetRaceDate,
        generated_at: validGeneratedTrainingPlan.generatedAt,
        input_snapshot_json: validPlanGenerationInput,
        plan_json: validGeneratedTrainingPlan,
        created_at: '2026-07-14T18:00:00.000Z',
        updated_at: '2026-07-14T18:00:00.000Z',
      },
      error: null,
    }));
    const rpc = vi.fn(() => ({ single }));
    const from = vi.fn();
    mocks.getSupabaseClient.mockReturnValue({ from, rpc });

    const { saveTrainingPlanToSupabase } = await import('./supabaseTrainingPlanRepository');

    await expect(saveTrainingPlanToSupabase('user-1', validGeneratedTrainingPlan, validPlanGenerationInput)).resolves.toMatchObject({
      id: 'plan-1',
      userId: 'user-1',
      status: 'active',
      title: validGeneratedTrainingPlan.title,
    });
    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('save_training_plan_atomic', {
      p_title: validGeneratedTrainingPlan.title,
      p_target_race_date: validGeneratedTrainingPlan.targetRaceDate,
      p_generated_at: validGeneratedTrainingPlan.generatedAt,
      p_input_snapshot_json: validPlanGenerationInput,
      p_plan_json: validGeneratedTrainingPlan,
    });
  });

  it('propagates an atomic save error without attempting non-transactional fallback writes', async () => {
    const saveError = { code: '23505', message: 'conflict', details: 'safe', hint: 'safe' };
    const from = vi.fn();
    const rpc = vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: saveError })) }));
    mocks.getSupabaseClient.mockReturnValue({ from, rpc });

    const { saveTrainingPlanToSupabase } = await import('./supabaseTrainingPlanRepository');

    await expect(saveTrainingPlanToSupabase('user-1', validGeneratedTrainingPlan, validPlanGenerationInput)).rejects.toBe(saveError);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
  });

  it('surfaces a missing atomic RPC and never falls back to the data-loss-prone two-query save', async () => {
    const missingRpcError = { code: 'PGRST202', message: 'function not found', details: null, hint: null };
    const from = vi.fn();
    const rpc = vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: missingRpcError })) }));
    mocks.getSupabaseClient.mockReturnValue({ from, rpc });

    const { saveTrainingPlanToSupabase } = await import('./supabaseTrainingPlanRepository');

    await expect(saveTrainingPlanToSupabase('user-1', validGeneratedTrainingPlan, validPlanGenerationInput)).rejects.toBe(missingRpcError);
    expect(from).not.toHaveBeenCalled();
  });

  it('activates an existing plan through the transactional RPC', async () => {
    const rpc = vi.fn(() => ({
      single: vi.fn(async () => ({
        data: {
          id: 'plan-2',
          user_id: 'user-1',
          title: validGeneratedTrainingPlan.title,
          status: 'active',
          target_race_date: validGeneratedTrainingPlan.targetRaceDate,
          generated_at: validGeneratedTrainingPlan.generatedAt,
          input_snapshot_json: validPlanGenerationInput,
          plan_json: validGeneratedTrainingPlan,
          created_at: '2026-07-14T18:00:00.000Z',
          updated_at: '2026-07-14T18:00:00.000Z',
        },
        error: null,
      })),
    }));
    mocks.getSupabaseClient.mockReturnValue({ rpc });

    const { setActiveTrainingPlanInSupabase } = await import('./supabaseTrainingPlanRepository');

    await expect(setActiveTrainingPlanInSupabase('user-1', 'plan-2')).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('set_active_training_plan_atomic', {
      p_plan_id: 'plan-2',
    });
  });

  it('filters corrupt persisted plans from Supabase reads', async () => {
    mocks.getSupabaseClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => ({
              data: [
                {
                  id: 'valid-plan',
                  user_id: 'user-1',
                  title: validGeneratedTrainingPlan.title,
                  status: 'active',
                  target_race_date: validGeneratedTrainingPlan.targetRaceDate,
                  generated_at: validGeneratedTrainingPlan.generatedAt,
                  input_snapshot_json: validPlanGenerationInput,
                  plan_json: validGeneratedTrainingPlan,
                  created_at: '2026-07-09T10:00:00.000Z',
                  updated_at: '2026-07-09T10:00:00.000Z',
                },
                {
                  id: 'corrupt-plan',
                  user_id: 'user-1',
                  title: 'Corrupto',
                  status: 'active',
                  target_race_date: validGeneratedTrainingPlan.targetRaceDate,
                  generated_at: validGeneratedTrainingPlan.generatedAt,
                  input_snapshot_json: validPlanGenerationInput,
                  plan_json: { ...validGeneratedTrainingPlan, generatedWeeks: 99 },
                  created_at: '2026-07-09T10:00:00.000Z',
                  updated_at: '2026-07-09T10:00:00.000Z',
                },
              ],
              error: null,
            })),
          })),
        })),
      })),
    });

    const { getTrainingPlansFromSupabase } = await import('./supabaseTrainingPlanRepository');

    await expect(getTrainingPlansFromSupabase('user-1')).resolves.toEqual([
      expect.objectContaining({ id: 'valid-plan', title: validGeneratedTrainingPlan.title }),
    ]);
  });

  it('returns null instead of exposing an invalid active plan to the UI', async () => {
    mocks.getSupabaseClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: {
                      id: 'corrupt-plan',
                      user_id: 'user-1',
                      title: 'Corrupto',
                      status: 'active',
                      target_race_date: validGeneratedTrainingPlan.targetRaceDate,
                      generated_at: validGeneratedTrainingPlan.generatedAt,
                      input_snapshot_json: validPlanGenerationInput,
                      plan_json: { weeks: [] },
                      created_at: '2026-07-09T10:00:00.000Z',
                      updated_at: '2026-07-09T10:00:00.000Z',
                    },
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        })),
      })),
    });

    const { getActiveTrainingPlanFromSupabase } = await import('./supabaseTrainingPlanRepository');

    await expect(getActiveTrainingPlanFromSupabase('user-1')).resolves.toBeNull();
  });
});
