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
  'Sesión sencilla de base para probar la selección semanal y acumular minutos sin fatiga residual.',
  'Trabajo técnico de sentadilla, bisagra y estabilidad con cargas moderadas.',
  'Intervalos cortos y controlados en SkiErg para sostener técnica bajo intensidad media.',
  'Rodaje aeróbico progresivo dentro de Z2, sin buscar ritmos máximos.',
  'Día regenerativo con core, respiración y movilidad de cadera y tobillo.',
  'Bloque híbrido suave con estaciones conocidas para ensayar transiciones.',
  'Recuperación activa opcional para cerrar la semana preparatoria.',
] as const;

const week5Sections: TrainingDay['sections'] = [
  {
    id: 'week-5-main-block',
    type: 'Engine',
    title: 'Bloque principal',
    collapsed: false,
    blocks: [
      {
        id: 'week-5-warm-up',
        title: 'Warm-up',
        lines: ['8’ movilidad dinámica', '5’ ergómetro suave', '3 progresiones técnicas'],
      },
      {
        id: 'week-5-quality',
        title: 'For quality',
        lines: ['30-40’ trabajo controlado', 'RPE 5-6', 'Prioriza técnica y respiración nasal'],
      },
    ],
    notes: ['Mock coherente para validar el selector de semanas sin tocar los datos reales de Semana 6.'],
  },
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
  sections: week5Sections.map((section) => ({
    ...section,
    id: `${section.id}-${index + 1}`,
    blocks: section.blocks?.map((block) => ({ ...block, id: `${block.id}-${index + 1}` })),
  })),
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
