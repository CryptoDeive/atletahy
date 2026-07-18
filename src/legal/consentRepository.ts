import { supabase } from '../lib/supabaseClient';
import { storageKey, type StorageContext } from '../repositories/storageKeys';
import { buildConsentRecord, type ConsentChoices, type ConsentRecord } from './consent';

const CONSENT_STORAGE_RESOURCE = 'legal-consents';

export function readLocalConsent(context: StorageContext): ConsentRecord | null {
  try {
    const value = window.localStorage.getItem(storageKey(context, CONSENT_STORAGE_RESOURCE));
    return value ? JSON.parse(value) as ConsentRecord : null;
  } catch {
    return null;
  }
}

export async function loadConsent(context: StorageContext): Promise<ConsentRecord | null> {
  const local = readLocalConsent(context);
  if (context.kind === 'guest' || !supabase || typeof supabase.from !== 'function') return local;

  const { data, error } = await supabase
    .from('consent_events')
    .select('purpose,granted,policy_version,recorded_at')
    .eq('user_id', context.userId)
    .order('recorded_at', { ascending: false });
  if (error || !data?.length) return local;
  const health = data.find((row) => row.purpose === 'health_data');
  const ai = data.find((row) => row.purpose === 'health_data_ai');
  if (!health) return local;
  const record: ConsentRecord = {
    policyVersion: health.policy_version,
    recordedAt: health.recorded_at,
    healthData: health.granted,
    healthDataWithAi: Boolean(health.granted && ai?.granted),
  };
  window.localStorage.setItem(storageKey(context, CONSENT_STORAGE_RESOURCE), JSON.stringify(record));
  return record;
}

export async function saveConsent(context: StorageContext, choices: ConsentChoices): Promise<{ record: ConsentRecord; remotelyAudited: boolean }> {
  const record = buildConsentRecord(choices);
  window.localStorage.setItem(storageKey(context, CONSENT_STORAGE_RESOURCE), JSON.stringify(record));
  if (context.kind === 'guest' || !supabase || typeof supabase.rpc !== 'function') {
    return { record, remotelyAudited: false };
  }

  const { error } = await supabase.rpc('record_health_consents', {
    p_health_data: record.healthData,
    p_health_data_ai: record.healthDataWithAi,
    p_policy_version: record.policyVersion,
  });
  return { record, remotelyAudited: !error };
}

export async function withdrawHealthConsent(context: StorageContext) {
  const result = await saveConsent(context, { healthData: false, healthDataWithAi: false });
  for (const resource of ['physiology-metrics', 'injuries', 'nutrition-preferences', 'daily-readiness']) {
    window.localStorage.removeItem(storageKey(context, resource));
  }
  const deletionErrors: string[] = [];
  const client = supabase;
  if (context.kind === 'user' && client && typeof client.from === 'function') {
    const tables = ['athlete_metrics', 'injuries', 'nutrition_preferences', 'daily_readiness'] as const;
    const deletions = await Promise.allSettled(
      tables.map((table) => client.from(table).delete().eq('user_id', context.userId)),
    );
    deletions.forEach((deletion, index) => {
      if (deletion.status === 'rejected' || deletion.value.error) deletionErrors.push(tables[index]);
    });
  }
  const remoteHealthDataDeleted = context.kind === 'user'
    && Boolean(client && typeof client.from === 'function')
    && deletionErrors.length === 0;
  return { ...result, remoteHealthDataDeleted, deletionErrors };
}
