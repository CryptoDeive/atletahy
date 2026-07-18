import {
  GENERATED_TRAINING_PLAN_DAYS_PER_WEEK,
  GENERATED_TRAINING_PLAN_WEEKS,
  trainingPlanJsonSchema,
  validateGeneratedTrainingPlan,
} from './trainingPlanContract.ts';
import { validatePlanGenerationInput } from './trainingPlanInput.ts';
import { extractResponsesApiText, isAbortError } from './trainingPlanResponse.ts';
import { applyPlanSafetyOverrides, evaluateTrainingSafety } from './trainingSafety.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export const OPENAI_TIMEOUT_MS = 120_000;
export const PLAN_MAX_OUTPUT_TOKENS = 6_000;
export const PLAN_MAX_INPUT_BYTES = 64 * 1024;
const textEncoder = new TextEncoder();

const systemPrompt = `Eres un entrenador experto HYROX para HyDeivi.
Devuelve exclusivamente JSON válido y conciso que cumpla el schema.
Reglas obligatorias:
- Genera exactamente ${GENERATED_TRAINING_PLAN_WEEKS} semanas completas de ${GENERATED_TRAINING_PLAN_DAYS_PER_WEEK} días consecutivos cada una.
- Usa totalWeeks=${GENERATED_TRAINING_PLAN_WEEKS} y generatedWeeks=${GENERATED_TRAINING_PLAN_WEEKS}; ambos deben coincidir con weeks.length.
- Usa sessionType sólo con: run, strength, hyrox, engine, mobility, rest.
- Todo día de descanso debe usar exactamente sessionType="rest" e intensity="rest".
- Usa intensity sólo con: rest, low, moderate, high.
- Mantén assumptions, nutritionNotes, week.notes, day.notes y adaptationOptions con un máximo de 3 elementos.
- En este contrato, coachNotes corresponde a los arrays notes de semana, día y sección; cada uno tiene un máximo de 3 elementos.
- Mantén sections por día entre 1 y 3; exercises por section entre 1 y 3.
- Títulos, objetivos, descripciones y notas deben ser breves y accionables; sin párrafos largos ni relleno.
- Respeta lesiones, disponibilidad, tiempo máximo y material disponible.
- Si faltan datos, usa un enfoque conservador y dilo en assumptions.
- No sustituyas semanas existentes de la app.`;

type TrainingPlanTelemetryDetails = {
  elapsedMs: number;
  openAiStatus?: number;
  errorCode?: string;
  weeksReturned?: number;
};

