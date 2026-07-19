import { validateWorkoutLog } from '../domain/fields/schemas';
import type { AthleteState, DailyReadiness, EquipmentAvailability, Injury, WorkoutLog, WorkoutLogStatus } from '../types/athlete';

export { validatePlanGenerationInput } from '../../supabase/functions/_shared/trainingPlanInput';

const equipmentLabels: Record<keyof EquipmentAvailability, string> = {
  skiErg: 'SkiErg',
  rowErg: 'RowErg',
  bikeErg: 'BikeErg',
  assaultBike: 'Assault Bike',
  sled: 'Sled',
  wallBall: 'Wall Ball',
  sandbag: 'Sandbag',
  kettlebells: 'Kettlebells',
  dumbbells: 'Dumbbells',
  barbellAndPlates: 'Barra y discos',
  treadmill: 'Cinta de correr',
  runningSpace: 'Espacio para correr',
  plyoBox: 'Cajón pliométrico',
};

const MAX_RECENT_WORKOUT_LOGS = 7;
const workoutLogStatuses: WorkoutLogStatus[] = ['completado', 'parcial', 'saltado', 'adaptado'];

export interface PlanGenerationInput {
  objective: {
    targetRaceDate: string;
    mainGoal: AthleteState['profile']['mainGoal'];
    category: string;
    targetTime?: string;
  };
  currentLevel: {
    hyroxExperience?: string;
    currentRunningVolumeKm?: number | '';
    currentLongRunKm?: number | '';
    fiveKPace?: string;
    tenKPace?: string;
    strengthExperience?: string;
  };
  availability: AthleteState['availability'];
  equipment: {
    available: string[];
    raw: EquipmentAvailability;
  };
  injuries: Injury[];
  physiology: AthleteState['physiology'];
  nutrition: Omit<AthleteState['nutrition'], 'dietTypeLegacy'>;
  dailyReadiness: DailyReadiness | null;
  recentWorkoutLogs: WorkoutLog[];
}

export interface BuildPlanGenerationInputParams {
  athleteState: AthleteState;
  dailyReadiness?: DailyReadiness | null;
  recentWorkoutLogs?: WorkoutLog[];
}

function workoutLogKey(log: WorkoutLog) {
  return `${log.weekId}:${log.dayId}:${log.date}`;
}

function logTimestamp(log: WorkoutLog) {
  return Date.parse(log.finishedAt ?? log.startedAt ?? `${log.date}T00:00:00.000Z`);
}

function isWorkoutLogStatus(value: unknown): value is WorkoutLogStatus {
  return typeof value === 'string' && workoutLogStatuses.includes(value as WorkoutLogStatus);
}

function signalScore(log: WorkoutLog) {
  return [
    isWorkoutLogStatus(log.status),
    log.durationMinutes !== '',
    log.sessionRpe1To10 !== '',
    log.averageHr !== '',
    log.maxHr !== '',
    typeof log.calories === 'number',
    log.completionPercent !== '',
    log.notes.trim().length > 0,
    log.wentWell.trim().length > 0,
    log.wentWrong.trim().length > 0,
  ].filter(Boolean).length;
}

function sanitizeWorkoutLog(log: WorkoutLog): WorkoutLog {
  return {
    id: log.id,
    date: log.date.trim(),
    weekId: log.weekId.trim(),
    dayId: log.dayId.trim(),
    status: log.status,
    durationMinutes: log.durationMinutes,
    sessionRpe1To10: log.sessionRpe1To10,
    averageHr: log.averageHr,
    maxHr: log.maxHr,
    calories: log.calories,
    startedAt: log.startedAt,
    finishedAt: log.finishedAt,
    completionPercent: log.completionPercent,
    notes: log.notes.trim(),
    wentWell: log.wentWell.trim(),
    wentWrong: log.wentWrong.trim(),
  };
}

function isMeaningfulWorkoutLog(log: WorkoutLog) {
  return log.date.length > 0 && log.weekId.length > 0 && log.dayId.length > 0 && signalScore(log) > 1;
}

export function selectRelevantWorkoutLogs(recentWorkoutLogs: WorkoutLog[]) {
  const deduped = new Map<string, WorkoutLog>();

  for (const originalLog of recentWorkoutLogs) {
    const log = sanitizeWorkoutLog(originalLog);
    if (!isMeaningfulWorkoutLog(log) || !validateWorkoutLog(log).ok) continue;

    const key = workoutLogKey(log);
    const current = deduped.get(key);
    if (!current) {
      deduped.set(key, log);
      continue;
    }

    const currentTimestamp = logTimestamp(current);
    const nextTimestamp = logTimestamp(log);
    if (nextTimestamp > currentTimestamp || (nextTimestamp === currentTimestamp && signalScore(log) >= signalScore(current))) {
      deduped.set(key, log);
    }
  }

  return [...deduped.values()]
    .sort((left, right) => logTimestamp(right) - logTimestamp(left))
    .slice(0, MAX_RECENT_WORKOUT_LOGS);
}

