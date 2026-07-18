import { validateWorkoutLog } from '../../domain/fields/schemas';
import type { WorkoutLog } from '../../types/athlete';
import type { Database } from '../../types/database';
import { fromNullableDate, fromNullableNumber, getSupabaseClient, toNullableDate, toNullableNumber, warnSupabaseError } from './supabaseRepositoryUtils';

type WorkoutLogRow = Database['public']['Tables']['workout_logs']['Row'];

function mapWorkoutLog(row: WorkoutLogRow): WorkoutLog {
  return {
    id: row.workout_log_id,
    date: row.date,
    weekId: row.training_week_id,
    dayId: row.training_day_id,
    status: row.status,
    startedAt: fromNullableDate(row.started_at),
    finishedAt: fromNullableDate(row.finished_at),
    durationMinutes: fromNullableNumber(row.duration_minutes),
    sessionRpe1To10: fromNullableNumber(row.session_rpe),
    averageHr: fromNullableNumber(row.avg_hr),
    maxHr: fromNullableNumber(row.max_hr),
    calories: fromNullableNumber(row.calories),
    completionPercent: fromNullableNumber(row.completed_percentage),
    notes: row.notes,
    wentWell: row.what_went_well,
    wentWrong: row.what_went_wrong,
  };
}

export async function getWorkoutLogsFromSupabase(userId: string): Promise<WorkoutLog[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase no está configurado.');

  const { data, error } = await client.from('workout_logs').select('*').eq('user_id', userId).order('date', { ascending: true });
  if (error) {
    warnSupabaseError('No se pudieron leer los logs de entrenamiento', error);
    throw error;
  }

  return (data ?? []).map(mapWorkoutLog);
}

export async function saveWorkoutLogToSupabase(userId: string, log: WorkoutLog): Promise<void> {
  const validation = validateWorkoutLog(log); if (!validation.ok) throw new Error(validation.issues[0]?.message ?? 'Registro no válido.');
  log = validation.value;
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.from('workout_logs').upsert(
    {
      user_id: userId,
      workout_log_id: log.id,
      date: log.date,
      training_week_id: log.weekId,
      training_day_id: log.dayId,
      status: log.status,
      started_at: toNullableDate(log.startedAt),
      finished_at: toNullableDate(log.finishedAt),
      duration_minutes: toNullableNumber(log.durationMinutes),
      session_rpe: toNullableNumber(log.sessionRpe1To10),
      avg_hr: toNullableNumber(log.averageHr),
      max_hr: toNullableNumber(log.maxHr),
      calories: toNullableNumber(log.calories),
      completed_percentage: toNullableNumber(log.completionPercent),
      notes: log.notes,
      what_went_well: log.wentWell,
      what_went_wrong: log.wentWrong,
    },
    { onConflict: 'user_id,training_week_id,training_day_id,date' },
  );

  if (error) {
    warnSupabaseError('No se pudo guardar el log de entrenamiento', error);
    throw error;
  }
}
