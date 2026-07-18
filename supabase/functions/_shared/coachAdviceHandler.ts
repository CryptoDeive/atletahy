import { coachAdviceJsonSchema, validateCoachAdvice } from './coachAdviceSchema.ts';
import { applyCoachSafetyOverrides, evaluateTrainingSafety } from './trainingSafety.ts';
import { extractResponsesApiText, isAbortError } from './trainingPlanResponse.ts';
import { hasCurrentAiHealthConsent } from './aiConsentGuard.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400' };
export const COACH_MAX_INPUT_BYTES = 32 * 1024;
export const COACH_OPENAI_TIMEOUT_MS = 45_000;
const topLevelKeys = ['profile', 'physiology', 'availability', 'equipment', 'activeInjuries', 'nutrition', 'dailyReadiness', 'activeWorkout', 'currentWorkoutLog', 'recentWorkoutLogs'];
const bounded1To5 = new Set(['sleepQuality1To5', 'stress1To5', 'fatigue1To5', 'muscleSoreness1To5', 'legSoreness1To5', 'upperSoreness1To5', 'motivation1To5', 'hydration1To5']);
const bounded0To10 = new Set(['pain0To10', 'pain_level_0_10', 'sessionRpe1To10']);
const inputKeys = {
  profile: ['name', 'birthDate', 'heightCm', 'weightKg', 'sex', 'hyroxCategory', 'targetDate', 'mainGoal', 'targetTime', 'onboardingCompleted', 'onboardingCompletedAt'],
  physiology: ['restingHrBaseline', 'restingHrToday', 'maxHr', 'lthr', 'rftp', 'z2PaceLow', 'z2PaceHigh', 'fiveKPace', 'tenKPace', 'hrvBaseline', 'currentRunningVolumeKm', 'currentLongRunKm', 'hyroxExperience', 'strengthExperience'],
  availability: ['availableDays', 'preferredTrainingTime', 'maxSessionMinutes', 'canDoubleSession', 'minHoursBetweenSessions', 'scheduleNotes'],
  equipment: ['skiErg', 'rowErg', 'bikeErg', 'assaultBike', 'sled', 'wallBall', 'sandbag', 'kettlebells', 'dumbbells', 'barbellAndPlates', 'treadmill', 'runningSpace', 'plyoBox'],
  injury: ['id', 'body_area', 'side', 'pain_level_0_10', 'status', 'started_at', 'resolved_at', 'movement_restrictions', 'notes'],
  nutrition: ['goal', 'dietType', 'allergies', 'intolerances', 'caffeineTolerance', 'fastedTrainingPreference', 'mealTiming', 'supplements', 'notes'],
  readiness: ['date', 'sleepHours', 'sleepQuality1To5', 'stress1To5', 'fatigue1To5', 'muscleSoreness1To5', 'legSoreness1To5', 'upperSoreness1To5', 'motivation1To5', 'hydration1To5', 'pain0To10', 'restingHr', 'hrv', 'painLocation', 'notes'],
  workoutLog: ['id', 'date', 'weekId', 'dayId', 'status', 'durationMinutes', 'sessionRpe1To10', 'averageHr', 'maxHr', 'startedAt', 'finishedAt', 'calories', 'completionPercent', 'notes', 'wentWell', 'wentWrong'],
  week: ['id', 'weekNumber', 'phase', 'block', 'startDate', 'endDate', 'label', 'description', 'days'],
  day: ['id', 'dateLabel', 'weekday', 'dayNumber', 'title', 'summary', 'phase', 'block', 'weekNumber', 'isCompleted', 'sections', 'sessionType', 'estimatedDurationMinutes', 'intensity', 'coachNotes', 'nutritionNotes', 'adaptationOptions'],
  section: ['id', 'type', 'title', 'description', 'lines', 'blocks', 'notes', 'loads', 'collapsed'],
  block: ['id', 'title', 'lines', 'subtitle', 'restAfter', 'notes'],
} as const;

