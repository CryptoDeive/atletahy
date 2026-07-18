import type { TrainingDay, TrainingWeek } from './training';

export type MainGoal = 'terminar' | 'mejorar_marca' | 'competir';
export type InjuryStatus = 'active' | 'improving' | 'resolved';
export type WorkoutLogStatus = 'completado' | 'parcial' | 'saltado' | 'adaptado';
export type NutritionGoal = 'rendimiento' | 'mantenimiento' | 'perdida_grasa';

export interface AthleteProfile {
  name: string;
  birthDate: string;
  heightCm: number | '';
  weightKg: number | '';
  sex?: string;
  hyroxCategory: string;
  targetDate: string;
  mainGoal: MainGoal;
  targetTime?: string;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
}

export interface PhysiologyMetrics {
  restingHrBaseline: number | '';
  restingHrToday: number | '';
  maxHr: number | '';
  lthr: number | '';
  rftp: string;
  z2PaceLow: string;
  z2PaceHigh: string;
  fiveKPace: string;
  tenKPace: string;
  hrvBaseline?: number | '';
  currentRunningVolumeKm?: number | '';
  currentLongRunKm?: number | '';
  hyroxExperience?: string;
  strengthExperience?: string;
}

export interface TrainingAvailability {
  availableDays: string[];
  preferredTrainingTime: string;
  maxSessionMinutes: number | '';
  canDoubleSession: boolean;
  minHoursBetweenSessions: number | '';
  scheduleNotes: string;
}

export interface EquipmentAvailability {
  skiErg: boolean;
  rowErg: boolean;
  bikeErg: boolean;
  assaultBike: boolean;
  sled: boolean;
  wallBall: boolean;
  sandbag: boolean;
  kettlebells: boolean;
  dumbbells: boolean;
  barbellAndPlates: boolean;
  treadmill: boolean;
  runningSpace: boolean;
  plyoBox: boolean;
}

export interface Injury {
  id: string;
  body_area: string;
  side: string;
  pain_level_0_10: number | '';
  status: InjuryStatus;
  started_at?: string;
  resolved_at?: string;
  movement_restrictions: string;
  notes: string;
}

export interface NutritionPreferences {
  goal: NutritionGoal;
  dietType: string;
  allergies: string;
  intolerances: string;
  caffeineTolerance: string;
  fastedTrainingPreference: string;
  mealTiming: string;
  supplements?: string;
  notes: string;
}

export interface DailyReadiness {
  date: string;
  sleepHours: number | '';
  sleepQuality1To5: number | '';
  stress1To5: number | '';
  fatigue1To5: number | '';
  muscleSoreness1To5: number | '';
  legSoreness1To5: number | '';
  upperSoreness1To5: number | '';
  motivation1To5: number | '';
  hydration1To5: number | '';
  pain0To10: number | '';
  restingHr?: number | '';
  hrv?: number | '';
  painLocation: string;
  notes: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  weekId: string;
  dayId: string;
  status: WorkoutLogStatus;
  durationMinutes: number | '';
  sessionRpe1To10: number | '';
  averageHr: number | '';
  maxHr: number | '';
  startedAt?: string;
  finishedAt?: string;
  calories?: number | '';
  completionPercent: number | '';
  notes: string;
  wentWell: string;
  wentWrong: string;
}

export interface AthleteState {
  profile: AthleteProfile;
  physiology: PhysiologyMetrics;
  availability: TrainingAvailability;
  equipment: EquipmentAvailability;
  injuries: Injury[];
  nutrition: NutritionPreferences;
}

export interface CoachAdviceInput {
  profile: AthleteProfile;
  physiology: PhysiologyMetrics;
  availability: TrainingAvailability;
  equipment: EquipmentAvailability;
  activeInjuries: Injury[];
  nutrition: NutritionPreferences;
  dailyReadiness: DailyReadiness | null;
  activeWorkout: {
    week: TrainingWeek;
    day: TrainingDay;
  };
  currentWorkoutLog: WorkoutLog | null;
  recentWorkoutLogs: WorkoutLog[];
}

export interface CoachAdviceInputParams {
  profile: AthleteProfile;
  physiology: PhysiologyMetrics;
  availability: TrainingAvailability;
  equipment: EquipmentAvailability;
  injuries: Injury[];
  nutrition: NutritionPreferences;
  dailyReadiness: DailyReadiness | null;
  activeWeek: TrainingWeek;
  activeDay: TrainingDay;
  workoutLog: WorkoutLog | null;
  recentWorkoutLogs: WorkoutLog[];
}

