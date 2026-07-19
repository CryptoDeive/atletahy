import type { TrainingDay, TrainingWeek } from '../types/training';
import { trainingWeek as week6Days } from './trainingWeek';

const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

const week5Titles = [
  'Base aeróbica + movilidad',
  'Fuerza técnica tren inferior',
  'Intervalos controlados SkiErg',
  'Rodaje Z2 progresivo',
  'Core + movilidad',
  'Simulación HYROX suave',
  'Descanso activo',
] as const;

const week5Summaries = [
  'Sesión sencilla de base aeróbica para acumular minutos de calidad sin fatiga residual.',
  'Trabajo técnico de sentadilla, bisagra y estabilidad con cargas moderadas.',
  'Intervalos cortos y controlados en SkiErg para sostener técnica bajo intensidad media.',
  'Rodaje aeróbico progresivo dentro de Z2, sin buscar ritmos máximos.',
  'Día regenerativo con core, respiración y movilidad de cadera y tobillo.',
  'Bloque híbrido suave con estaciones conocidas para ensayar transiciones.',
  'Recuperación activa opcional para cerrar la semana preparatoria.',
] as const;

const week5SectionsByDay: TrainingDay['sections'][] = [
  [{
    id: 'week-5-day-1-engine', type: 'Engine', title: 'Base aeróbica', collapsed: false,
    blocks: [
      { id: 'week-5-day-1-warm-up', title: 'Warm-up', lines: ['8’ movilidad dinámica', '5’ ergómetro suave', '3 progresiones de 20”'] },
      { id: 'week-5-day-1-main', title: 'For quality', lines: ['35’ carrera o BikeErg en Z2', 'RPE 5-6', '10’ movilidad de cadera y tobillo'] },
    ],
    notes: ['Mantén una intensidad cómoda: deberías poder hablar en frases completas durante todo el bloque.'],
  }],
  [{
    id: 'week-5-day-2-strength', type: 'Fuerza', title: 'Fuerza técnica', collapsed: false,
    blocks: [
      { id: 'week-5-day-2-warm-up', title: 'Activación', lines: ['2 rondas: 10 Air Squat', '10 Glute Bridge', '8/8 Split Squat sin carga'] },
      { id: 'week-5-day-2-main', title: '4 rondas for quality', lines: ['6 Goblet Squat — RPE 6', '8 Romanian Deadlift con 2 DB — RPE 6', '10/10 Step Up controlado', 'Descanso 90”'] },
    ],
    notes: ['Deja siempre 3-4 repeticiones en reserva y prioriza el control de cada fase del movimiento.'],
  }],
  [{
    id: 'week-5-day-3-ski', type: 'Engine', title: 'Intervalos SkiErg', collapsed: false,
    blocks: [
      { id: 'week-5-day-3-warm-up', title: 'Warm-up', lines: ['8’ SkiErg progresivo', '3 x 20” alegres + 40” suave'] },
      { id: 'week-5-day-3-main', title: 'Intervalos controlados', lines: ['8 x 1’ SkiErg — RPE 7', '1’ recuperación suave entre intervalos', '5’ vuelta a la calma'] },
    ],
    notes: ['Busca repetir el mismo ritmo en las ocho series sin perder longitud de tirón.'],
  }],
  [{
    id: 'week-5-day-4-run', type: 'Engine', title: 'Rodaje Z2 progresivo', collapsed: false,
    blocks: [
      { id: 'week-5-day-4-warm-up', title: 'Entrada en calor', lines: ['10’ carrera suave — RPE 4-5', 'Movilidad dinámica de tobillo y cadera'] },
      { id: 'week-5-day-4-main', title: 'Progresivo', lines: ['20’ Z2 baja', '15’ Z2 media', '5’ Z2 alta sin superar RPE 7'] },
    ],
    notes: ['Ajusta el ritmo al calor y al terreno; manda la sensación aeróbica, no el ritmo del reloj.'],
  }],
  [{
    id: 'week-5-day-5-recovery', type: 'Recovery', title: 'Core + movilidad', collapsed: false,
    blocks: [
      { id: 'week-5-day-5-core', title: '3 rondas suaves', lines: ['30” Dead Bug', '30” Side Plank por lado', '10 Bird Dog por lado', '60” descanso'] },
      { id: 'week-5-day-5-mobility', title: 'Movilidad', lines: ['2’ respiración diafragmática', '8’ movilidad de cadera, dorsal y tobillo'] },
    ],
    notes: ['Termina con sensación de frescura; esta sesión prepara el cuerpo para el bloque híbrido del sábado.'],
  }],
  [{
    id: 'week-5-day-6-hybrid', type: 'For Time', title: 'Simulación HYROX suave', collapsed: false,
    blocks: [
      { id: 'week-5-day-6-warm-up', title: 'Warm-up', lines: ['8’ ergómetro progresivo', '2 rondas: 8 Walking Lunge + 8 Wall Ball suaves'] },
      { id: 'week-5-day-6-main', title: '3 rondas for quality', lines: ['600 m Run', '500 m RowErg', '20 m Farmers Carry moderado', '12 Wall Ball', '2’ descanso entre rondas'] },
    ],
    notes: ['Practica transiciones fluidas y reserva energía: el objetivo es acabar todas las rondas al mismo ritmo.'],
  }],
  [{
    id: 'week-5-day-7-recovery', type: 'Recovery', title: 'Descanso activo', collapsed: false,
    blocks: [
      { id: 'week-5-day-7-main', title: 'Recuperación opcional', lines: ['20-30’ paseo o bici muy suave', '10’ movilidad libre', 'RPE 2-3'] },
    ],
    notes: ['Si notas fatiga acumulada, sustituye la actividad por descanso completo, hidratación y sueño.'],
  }],
];

const week5Days: TrainingDay[] = weekdays.map((weekday, index) => ({
  id: `week-5-day-${index + 1}`,
  dateLabel: 'Semana 5',
  weekday,
  dayNumber: index + 1,
  title: week5Titles[index],
  summary: week5Summaries[index],
  phase: 'PRETEMPORADA',
  block: 'Preparatorio Base',
  weekNumber: 5,
  isCompleted: false,
  sections: week5SectionsByDay[index],
}));

export const trainingWeeks: TrainingWeek[] = [
  {
    id: 'week-5',
    weekNumber: 5,
    phase: 'PRETEMPORADA',
    block: 'Preparatorio Base',
    startDate: '2026-06-29',
    endDate: '2026-07-05',
    label: 'Semana 5',
    description: 'Preparatorio Base / Semana 5',
    days: week5Days,
  },
  {
    id: 'week-6',
    weekNumber: 6,
    phase: 'PRETEMPORADA',
    block: 'Preparatorio Base',
    startDate: '2026-07-06',
    endDate: '2026-07-12',
    label: 'Semana 6',
    description: 'Preparatorio Base / Semana 6',
    days: week6Days,
  },
];

export const defaultWeek = trainingWeeks.find((week) => week.id === 'week-6') ?? trainingWeeks[0];
