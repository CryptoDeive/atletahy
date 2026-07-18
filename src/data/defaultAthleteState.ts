import type {
  AthleteProfile,
  DailyReadiness,
  EquipmentAvailability,
  Injury,
  NutritionPreferences,
  PhysiologyMetrics,
  TrainingAvailability,
  WorkoutLog,
} from '../types/athlete';

export const defaultAthleteProfile: AthleteProfile = {
  name: '',
  birthDate: '',
  heightCm: '',
  weightKg: '',
  sex: '',
  hyroxCategory: '',
  targetDate: '',
  mainGoal: 'terminar',
  targetTime: '',
  onboardingCompleted: false,
  onboardingCompletedAt: '',
};

export const defaultPhysiologyMetrics: PhysiologyMetrics = {
  restingHrBaseline: '',
  restingHrToday: '',
  maxHr: '',
  lthr: '',
  rftp: '',
  z2PaceLow: '',
  z2PaceHigh: '',
  fiveKPace: '',
  tenKPace: '',
  hrvBaseline: '',
  currentRunningVolumeKm: '',
  currentLongRunKm: '',
  hyroxExperience: '',
  strengthExperience: '',
};

export const defaultTrainingAvailability: TrainingAvailability = {
  availableDays: [],
  preferredTrainingTime: '',
  maxSessionMinutes: '',
  canDoubleSession: false,
  minHoursBetweenSessions: '',
  scheduleNotes: '',
};

export const defaultEquipmentAvailability: EquipmentAvailability = {
  skiErg: false,
  rowErg: false,
  bikeErg: false,
  assaultBike: false,
  sled: false,
  wallBall: false,
  sandbag: false,
  kettlebells: false,
  dumbbells: false,
  barbellAndPlates: false,
  treadmill: false,
  runningSpace: false,
  plyoBox: false,
};

export const defaultNutritionPreferences: NutritionPreferences = {
  goal: 'rendimiento',
  dietType: '',
  allergies: '',
  intolerances: '',
  caffeineTolerance: '',
  fastedTrainingPreference: '',
  mealTiming: '',
  supplements: '',
  notes: '',
};

export function createDefaultDailyReadiness(date: string): DailyReadiness {
  return {
    date,
    sleepHours: '',
    sleepQuality1To5: '',
    stress1To5: '',
    fatigue1To5: '',
    muscleSoreness1To5: '',
    legSoreness1To5: '',
    upperSoreness1To5: '',
    motivation1To5: '',
    hydration1To5: '',
    pain0To10: '',
    painLocation: '',
    notes: '',
  };
}

export function createEmptyInjury(id: string): Injury {
  return {
    id,
    body_area: '',
    side: '',
    pain_level_0_10: '',
    status: 'active',
    movement_restrictions: '',
    notes: '',
  };
}

export function createDefaultWorkoutLog(params: { id: string; date: string; weekId: string; dayId: string }): WorkoutLog {
  return {
    id: params.id,
    date: params.date,
    weekId: params.weekId,
    dayId: params.dayId,
    status: 'completado',
    durationMinutes: '',
    sessionRpe1To10: '',
    averageHr: '',
    maxHr: '',
    completionPercent: '',
    notes: '',
    wentWell: '',
    wentWrong: '',
  };
}