type Client = { auth: { getUser: () => Promise<{ data: { user: unknown | null }; error: unknown }> }; rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const response = (body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...headers } });

function bounded(value: unknown, depth = 0): boolean {
  if (depth > 16) return false;
  if (typeof value === 'string') return value.length <= 1000;
  if (typeof value === 'number') return Number.isFinite(value);
  if (value === null || typeof value === 'boolean' || value === undefined) return true;
  if (Array.isArray(value)) return value.length <= 100 && value.every((item) => bounded(item, depth + 1));
  if (!isRecord(value) || Object.keys(value).length > 40) return false;
  return Object.entries(value).every(([key, item]) => {
    if (bounded1To5.has(key) && typeof item === 'number' && (item < 1 || item > 5)) return false;
    if (bounded0To10.has(key) && typeof item === 'number' && (item < 0 || item > 10)) return false;
    if (key === 'sleepHours' && typeof item === 'number' && (item < 0 || item > 24)) return false;
    return bounded(item, depth + 1);
  });
}

function onlyKeys(value: unknown, allowed: readonly string[]): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).every((key) => allowed.includes(key));
}

const text = (value: unknown, max = 1000) => typeof value === 'string' && value.length <= max;
const finite = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const numberOrEmpty = (value: unknown, min: number, max: number) => value === '' || finite(value, min, max);
const optionalNumberOrEmpty = (value: unknown, min: number, max: number) => value === undefined || numberOrEmpty(value, min, max);
const optionalText = (value: unknown, max = 1000) => value === undefined || text(value, max);
const oneOf = (value: unknown, values: readonly string[]) => typeof value === 'string' && values.includes(value);
const stringList = (value: unknown, maxItems = 20, maxLength = 500) => Array.isArray(value) && value.length <= maxItems && value.every((item) => text(item, maxLength));
const isoDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

function validProfile(value: Record<string, unknown>) {
  return text(value.name, 120) && isoDate(value.birthDate)
    && numberOrEmpty(value.heightCm, 50, 300) && numberOrEmpty(value.weightKg, 20, 500)
    && optionalText(value.sex, 40) && text(value.hyroxCategory, 100) && isoDate(value.targetDate)
    && oneOf(value.mainGoal, ['terminar', 'mejorar_marca', 'competir'])
    && optionalText(value.targetTime, 40)
    && (value.onboardingCompleted === undefined || typeof value.onboardingCompleted === 'boolean')
    && optionalText(value.onboardingCompletedAt, 50);
}

function validPhysiology(value: Record<string, unknown>) {
  return numberOrEmpty(value.restingHrBaseline, 20, 250) && numberOrEmpty(value.restingHrToday, 20, 250)
    && numberOrEmpty(value.maxHr, 40, 250) && numberOrEmpty(value.lthr, 40, 250)
    && text(value.rftp, 40) && text(value.z2PaceLow, 40) && text(value.z2PaceHigh, 40)
    && text(value.fiveKPace, 40) && text(value.tenKPace, 40)
    && optionalNumberOrEmpty(value.hrvBaseline, 0, 300)
    && optionalNumberOrEmpty(value.currentRunningVolumeKm, 0, 500)
    && optionalNumberOrEmpty(value.currentLongRunKm, 0, 200)
    && optionalText(value.hyroxExperience, 500) && optionalText(value.strengthExperience, 500);
}

function validAvailability(value: Record<string, unknown>) {
  return stringList(value.availableDays, 7, 20) && text(value.preferredTrainingTime, 40)
    && numberOrEmpty(value.maxSessionMinutes, 0, 1440) && typeof value.canDoubleSession === 'boolean'
    && numberOrEmpty(value.minHoursBetweenSessions, 0, 24) && text(value.scheduleNotes, 1000);
}

function validEquipment(value: Record<string, unknown>) {
  return inputKeys.equipment.every((key) => typeof value[key] === 'boolean');
}

