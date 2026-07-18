import type { AthleteState, DailyReadiness, EquipmentAvailability, Injury, WorkoutLog } from '../../types/athlete';
import type { TrainingTestId } from '../../types/tests';
import { trainingTestById } from '../../data/trainingTests';
import {
  BODY_SIDE_VALUES, CAFFEINE_VALUES, DAY_VALUES, DIET_VALUES, EQUIPMENT_KEYS, FASTED_VALUES,
  HYROX_CATEGORY_VALUES, HYROX_EXPERIENCE_VALUES, INJURY_AREA_VALUES, INJURY_STATUS_VALUES,
  MAIN_GOAL_VALUES, NUTRITION_GOAL_VALUES, SEX_VALUES, STRENGTH_EXPERIENCE_VALUES,
  TRAINING_TEST_IDS, TRAINING_TIME_VALUES, WORKOUT_STATUS_VALUES, isCanonicalValue,
} from '../../../supabase/functions/_shared/inputDomains';
import { optionalBoundedNumber, parseBoundedNumber, type FieldIssue, type ValidationResult } from './numbers';
import { validateAdultBirthDate, validateNotFutureDate, validateNotPastDate } from './dates';
import { parseDuration, parsePace } from './durations';

const fail = <T>(issues: FieldIssue[]): ValidationResult<T> => ({ ok: false, issues });
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const trimmed = (value: unknown) => typeof value === 'string' ? value.trim() : value;
const validText = (value: unknown, max: number, required = false) => typeof value === 'string' && value.trim().length <= max && (!required || value.trim().length > 0);
function collect(result: ValidationResult<unknown>, path: string, issues: FieldIssue[]) { if (!result.ok) issues.push(...result.issues.map((issue) => ({ ...issue, path }))); }
function option(value: unknown, values: readonly string[], path: string, issues: FieldIssue[], allowEmpty = true) {
  if ((allowEmpty && value === '') || values.includes(value as string)) return;
  issues.push({ path, code: 'option', message: 'Selecciona una opción válida.' });
}
function isoTimestamp(value: unknown) { return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value)); }
function normalizeArea(value: string) { return INJURY_AREA_VALUES.find((item) => item.toLocaleLowerCase('es') === value.trim().toLocaleLowerCase('es')) ?? value.trim(); }
function normalizeInjury(injury: Injury): Injury { return { ...injury, id: injury.id.trim(), body_area: normalizeArea(injury.body_area), movement_restrictions: injury.movement_restrictions.trim(), notes: injury.notes.trim() }; }

