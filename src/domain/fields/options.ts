import { DAY_VALUES, HYROX_EXPERIENCE_VALUES, STRENGTH_EXPERIENCE_VALUES, TRAINING_TIME_VALUES } from '../../../supabase/functions/_shared/inputDomains';
export type Option<T extends string | number = string> = { value: T; label: string };

export const HYROX_CATEGORIES = [
  ['women_open', 'Women Open'], ['men_open', 'Men Open'], ['women_pro', 'Women Pro'], ['men_pro', 'Men Pro'],
  ['doubles_women', 'Doubles Women'], ['doubles_men', 'Doubles Men'], ['doubles_mixed', 'Doubles Mixed'],
  ['doubles_women_pro', 'Doubles Women Pro'], ['doubles_men_pro', 'Doubles Men Pro'],
  ['relay_women', 'Relay Women'], ['relay_men', 'Relay Men'], ['relay_mixed', 'Relay Mixed'],
] .map(([value, label]) => ({ value, label })) as Option<HyroxCategory>[];

export type HyroxCategory =
  | 'women_open' | 'men_open' | 'women_pro' | 'men_pro'
  | 'doubles_women' | 'doubles_men' | 'doubles_mixed'
  | 'doubles_women_pro' | 'doubles_men_pro'
  | 'relay_women' | 'relay_men' | 'relay_mixed';

export const HEIGHT_OPTIONS: Option<number>[] = Array.from({ length: 111 }, (_, index) => ({ value: 120 + index, label: `${120 + index} cm` }));
export const WEIGHT_OPTIONS: Option<number>[] = Array.from({ length: 431 }, (_, index) => ({ value: 35 + index * 0.5, label: `${(35 + index * 0.5).toLocaleString('es-ES')} kg` }));
export const SEX_OPTIONS = [{ value: 'female', label: 'Mujer' }, { value: 'male', label: 'Hombre' }, { value: 'other', label: 'Otra / prefiero no indicarlo' }] as const;
export const DAYS = DAY_VALUES;
export const TRAINING_TIMES = TRAINING_TIME_VALUES.map((value) => ({ value, label: value[0].toLocaleUpperCase('es') + value.slice(1) }));
export const HYROX_EXPERIENCE_OPTIONS = HYROX_EXPERIENCE_VALUES.map((value) => ({ value, label: value[0].toLocaleUpperCase('es') + value.slice(1) }));
export const STRENGTH_EXPERIENCE_OPTIONS = STRENGTH_EXPERIENCE_VALUES.map((value) => ({ value, label: value[0].toLocaleUpperCase('es') + value.slice(1) }));
export const INJURY_AREAS = ['Cabeza/cuello', 'Hombro', 'Brazo/codo', 'Muñeca/mano', 'Espalda', 'Cadera', 'Muslo', 'Rodilla', 'Pantorrilla', 'Tobillo/pie'] as const;
export const BODY_SIDES = [{ value: 'none', label: 'No aplica' }, { value: 'left', label: 'Izquierda' }, { value: 'right', label: 'Derecha' }, { value: 'both', label: 'Ambos lados' }] as const;
export const DIET_OPTIONS = [{ value: 'omnivore', label: 'Omnívora' }, { value: 'vegetarian', label: 'Vegetariana' }, { value: 'vegan', label: 'Vegana' }, { value: 'pescatarian', label: 'Pescetariana' }, { value: 'other', label: 'Otra' }] as const;
export const CAFFEINE_OPTIONS = [{ value: 'none', label: 'No consumo' }, { value: 'low', label: 'Baja' }, { value: 'medium', label: 'Media' }, { value: 'high', label: 'Alta' }] as const;
export const FASTED_OPTIONS = [{ value: 'never', label: 'Nunca' }, { value: 'sometimes', label: 'A veces' }, { value: 'usually', label: 'Habitualmente' }] as const;