function validInjury(value: Record<string, unknown>) {
  return text(value.id, 120) && text(value.body_area, 120) && text(value.side, 40)
    && numberOrEmpty(value.pain_level_0_10, 0, 10) && oneOf(value.status, ['active', 'improving', 'resolved'])
    && optionalText(value.started_at, 50) && optionalText(value.resolved_at, 50)
    && text(value.movement_restrictions, 1000) && text(value.notes, 1000);
}

function validNutrition(value: Record<string, unknown>) {
  return oneOf(value.goal, ['rendimiento', 'mantenimiento', 'perdida_grasa'])
    && text(value.dietType, 120) && text(value.allergies, 1000) && text(value.intolerances, 1000)
    && text(value.caffeineTolerance, 120) && text(value.fastedTrainingPreference, 120)
    && text(value.mealTiming, 1000) && optionalText(value.supplements, 1000) && text(value.notes, 1000);
}

function validReadiness(value: Record<string, unknown>) {
  return isoDate(value.date) && numberOrEmpty(value.sleepHours, 0, 24)
    && ['sleepQuality1To5', 'stress1To5', 'fatigue1To5', 'muscleSoreness1To5', 'legSoreness1To5', 'upperSoreness1To5', 'motivation1To5', 'hydration1To5'].every((key) => numberOrEmpty(value[key], 1, 5))
    && numberOrEmpty(value.pain0To10, 0, 10) && optionalNumberOrEmpty(value.restingHr, 20, 250)
    && optionalNumberOrEmpty(value.hrv, 0, 300) && text(value.painLocation, 500) && text(value.notes, 1000);
}

function validWorkoutLog(value: Record<string, unknown>) {
  return text(value.id, 120) && isoDate(value.date) && text(value.weekId, 120) && text(value.dayId, 120)
    && oneOf(value.status, ['completado', 'parcial', 'saltado', 'adaptado'])
    && numberOrEmpty(value.durationMinutes, 0, 1440) && numberOrEmpty(value.sessionRpe1To10, 1, 10)
    && numberOrEmpty(value.averageHr, 0, 300) && numberOrEmpty(value.maxHr, 0, 300)
    && optionalText(value.startedAt, 50) && optionalText(value.finishedAt, 50)
    && optionalNumberOrEmpty(value.calories, 0, 20000) && numberOrEmpty(value.completionPercent, 0, 100)
    && text(value.notes, 1000) && text(value.wentWell, 1000) && text(value.wentWrong, 1000);
}

function validSection(value: unknown) {
  if (!onlyKeys(value, inputKeys.section)) return false;
  if (!text(value.id, 120) || !text(value.type, 80) || !text(value.title, 200) || !optionalText(value.description, 1000) || typeof value.collapsed !== 'boolean') return false;
  if (value.lines !== undefined && !stringList(value.lines, 100, 500)) return false;
  if (value.notes !== undefined && !stringList(value.notes, 100, 500)) return false;
  if (value.blocks !== undefined && (!Array.isArray(value.blocks) || !value.blocks.every((block) => onlyKeys(block, inputKeys.block)
    && text(block.id, 120) && text(block.title, 200) && stringList(block.lines, 100, 500)
    && optionalText(block.subtitle, 500) && optionalText(block.restAfter, 200)
    && (block.notes === undefined || stringList(block.notes, 100, 500))))) return false;
  if (value.loads !== undefined && (!isRecord(value.loads) || !Object.values(value.loads).every((loads) => stringList(loads, 100, 200)))) return false;
  return true;
}

function validDay(value: unknown) {
  return onlyKeys(value, inputKeys.day) && text(value.id, 120) && text(value.dateLabel, 120) && text(value.weekday, 40)
    && finite(value.dayNumber, 1, 31) && text(value.title, 200) && text(value.summary, 1000)
    && text(value.phase, 120) && text(value.block, 120) && finite(value.weekNumber, 0, 100)
    && typeof value.isCompleted === 'boolean' && Array.isArray(value.sections) && value.sections.length <= 50 && value.sections.every(validSection)
    && optionalText(value.sessionType, 80) && (value.estimatedDurationMinutes === undefined || finite(value.estimatedDurationMinutes, 0, 1440))
    && optionalText(value.intensity, 80) && (value.coachNotes === undefined || stringList(value.coachNotes))
    && (value.nutritionNotes === undefined || stringList(value.nutritionNotes))
    && (value.adaptationOptions === undefined || stringList(value.adaptationOptions));
}

