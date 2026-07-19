import type { CoachAdvice } from '../types/coach';

type ValidationResult = { ok: true; advice: CoachAdvice } | { ok: false; error: string };

const readinessStatuses = new Set(['green', 'yellow', 'red']);
const timeWindows = new Set(['morning', 'midday', 'afternoon', 'evening', 'any']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function requireStringArray(record: Record<string, unknown>, key: string): string | null {
  return isStringArray(record[key]) ? null : `${key} debe ser un array de strings`;
}

export function validateCoachAdvice(value: unknown): ValidationResult {
  if (!isRecord(value)) return { ok: false, error: 'CoachAdvice debe ser un objeto' };

  if (!readinessStatuses.has(String(value.readinessStatus))) {
    return { ok: false, error: 'readinessStatus inválido' };
  }

  if (typeof value.summary !== 'string' || value.summary.trim().length === 0) {
    return { ok: false, error: 'summary debe ser un string no vacío' };
  }

  if (typeof value.objective !== 'string' || value.objective.trim().length === 0) {
    return { ok: false, error: 'objective debe ser un string no vacío' };
  }

  for (const key of ['strategy', 'pacing', 'techniqueFocus', 'warmupAdjustments', 'riskWarnings', 'checklist']) {
    const error = requireStringArray(value, key);
    if (error) return { ok: false, error };
  }

  if (!Array.isArray(value.modifications)) {
    return { ok: false, error: 'modifications debe ser un array' };
  }

  for (const modification of value.modifications) {
    if (!isRecord(modification)) return { ok: false, error: 'Cada modificación debe ser un objeto' };
    if (typeof modification.condition !== 'string') return { ok: false, error: 'modification.condition debe ser string' };
    if (typeof modification.recommendation !== 'string') return { ok: false, error: 'modification.recommendation debe ser string' };
    if (typeof modification.keepOriginalIntent !== 'boolean') return { ok: false, error: 'modification.keepOriginalIntent debe ser boolean' };
  }

  if (!isRecord(value.nutrition)) return { ok: false, error: 'nutrition debe ser un objeto' };
  for (const key of ['preWorkout', 'intraWorkout', 'postWorkout', 'hydration']) {
    const error = requireStringArray(value.nutrition, key);
    if (error) return { ok: false, error: `nutrition.${error}` };
  }
  if (value.nutrition.caffeine !== undefined && value.nutrition.caffeine !== null && typeof value.nutrition.caffeine !== 'string') {
    return { ok: false, error: 'nutrition.caffeine debe ser string si existe' };
  }

  if (!isRecord(value.scheduling)) return { ok: false, error: 'scheduling debe ser un objeto' };
  if (!timeWindows.has(String(value.scheduling.bestTimeWindow))) return { ok: false, error: 'scheduling.bestTimeWindow inválido' };
  if (typeof value.scheduling.reason !== 'string') return { ok: false, error: 'scheduling.reason debe ser string' };
  if (typeof value.scheduling.doubleSessionRecommended !== 'boolean') return { ok: false, error: 'scheduling.doubleSessionRecommended debe ser boolean' };

  if (value.scheduling.doubleSessionPlan !== undefined && value.scheduling.doubleSessionPlan !== null) {
    const plan = value.scheduling.doubleSessionPlan;
    if (!isRecord(plan)) return { ok: false, error: 'scheduling.doubleSessionPlan debe ser un objeto' };
    if (typeof plan.session1 !== 'string') return { ok: false, error: 'scheduling.doubleSessionPlan.session1 debe ser string' };
    if (typeof plan.session2 !== 'string') return { ok: false, error: 'scheduling.doubleSessionPlan.session2 debe ser string' };
    if (typeof plan.minimumHoursBetween !== 'number' || !Number.isFinite(plan.minimumHoursBetween)) {
      return { ok: false, error: 'scheduling.doubleSessionPlan.minimumHoursBetween debe ser number' };
    }
  }

  const nutrition = { ...value.nutrition };
  if (nutrition.caffeine === null) delete nutrition.caffeine;
  const scheduling = { ...value.scheduling };
  if (scheduling.doubleSessionPlan === null) delete scheduling.doubleSessionPlan;

  return {
    ok: true,
    advice: { ...value, nutrition, scheduling } as CoachAdvice,
  };
}
