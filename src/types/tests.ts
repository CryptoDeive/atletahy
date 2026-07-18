export type TrainingTestId =
  | 'erg-power' | 'ski-2k' | 'row-2k' | 'vam' | 'run-10k'
  | 'sled-push-sprint' | 'sled-pull-sprint' | 'sled-push-max' | 'sled-pull-max'
  | 'bike-ftp-20' | 'jim-vance-30';

export type TrainingTestCategory = 'Ergómetros' | 'Carrera' | 'Sled' | 'Umbral';
export type TrainingTestFieldType = 'text' | 'number' | 'duration' | 'select' | 'boolean' | 'textarea';

export type TrainingTestField = {
  key: string;
  label: string;
  type: TrainingTestFieldType;
  required?: boolean;
  options?: string[];
  min?: number;
  step?: number;
  placeholder?: string;
};

export type TrainingTestDefinition = {
  id: TrainingTestId;
  title: string;
  shortDescription: string;
  category: TrainingTestCategory;
  objective: string;
  protocol: string[];
  recommendations: string[];
  fields: TrainingTestField[];
};

export type TrainingTestResult = {
  id: string;
  userId?: string;
  testId: TrainingTestId;
  performedAt: string;
  result: Record<string, unknown>;
  calculated: Record<string, number | string | null>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
