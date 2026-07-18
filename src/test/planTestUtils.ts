import type { GeneratedTrainingDay, GeneratedTrainingPlan } from '../types/plan';
import type { PlanGenerationInput } from '../utils/planInput';
import { defaultAthleteProfile, defaultEquipmentAvailability, defaultNutritionPreferences, defaultPhysiologyMetrics, defaultTrainingAvailability } from '../data/defaultAthleteState';

function buildSection(title: string, type: 'warmup' | 'main' | 'strength' | 'conditioning' | 'mobility' | 'recovery', durationMinutes: number, description: string, exercises: string[], intensity: string) {
  return {
    title,
    type,
    durationMinutes,
    description,
    exercises,
    intensity,
    notes: [],
  };
}

function buildDay(overrides: Partial<GeneratedTrainingDay> & Pick<GeneratedTrainingDay, 'date' | 'weekday' | 'title' | 'sessionType' | 'objective' | 'estimatedDurationMinutes' | 'intensity'>): GeneratedTrainingDay {
  const isRest = overrides.sessionType === 'rest';
  return {
    date: overrides.date,
    weekday: overrides.weekday,
    title: overrides.title,
    sessionType: overrides.sessionType,
    objective: overrides.objective,
    estimatedDurationMinutes: overrides.estimatedDurationMinutes,
    intensity: overrides.intensity,
    sections: isRest
      ? [buildSection('Recuperación', 'recovery', overrides.estimatedDurationMinutes, 'Descanso activo opcional y movilidad muy suave.', ['Paseo suave 20 min'], 'Muy suave')]
      : overrides.sections ?? [buildSection('Bloque principal', 'main', Math.max(20, overrides.estimatedDurationMinutes - 10), 'Trabajo principal del día sin volumen extra.', ['Bloque principal guiado'], overrides.intensity === 'high' ? 'RPE 8' : 'RPE 6')],
    notes: overrides.notes ?? [],
    nutritionNotes: overrides.nutritionNotes ?? [],
    adaptationOptions: overrides.adaptationOptions ?? ['Reduce el volumen a la mitad si llegas fatigado.'],
  };
}

