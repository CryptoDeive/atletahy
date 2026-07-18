export const GENERATED_TRAINING_PLAN_WEEKS = 2;
export const GENERATED_TRAINING_PLAN_DAYS_PER_WEEK = 7;
export const MAX_PLAN_ASSUMPTIONS = 3;
export const MAX_PLAN_NUTRITION_NOTES = 3;
export const MAX_WEEK_NOTES = 3;
export const MAX_DAY_NOTES = 3;
export const MAX_DAY_NUTRITION_NOTES = 3;
export const MAX_DAY_ADAPTATION_OPTIONS = 3;
export const MAX_DAY_SECTIONS = 3;
export const MAX_SECTION_EXERCISES = 3;
export const MAX_SECTION_NOTES = 3;

export const generatedTrainingSessionTypes = ['run', 'strength', 'hyrox', 'engine', 'mobility', 'rest'] as const;
export type GeneratedTrainingSessionType = (typeof generatedTrainingSessionTypes)[number];

export const generatedTrainingIntensityValues = ['rest', 'low', 'moderate', 'high'] as const;
export type GeneratedTrainingIntensity = (typeof generatedTrainingIntensityValues)[number];

export const generatedTrainingSectionTypes = ['warmup', 'main', 'strength', 'conditioning', 'mobility', 'recovery'] as const;
export type GeneratedTrainingSectionType = (typeof generatedTrainingSectionTypes)[number];

export const generatedTrainingErrorCodes = [
  'AUTH_REQUIRED',
  'INVALID_INPUT',
  'OPENAI_NOT_CONFIGURED',
  'OPENAI_TIMEOUT',
  'OPENAI_ERROR',
  'INVALID_OPENAI_RESPONSE',
  'INVALID_PLAN_RESPONSE',
  'AI_QUOTA_EXCEEDED',
] as const;
export type GeneratedTrainingPlanErrorCode = (typeof generatedTrainingErrorCodes)[number];

export interface GeneratedTrainingSection {
  id?: string;
  title: string;
  type: GeneratedTrainingSectionType;
  durationMinutes: number;
  description: string;
  exercises: string[];
  intensity: string;
  notes: string[];
}

export interface GeneratedTrainingDay {
  id?: string;
  date: string;
  weekday: string;
  title: string;
  sessionType: GeneratedTrainingSessionType;
  objective: string;
  estimatedDurationMinutes: number;
  intensity: GeneratedTrainingIntensity;
  sections: GeneratedTrainingSection[];
  notes: string[];
  nutritionNotes: string[];
  adaptationOptions: string[];
}

export interface GeneratedTrainingWeek {
  id?: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  focus: string;
  notes: string[];
  days: GeneratedTrainingDay[];
}

export interface GeneratedTrainingPlan {
  title: string;
  objective: string;
  targetRaceDate: string;
  totalWeeks: typeof GENERATED_TRAINING_PLAN_WEEKS;
  generatedWeeks: typeof GENERATED_TRAINING_PLAN_WEEKS;
  generatedAt: string;
  assumptions: string[];
  nutritionNotes: string[];
  weeks: GeneratedTrainingWeek[];
}

export type PlanValidationResult = { ok: true; plan: GeneratedTrainingPlan } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown, maxLength = 240): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function isStringArray(value: unknown, maxItems: number, maxLength = 160): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => isNonEmptyString(item, maxLength));
}

function hasFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isIsoDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isIsoDateTimeString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isEnumValue<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === 'string' && allowed.includes(value as T[number]);
}

function addDays(date: string, offset: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + offset);
  return parsed.toISOString().slice(0, 10);
}

