// Runtime-safe canonical domains shared by the browser bundle and Edge Functions.
// Keep this module dependency-free so Deno and Vite consume the same contract.
export const HYROX_CATEGORY_VALUES = ['women_open','men_open','women_pro','men_pro','doubles_women','doubles_men','doubles_mixed','doubles_women_pro','doubles_men_pro','relay_women','relay_men','relay_mixed'] as const;
export const MAIN_GOAL_VALUES = ['terminar', 'mejorar_marca', 'competir'] as const;
export const SEX_VALUES = ['female', 'male', 'other'] as const;
export const DAY_VALUES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
export const TRAINING_TIME_VALUES = ['mañana', 'mediodía', 'tarde', 'noche'] as const;
export const HYROX_EXPERIENCE_VALUES = ['primera vez', '1-2 carreras', '3+ carreras'] as const;
export const STRENGTH_EXPERIENCE_VALUES = ['baja', 'media', 'alta'] as const;
export const INJURY_STATUS_VALUES = ['active', 'improving', 'resolved'] as const;
export const INJURY_AREA_VALUES = ['Cabeza/cuello', 'Hombro', 'Brazo/codo', 'Muñeca/mano', 'Espalda', 'Cadera', 'Muslo', 'Rodilla', 'Pantorrilla', 'Tobillo/pie'] as const;
export const BODY_SIDE_VALUES = ['none', 'left', 'right', 'both'] as const;
export const NUTRITION_GOAL_VALUES = ['rendimiento', 'mantenimiento', 'perdida_grasa'] as const;
export const DIET_VALUES = ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'other'] as const;
export const CAFFEINE_VALUES = ['none', 'low', 'medium', 'high'] as const;
export const FASTED_VALUES = ['never', 'sometimes', 'usually'] as const;
export const WORKOUT_STATUS_VALUES = ['completado', 'parcial', 'saltado', 'adaptado'] as const;
export const EQUIPMENT_KEYS = ['skiErg','rowErg','bikeErg','assaultBike','sled','wallBall','sandbag','kettlebells','dumbbells','barbellAndPlates','treadmill','runningSpace','plyoBox'] as const;
export const TRAINING_TEST_IDS = ['erg-power','ski-2k','row-2k','vam','run-10k','sled-push-sprint','sled-pull-sprint','sled-push-max','sled-pull-max','bike-ftp-20','jim-vance-30'] as const;

export function isCanonicalValue<const T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

export function isBoundedFiniteNumber(value: unknown, min: number, max: number, step?: number): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return false;
  if (step !== undefined && Math.abs((value - min) / step - Math.round((value - min) / step)) > 1e-9) return false;
  return true;
}

export function isPaceString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [minutes, seconds] = value.split(':').map(Number);
  return seconds < 60 && minutes >= 2 && (minutes < 15 || (minutes === 15 && seconds === 0));
}