export function validateAthleteState(input: AthleteState, options: { requireProfile?: boolean } = {}): ValidationResult<AthleteState> {
  if (!isRecord(input) || !isRecord(input.profile) || !isRecord(input.physiology) || !isRecord(input.availability) || !isRecord(input.equipment) || !Array.isArray(input.injuries) || !isRecord(input.nutrition)) return fail([{ path: 'athlete', code: 'shape', message: 'Los datos del atleta están dañados.' }]);
  const issues: FieldIssue[] = [];
  const { profile, physiology, availability, equipment, injuries, nutrition } = input;
  if (!validText(profile.name, 500)) issues.push({ path: 'profile.name', code: 'length', message: 'El nombre admite hasta 500 caracteres.' });
  if (options.requireProfile || profile.birthDate) collect(validateAdultBirthDate(profile.birthDate), 'profile.birthDate', issues);
  collect(optionalBoundedNumber(profile.heightCm, { min: 120, max: 230, step: 1 }), 'profile.heightCm', issues);
  collect(optionalBoundedNumber(profile.weightKg, { min: 35, max: 250, step: 0.5 }), 'profile.weightKg', issues);
  option(profile.sex ?? '', SEX_VALUES, 'profile.sex', issues);
  option(profile.hyroxCategory, HYROX_CATEGORY_VALUES, 'profile.hyroxCategory', issues, !options.requireProfile);
  if (profile.hyroxCategoryLegacy?.ambiguous) issues.push({ path: 'profile.hyroxCategory', code: 'legacy', message: `${profile.hyroxCategoryLegacy.label}. Selecciona una categoría oficial.` });
  option(profile.mainGoal, MAIN_GOAL_VALUES, 'profile.mainGoal', issues, false);
  if (options.requireProfile && (profile.heightCm === '' || profile.weightKg === '')) issues.push({ path: 'profile.heightCm', code: 'required', message: 'Completa altura y peso.' });
  if (profile.targetDate) collect(validateNotPastDate(profile.targetDate), 'profile.targetDate', issues);
  if (profile.targetTime) collect(parseDuration(profile.targetTime, { minSeconds: 1800, maxSeconds: 21600 }), 'profile.targetTime', issues);
  if (profile.onboardingCompleted !== undefined && typeof profile.onboardingCompleted !== 'boolean') issues.push({ path: 'profile.onboardingCompleted', code: 'type', message: 'Estado de onboarding no válido.' });
  if (profile.onboardingCompletedAt && !isoTimestamp(profile.onboardingCompletedAt)) issues.push({ path: 'profile.onboardingCompletedAt', code: 'date', message: 'Fecha de onboarding no válida.' });

  const numeric: Array<[unknown, number, number, number | undefined, string]> = [
    [physiology.currentRunningVolumeKm, 0, 300, 0.5, 'physiology.currentRunningVolumeKm'], [physiology.currentLongRunKm, 0, 100, 0.5, 'physiology.currentLongRunKm'],
    [physiology.restingHrBaseline, 25, 240, 1, 'physiology.restingHrBaseline'], [physiology.restingHrToday, 25, 240, 1, 'physiology.restingHrToday'], [physiology.maxHr, 25, 240, 1, 'physiology.maxHr'], [physiology.lthr, 25, 240, 1, 'physiology.lthr'], [physiology.hrvBaseline, 1, 500, 1, 'physiology.hrvBaseline'],
    [availability.maxSessionMinutes, 15, 360, 5, 'availability.maxSessionMinutes'], [availability.minHoursBetweenSessions, 1, 24, 1, 'availability.minHoursBetweenSessions'],
  ];
  numeric.forEach(([raw, min, max, step, path]) => collect(optionalBoundedNumber(raw, { min, max, step }), path, issues));
  for (const key of ['rftp','z2PaceLow','z2PaceHigh','fiveKPace','tenKPace'] as const) if (physiology[key]) collect(parsePace(physiology[key]), `physiology.${key}`, issues);
  option(physiology.hyroxExperience ?? '', HYROX_EXPERIENCE_VALUES, 'physiology.hyroxExperience', issues);
  option(physiology.strengthExperience ?? '', STRENGTH_EXPERIENCE_VALUES, 'physiology.strengthExperience', issues);
  if (typeof physiology.currentLongRunKm === 'number' && typeof physiology.currentRunningVolumeKm === 'number' && physiology.currentLongRunKm > physiology.currentRunningVolumeKm) issues.push({ path: 'physiology.currentLongRunKm', code: 'coherence', message: 'La tirada larga no puede superar el volumen semanal.' });
  if (typeof physiology.lthr === 'number' && typeof physiology.maxHr === 'number' && physiology.lthr > physiology.maxHr) issues.push({ path: 'physiology.lthr', code: 'coherence', message: 'El LTHR no puede superar la FC máxima.' });

  if (!Array.isArray(availability.availableDays) || availability.availableDays.length > 7 || new Set(availability.availableDays).size !== availability.availableDays.length) issues.push({ path: 'availability.availableDays', code: 'shape', message: 'Los días disponibles no son válidos.' });
  else availability.availableDays.forEach((day) => option(day, DAY_VALUES, 'availability.availableDays', issues, false));
  option(availability.preferredTrainingTime, TRAINING_TIME_VALUES, 'availability.preferredTrainingTime', issues);
  if (typeof availability.canDoubleSession !== 'boolean') issues.push({ path: 'availability.canDoubleSession', code: 'type', message: 'La doble sesión debe ser sí o no.' });
  if (!validText(availability.scheduleNotes, 1000)) issues.push({ path: 'availability.scheduleNotes', code: 'length', message: 'Máximo 1000 caracteres.' });

  if (Object.keys(equipment).length !== EQUIPMENT_KEYS.length || !EQUIPMENT_KEYS.every((key) => typeof equipment[key] === 'boolean') || Object.keys(equipment).some((key) => !(EQUIPMENT_KEYS as readonly string[]).includes(key))) issues.push({ path: 'equipment', code: 'shape', message: 'El material contiene valores no válidos.' });
  if (injuries.length > 20) issues.push({ path: 'injuries', code: 'length', message: 'Máximo 20 lesiones.' });
  injuries.forEach((injury, index) => {
    if (!isRecord(injury) || !validText(injury.id, 200, true)) { issues.push({ path: `injuries.${index}.id`, code: 'required', message: 'La lesión necesita un identificador.' }); return; }
    collect(optionalBoundedNumber(injury.pain_level_0_10, { min: 0, max: 10, step: 1 }), `injuries.${index}.pain_level_0_10`, issues);
    option(injury.status, INJURY_STATUS_VALUES, `injuries.${index}.status`, issues, false);
    option(injury.side, BODY_SIDE_VALUES, `injuries.${index}.side`, issues);
    if (injury.body_area && !INJURY_AREA_VALUES.some((area) => area.toLocaleLowerCase('es') === injury.body_area.trim().toLocaleLowerCase('es'))) issues.push({ path: `injuries.${index}.body_area`, code: 'option', message: 'Selecciona una zona corporal válida.' });
    if (Number(injury.pain_level_0_10) > 0 && !injury.body_area.trim()) issues.push({ path: `injuries.${index}.body_area`, code: 'required', message: 'Indica la zona con dolor.' });
    if (!validText(injury.notes, 1000) || !validText(injury.movement_restrictions, 500)) issues.push({ path: `injuries.${index}.notes`, code: 'length', message: 'El texto es demasiado largo.' });
    if (injury.started_at) collect(validateNotFutureDate(injury.started_at), `injuries.${index}.started_at`, issues);
    if (injury.resolved_at) collect(validateNotFutureDate(injury.resolved_at), `injuries.${index}.resolved_at`, issues);
    if (injury.started_at && injury.resolved_at && injury.resolved_at < injury.started_at) issues.push({ path: `injuries.${index}.resolved_at`, code: 'coherence', message: 'La resolución no puede ser anterior al inicio.' });
  });

  option(nutrition.goal, NUTRITION_GOAL_VALUES, 'nutrition.goal', issues, false);
  option(nutrition.dietType, DIET_VALUES, 'nutrition.dietType', issues);
  if (nutrition.dietTypeLegacy?.ambiguous) issues.push({ path: 'nutrition.dietType', code: 'legacy', message: `${nutrition.dietTypeLegacy.label}. Selecciona una dieta válida.` });
  option(nutrition.caffeineTolerance, CAFFEINE_VALUES, 'nutrition.caffeineTolerance', issues);
  option(nutrition.fastedTrainingPreference, FASTED_VALUES, 'nutrition.fastedTrainingPreference', issues);
  for (const [key, max] of [['allergies',500],['intolerances',500],['mealTiming',500],['supplements',500],['notes',1000]] as const) if (!validText(nutrition[key] ?? '', max)) issues.push({ path: `nutrition.${key}`, code: 'length', message: `Máximo ${max} caracteres.` });

  if (issues.length) return fail(issues);
  return { ok: true, value: {
    profile: { ...profile, name: profile.name.trim(), targetTime: profile.targetTime?.trim(), hyroxCategoryLegacy: undefined },
    physiology: { ...physiology, rftp: physiology.rftp.trim(), z2PaceLow: physiology.z2PaceLow.trim(), z2PaceHigh: physiology.z2PaceHigh.trim(), fiveKPace: physiology.fiveKPace.trim(), tenKPace: physiology.tenKPace.trim() },
    availability: { ...availability, scheduleNotes: availability.scheduleNotes.trim() },
    equipment: { ...equipment } as EquipmentAvailability,
    injuries: injuries.map(normalizeInjury),
    nutrition: { ...nutrition, dietTypeLegacy: undefined, allergies: nutrition.allergies.trim(), intolerances: nutrition.intolerances.trim(), mealTiming: nutrition.mealTiming.trim(), supplements: nutrition.supplements?.trim(), notes: nutrition.notes.trim() },
  } };
}

