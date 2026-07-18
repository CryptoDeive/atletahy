export type TrainingSectionType =
  | 'For Time'
  | 'Strength'
  | 'Engine'
  | 'Recovery'
  | 'Mobility'
  | 'Notes'
  | 'Warm-up'
  | 'Fuerza'
  | 'Metcon'
  | 'Test'
  | 'Endurance';

export type TrainingDayId = string;
export type TrainingWeekId = 'week-5' | 'week-6' | string;

export type LoadGroupName = 'PRO' | 'Normal' | string;

export interface TrainingBlock {
  id: string;
  title: string;
  lines: string[];
  subtitle?: string;
  restAfter?: string;
  notes?: string[];
}

export interface TrainingSection {
  id: string;
  type: TrainingSectionType | string;
  title: string;
  description?: string;
  lines?: string[];
  blocks?: TrainingBlock[];
  notes?: string[];
  loads?: Record<LoadGroupName, string[]>;
  collapsed: boolean;
}

export interface TrainingDay {
  id: TrainingDayId;
  dateLabel: string;
  weekday: string;
  dayNumber: number;
  title: string;
  summary: string;
  phase: 'PRETEMPORADA' | string;
  block: string;
  weekNumber: number;
  isCompleted: boolean;
  sections: TrainingSection[];
  sessionType?: string;
  estimatedDurationMinutes?: number;
  intensity?: string;
  coachNotes?: string[];
  nutritionNotes?: string[];
  adaptationOptions?: string[];
}

export interface TrainingWeek {
  id: TrainingWeekId;
  weekNumber: number;
  phase: 'PRETEMPORADA' | string;
  block: string;
  startDate: string;
  endDate: string;
  label: string;
  description: string;
  days: TrainingDay[];
}
