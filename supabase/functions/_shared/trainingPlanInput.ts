function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumberOrEmpty(value: unknown) {
  return value === '' || (typeof value === 'number' && Number.isFinite(value));
}

function isStringArray(value: unknown, maxItems: number, requireItem = false) {
  return Array.isArray(value) && (!requireItem || value.length > 0) && value.length <= maxItems && value.every(isString);
}

function validateObjective(value: unknown) {
  if (!isRecord(value)) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value.targetRaceDate ?? ''))
    && isString(value.mainGoal) && value.mainGoal.length > 0
    && isString(value.category) && value.category.length > 0
    && (value.targetTime === undefined || isString(value.targetTime));
}

function validateCurrentLevel(value: unknown) {
  if (!isRecord(value)) return false;
  const stringKeys = ['hyroxExperience', 'fiveKPace', 'tenKPace', 'strengthExperience'];
  const numericKeys = ['currentRunningVolumeKm', 'currentLongRunKm'];
  return Object.entries(value).every(([key, item]) => (
    stringKeys.includes(key) ? item === undefined || isString(item)
      : numericKeys.includes(key) && isFiniteNumberOrEmpty(item)
  ));
}

function validateAvailability(value: unknown) {
  if (!isRecord(value)) return false;
  return isStringArray(value.availableDays, 7, true)
    && isString(value.preferredTrainingTime)
    && isFiniteNumberOrEmpty(value.maxSessionMinutes)
    && typeof value.canDoubleSession === 'boolean'
    && isFiniteNumberOrEmpty(value.minHoursBetweenSessions)
    && isString(value.scheduleNotes);
}

function validateEquipment(value: unknown) {
  if (!isRecord(value) || !isStringArray(value.available, 20) || !isRecord(value.raw)) return false;
  const raw = value.raw;
  const keys = ['skiErg', 'rowErg', 'bikeErg', 'assaultBike', 'sled', 'wallBall', 'sandbag', 'kettlebells', 'dumbbells', 'barbellAndPlates', 'treadmill', 'runningSpace', 'plyoBox'];
  return Object.keys(raw).every((key) => keys.includes(key)) && keys.every((key) => typeof raw[key] === 'boolean');
}

function validateInjury(value: unknown) {
  if (!isRecord(value)) return false;
  return ['id', 'body_area', 'side', 'status', 'movement_restrictions', 'notes'].every((key) => isString(value[key]))
    && isFiniteNumberOrEmpty(value.pain_level_0_10)
    && (value.started_at === undefined || isString(value.started_at))
    && (value.resolved_at === undefined || isString(value.resolved_at));
}

function validatePhysiology(value: unknown) {
  if (!isRecord(value)) return false;
  const numericKeys = ['restingHrBaseline', 'restingHrToday', 'maxHr', 'lthr', 'hrvBaseline', 'currentRunningVolumeKm', 'currentLongRunKm'];
  const stringKeys = ['rftp', 'z2PaceLow', 'z2PaceHigh', 'fiveKPace', 'tenKPace', 'hyroxExperience', 'strengthExperience'];
  return Object.entries(value).every(([key, item]) => numericKeys.includes(key) ? isFiniteNumberOrEmpty(item) : stringKeys.includes(key) && isString(item))
    && ['restingHrBaseline', 'restingHrToday', 'maxHr', 'lthr', 'rftp', 'z2PaceLow', 'z2PaceHigh', 'fiveKPace', 'tenKPace'].every((key) => key in value);
}

function validateNutrition(value: unknown) {
  if (!isRecord(value)) return false;
  const required = ['goal', 'dietType', 'allergies', 'intolerances', 'caffeineTolerance', 'fastedTrainingPreference', 'mealTiming', 'notes'];
  return required.every((key) => isString(value[key])) && (value.supplements === undefined || isString(value.supplements));
}

function validateReadiness(value: unknown) {
  if (value === null) return true;
  if (!isRecord(value) || !isString(value.date) || !isString(value.painLocation) || !isString(value.notes)) return false;
  const keys = ['sleepHours', 'sleepQuality1To5', 'stress1To5', 'fatigue1To5', 'muscleSoreness1To5', 'legSoreness1To5', 'upperSoreness1To5', 'motivation1To5', 'hydration1To5', 'pain0To10', 'restingHr', 'hrv'];
  return keys.every((key) => value[key] === undefined || isFiniteNumberOrEmpty(value[key]));
}

function validateWorkoutLog(value: unknown) {
  if (!isRecord(value)) return false;
  return ['id', 'date', 'weekId', 'dayId', 'status', 'notes', 'wentWell', 'wentWrong'].every((key) => isString(value[key]))
    && ['durationMinutes', 'sessionRpe1To10', 'averageHr', 'maxHr', 'completionPercent'].every((key) => isFiniteNumberOrEmpty(value[key]))
    && (value.calories === undefined || isFiniteNumberOrEmpty(value.calories))
    && (value.startedAt === undefined || isString(value.startedAt))
    && (value.finishedAt === undefined || isString(value.finishedAt));
}

export function validatePlanGenerationInput(value: unknown) {
  if (!isRecord(value)) return false;
  const keys = ['objective', 'currentLevel', 'availability', 'equipment', 'injuries', 'physiology', 'nutrition', 'dailyReadiness', 'recentWorkoutLogs'];
  if (Object.keys(value).length !== keys.length || !keys.every((key) => key in value)) return false;
  return validateObjective(value.objective)
    && validateCurrentLevel(value.currentLevel)
    && validateAvailability(value.availability)
    && validateEquipment(value.equipment)
    && Array.isArray(value.injuries) && value.injuries.length <= 20 && value.injuries.every(validateInjury)
    && validatePhysiology(value.physiology)
    && validateNutrition(value.nutrition)
    && validateReadiness(value.dailyReadiness)
    && Array.isArray(value.recentWorkoutLogs) && value.recentWorkoutLogs.length <= 7 && value.recentWorkoutLogs.every(validateWorkoutLog);
}