export function validateWorkoutLog(input: WorkoutLog): ValidationResult<WorkoutLog> {
  if (!isRecord(input)) return fail([{ path: 'workout', code: 'shape', message: 'El registro está dañado.' }]);
  const issues: FieldIssue[] = [];
  for (const key of ['id','weekId','dayId'] as const) if (!validText(input[key], 200, true)) issues.push({ path: key, code: 'required', message: 'El identificador no puede estar vacío.' });
  option(input.status, WORKOUT_STATUS_VALUES, 'status', issues, false);
  collect(validateNotFutureDate(input.date), 'date', issues);
  const durationMin = input.status === 'saltado' ? 0 : 1;
  collect(input.status === 'saltado' ? optionalBoundedNumber(input.durationMinutes, { min: 0, max: 600, step: 1 }) : parseBoundedNumber(input.durationMinutes, { min: durationMin, max: 600, step: 1 }), 'durationMinutes', issues);
  collect(input.status === 'saltado' ? optionalBoundedNumber(input.sessionRpe1To10, { min: 1, max: 10, step: 1, integer: true }) : parseBoundedNumber(input.sessionRpe1To10, { min: 1, max: 10, step: 1, integer: true }), 'sessionRpe1To10', issues);
  collect(optionalBoundedNumber(input.completionPercent, { min: 0, max: 100, step: 5 }), 'completionPercent', issues);
  collect(optionalBoundedNumber(input.averageHr, { min: 25, max: 240, step: 1 }), 'averageHr', issues);
  collect(optionalBoundedNumber(input.maxHr, { min: 25, max: 240, step: 1 }), 'maxHr', issues);
  collect(optionalBoundedNumber(input.calories, { min: 0, max: 10000, step: 1 }), 'calories', issues);
  if (typeof input.averageHr === 'number' && typeof input.maxHr === 'number' && input.averageHr > input.maxHr) issues.push({ path: 'averageHr', code: 'coherence', message: 'La FC media no puede superar la máxima.' });
  if (input.startedAt && !isoTimestamp(input.startedAt)) issues.push({ path: 'startedAt', code: 'date', message: 'Hora de inicio no válida.' });
  if (input.finishedAt && !isoTimestamp(input.finishedAt)) issues.push({ path: 'finishedAt', code: 'date', message: 'Hora de fin no válida.' });
  if (input.startedAt && input.finishedAt && Date.parse(input.finishedAt) < Date.parse(input.startedAt)) issues.push({ path: 'finishedAt', code: 'coherence', message: 'La sesión no puede terminar antes de empezar.' });
  for (const [path, value, max] of [['notes', input.notes, 1000], ['wentWell', input.wentWell, 500], ['wentWrong', input.wentWrong, 500]] as const) if (!validText(value, max)) issues.push({ path, code: 'length', message: `Máximo ${max} caracteres.` });
  if (issues.length) return fail(issues);
  return { ok: true, value: { ...input, id: input.id.trim(), weekId: input.weekId.trim(), dayId: input.dayId.trim(), notes: input.notes.trim(), wentWell: input.wentWell.trim(), wentWrong: input.wentWrong.trim() } };
}