type SupabaseClientLike = {
  auth: {
    getUser: () => Promise<{ data: { user: unknown | null }; error: unknown }>;
  };
  rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function errorResponse(code: string, status: number, message: string) {
  return jsonResponse({ error: message, code }, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactInputBody(value: unknown): value is { input: Record<string, unknown> } {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === 'input' && isRecord(value.input);
}

function getReturnedWeeks(value: unknown) {
  return isRecord(value) && Array.isArray(value.weeks) ? value.weeks.length : undefined;
}

function getDefaultPublishableKey(getEnv: (name: string) => string | undefined) {
  const legacyAnonKey = getEnv('SUPABASE_ANON_KEY');
  if (legacyAnonKey) return legacyAnonKey;

  const singlePublishableKey = getEnv('SUPABASE_PUBLISHABLE_KEY');
  if (singlePublishableKey) return singlePublishableKey;

  const publishableKeysJson = getEnv('SUPABASE_PUBLISHABLE_KEYS');
  if (!publishableKeysJson) return null;

  try {
    const publishableKeys = JSON.parse(publishableKeysJson);
    return typeof publishableKeys?.default === 'string' ? publishableKeys.default : null;
  } catch {
    return null;
  }
}

export function createTrainingPlanHandler({
  getEnv,
  createSupabaseClient,
  fetch = globalThis.fetch.bind(globalThis),
  log = (stage: string, details: TrainingPlanTelemetryDetails) => {
    console.info(`[generate-training-plan] ${JSON.stringify({ stage, ...details })}`);
  },
  openAiTimeoutMs = OPENAI_TIMEOUT_MS,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  now = () => Date.now(),
}: {
  getEnv: (name: string) => string | undefined;
  createSupabaseClient: (params: { supabaseUrl: string; supabaseKey: string; authorization: string }) => SupabaseClientLike;
  fetch?: typeof globalThis.fetch;
  log?: (stage: string, details: TrainingPlanTelemetryDetails) => void;
  openAiTimeoutMs?: number;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
  now?: () => number;
}) {
  return async function handleTrainingPlanRequest(req: Request) {
    const startedAt = now();
    const emit = (stage: string, details: Omit<TrainingPlanTelemetryDetails, 'elapsedMs'> = {}) => {
      log(stage, { elapsedMs: now() - startedAt, ...details });
    };
    const fail = (code: string, status: number, message: string, details: Omit<TrainingPlanTelemetryDetails, 'elapsedMs' | 'errorCode'> = {}) => {
      emit('failed', { ...details, errorCode: code });
      return errorResponse(code, status, message);
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    emit('request_received');

    if (req.method !== 'POST') {
      return fail('INVALID_INPUT', 405, 'Método no permitido.');
    }

    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return fail('AUTH_REQUIRED', 401, 'Sesión requerida.');
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail('INVALID_INPUT', 400, 'JSON inválido.');
    }

    if (!hasExactInputBody(body)) {
      return fail('INVALID_INPUT', 400, 'Body inválido: se requiere exactamente { input }.');
    }

    if (textEncoder.encode(JSON.stringify(body.input)).length > PLAN_MAX_INPUT_BYTES) {
      return fail('INVALID_INPUT', 413, 'El input supera el tamaño permitido.');
    }

    if (!validatePlanGenerationInput(body.input)) {
      return fail('INVALID_INPUT', 400, 'La estructura de input no es válida.');
    }

    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseKey = getDefaultPublishableKey(getEnv);
    if (!supabaseUrl || !supabaseKey) {
      return fail('OPENAI_ERROR', 500, 'No se pudo preparar el servicio remoto.');
    }

    let userData: { user: unknown | null };
    let userError: unknown;
    let supabase: SupabaseClientLike;
    try {
      supabase = createSupabaseClient({ supabaseUrl, supabaseKey, authorization });
      ({ data: userData, error: userError } = await supabase.auth.getUser());
    } catch {
      return fail('OPENAI_ERROR', 500, 'No se pudo validar la sesión.');
    }
    if (userError || !userData.user) {
      return fail('AUTH_REQUIRED', 401, 'Sesión no válida.');
    }
    emit('auth_ok');

    let quotaData: unknown;
    try {
      const quota = await supabase.rpc('consume_ai_quota', { p_feature: 'training_plan' });
      if (quota.error) return fail('OPENAI_ERROR', 500, 'No se pudo comprobar la cuota de IA.');
      quotaData = quota.data;
    } catch {
      return fail('OPENAI_ERROR', 500, 'No se pudo comprobar la cuota de IA.');
    }
    const quotaRow = Array.isArray(quotaData) ? quotaData[0] : quotaData;
    if (isRecord(quotaRow) && quotaRow.allowed === false) {
      emit('failed', { errorCode: 'AI_QUOTA_EXCEEDED' });
      return jsonResponse({ error: 'Límite diario de planes IA alcanzado.', code: 'AI_QUOTA_EXCEEDED' }, 429, { 'Retry-After': String(quotaRow.retry_after_seconds ?? 86400) });
    }

    const openAiKey = getEnv('OPENAI_API_KEY');
    if (!openAiKey) {
      return fail('OPENAI_NOT_CONFIGURED', 500, 'OpenAI no está configurado en el servidor.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeoutFn(() => controller.abort('OPENAI_TIMEOUT'), openAiTimeoutMs);

    try {
      emit('openai_started');
      const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          instructions: systemPrompt,
          input: JSON.stringify(body.input),
          text: {
            format: {
              type: 'json_schema',
              name: 'generated_training_plan',
              strict: true,
              schema: trainingPlanJsonSchema,
            },
          },
          max_output_tokens: PLAN_MAX_OUTPUT_TOKENS,
        }),
      });
      emit('openai_completed', { openAiStatus: openAiResponse.status });

      if (!openAiResponse.ok) {
        return fail('OPENAI_ERROR', 502, 'No se pudo generar el plan remoto.', { openAiStatus: openAiResponse.status });
      }

      let openAiJson: unknown;
      try {
        openAiJson = await openAiResponse.json();
      } catch {
        return fail('INVALID_OPENAI_RESPONSE', 502, 'La respuesta remota no era JSON válido.', { openAiStatus: openAiResponse.status });
      }

      const outputText = extractResponsesApiText(openAiJson);
      if (!outputText) {
        return fail('INVALID_OPENAI_RESPONSE', 502, 'La respuesta remota llegó vacía.', { openAiStatus: openAiResponse.status });
      }

      let parsedPlan: unknown;
      try {
        parsedPlan = JSON.parse(outputText);
      } catch {
        return fail('INVALID_OPENAI_RESPONSE', 502, 'La respuesta remota no contenía JSON válido.', { openAiStatus: openAiResponse.status });
      }
      const weeksReturned = getReturnedWeeks(parsedPlan);
      emit('parse_ok', { openAiStatus: openAiResponse.status, weeksReturned });

      const safety = evaluateTrainingSafety({ dailyReadiness: body.input.dailyReadiness as Record<string, unknown> | null, injuries: body.input.injuries as Array<Record<string, unknown>> });
      const safePlan = applyPlanSafetyOverrides(parsedPlan as Record<string, unknown>, safety);
      const validation = validateGeneratedTrainingPlan(safePlan);
      if (!validation.ok) {
        return fail('INVALID_PLAN_RESPONSE', 502, 'La respuesta remota no cumplió el contrato del plan.', {
          openAiStatus: openAiResponse.status,
          weeksReturned,
        });
      }

      emit('validation_ok', { openAiStatus: openAiResponse.status, weeksReturned: validation.plan.weeks.length });
      return jsonResponse({ plan: validation.plan, source: 'openai' });
    } catch (error) {
      if (isAbortError(error)) {
        return fail('OPENAI_TIMEOUT', 504, 'La generación remota agotó el tiempo de espera.');
      }

      return fail('OPENAI_ERROR', 502, 'No se pudo generar el plan remoto.');
    } finally {
      clearTimeoutFn(timeoutId);
    }
  };
}
