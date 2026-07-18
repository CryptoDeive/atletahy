import type { GeneratedTrainingDay, GeneratedTrainingPlan, GeneratedTrainingSection, GeneratedTrainingWeek } from '../types/plan';
import type { TrainingDay, TrainingSection, TrainingWeek } from '../types/training';

function capitalize(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function generatedWeekId(week: GeneratedTrainingWeek) {
  return `generated:${week.id ?? `week-${week.weekNumber}`}`;
}

function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(parsed);
}

function adaptSection(section: GeneratedTrainingSection, week: GeneratedTrainingWeek, day: GeneratedTrainingDay, index: number): TrainingSection {
  const notes = [
    section.intensity ? `Intensidad: ${section.intensity}` : null,
    section.durationMinutes ? `Duración: ${section.durationMinutes} min` : null,
    ...(section.notes ?? []),
  ].filter((value): value is string => Boolean(value));

  return {
    id: `${generatedWeekId(week)}:${day.date}:section-${index + 1}`,
    type: capitalize(section.type),
    title: section.title,
    description: section.description,
    lines: section.exercises,
    notes,
    collapsed: false,
  };
}

export function adaptGeneratedDayToTrainingDay(day: GeneratedTrainingDay, week: GeneratedTrainingWeek): TrainingDay {
  return {
    id: `${generatedWeekId(week)}:${day.date}`,
    dateLabel: formatDateLabel(day.date),
    weekday: capitalize(day.weekday),
    dayNumber: week.days.findIndex((candidate) => candidate.date === day.date) + 1,
    title: day.title,
    summary: day.objective,
    phase: 'PLAN IA',
    block: week.focus,
    weekNumber: week.weekNumber,
    isCompleted: false,
    sections: day.sections.map((section, index) => adaptSection(section, week, day, index)),
    sessionType: day.sessionType,
    estimatedDurationMinutes: day.estimatedDurationMinutes,
    intensity: day.intensity,
    coachNotes: day.notes,
    nutritionNotes: day.nutritionNotes,
    adaptationOptions: day.adaptationOptions,
  };
}

export function adaptGeneratedPlanToTrainingWeeks(plan: GeneratedTrainingPlan): TrainingWeek[] {
  return plan.weeks.map((week) => ({
    id: generatedWeekId(week),
    weekNumber: week.weekNumber,
    phase: 'PLAN IA',
    block: week.focus,
    startDate: week.startDate,
    endDate: week.endDate,
    label: `Semana ${week.weekNumber}`,
    description: week.notes.join(' · ') || week.focus,
    days: week.days.map((day) => adaptGeneratedDayToTrainingDay(day, week)),
  }));
}