export function validateDailyReadiness(input: DailyReadiness): ValidationResult<DailyReadiness> {
  if (!isRecord(input) || !validText(input.painLocation, 100) || !validText(input.notes, 1000)) return fail([{ path: 'readiness', code: 'shape', message: 'El check-in está dañado.' }]);
  const issues: FieldIssue[] = []; collect(validateNotFutureDate(input.date), 'date', issues);
  collect(optionalBoundedNumber(input.sleepHours, { min: 0, max: 24, step: 0.5 }), 'sleepHours', issues);
  for (const key of ['sleepQuality1To5','stress1To5','fatigue1To5','muscleSoreness1To5','legSoreness1To5','upperSoreness1To5','motivation1To5','hydration1To5'] as const) collect(optionalBoundedNumber(input[key], { min: 1, max: 5, step: 1 }), key, issues);
  collect(optionalBoundedNumber(input.pain0To10, { min: 0, max: 10, step: 1 }), 'pain0To10', issues);
  collect(optionalBoundedNumber(input.restingHr, { min: 25, max: 240, step: 1 }), 'restingHr', issues); collect(optionalBoundedNumber(input.hrv, { min: 1, max: 500, step: 1 }), 'hrv', issues);
  if (Number(input.pain0To10) > 0 && !input.painLocation.trim()) issues.push({ path: 'painLocation', code: 'required', message: 'Indica dónde tienes dolor.' });
  return issues.length ? fail(issues) : { ok: true, value: { ...input, painLocation: input.painLocation.trim(), notes: input.notes.trim() } };
}