function getWeekdayLabel(date: string) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00.000Z`));
}

function validateSection(section: unknown): section is GeneratedTrainingSection {
  if (!isRecord(section)) return false;
  if (!isNonEmptyString(section.title, 80)) return false;
  if (!isEnumValue(section.type, generatedTrainingSectionTypes)) return false;
  if (!hasFiniteNumber(section.durationMinutes) || section.durationMinutes < 0 || section.durationMinutes > 180) return false;
  if (!isNonEmptyString(section.description, 220)) return false;
  if (!isStringArray(section.exercises, MAX_SECTION_EXERCISES, 120)) return false;
  if (!isNonEmptyString(section.intensity, 32)) return false;
  if (!isStringArray(section.notes, MAX_SECTION_NOTES, 120)) return false;
  return true;
}

function validateDay(day: unknown, expectedDate: string): day is GeneratedTrainingDay {
  if (!isRecord(day)) return false;
  if (!isNonEmptyString(day.title, 80)) return false;
  if (!isIsoDateString(day.date) || day.date !== expectedDate) return false;
  if (!isNonEmptyString(day.weekday, 32)) return false;
  if (day.weekday.trim().toLowerCase() !== getWeekdayLabel(expectedDate).toLowerCase()) return false;
  if (!isEnumValue(day.sessionType, generatedTrainingSessionTypes)) return false;
  if (!isNonEmptyString(day.objective, 160)) return false;
  if (!hasFiniteNumber(day.estimatedDurationMinutes) || day.estimatedDurationMinutes < 0 || day.estimatedDurationMinutes > 180) return false;
  if (!isEnumValue(day.intensity, generatedTrainingIntensityValues)) return false;
  if (!Array.isArray(day.sections) || day.sections.length === 0 || day.sections.length > MAX_DAY_SECTIONS) return false;
  if (!day.sections.every(validateSection)) return false;
  if (!isStringArray(day.notes, MAX_DAY_NOTES, 120)) return false;
  if (!isStringArray(day.nutritionNotes, MAX_DAY_NUTRITION_NOTES, 120)) return false;
  if (!isStringArray(day.adaptationOptions, MAX_DAY_ADAPTATION_OPTIONS, 120) || day.adaptationOptions.length === 0) return false;
  if (day.sessionType === 'rest') {
    if (day.intensity !== 'rest') return false;
    if (day.estimatedDurationMinutes > 45) return false;
  } else if (day.intensity === 'rest') {
    return false;
  }
  return true;
}

function validateWeek(week: unknown, weekIndex: number, expectedStartDate?: string): week is GeneratedTrainingWeek {
  if (!isRecord(week)) return false;
  if (!hasFiniteNumber(week.weekNumber) || week.weekNumber !== weekIndex + 1) return false;
  if (!isIsoDateString(week.startDate)) return false;
  if (!isIsoDateString(week.endDate)) return false;
  if (expectedStartDate && week.startDate !== expectedStartDate) return false;
  if (week.endDate !== addDays(week.startDate, GENERATED_TRAINING_PLAN_DAYS_PER_WEEK - 1)) return false;
  if (!isNonEmptyString(week.focus, 120)) return false;
  if (!isStringArray(week.notes, MAX_WEEK_NOTES, 140)) return false;
  if (!Array.isArray(week.days) || week.days.length !== GENERATED_TRAINING_PLAN_DAYS_PER_WEEK) return false;

  const seenDates = new Set<string>();
  for (let dayIndex = 0; dayIndex < week.days.length; dayIndex += 1) {
    const expectedDateForDay = addDays(week.startDate, dayIndex);
    const day = week.days[dayIndex];
    if (!validateDay(day, expectedDateForDay)) return false;
    if (seenDates.has(day.date)) return false;
    seenDates.add(day.date);
  }

  return true;
}

export function validateGeneratedTrainingPlan(value: unknown): PlanValidationResult {
  if (!isRecord(value)) return { ok: false, error: 'El plan debe ser un objeto.' };
  if (!isNonEmptyString(value.title, 100)) return { ok: false, error: 'title debe ser un string no vacío.' };
  if (!isNonEmptyString(value.objective, 180)) return { ok: false, error: 'objective debe ser un string no vacío.' };
  if (!isIsoDateString(value.targetRaceDate)) return { ok: false, error: 'targetRaceDate debe ser YYYY-MM-DD.' };
  if (value.totalWeeks !== GENERATED_TRAINING_PLAN_WEEKS) return { ok: false, error: 'totalWeeks debe coincidir con las 2 semanas devueltas.' };
  if (value.generatedWeeks !== GENERATED_TRAINING_PLAN_WEEKS) return { ok: false, error: 'generatedWeeks debe ser 2.' };
  if (!isIsoDateTimeString(value.generatedAt)) return { ok: false, error: 'generatedAt debe ser fecha ISO.' };
  if (!isStringArray(value.assumptions, MAX_PLAN_ASSUMPTIONS, 140) || value.assumptions.length === 0) return { ok: false, error: 'assumptions debe contener entre 1 y 3 strings.' };
  if (!isStringArray(value.nutritionNotes, MAX_PLAN_NUTRITION_NOTES, 140) || value.nutritionNotes.length === 0) return { ok: false, error: 'nutritionNotes debe contener entre 1 y 3 strings.' };
  if (!Array.isArray(value.weeks) || value.weeks.length !== GENERATED_TRAINING_PLAN_WEEKS) return { ok: false, error: 'weeks debe contener exactamente 2 semanas.' };
  const weeks = value.weeks as unknown[];
  if (!weeks.every((week, index) => validateWeek(week, index, index === 0 ? undefined : addDays((weeks[index - 1] as GeneratedTrainingWeek).endDate, 1)))) {
    return { ok: false, error: 'weeks contiene semanas o días inválidos.' };
  }

  return { ok: true, plan: value as unknown as GeneratedTrainingPlan };
}

// OpenAI Structured Outputs does not support minLength/maxLength. Text length
// stays enforced by validateGeneratedTrainingPlan after parsing the response.
const stringSchema = (_maxLength: number) => ({ type: 'string' });
const stringArraySchema = (maxItems: number, maxLength: number) => ({
  type: 'array',
  minItems: 1,
  maxItems,
  items: stringSchema(maxLength),
}) as const;
export const trainingPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'objective', 'targetRaceDate', 'totalWeeks', 'generatedWeeks', 'generatedAt', 'assumptions', 'nutritionNotes', 'weeks'],
  properties: {
    title: stringSchema(100),
    objective: stringSchema(180),
    targetRaceDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    totalWeeks: { type: 'number', enum: [GENERATED_TRAINING_PLAN_WEEKS] },
    generatedWeeks: { type: 'number', enum: [GENERATED_TRAINING_PLAN_WEEKS] },
    generatedAt: { type: 'string' },
    assumptions: stringArraySchema(MAX_PLAN_ASSUMPTIONS, 140),
    nutritionNotes: stringArraySchema(MAX_PLAN_NUTRITION_NOTES, 140),
    weeks: {
      type: 'array',
      minItems: GENERATED_TRAINING_PLAN_WEEKS,
      maxItems: GENERATED_TRAINING_PLAN_WEEKS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['weekNumber', 'startDate', 'endDate', 'focus', 'notes', 'days'],
        properties: {
          weekNumber: { type: 'number' },
          startDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          endDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          focus: stringSchema(120),
          notes: {
            type: 'array',
            maxItems: MAX_WEEK_NOTES,
            items: stringSchema(140),
          },
          days: {
            type: 'array',
            minItems: GENERATED_TRAINING_PLAN_DAYS_PER_WEEK,
            maxItems: GENERATED_TRAINING_PLAN_DAYS_PER_WEEK,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['date', 'weekday', 'title', 'sessionType', 'objective', 'estimatedDurationMinutes', 'intensity', 'sections', 'notes', 'nutritionNotes', 'adaptationOptions'],
              properties: {
                date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
                weekday: stringSchema(32),
                title: stringSchema(80),
                sessionType: { type: 'string', enum: [...generatedTrainingSessionTypes] },
                objective: stringSchema(160),
                estimatedDurationMinutes: { type: 'number', minimum: 0, maximum: 180 },
                intensity: { type: 'string', enum: [...generatedTrainingIntensityValues] },
                notes: {
                  type: 'array',
                  maxItems: MAX_DAY_NOTES,
                  items: stringSchema(120),
                },
                nutritionNotes: {
                  type: 'array',
                  maxItems: MAX_DAY_NUTRITION_NOTES,
                  items: stringSchema(120),
                },
                adaptationOptions: stringArraySchema(MAX_DAY_ADAPTATION_OPTIONS, 120),
                sections: {
                  type: 'array',
                  minItems: 1,
                  maxItems: MAX_DAY_SECTIONS,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['title', 'type', 'durationMinutes', 'description', 'exercises', 'intensity', 'notes'],
                    properties: {
                      title: stringSchema(80),
                      type: { type: 'string', enum: [...generatedTrainingSectionTypes] },
                      durationMinutes: { type: 'number', minimum: 0, maximum: 180 },
                      description: stringSchema(220),
                      exercises: stringArraySchema(MAX_SECTION_EXERCISES, 120),
                      intensity: stringSchema(32),
                      notes: {
                        type: 'array',
                        maxItems: MAX_SECTION_NOTES,
                        items: stringSchema(120),
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
