import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { CoachAdvice, CoachAdviceInput } from '../types/coach';
import { generateLocalCoachAdvice } from '../utils/localCoach';
import { validateCoachAdvice } from '../utils/coachAdviceValidation';
import { applyCoachSafetyOverrides, evaluateTrainingSafety } from '../shared/trainingSafety';

export type CoachAdviceSource = 'local' | 'openai' | 'fallback';
export type CoachAdviceResult = {
  advice: CoachAdvice;
  source: CoachAdviceSource;
  error?: string;
  code?: 'AI_QUOTA_EXCEEDED';
  status?: number;
  retryAfterSeconds?: number;
};

const fallbackError = 'No se pudo usar Coach IA real. Se ha generado una recomendación local.';

function localResult(input: CoachAdviceInput, source: CoachAdviceSource = 'local', error?: string): CoachAdviceResult {
  const safety = evaluateTrainingSafety({ dailyReadiness: input.dailyReadiness as unknown as Record<string, unknown>, injuries: input.activeInjuries });
  return {
    advice: applyCoachSafetyOverrides(generateLocalCoachAdvice(input), safety),
    source,
    ...(error ? { error } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function retryLabel(seconds: number) {
  if (seconds >= 3600 && seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
}

async function quotaResult(input: CoachAdviceInput, error: unknown): Promise<CoachAdviceResult | null> {
  const context = isRecord(error) ? error.context : undefined;
  const status = isRecord(context) && typeof context.status === 'number'
    ? context.status
    : context instanceof Response ? context.status : undefined;
  if (status !== 429) return null;

  let code: unknown;
  if (context && typeof (context as Response).clone === 'function' && typeof (context as Response).json === 'function') {
    try {
      code = (await (context as Response).clone().json() as { code?: unknown }).code;
    } catch {
      // The 429 status remains authoritative when the body is unavailable.
    }
  } else if (isRecord(context) && isRecord(context.body)) {
    code = context.body.code;
  }
  if (code !== undefined && code !== 'AI_QUOTA_EXCEEDED') return null;

  const retryHeader = context && typeof (context as Response).headers?.get === 'function'
    ? (context as Response).headers.get('Retry-After')
    : isRecord(context) && typeof context.retryAfter === 'string' ? context.retryAfter : null;
  const parsedRetry = Number(retryHeader);
  const retryAfterSeconds = Number.isFinite(parsedRetry) && parsedRetry > 0 ? Math.ceil(parsedRetry) : 86400;
  return {
    ...localResult(input, 'fallback'),
    error: `Has alcanzado el límite diario de Coach IA. Reinténtalo en ${retryLabel(retryAfterSeconds)}.`,
    code: 'AI_QUOTA_EXCEEDED',
    status: 429,
    retryAfterSeconds,
  };
}

export async function generateCoachAdvice(input: CoachAdviceInput, options: { useRemote?: boolean } = {}): Promise<CoachAdviceResult> {
  if (options.useRemote === false || !isSupabaseConfigured || !supabase) {
    return localResult(input);
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      return localResult(input);
    }

    const { data, error } = await supabase.functions.invoke('generate-coach-advice', {
      body: { input },
    });

    if (error) {
      const quota = await quotaResult(input, error);
      if (quota) return quota;
      return localResult(input, 'fallback', fallbackError);
    }

    const validation = validateCoachAdvice((data as { advice?: unknown } | null)?.advice);
    if (!validation.ok) {
      return localResult(input, 'fallback', fallbackError);
    }

    const safety = evaluateTrainingSafety({ dailyReadiness: input.dailyReadiness as unknown as Record<string, unknown>, injuries: input.activeInjuries });
    return { advice: applyCoachSafetyOverrides(validation.advice, safety), source: 'openai' };
  } catch {
    return localResult(input, 'fallback', fallbackError);
  }
}
