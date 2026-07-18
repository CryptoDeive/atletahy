export type CoachAdviceValidationResult = { ok: true; advice: unknown } | { ok: false; error: string };

const readinessStatuses = new Set(['green', 'yellow', 'red']);
const timeWindows = new Set(['morning', 'midday', 'afternoon', 'evening', 'any']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.length <= 10 && value.every((item) => typeof item === 'string' && item.length <= 1000);
}

function isBoundedString(value: unknown) {
  return typeof value === 'string' && value.length <= 1000;
}

function hasOnlyKeys(record: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(record).every((key) => allowed.includes(key));
}

function requireStringArray(record: Record<string, unknown>, key: string): string | null {
  return isStringArray(record[key]) ? null : `${key} debe ser un array de strings`;
}

export function validateCoachAdvice(value: unknown): CoachAdviceValidationResult {
  if (!isRecord(value)) return { ok: false, error: 'CoachAdvice debe ser un objeto' };
  const allowedKeys = ['readinessStatus', 'summary', 'objective', 'strategy', 'pacing', 'techniqueFocus', 'warmupAdjustments', 'riskWarnings', 'modifications', 'nutrition', 'scheduling', 'checklist'];
  if (!Object.keys(value).every((key) => allowedKeys.includes(key))) return { ok: false, error: 'Campo no permitido' };
  if (!readinessStatuses.has(String(value.readinessStatus))) return { ok: false, error: 'readinessStatus inválido' };
  if (typeof value.summary !== 'string' || value.summary.trim().length === 0 || value.summary.length > 1000) return { ok: false, error: 'summary inválido' };
  if (typeof value.objective !== 'string' || value.objective.trim().length === 0 || value.objective.length > 1000) return { ok: false, error: 'objective inválido' };

  for (const key of ['strategy', 'pacing', 'techniqueFocus', 'warmupAdjustments', 'riskWarnings', 'checklist']) {
    const error = requireStringArray(value, key);
    if (error) return { ok: false, error };
  }

  if (!Array.isArray(value.modifications) || value.modifications.length > 10) return { ok: false, error: 'modifications inválido' };
  for (const modification of value.modifications) {
    if (!isRecord(modification)) return { ok: false, error: 'modification inválida' };
    if (!hasOnlyKeys(modification, ['condition', 'recommendation', 'keepOriginalIntent'])) return { ok: false, error: 'Campo de modification no permitido' };
    if (!isBoundedString(modification.condition)) return { ok: false, error: 'modification.condition inválido' };
    if (!isBoundedString(modification.recommendation)) return { ok: false, error: 'modification.recommendation inválido' };
    if (typeof modification.keepOriginalIntent !== 'boolean') return { ok: false, error: 'modification.keepOriginalIntent inválido' };
  }

  if (!isRecord(value.nutrition)) return { ok: false, error: 'nutrition inválido' };
  if (!hasOnlyKeys(value.nutrition, ['preWorkout', 'intraWorkout', 'postWorkout', 'hydration', 'caffeine'])) return { ok: false, error: 'Campo de nutrition no permitido' };
  for (const key of ['preWorkout', 'intraWorkout', 'postWorkout', 'hydration']) {
    const error = requireStringArray(value.nutrition, key);
    if (error) return { ok: false, error: `nutrition.${error}` };
  }
  if (value.nutrition.caffeine !== undefined && !isBoundedString(value.nutrition.caffeine)) return { ok: false, error: 'nutrition.caffeine inválido' };

  if (!isRecord(value.scheduling)) return { ok: false, error: 'scheduling inválido' };
  if (!hasOnlyKeys(value.scheduling, ['bestTimeWindow', 'reason', 'doubleSessionRecommended', 'doubleSessionPlan'])) return { ok: false, error: 'Campo de scheduling no permitido' };
  if (!timeWindows.has(String(value.scheduling.bestTimeWindow))) return { ok: false, error: 'scheduling.bestTimeWindow inválido' };
  if (!isBoundedString(value.scheduling.reason)) return { ok: false, error: 'scheduling.reason inválido' };
  if (typeof value.scheduling.doubleSessionRecommended !== 'boolean') return { ok: false, error: 'scheduling.doubleSessionRecommended inválido' };

  if (value.scheduling.doubleSessionPlan !== undefined) {
    const plan = value.scheduling.doubleSessionPlan;
    if (!isRecord(plan)) return { ok: false, error: 'doubleSessionPlan inválido' };
    if (!hasOnlyKeys(plan, ['session1', 'session2', 'minimumHoursBetween'])) return { ok: false, error: 'Campo de doubleSessionPlan no permitido' };
    if (!isBoundedString(plan.session1)) return { ok: false, error: 'doubleSessionPlan.session1 inválido' };
    if (!isBoundedString(plan.session2)) return { ok: false, error: 'doubleSessionPlan.session2 inválido' };
    if (typeof plan.minimumHoursBetween !== 'number' || !Number.isFinite(plan.minimumHoursBetween) || plan.minimumHoursBetween < 1 || plan.minimumHoursBetween > 24) return { ok: false, error: 'doubleSessionPlan.minimumHoursBetween inválido' };
  }

  return { ok: true, advice: value };
}

const stringArraySchema = { type: 'array', maxItems: 10, items: { type: 'string' } } as const;

export const coachAdviceJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'readinessStatus',
    'summary',
    'objective',
    'strategy',
    'pacing',
    'techniqueFocus',
    'warmupAdjustments',
    'riskWarnings',
    'modifications',
    'nutrition',
    'scheduling',
    'checklist',
  ],
  properties: {
    readinessStatus: { type: 'string', enum: ['green', 'yellow', 'red'] },
    summary: { type: 'string' },
    objective: { type: 'string' },
    strategy: stringArraySchema,
    pacing: stringArraySchema,
    techniqueFocus: stringArraySchema,
    warmupAdjustments: stringArraySchema,
    riskWarnings: stringArraySchema,
    modifications: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['condition', 'recommendation', 'keepOriginalIntent'],
        properties: {
          condition: { type: 'string' },
          recommendation: { type: 'string' },
          keepOriginalIntent: { type: 'boolean' },
        },
      },
    },
    nutrition: {
      type: 'object',
      additionalProperties: false,
      required: ['preWorkout', 'intraWorkout', 'postWorkout', 'hydration'],
      properties: {
        preWorkout: stringArraySchema,
        intraWorkout: stringArraySchema,
        postWorkout: stringArraySchema,
        hydration: stringArraySchema,
        caffeine: { type: 'string' },
      },
    },
    scheduling: {
      type: 'object',
      additionalProperties: false,
      required: ['bestTimeWindow', 'reason', 'doubleSessionRecommended'],
      properties: {
        bestTimeWindow: { type: 'string', enum: ['morning', 'midday', 'afternoon', 'evening', 'any'] },
        reason: { type: 'string' },
        doubleSessionRecommended: { type: 'boolean' },
        doubleSessionPlan: {
          type: 'object',
          additionalProperties: false,
          required: ['session1', 'session2', 'minimumHoursBetween'],
          properties: {
            session1: { type: 'string' },
            session2: { type: 'string' },
            minimumHoursBetween: { type: 'number', minimum: 1, maximum: 24 },
          },
        },
      },
    },
    checklist: stringArraySchema,
  },
} as const;