export function validateTrainingTestResult(testId: TrainingTestId, performedAt: string, result: Record<string, unknown>): ValidationResult<Record<string, unknown>> {
  if (!isRecord(result)) return fail([{ path: 'result', code: 'shape', message: 'El resultado está dañado.' }]);
  if (!isCanonicalValue(testId, TRAINING_TEST_IDS)) return fail([{ path: 'testId', code: 'option', message: 'Test no válido.' }]);
  const test = trainingTestById[testId];
  const issues: FieldIssue[] = []; collect(validateNotFutureDate(performedAt), 'performedAt', issues);
  const allowedKeys = new Set(test.fields.map((field) => field.key));
  Object.keys(result).forEach((key) => { if (!allowedKeys.has(key)) issues.push({ path: key, code: 'unexpected', message: 'Campo no permitido para este test.' }); });
  const normalized: Record<string, unknown> = {};
  for (const field of test.fields) {
    const raw = result[field.key];
    const missing = raw === undefined || raw === null || raw === '';
    if (field.required && missing) { issues.push({ path: field.key, code: 'required', message: `Completa ${field.label}.` }); continue; }
    if (missing) { normalized[field.key] = field.type === 'number' ? null : ''; continue; }
    if (field.type === 'number') collect(parseBoundedNumber(raw, { min: field.min ?? 0, max: field.max ?? 10000, step: field.step ?? 1 }), field.key, issues);
    else if (field.type === 'duration' && field.key === 'averagePace') collect(parsePace(String(raw)), field.key, issues);
    else if (field.type === 'duration') collect(parseDuration(String(raw), { minSeconds: 1, maxSeconds: 21600 }), field.key, issues);
    else if (field.type === 'select' && !field.options?.includes(String(raw))) issues.push({ path: field.key, code: 'option', message: `Selecciona ${field.label}.` });
    else if (field.type === 'boolean' && typeof raw !== 'boolean') issues.push({ path: field.key, code: 'type', message: `${field.label} debe ser sí o no.` });
    else if ((field.type === 'text' || field.type === 'textarea') && !validText(raw, field.type === 'textarea' ? 1000 : 500, field.required)) issues.push({ path: field.key, code: 'length', message: `${field.label} no es válido.` });
    normalized[field.key] = typeof raw === 'string' ? raw.trim() : raw;
  }
  if (Number(result.averageHr) > Number(result.maxHr) || Number(result.last20AverageHr) > Number(result.maxHr)) issues.push({ path: 'averageHr', code: 'coherence', message: 'La media no puede superar el máximo.' });
  if (Number(result.averageWatts) > Number(result.maxWatts)) issues.push({ path: 'averageWatts', code: 'coherence', message: 'La potencia media no puede superar la máxima.' });
  return issues.length ? fail(issues) : { ok: true, value: normalized };
}
