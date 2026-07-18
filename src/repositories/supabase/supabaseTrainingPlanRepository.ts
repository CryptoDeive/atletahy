import type { Json } from '../../types/database';
import type { GeneratedTrainingPlan, StoredTrainingPlan } from '../../types/plan';
import type { PlanGenerationInput } from '../../utils/planInput';
import { sanitizeStoredTrainingPlan } from '../trainingPlanPersistence';
import { getSupabaseClient, warnSupabaseError } from './supabaseRepositoryUtils';

type TrainingPlanRow = {
  id: string;
  user_id: string;
  title: string;
  status: string;
  target_race_date: string | null;
  generated_at: string | null;
  input_snapshot_json: Json;
  plan_json: Json;
  created_at: string;
  updated_at: string;
};

function fromRow(row: TrainingPlanRow): StoredTrainingPlan | null {
  return sanitizeStoredTrainingPlan({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    status: row.status,
    targetRaceDate: row.target_race_date ?? '',
    generatedAt: row.generated_at ?? row.created_at,
    inputSnapshotJson: row.input_snapshot_json,
    planJson: row.plan_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function warnTrainingPlanSaveError(context: string, error: unknown) {
  if (!import.meta.env.DEV || !error || typeof error !== 'object') return;

  const safeError = error as Record<string, unknown>;
  warnSupabaseError(context, {
    code: safeError.code,
    message: safeError.message,
    details: safeError.details,
    hint: safeError.hint,
  });
}

export async function getTrainingPlansFromSupabase(userId: string): Promise<StoredTrainingPlan[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase no está configurado.');

  const { data, error } = await client.from('training_plans').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) {
    warnSupabaseError('No se pudieron leer los planes IA', error);
    throw error;
  }

  return ((data ?? []) as TrainingPlanRow[])
    .map(fromRow)
    .filter((plan): plan is StoredTrainingPlan => plan !== null);
}

export async function getActiveTrainingPlanFromSupabase(userId: string): Promise<StoredTrainingPlan | null> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase no está configurado.');

  const { data, error } = await client.from('training_plans').select('*').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) {
    warnSupabaseError('No se pudo leer el plan IA activo', error);
    throw error;
  }

  return data ? fromRow(data as TrainingPlanRow) : null;
}

export async function saveTrainingPlanToSupabase(_userId: string, plan: GeneratedTrainingPlan, inputSnapshot: PlanGenerationInput): Promise<StoredTrainingPlan> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase no est? configurado.');

  const { data, error } = await client
    .rpc('save_training_plan_atomic', {
      p_title: plan.title,
      p_target_race_date: plan.targetRaceDate || null,
      p_generated_at: plan.generatedAt || new Date().toISOString(),
      p_input_snapshot_json: inputSnapshot as unknown as Json,
      p_plan_json: plan as unknown as Json,
    })
    .single();

  if (error) {
    warnTrainingPlanSaveError('No se pudo guardar el plan IA de forma atómica', error);
    throw error;
  }

  const storedPlan = fromRow(data as TrainingPlanRow);
  if (!storedPlan) {
    throw new Error('Supabase devolvi? un plan IA inv?lido.');
  }

  return storedPlan;
}

export async function setActiveTrainingPlanInSupabase(_userId: string, id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .rpc('set_active_training_plan_atomic', {
      p_plan_id: id,
    })
    .single();
  if (error) {
    warnSupabaseError('No se pudo activar el plan IA', error);
    throw error;
  }
}