function validWeek(value: unknown) {
  return onlyKeys(value, inputKeys.week) && text(value.id, 120) && finite(value.weekNumber, 0, 100)
    && text(value.phase, 120) && text(value.block, 120) && isoDate(value.startDate) && isoDate(value.endDate)
    && text(value.label, 200) && text(value.description, 1000)
    && Array.isArray(value.days) && value.days.length <= 31 && value.days.every(validDay);
}

function validKnownInputShapes(input: Record<string, unknown>) {
  if (!onlyKeys(input.profile, inputKeys.profile) || !validProfile(input.profile)
    || !onlyKeys(input.physiology, inputKeys.physiology) || !validPhysiology(input.physiology)
    || !onlyKeys(input.availability, inputKeys.availability) || !validAvailability(input.availability)
    || !onlyKeys(input.equipment, inputKeys.equipment) || !validEquipment(input.equipment)
    || !onlyKeys(input.nutrition, inputKeys.nutrition) || !validNutrition(input.nutrition)) return false;
  if (input.dailyReadiness !== null && (!onlyKeys(input.dailyReadiness, inputKeys.readiness) || !validReadiness(input.dailyReadiness))) return false;
  if (input.currentWorkoutLog !== null && (!onlyKeys(input.currentWorkoutLog, inputKeys.workoutLog) || !validWorkoutLog(input.currentWorkoutLog))) return false;
  if (!Array.isArray(input.activeInjuries) || !input.activeInjuries.every((injury) => onlyKeys(injury, inputKeys.injury) && validInjury(injury))) return false;
  if (!Array.isArray(input.recentWorkoutLogs) || !input.recentWorkoutLogs.every((log) => onlyKeys(log, inputKeys.workoutLog) && validWorkoutLog(log))) return false;
  if (!onlyKeys(input.activeWorkout, ['week', 'day'])) return false;
  return validWeek(input.activeWorkout.week) && validDay(input.activeWorkout.day);
}

function validBody(body: unknown): body is { input: Record<string, unknown> } {
  return isRecord(body) && Object.keys(body).length === 1 && isRecord(body.input)
    && Object.keys(body.input).length === topLevelKeys.length && topLevelKeys.every((key) => key in body.input)
    && Array.isArray(body.input.activeInjuries) && body.input.activeInjuries.length <= 20
    && Array.isArray(body.input.recentWorkoutLogs) && body.input.recentWorkoutLogs.length <= 7
    && validKnownInputShapes(body.input)
    && bounded(body.input);
}

function publishableKey(getEnv: (name: string) => string | undefined) {
  return getEnv('SUPABASE_ANON_KEY') ?? getEnv('SUPABASE_PUBLISHABLE_KEY');
}

