import { describe, expect, it } from 'vitest';
import { createEmptyInjury } from '../data/defaultAthleteState';
import { trainingWeeks } from '../data/trainingWeeks';
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
import { buildCoachAdviceInput } from './coachAdvice';

const activeWeek = trainingWeeks[0];
const activeDay = activeWeek.days[0];

const profile: AthleteProfile = {
  name: 'Deivi',
  birthDate: '1990-04-12',
  heightCm: 178,
  weightKg: 77,
  sex: 'male',
  hyroxCategory: 'Open Men',
  targetDate: '2026-10-01',
  mainGoal: 'mejorar_marca',
};

const physiology: PhysiologyMetrics = {
  restingHrBaseline: 50,
  restingHrToday: 54,
  maxHr: 190,
  lthr: 174,
  rftp: '4:20/km',
  z2PaceLow: '5:15/km',
  z2PaceHigh: '5:45/km',
  fiveKPace: '4:05/km',
  tenKPace: '4:20/km',
  hrvBaseline: 72,
};

const availability: TrainingAvailability = {
  availableDays: ['lunes', 'miÃ©rcoles', 'sÃ¡bado'],
  preferredTrainingTime: 'maÃ±ana',
  maxSessionMinutes: 75,
  canDoubleSession: false,
  minHoursBetweenSessions: 8,
  scheduleNotes: 'Viajes los viernes.',
};

const equipment: EquipmentAvailability = {
  skiErg: true,
  rowErg: true,
  bikeErg: false,
  assaultBike: false,
  sled: true,
  wallBall: true,
  sandbag: true,
  kettlebells: true,
  dumbbells: true,
  barbellAndPlates: true,
  treadmill: false,
  runningSpace: true,
  plyoBox: true,
};

const nutrition: NutritionPreferences = {
  goal: 'rendimiento',
  dietType: 'OmnÃ­vora',
  allergies: 'Ninguna',
  intolerances: 'Lactosa leve',
  caffeineTolerance: 'media',
  fastedTrainingPreference: 'evitar',
  mealTiming: 'Desayuno 8:00, comida 14:00, cena 21:00',
  supplements: 'Creatina',
  notes: 'Priorizar digestiÃ³n antes de running.',
};

const dailyReadiness: DailyReadiness = {
  date: '2026-07-05',
  sleepHours: 7.5,
  sleepQuality1To5: 4,
  stress1To5: 2,
  fatigue1To5: 2,
  muscleSoreness1To5: 3,
  legSoreness1To5: 2,
  upperSoreness1To5: 1,
  motivation1To5: 5,
  hydration1To5: 4,
  pain0To10: 1,
  painLocation: 'rodilla derecha',
  notes: 'Listo para entrenar.',
};

const workoutLog: WorkoutLog = {
  id: 'log-1',
  date: '2026-07-05',
  weekId: activeWeek.id,
  dayId: activeDay.id,
  status: 'completado',
  durationMinutes: 62,
  sessionRpe1To10: 8,
  averageHr: 154,
  maxHr: 181,
  completionPercent: 95,
  notes: 'Buena sesiÃ³n.',
  wentWell: 'Ritmo estable.',
  wentWrong: 'Transiciones lentas.',
};

describe('buildCoachAdviceInput', () => {
  it('returns profile, readiness and the active workout context', () => {
    const input = buildCoachAdviceInput({
      profile,
      physiology,
      availability,
      equipment,
      injuries: [],
      nutrition,
      dailyReadiness,
      activeWeek,
      activeDay,
      workoutLog,
      recentWorkoutLogs: [workoutLog],
    });

    expect(input.profile.name).toBe('Deivi');
    expect(input.dailyReadiness?.sleepHours).toBe(7.5);
    expect(input.activeWorkout.week.id).toBe(activeWeek.id);
    expect(input.activeWorkout.day.id).toBe(activeDay.id);
    expect(input.currentWorkoutLog?.status).toBe('completado');
    expect(input.recentWorkoutLogs).toHaveLength(1);
  });

  it('includes active injuries and excludes resolved injuries from the coach input', () => {
    expect(createEmptyInjury('inj-default')).toEqual(
      expect.objectContaining({
        body_area: '',
        side: '',
        pain_level_0_10: '',
        status: 'active',
        movement_restrictions: '',
        notes: '',
      }),
    );

    const injuries: Injury[] = [
      {
        id: 'inj-1',
        body_area: 'rodilla',
        side: 'derecha',
        pain_level_0_10: 4,
        status: 'active',
        movement_restrictions: 'Evitar saltos altos',
        notes: 'Molestia en lunges.',
      },
      {
        id: 'inj-2',
        body_area: 'hombro',
        side: 'izquierda',
        pain_level_0_10: 0,
        status: 'resolved',
        movement_restrictions: '',
        notes: 'Sin dolor.',
      },
    ];

    const input = buildCoachAdviceInput({
      profile,
      physiology,
      availability,
      equipment,
      injuries,
      nutrition,
      dailyReadiness,
      activeWeek,
      activeDay,
      workoutLog: null,
      recentWorkoutLogs: [],
    });

    expect(input.activeInjuries).toHaveLength(1);
    expect(input.activeInjuries[0]).toMatchObject({
      body_area: 'rodilla',
      pain_level_0_10: 4,
      movement_restrictions: 'Evitar saltos altos',
    });
    expect(input.activeInjuries.some((injury) => injury.status === 'resolved')).toBe(false);
  });
});

