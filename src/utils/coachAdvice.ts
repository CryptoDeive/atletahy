import type { CoachAdviceInput, CoachAdviceInputParams } from '../types/athlete';

export function buildCoachAdviceInput(params: CoachAdviceInputParams): CoachAdviceInput {
  return {
    profile: params.profile,
    physiology: params.physiology,
    availability: params.availability,
    equipment: params.equipment,
    activeInjuries: params.injuries.filter((injury) => injury.status !== 'resolved'),
    nutrition: params.nutrition,
    dailyReadiness: params.dailyReadiness,
    activeWorkout: {
      week: params.activeWeek,
      day: params.activeDay,
    },
    currentWorkoutLog: params.workoutLog,
    recentWorkoutLogs: params.recentWorkoutLogs,
  };
}