export function createCoachAdviceHandler({ getEnv, createSupabaseClient, fetch = globalThis.fetch.bind(globalThis), openAiTimeoutMs = COACH_OPENAI_TIMEOUT_MS, setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout }: {
  getEnv: (name: string) => string | undefined;
  createSupabaseClient: (params: { supabaseUrl: string; supabaseKey: string; authorization: string }) => Client;
  fetch?: typeof globalThis.fetch;
  openAiTimeoutMs?: number;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== 'POST') return response({ error: 'Método no permitido.', code: 'INVALID_INPUT' }, 405);
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return response({ error: 'Sesión requerida.', code: 'AUTH_REQUIRED' }, 401);
    let body: unknown;
    try { body = await req.json(); } catch { return response({ error: 'JSON inválido.', code: 'INVALID_INPUT' }, 400); }
    if (!isRecord(body) || !isRecord(body.input)) return response({ error: 'Body inválido.', code: 'INVALID_INPUT' }, 400);
    if (new TextEncoder().encode(JSON.stringify(body.input)).length > COACH_MAX_INPUT_BYTES) return response({ error: 'Input demasiado grande.', code: 'INVALID_INPUT' }, 413);
    if (!validBody(body)) return response({ error: 'Input inválido.', code: 'INVALID_INPUT' }, 400);

    const url = getEnv('SUPABASE_URL'); const key = publishableKey(getEnv);
    if (!url || !key) return response({ error: 'Servicio no configurado.', code: 'OPENAI_ERROR' }, 500);
    let client: Client;
    try {
      client = createSupabaseClient({ supabaseUrl: url, supabaseKey: key, authorization });
      const auth = await client.auth.getUser();
      if (auth.error || !auth.data.user) return response({ error: 'Sesión no válida.', code: 'AUTH_REQUIRED' }, 401);
    } catch { return response({ error: 'No se pudo validar la sesión.', code: 'OPENAI_ERROR' }, 500); }

    if (!await hasCurrentAiHealthConsent(client)) {
      return response({ error: 'Se requiere consentimiento vigente para usar datos de salud con IA.', code: 'CONSENT_REQUIRED' }, 403);
    }

    try {
      const quota = await client.rpc('consume_ai_quota', { p_feature: 'coach_advice' });
      if (quota.error) return response({ error: 'No se pudo comprobar la cuota.', code: 'OPENAI_ERROR' }, 500);
      const row = Array.isArray(quota.data) ? quota.data[0] : quota.data;
      if (isRecord(row) && row.allowed === false) return response({ error: 'Límite diario de Coach IA alcanzado.', code: 'AI_QUOTA_EXCEEDED' }, 429, { 'Retry-After': String(row.retry_after_seconds ?? 86400) });
    } catch { return response({ error: 'No se pudo comprobar la cuota.', code: 'OPENAI_ERROR' }, 500); }

    const openAiKey = getEnv('OPENAI_API_KEY');
    if (!openAiKey) return response({ error: 'OpenAI no configurado.', code: 'OPENAI_NOT_CONFIGURED' }, 500);
    const safety = evaluateTrainingSafety({ dailyReadiness: body.input.dailyReadiness as Record<string, unknown> | null, injuries: body.input.activeInjuries as Array<Record<string, unknown>> });
    const controller = new AbortController(); const timeout = setTimeoutFn(() => controller.abort(), openAiTimeoutMs);
    try {
      const upstream = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ model: 'gpt-4.1-mini', instructions: 'Coach HYROX seguro. Responde sólo JSON válido. Las reglas de seguridad deterministas prevalecen.', input: JSON.stringify(body.input), text: { format: { type: 'json_schema', name: 'coach_advice', strict: true, schema: coachAdviceJsonSchema } }, max_output_tokens: 2400 }) });
      if (!upstream.ok) return response({ error: 'Servicio remoto no disponible.', code: 'OPENAI_ERROR' }, 502);
      const text = extractResponsesApiText(await upstream.json());
      if (!text) return response({ error: 'Respuesta remota inválida.', code: 'INVALID_OPENAI_RESPONSE' }, 502);
      let parsed: unknown; try { parsed = JSON.parse(text); } catch { return response({ error: 'Respuesta remota inválida.', code: 'INVALID_OPENAI_RESPONSE' }, 502); }
      const safe = applyCoachSafetyOverrides(parsed as Record<string, unknown>, safety);
      const validation = validateCoachAdvice(safe);
      return validation.ok ? response({ advice: validation.advice, source: 'openai' }) : response({ error: 'Respuesta remota inválida.', code: 'INVALID_OPENAI_RESPONSE' }, 502);
    } catch (error) {
      return isAbortError(error) || controller.signal.aborted ? response({ error: 'Coach IA agotó el tiempo de espera.', code: 'OPENAI_TIMEOUT' }, 504) : response({ error: 'Servicio remoto no disponible.', code: 'OPENAI_ERROR' }, 502);
    } finally { clearTimeoutFn(timeout); }
  };
}
