import {
  BODY_SIDE_VALUES, CAFFEINE_VALUES, DAY_VALUES, DIET_VALUES, EQUIPMENT_KEYS, FASTED_VALUES,
  HYROX_CATEGORY_VALUES, HYROX_EXPERIENCE_VALUES, INJURY_AREA_VALUES, INJURY_STATUS_VALUES,
  MAIN_GOAL_VALUES, NUTRITION_GOAL_VALUES, STRENGTH_EXPERIENCE_VALUES, TRAINING_TIME_VALUES,
  WORKOUT_STATUS_VALUES, isBoundedFiniteNumber, isCanonicalValue, isPaceString,
} from './inputDomains.ts';

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) { const keys = Object.keys(value); return required.every((key) => key in value) && keys.every((key) => required.includes(key) || optional.includes(key)); }
function text(value: unknown, max: number, required = false) { return typeof value === 'string' && value.trim().length <= max && (!required || value.trim().length > 0); }
function optionalNumber(value: unknown, min: number, max: number, step?: number) { return value === '' || value === undefined || isBoundedFiniteNumber(value, min, max, step); }
function isoDate(value: unknown) { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const d = new Date(`${value}T00:00:00Z`); return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10) === value; }
function notFutureDate(value: unknown) { return isoDate(value) && String(value) <= new Date().toISOString().slice(0,10); }
function notPastDate(value: unknown) { return isoDate(value) && String(value) >= new Date().toISOString().slice(0,10); }
function duration(value: unknown, min: number, max: number) { if (typeof value !== 'string' || !/^(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d{1,3})?$/.test(value)) return false; const p=value.split(':').map(Number); const [h,m,s]=p.length===3?p:[0,p[0],p[1]]; const total=h*3600+m*60+s; return m<60 && s<60 && total>=min && total<=max; }
function pace(value: unknown) { return value === undefined || value === '' || isPaceString(value); }
function canonicalOrEmpty(value: unknown, values: readonly string[]) { return value === '' || isCanonicalValue(value, values); }

