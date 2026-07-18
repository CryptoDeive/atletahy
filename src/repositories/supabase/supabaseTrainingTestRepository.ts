import type { Database, Json } from '../../types/database';
import type { TrainingTestId, TrainingTestResult } from '../../types/tests';
import { getSupabaseClient, warnSupabaseError } from './supabaseRepositoryUtils';

type TrainingTestResultRow = Database['public']['Tables']['training_test_results']['Row'];

function toJson(value: Record<string, unknown>): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function mapResult(row: TrainingTestResultRow): TrainingTestResult {
  return {
    id: row.id,
    userId: row.user_id,
    testId: row.test_id as TrainingTestId,
    performedAt: row.performed_at,
    result: row.result_json as Record<string, unknown>,
    calculated: row.calculated_json as Record<string, number | string | null>,
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTrainingTestResultsFromSupabase(userId: string, testId?: TrainingTestId): Promise<TrainingTestResult[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase no está configurado.');
  let query = client.from('training_test_results').select('*').eq('user_id', userId);
  if (testId) query = query.eq('test_id', testId);
  const { data, error } = await query.order('performed_at', { ascending: false });
  if (error) {
    warnSupabaseError('No se pudieron leer los resultados de tests', error);
    throw error;
  }
  return (data ?? []).map(mapResult);
}

export async function saveTrainingTestResultToSupabase(userId: string, result: TrainingTestResult): Promise<TrainingTestResult> {
  const client = getSupabaseClient();
  if (!client) return result;
  const { data, error } = await client.from('training_test_results').upsert({
    id: result.id, user_id: userId, test_id: result.testId, performed_at: result.performedAt,
    result_json: toJson(result.result), calculated_json: toJson(result.calculated), notes: result.notes ?? null,
    created_at: result.createdAt, updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select('*').single();
  if (error) {
    warnSupabaseError('No se pudo guardar el resultado del test', error);
    throw error;
  }
  return mapResult(data);
}

export async function deleteTrainingTestResultFromSupabase(userId: string, id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('training_test_results').delete().eq('user_id', userId).eq('id', id);
  if (error) {
    warnSupabaseError('No se pudo eliminar el resultado del test', error);
    throw error;
  }
}