export function buildPlanGenerationInput({
  athleteState,
  dailyReadiness = null,
  recentWorkoutLogs = [],
}: BuildPlanGenerationInputParams): PlanGenerationInput {
  const { profile, physiology, availability, equipment, injuries, nutrition } = athleteState;

  return {
    objective: {
      targetRaceDate: profile.targetDate,
      mainGoal: profile.mainGoal,
      category: profile.hyroxCategory,
      targetTime: profile.targetTime || undefined,
    },
    currentLevel: {
      hyroxExperience: physiology.hyroxExperience || undefined,
      currentRunningVolumeKm: physiology.currentRunningVolumeKm ?? '',
      currentLongRunKm: physiology.currentLongRunKm ?? '',
      fiveKPace: physiology.fiveKPace || undefined,
      tenKPace: physiology.tenKPace || undefined,
      strengthExperience: physiology.strengthExperience || undefined,
    },
    availability: {
      availableDays: [...availability.availableDays],
      preferredTrainingTime: availability.preferredTrainingTime,
      maxSessionMinutes: availability.maxSessionMinutes,
      canDoubleSession: availability.canDoubleSession,
      minHoursBetweenSessions: availability.minHoursBetweenSessions,
      scheduleNotes: availability.scheduleNotes,
    },
    equipment: {
      available: (Object.keys(equipmentLabels) as (keyof EquipmentAvailability)[])
        .filter((key) => equipment[key])
        .map((key) => equipmentLabels[key]),
      raw: Object.fromEntries(
        (Object.keys(equipmentLabels) as (keyof EquipmentAvailability)[]).map((key) => [key, equipment[key] === true]),
      ) as unknown as EquipmentAvailability,
    },
    injuries: injuries.map((injury) => ({
      id: injury.id,
      body_area: injury.body_area,
      side: injury.side,
      pain_level_0_10: injury.pain_level_0_10,
      status: injury.status,
      started_at: injury.started_at,
      resolved_at: injury.resolved_at,
      movement_restrictions: injury.movement_restrictions,
      notes: injury.notes,
    })),
    physiology: {
      restingHrBaseline: physiology.restingHrBaseline,
      restingHrToday: physiology.restingHrToday,
      maxHr: physiology.maxHr,
      lthr: physiology.lthr,
      rftp: physiology.rftp,
      z2PaceLow: physiology.z2PaceLow,
      z2PaceHigh: physiology.z2PaceHigh,
      fiveKPace: physiology.fiveKPace,
      tenKPace: physiology.tenKPace,
      hrvBaseline: physiology.hrvBaseline,
      currentRunningVolumeKm: physiology.currentRunningVolumeKm,
      currentLongRunKm: physiology.currentLongRunKm,
      hyroxExperience: physiology.hyroxExperience,
      strengthExperience: physiology.strengthExperience,
    },
    nutrition: {
      goal: nutrition.goal,
      dietType: nutrition.dietType,
      allergies: nutrition.allergies,
      intolerances: nutrition.intolerances,
      caffeineTolerance: nutrition.caffeineTolerance,
      fastedTrainingPreference: nutrition.fastedTrainingPreference,
      mealTiming: nutrition.mealTiming,
      supplements: nutrition.supplements,
      notes: nutrition.notes,
    },
    dailyReadiness: dailyReadiness ? {
      date: dailyReadiness.date,
      sleepHours: dailyReadiness.sleepHours,
      sleepQuality1To5: dailyReadiness.sleepQuality1To5,
      stress1To5: dailyReadiness.stress1To5,
      fatigue1To5: dailyReadiness.fatigue1To5,
      muscleSoreness1To5: dailyReadiness.muscleSoreness1To5,
      legSoreness1To5: dailyReadiness.legSoreness1To5,
      upperSoreness1To5: dailyReadiness.upperSoreness1To5,
      motivation1To5: dailyReadiness.motivation1To5,
      hydration1To5: dailyReadiness.hydration1To5,
      pain0To10: dailyReadiness.pain0To10,
      painLocation: dailyReadiness.painLocation,
      restingHr: dailyReadiness.restingHr,
      hrv: dailyReadiness.hrv,
      notes: dailyReadiness.notes,
    } : null,
    recentWorkoutLogs: selectRelevantWorkoutLogs(recentWorkoutLogs),
  };
}