function validateObjective(value: unknown) {
  if (!isRecord(value) || !exactKeys(value, ['targetRaceDate','mainGoal','category'], ['targetTime'])) return false;
  return notPastDate(value.targetRaceDate) && isCanonicalValue(value.mainGoal, MAIN_GOAL_VALUES)
    && isCanonicalValue(value.category, HYROX_CATEGORY_VALUES)
    && (value.targetTime === undefined || duration(value.targetTime, 1800, 21600));
}
function validateCurrentLevel(value: unknown) {
  if (!isRecord(value) || !exactKeys(value, [], ['hyroxExperience','currentRunningVolumeKm','currentLongRunKm','fiveKPace','tenKPace','strengthExperience'])) return false;
  if (!canonicalOrEmpty(value.hyroxExperience ?? '', HYROX_EXPERIENCE_VALUES) || !canonicalOrEmpty(value.strengthExperience ?? '', STRENGTH_EXPERIENCE_VALUES)) return false;
  if (!optionalNumber(value.currentRunningVolumeKm,0,300,.5) || !optionalNumber(value.currentLongRunKm,0,100,.5) || !pace(value.fiveKPace) || !pace(value.tenKPace)) return false;
  return !(typeof value.currentRunningVolumeKm === 'number' && typeof value.currentLongRunKm === 'number' && value.currentLongRunKm > value.currentRunningVolumeKm);
}
function validateAvailability(value: unknown) {
  if (!isRecord(value) || !exactKeys(value,['availableDays','preferredTrainingTime','maxSessionMinutes','canDoubleSession','minHoursBetweenSessions','scheduleNotes'])) return false;
  return Array.isArray(value.availableDays) && value.availableDays.length > 0 && value.availableDays.length <= 7
    && new Set(value.availableDays).size === value.availableDays.length && value.availableDays.every((day) => isCanonicalValue(day,DAY_VALUES))
    && isCanonicalValue(value.preferredTrainingTime,TRAINING_TIME_VALUES) && optionalNumber(value.maxSessionMinutes,15,360,5)
    && typeof value.canDoubleSession === 'boolean' && optionalNumber(value.minHoursBetweenSessions,1,24,1) && text(value.scheduleNotes,1000);
}
function validateEquipment(value: unknown) {
  if (!isRecord(value) || !exactKeys(value,['available','raw']) || !Array.isArray(value.available) || value.available.length>20 || !value.available.every((item)=>text(item,100,true)) || !isRecord(value.raw)) return false;
  const raw = value.raw as Record<string, unknown>;
  return exactKeys(raw,EQUIPMENT_KEYS) && EQUIPMENT_KEYS.every((key)=>typeof raw[key]==='boolean');
}
function validateInjury(value: unknown) {
  if (!isRecord(value) || !exactKeys(value,['id','body_area','side','pain_level_0_10','status','movement_restrictions','notes'],['started_at','resolved_at'])) return false;
  const bodyArea = typeof value.body_area === 'string' ? value.body_area : '';
  const area = INJURY_AREA_VALUES.some((item)=>item.toLocaleLowerCase('es')===bodyArea.toLocaleLowerCase('es'));
  const started = value.started_at === undefined || value.started_at === '' || notFutureDate(value.started_at);
  const resolved = value.resolved_at === undefined || value.resolved_at === '' || notFutureDate(value.resolved_at);
  return text(value.id,200,true) && (value.body_area === '' || area) && canonicalOrEmpty(value.side,BODY_SIDE_VALUES)
    && optionalNumber(value.pain_level_0_10,0,10,1) && isCanonicalValue(value.status,INJURY_STATUS_VALUES)
    && text(value.movement_restrictions,500) && text(value.notes,1000) && started && resolved
    && !(Number(value.pain_level_0_10)>0 && value.body_area==='')
    && !(typeof value.started_at==='string' && value.started_at && typeof value.resolved_at==='string' && value.resolved_at && value.resolved_at<value.started_at);
}
function validatePhysiology(value: unknown) {
  if (!isRecord(value) || !exactKeys(value,['restingHrBaseline','restingHrToday','maxHr','lthr','rftp','z2PaceLow','z2PaceHigh','fiveKPace','tenKPace'],['hrvBaseline','currentRunningVolumeKm','currentLongRunKm','hyroxExperience','strengthExperience'])) return false;
  const valid = optionalNumber(value.restingHrBaseline,25,240,1)&&optionalNumber(value.restingHrToday,25,240,1)&&optionalNumber(value.maxHr,25,240,1)&&optionalNumber(value.lthr,25,240,1)
    && optionalNumber(value.hrvBaseline,1,500,1)&&optionalNumber(value.currentRunningVolumeKm,0,300,.5)&&optionalNumber(value.currentLongRunKm,0,100,.5)
    && pace(value.rftp)&&pace(value.z2PaceLow)&&pace(value.z2PaceHigh)&&pace(value.fiveKPace)&&pace(value.tenKPace)
    && canonicalOrEmpty(value.hyroxExperience??'',HYROX_EXPERIENCE_VALUES)&&canonicalOrEmpty(value.strengthExperience??'',STRENGTH_EXPERIENCE_VALUES);
  return valid && !(typeof value.lthr==='number'&&typeof value.maxHr==='number'&&value.lthr>value.maxHr) && !(typeof value.currentLongRunKm==='number'&&typeof value.currentRunningVolumeKm==='number'&&value.currentLongRunKm>value.currentRunningVolumeKm);
}
function validateNutrition(value: unknown) {
  if (!isRecord(value) || !exactKeys(value,['goal','dietType','allergies','intolerances','caffeineTolerance','fastedTrainingPreference','mealTiming','notes'],['supplements'])) return false;
  return isCanonicalValue(value.goal,NUTRITION_GOAL_VALUES)&&canonicalOrEmpty(value.dietType,DIET_VALUES)&&canonicalOrEmpty(value.caffeineTolerance,CAFFEINE_VALUES)&&canonicalOrEmpty(value.fastedTrainingPreference,FASTED_VALUES)
    && text(value.allergies,500)&&text(value.intolerances,500)&&text(value.mealTiming,500)&&text(value.notes,1000)&&(value.supplements===undefined||text(value.supplements,500));
}
function validateReadiness(value: unknown) {
  if (value===null) return true;
  if (!isRecord(value)||!exactKeys(value,['date','sleepHours','sleepQuality1To5','stress1To5','fatigue1To5','muscleSoreness1To5','legSoreness1To5','upperSoreness1To5','motivation1To5','hydration1To5','pain0To10','painLocation','notes'],['restingHr','hrv'])) return false;
  const ratings=['sleepQuality1To5','stress1To5','fatigue1To5','muscleSoreness1To5','legSoreness1To5','upperSoreness1To5','motivation1To5','hydration1To5'];
  return notFutureDate(value.date)&&optionalNumber(value.sleepHours,0,24,.5)&&ratings.every((key)=>optionalNumber(value[key],1,5,1))&&optionalNumber(value.pain0To10,0,10,1)&&optionalNumber(value.restingHr,25,240,1)&&optionalNumber(value.hrv,1,500,1)&&text(value.painLocation,100)&&text(value.notes,1000)&&!(Number(value.pain0To10)>0&&String(value.painLocation).trim()==='');
}
function timestamp(value: unknown) { return typeof value==='string'&&value.trim()!==''&&Number.isFinite(Date.parse(value)); }
function validateWorkoutLog(value: unknown) {
  if (!isRecord(value)||!exactKeys(value,['id','date','weekId','dayId','status','durationMinutes','sessionRpe1To10','averageHr','maxHr','completionPercent','notes','wentWell','wentWrong'],['calories','startedAt','finishedAt'])) return false;
  const skipped=value.status==='saltado';
  const startOk=value.startedAt===undefined||value.startedAt===''||timestamp(value.startedAt); const finishOk=value.finishedAt===undefined||value.finishedAt===''||timestamp(value.finishedAt);
  return text(value.id,200,true)&&text(value.weekId,200,true)&&text(value.dayId,200,true)&&notFutureDate(value.date)&&isCanonicalValue(value.status,WORKOUT_STATUS_VALUES)
    && (skipped?optionalNumber(value.durationMinutes,0,600,1):isBoundedFiniteNumber(value.durationMinutes,1,600,1))&&(skipped?optionalNumber(value.sessionRpe1To10,1,10,1):isBoundedFiniteNumber(value.sessionRpe1To10,1,10,1))
    && optionalNumber(value.averageHr,25,240,1)&&optionalNumber(value.maxHr,25,240,1)&&optionalNumber(value.calories,0,10000,1)&&optionalNumber(value.completionPercent,0,100,5)
    && !(typeof value.averageHr==='number'&&typeof value.maxHr==='number'&&value.averageHr>value.maxHr)&&startOk&&finishOk&&!(typeof value.startedAt==='string'&&value.startedAt&&typeof value.finishedAt==='string'&&value.finishedAt&&Date.parse(value.finishedAt)<Date.parse(value.startedAt))
    && text(value.notes,1000)&&text(value.wentWell,500)&&text(value.wentWrong,500);
}
export function validatePlanGenerationInput(value: unknown) {
  if (!isRecord(value)) return false;
  const keys=['objective','currentLevel','availability','equipment','injuries','physiology','nutrition','dailyReadiness','recentWorkoutLogs'];
  return exactKeys(value,keys)&&validateObjective(value.objective)&&validateCurrentLevel(value.currentLevel)&&validateAvailability(value.availability)&&validateEquipment(value.equipment)
    &&Array.isArray(value.injuries)&&value.injuries.length<=20&&value.injuries.every(validateInjury)&&validatePhysiology(value.physiology)&&validateNutrition(value.nutrition)&&validateReadiness(value.dailyReadiness)
    &&Array.isArray(value.recentWorkoutLogs)&&value.recentWorkoutLogs.length<=7&&value.recentWorkoutLogs.every(validateWorkoutLog);
}
