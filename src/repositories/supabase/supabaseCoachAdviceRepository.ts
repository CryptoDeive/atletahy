import type { CoachAdvice, CoachAdviceInput } from '../../types/coach';
import { getSupabaseClient, warnSupabaseError } from './supabaseRepositoryUtils';

export type SaveCoachAdviceMetadata = {
  source?: 'local' | 'openai' | 'fallback';
  inputSnapshot?: CoachAdviceInput;
};

export async function getCoachAdviceFromSupabase(userId: string, key: string): Promise<CoachAdvice | null> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase no está configurado.');

  const { data, error } = await client.from('coach_advices').select('advice_json').eq('user_id', userId).eq('advice_key', key).maybeSingle();
  if (error) {
    warnSupabaseError('No se pudo leer el consejo del Coach IA', error);
    throw error;
  }

  return (data?.advice_json as CoachAdvice | undefined) ?? null;
}

export async function saveCoachAdviceToSupabase(userId: string, key: string, advice: CoachAdvice, metadata: SaveCoachAdviceMetadata = {}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.from('coach_advices').upsert(
      {
        user_id: userId,
        advice_key: key,
        model: metadata.source ?? 'local',
        input_snapshot_json: metadata.inputSnapshot ?? {},
        advice_json: advice,
        was_useful: null,
        user_feedback: '',
        generated_at: new Date().toISOString(),
      },
    { onConflict: 'user_id,advice_key' },
  );

  if (error) {
    warnSupabaseError('No se pudo guardar el consejo del Coach IA', error);
    throw error;
  }
}


export async function saveCoachAdviceFeedbackToSupabase(userId: string, key: string, wasUseful: boolean, userFeedback: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('coach_advices')
    .update({
      was_useful: wasUseful,
      user_feedback: userFeedback,
    })
    .eq('user_id', userId)
    .eq('advice_key', key);

  if (error) {
    warnSupabaseError('No se pudo guardar el feedback del Coach IA', error);
    throw error;
  }
}