export const validGeneratedTrainingPlan: GeneratedTrainingPlan = {
  title: 'Bloque inicial HYROX personalizado',
  objective: 'Construir base específica HYROX con carga controlada y recuperación suficiente.',
  targetRaceDate: '2026-11-22',
  totalWeeks: 2,
  generatedWeeks: 2,
  generatedAt: '2026-07-09T10:00:00.000Z',
  assumptions: ['Se asume disponibilidad de tres días de calidad y dos apoyos suaves por semana.'],
  nutritionNotes: ['Mantén proteína diaria suficiente e hidratación constante.'],
  weeks: [
    {
      id: 'week-1',
      weekNumber: 1,
      startDate: '2026-07-13',
      endDate: '2026-07-19',
      focus: 'Base aeróbica y técnica HYROX',
      notes: ['Semana de entrada conservadora.'],
      days: [
        buildDay({ date: '2026-07-13', weekday: 'lunes', title: 'Run Z2 + movilidad', sessionType: 'run', objective: 'Acumular volumen fácil y soltar piernas.', estimatedDurationMinutes: 55, intensity: 'low', adaptationOptions: ['Recorta a 30 min si vas justo de tiempo.'] }),
        buildDay({ date: '2026-07-14', weekday: 'martes', title: 'Fuerza tren inferior', sessionType: 'strength', objective: 'Reforzar patrones básicos con técnica estable.', estimatedDurationMinutes: 60, intensity: 'moderate' }),
        buildDay({ date: '2026-07-15', weekday: 'miércoles', title: 'Descanso activo', sessionType: 'rest', objective: 'Facilitar recuperación sin sumar fatiga.', estimatedDurationMinutes: 20, intensity: 'rest' }),
        buildDay({ date: '2026-07-16', weekday: 'jueves', title: 'Circuito HYROX controlado', sessionType: 'hyrox', objective: 'Practicar transiciones y ritmo sostenible.', estimatedDurationMinutes: 65, intensity: 'moderate' }),
        buildDay({ date: '2026-07-17', weekday: 'viernes', title: 'Engine corto', sessionType: 'engine', objective: 'Sumar trabajo cardiovascular sin vaciarse.', estimatedDurationMinutes: 45, intensity: 'moderate' }),
        buildDay({ date: '2026-07-18', weekday: 'sábado', title: 'Movilidad + core', sessionType: 'mobility', objective: 'Mejorar rango y control lumbo-pélvico.', estimatedDurationMinutes: 35, intensity: 'low' }),
        buildDay({ date: '2026-07-19', weekday: 'domingo', title: 'Run progresivo', sessionType: 'run', objective: 'Cerrar la semana con ritmo estable y controlado.', estimatedDurationMinutes: 70, intensity: 'moderate' }),
      ],
    },
    {
      id: 'week-2',
      weekNumber: 2,
      startDate: '2026-07-20',
      endDate: '2026-07-26',
      focus: 'Progresión suave y tolerancia específica',
      notes: ['Subida ligera de densidad, sin picos innecesarios.'],
      days: [
        buildDay({ date: '2026-07-20', weekday: 'lunes', title: 'Run Z2 + strides', sessionType: 'run', objective: 'Mejorar economía sin fatiga alta.', estimatedDurationMinutes: 55, intensity: 'low' }),
        buildDay({ date: '2026-07-21', weekday: 'martes', title: 'Fuerza total body', sessionType: 'strength', objective: 'Consolidar fuerza útil para HYROX.', estimatedDurationMinutes: 65, intensity: 'moderate' }),
        buildDay({ date: '2026-07-22', weekday: 'miércoles', title: 'Descanso completo', sessionType: 'rest', objective: 'Absorber la carga y llegar fresco al bloque final.', estimatedDurationMinutes: 15, intensity: 'rest' }),
        buildDay({ date: '2026-07-23', weekday: 'jueves', title: 'HYROX intervals', sessionType: 'hyrox', objective: 'Practicar estaciones con pacing consistente.', estimatedDurationMinutes: 65, intensity: 'high' }),
        buildDay({ date: '2026-07-24', weekday: 'viernes', title: 'Engine aeróbico', sessionType: 'engine', objective: 'Construir tolerancia sostenida sin perder técnica.', estimatedDurationMinutes: 50, intensity: 'moderate' }),
        buildDay({ date: '2026-07-25', weekday: 'sábado', title: 'Movilidad guiada', sessionType: 'mobility', objective: 'Descargar cadenas cargadas y mover sin impacto.', estimatedDurationMinutes: 30, intensity: 'low' }),
        buildDay({ date: '2026-07-26', weekday: 'domingo', title: 'Run largo controlado', sessionType: 'run', objective: 'Terminar el bloque con volumen sostenido y control.', estimatedDurationMinutes: 75, intensity: 'moderate' }),
      ],
    },
  ],
};

export const validPlanGenerationInput: PlanGenerationInput = {
  objective: { targetRaceDate: '2026-11-22', mainGoal: 'terminar', category: 'women_open' },
  currentLevel: { currentRunningVolumeKm: 24, currentLongRunKm: 10 },
  availability: { ...defaultTrainingAvailability, availableDays: ['Lunes', 'Miércoles', 'Viernes'], maxSessionMinutes: 75, preferredTrainingTime: 'mañana' },
  equipment: { available: ['SkiErg', 'Sled'], raw: { ...defaultEquipmentAvailability, skiErg: true, sled: true } },
  injuries: [],
  physiology: defaultPhysiologyMetrics,
  nutrition: defaultNutritionPreferences,
  dailyReadiness: null,
  recentWorkoutLogs: [],
};

export const validAthleteStateForPlan = {
  profile: { ...defaultAthleteProfile, targetDate: '2026-11-22', mainGoal: 'terminar' as const, hyroxCategory: 'women_open', onboardingCompleted: true },
  physiology: defaultPhysiologyMetrics,
  availability: { ...defaultTrainingAvailability, availableDays: ['Lunes', 'Miércoles', 'Viernes'], maxSessionMinutes: 75, preferredTrainingTime: 'mañana' },
  equipment: { ...defaultEquipmentAvailability, skiErg: true, sled: true },
  injuries: [],
  nutrition: defaultNutritionPreferences,
};
