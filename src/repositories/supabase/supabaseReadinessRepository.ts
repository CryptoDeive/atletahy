import type { DailyReadiness } from '../../types/athlete';
import type { Database } from '../../types/database';
import { fromNullableNumber, getSupabaseClient, toNullableNumber, warnSupabaseError } from './supabaseRepositoryUtils';

type ReadinessRow = Database['public']['Tables']['daily_readiness']['Row'];

function mapReadiness(row: ReadinessRow): DailyReadiness {
  return {
    date: row.date,
    sleepHours: fromNullableNumber(row.sleep_hours),
    sleepQuality1To5: fromNullableNumber(row.sleep_quality_1_5),
    stress1To5: fromNullableNumber(row.stress_1_5),
    fatigue1To5: fromNullableNumber(row.fatigue_1_5),
    muscleSoreness1To5: fromNullableNumber(row.muscle_soreness_1_5),
    legSoreness1To5: fromNullableNumber(row.leg_soreness_1_5),
    upperSoreness1To5: fromNullableNumber(row.upper_soreness_1_5),
    motivation1To5: fromNullableNumber(row.motivation_1_5),
    hydration1To5: fromNullableNumber(row.hydration_1_5),
    pain0To10: fromNullableNumber(row.pain_0_10),
    restingHr: fromNullableNumber(row.resting_hr),
    hrv: fromNullableNumber(row.hrv),
    painLocation: row.pain_location,
    notes: row.notes,
  };
}

export async function getDailyReadinessFromSupabase(userId: string, date: string): Promise<DailyReadiness | null> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase no está configurado.');

  const { data, error } = await client.from('daily_readiness').select('*').eq('user_id', userId).eq('date', date).maybeSingle();
  if (error) {
    warnSupabaseError('No se pudo leer el check-in diario', error);
    throw error;
  }

  return data ? mapReadiness(data) : null;
}

export async function saveDailyReadinessToSupabase(userId: string, readiness: DailyReadiness): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.from('daily_readiness').upsert(
    {
      user_id: userId,
      date: readiness.date,
      sleep_hours: toNullableNumber(readiness.sleepHours),
      sleep_quality_1_5: toNullableNumber(readiness.sleepQuality1To5),
      stress_1_5: toNullableNumber(readiness.stress1To5),
      fatigue_1_5: toNullableNumber(readiness.fatigue1To5),
      muscle_soreness_1_5: toNullableNumber(readiness.muscleSoreness1To5),
      leg_soreness_1_5: toNullableNumber(readiness.legSoreness1To5),
      upper_soreness_1_5: toNullableNumber(readiness.upperSoreness1To5),
      motivation_1_5: toNullableNumber(readiness.motivation1To5),
      hydration_1_5: toNullableNumber(readiness.hydration1To5),
      pain_0_10: toNullableNumber(readiness.pain0To10),
      resting_hr: toNullableNumber(readiness.restingHr),
      hrv: toNullableNumber(readiness.hrv),
      pain_location: readiness.painLocation,
      notes: readiness.notes,
    },
    { onConflict: 'user_id,date' },
  );

  if (error) {
    warnSupabaseError('No se pudo guardar el check-in diario', error);
    throw error;
  }
}
