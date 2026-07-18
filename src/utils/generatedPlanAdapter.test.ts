import { describe, expect, it } from 'vitest';
import { validGeneratedTrainingPlan } from '../test/planTestUtils';
import { adaptGeneratedDayToTrainingDay, adaptGeneratedPlanToTrainingWeeks } from './generatedPlanAdapter';

describe('generatedPlanAdapter', () => {
  it('adapts generated weeks using their real dates and plan focus', () => {
    const weeks = adaptGeneratedPlanToTrainingWeeks(validGeneratedTrainingPlan);

    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toMatchObject({
      id: 'generated:week-1',
      startDate: '2026-07-13',
      endDate: '2026-07-19',
      label: 'Semana 1',
      block: 'Base aeróbica y técnica HYROX',
    });
    expect(weeks[0].days[0]).toMatchObject({
      id: 'generated:week-1:2026-07-13',
      title: 'Run Z2 + movilidad',
      sessionType: 'run',
      estimatedDurationMinutes: 55,
      intensity: 'low',
      summary: 'Acumular volumen fácil y soltar piernas.',
    });
  });

  it('adapts generated sections and day guidance without losing details', () => {
    const week = validGeneratedTrainingPlan.weeks[0];
    const day = adaptGeneratedDayToTrainingDay(week.days[0], week);

    expect(day.sections[0]).toMatchObject({
      title: 'Bloque principal',
      lines: ['Bloque principal guiado'],
    });
    expect(day.sections[0].notes).toEqual(expect.arrayContaining(['Intensidad: RPE 6']));
    expect(day.coachNotes).toEqual([]);
    expect(day.nutritionNotes).toEqual([]);
    expect(day.adaptationOptions).toEqual(['Recorta a 30 min si vas justo de tiempo.']);
  });
});
