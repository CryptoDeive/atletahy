import type { CoachAdviceInput } from './athlete';

export type ReadinessStatus = 'green' | 'yellow' | 'red';

export type CoachAdvice = {
  readinessStatus: ReadinessStatus;
  summary: string;
  objective: string;
  strategy: string[];
  pacing: string[];
  techniqueFocus: string[];
  warmupAdjustments: string[];
  riskWarnings: string[];
  modifications: {
    condition: string;
    recommendation: string;
    keepOriginalIntent: boolean;
  }[];
  nutrition: {
    preWorkout: string[];
    intraWorkout: string[];
    postWorkout: string[];
    hydration: string[];
    caffeine?: string;
  };
  scheduling: {
    bestTimeWindow: 'morning' | 'midday' | 'afternoon' | 'evening' | 'any';
    reason: string;
    doubleSessionRecommended: boolean;
    doubleSessionPlan?: {
      session1: string;
      session2: string;
      minimumHoursBetween: number;
    };
  };
  checklist: string[];
};

export type { CoachAdviceInput };
