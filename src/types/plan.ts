export type {
  GeneratedTrainingDay,
  GeneratedTrainingIntensity,
  GeneratedTrainingPlan,
  GeneratedTrainingPlanErrorCode,
  GeneratedTrainingSection,
  GeneratedTrainingSectionType,
  GeneratedTrainingSessionType,
  GeneratedTrainingWeek,
} from '../shared/trainingPlanContract';

export type GeneratedTrainingPlanSource = 'openai' | 'fallback';

export type GeneratedTrainingPlanResult = {
  plan: import('../shared/trainingPlanContract').GeneratedTrainingPlan | null;
  source: GeneratedTrainingPlanSource;
  error?: string;
  code?: import('../shared/trainingPlanContract').GeneratedTrainingPlanErrorCode;
  status?: number;
};

export type StoredTrainingPlan = {
  id: string;
  userId?: string | null;
  title: string;
  status: 'active' | 'archived' | string;
  targetRaceDate: string;
  generatedAt: string;
  inputSnapshotJson: unknown;
  planJson: import('../shared/trainingPlanContract').GeneratedTrainingPlan;
  createdAt: string;
  updatedAt: string;
};
