import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validCoachAdvice } from '../../test/coachTestUtils';

const maybeSingleMock = vi.fn();
const selectMock = vi.fn(() => ({
  eq: vi.fn(() => ({
    eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
  })),
}));
const upsertMock = vi.fn();
const updateEqAdviceKeyMock = vi.fn();
const updateEqUserIdMock = vi.fn(() => ({ eq: updateEqAdviceKeyMock }));
const updateMock = vi.fn(() => ({ eq: updateEqUserIdMock }));
const fromMock = vi.fn(() => ({ select: selectMock, upsert: upsertMock, update: updateMock }));

vi.mock('../../lib/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: { from: fromMock },
}));

describe('supabaseCoachAdviceRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    upsertMock.mockResolvedValue({ error: null });
    updateEqAdviceKeyMock.mockResolvedValue({ error: null });
  });

  it('upserts by user_id and advice_key to avoid duplicates for the same advice key', async () => {
    const { saveCoachAdviceToSupabase } = await import('./supabaseCoachAdviceRepository');

    await saveCoachAdviceToSupabase('user-1', 'week-6:day-1:2026-07-09', validCoachAdvice, { source: 'openai' });

    expect(fromMock).toHaveBeenCalledWith('coach_advices');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', advice_key: 'week-6:day-1:2026-07-09', advice_json: validCoachAdvice }),
      { onConflict: 'user_id,advice_key' },
    );
  });

  it('updates feedback for the existing advice row without inserting a duplicate', async () => {
    const { saveCoachAdviceFeedbackToSupabase } = await import('./supabaseCoachAdviceRepository');

    await saveCoachAdviceFeedbackToSupabase('user-1', 'week-6:day-1:2026-07-09', true, 'Útil para pacing');

    expect(updateMock).toHaveBeenCalledWith({ was_useful: true, user_feedback: 'Útil para pacing' });
    expect(updateEqUserIdMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(updateEqAdviceKeyMock).toHaveBeenCalledWith('advice_key', 'week-6:day-1:2026-07-09');
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
