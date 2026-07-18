import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutLog } from '../../types/athlete';

const mocks = vi.hoisted(() => {
  const selectMock = vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(async () => ({ data: null, error: { message: 'boom' } })) })) }));
  const upsertMock = vi.fn(async () => ({ error: null }));
  const fromMock = vi.fn(() => ({ select: selectMock, upsert: upsertMock }));

  return { fromMock, selectMock, upsertMock };
});

vi.mock('../../lib/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: mocks.fromMock,
  },
}));

describe('Supabase repositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propagates read errors so callers cannot mistake them for empty data', async () => {
    const { getWorkoutLogsFromSupabase } = await import('./supabaseWorkoutLogRepository');

    await expect(getWorkoutLogsFromSupabase('user-1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('upserts workout logs by the same logical key used by localStorage', async () => {
    const { saveWorkoutLogToSupabase } = await import('./supabaseWorkoutLogRepository');
    const log: WorkoutLog = {
      id: 'client-generated-id',
      date: '2026-07-08',
      weekId: 'week-6',
      dayId: 'day-2',
      status: 'adaptado',
      durationMinutes: 60,
      sessionRpe1To10: 7,
      averageHr: 145,
      maxHr: 170,
      completionPercent: 90,
      notes: 'Actualizado',
      wentWell: 'Control',
      wentWrong: '',
    };

    await saveWorkoutLogToSupabase('user-1', log);

    expect(mocks.fromMock).toHaveBeenCalledWith('workout_logs');
    expect(mocks.upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        workout_log_id: 'client-generated-id',
        date: '2026-07-08',
        training_week_id: 'week-6',
        training_day_id: 'day-2',
      }),
      { onConflict: 'user_id,training_week_id,training_day_id,date' },
    );
  });
});
