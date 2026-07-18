import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { GeneratedTrainingPlanResult } from '../types/plan';
import { validatePlanGenerationInput, type PlanGenerationInput } from '../utils/planInput';
import { validateGeneratedTrainingPlan } from '../utils/planValidation';
import { getTrainingPlanErrorMessage, normalizeTrainingPlanInvokeError } from './planErrorUtils';
import { invokeTrainingPlanWithTimeout } from './trainingPlanInvoke';
import { applyPlanSafetyOverrides, evaluateTrainingSafety } from '../shared/trainingSafety';

const noSessionError = getTrainingPlanErrorMessage('AUTH_REQUIRED');
const MAX_PLAN_INPUT_BYTES = 64 * 1024;

function devLog(event: string, details: { status?: number; code?: string } = {}) {
  if (import.meta.env.DEV) {
    console.info(`[planService] ${event}`, details);
  }
}

function invalidInputResult(): GeneratedTrainingPlanResult {
  return {
    plan: null,
    source: 'fallback',
    error: getTrainingPlanErrorMessage('INVALID_INPUT'),
    code: 'INVALID_INPUT',
    status: 400,
  };
}

export async function generateTrainingPlan(input: PlanGenerationInput): Promise<GeneratedTrainingPlanResult> {
  devLog('PLAN_REMOTE_STARTED');

  if (!validatePlanGenerationInput(input)) {
    devLog('PLAN_REMOTE_FAILED', { status: 400, code: 'INVALID_INPUT' });
    return invalidInputResult();
  }

  try {
    if (new TextEncoder().encode(JSON.stringify(input)).length > MAX_PLAN_INPUT_BYTES) {
      devLog('PLAN_REMOTE_FAILED', { status: 400, code: 'INVALID_INPUT' });
      return invalidInputResult();
    }
  } catch {
    devLog('PLAN_REMOTE_FAILED', { status: 400, code: 'INVALID_INPUT' });
    return invalidInputResult();
  }

  if (!isSupabaseConfigured || !supabase) {
    devLog('PLAN_REMOTE_FAILED', { status: 500, code: 'OPENAI_ERROR' });
    return {
      plan: null,
      source: 'fallback',
      error: getTrainingPlanErrorMessage('OPENAI_ERROR'),
      code: 'OPENAI_ERROR',
      status: 500,
    };
  }

  try {
    const client = supabase;
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData.session) {
      devLog('PLAN_REMOTE_FAILED', { status: 401, code: 'AUTH_REQUIRED' });
      return { plan: null, source: 'fallback', error: noSessionError, code: 'AUTH_REQUIRED', status: 401 };
    }
    devLog('PLAN_REMOTE_SESSION_FOUND');

    devLog('PLAN_REMOTE_INVOKE_STARTED');
    const { data, error, timedOut } = await invokeTrainingPlanWithTimeout(input, {
      invoke: (options) => client.functions.invoke('generate-training-plan', options),
    });

    if (timedOut) {
      devLog('PLAN_REMOTE_FAILED', { status: 504, code: 'OPENAI_TIMEOUT' });
      return {
        plan: null,
        source: 'fallback',
        error: getTrainingPlanErrorMessage('OPENAI_TIMEOUT'),
        code: 'OPENAI_TIMEOUT',
        status: 504,
      };
    }

    if (error) {
      const normalizedError = await normalizeTrainingPlanInvokeError(error);
      devLog('PLAN_REMOTE_FAILED', { status: normalizedError.status, code: normalizedError.code });
      return { plan: null, source: 'fallback', error: normalizedError.message, code: normalizedError.code, status: normalizedError.status };
    }

    const validation = validateGeneratedTrainingPlan((data as { plan?: unknown } | null)?.plan);
    if (!validation.ok) {
      devLog('PLAN_REMOTE_FAILED', { status: 502, code: 'INVALID_PLAN_RESPONSE' });
      return {
        plan: null,
        source: 'fallback',
        error: getTrainingPlanErrorMessage('INVALID_PLAN_RESPONSE'),
        code: 'INVALID_PLAN_RESPONSE',
        status: 502,
      };
    }

    devLog('PLAN_REMOTE_SUCCESS', { status: 200 });
    const safety = evaluateTrainingSafety({ dailyReadiness: input.dailyReadiness as unknown as Record<string, unknown>, injuries: input.injuries });
    const safePlan = applyPlanSafetyOverrides(validation.plan, safety);
    const safeValidation = validateGeneratedTrainingPlan(safePlan);
    if (!safeValidation.ok) {
      devLog('PLAN_REMOTE_FAILED', { status: 502, code: 'INVALID_PLAN_RESPONSE' });
      return {
        plan: null,
        source: 'fallback',
        error: getTrainingPlanErrorMessage('INVALID_PLAN_RESPONSE'),
        code: 'INVALID_PLAN_RESPONSE',
        status: 502,
      };
    }
    return { plan: safeValidation.plan, source: 'openai' };
  } catch (error) {
    const normalizedError = await normalizeTrainingPlanInvokeError(error);
    devLog('PLAN_REMOTE_FAILED', { status: normalizedError.status, code: normalizedError.code });
    return { plan: null, source: 'fallback', error: normalizedError.message, code: normalizedError.code, status: normalizedError.status };
  }
}
