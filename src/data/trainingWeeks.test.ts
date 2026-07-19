import { trainingWeeks } from './trainingWeeks';

describe('trainingWeeks data', () => {
  it('contains Semana 5 and Semana 6 with seven days each', () => {
    expect(trainingWeeks.map((week) => week.id)).toEqual(['week-5', 'week-6']);

    const week5 = trainingWeeks.find((week) => week.id === 'week-5');
    const week6 = trainingWeeks.find((week) => week.id === 'week-6');

    expect(week5).toMatchObject({
      weekNumber: 5,
      phase: 'PRETEMPORADA',
      block: 'Preparatorio Base',
      startDate: '2026-06-29',
      endDate: '2026-07-05',
      label: 'Semana 5',
      description: 'Preparatorio Base / Semana 5',
    });
    expect(week6).toMatchObject({
      weekNumber: 6,
      phase: 'PRETEMPORADA',
      block: 'Preparatorio Base',
      startDate: '2026-07-06',
      endDate: '2026-07-12',
      label: 'Semana 6',
      description: 'Preparatorio Base / Semana 6',
    });

    expect(week5?.days).toHaveLength(7);
    expect(week6?.days).toHaveLength(7);
  });

  it('keeps Semana 6 real data and clean UTF-8 text', () => {
    const week6 = trainingWeeks.find((week) => week.id === 'week-6');
    expect(week6?.days.map((day) => day.weekday)).toEqual([
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ]);

    for (const [index, day] of week6?.days.entries() ?? []) {
      expect(day.phase).toBe('PRETEMPORADA');
      expect(day.block).toBe('Preparatorio Base');
      expect(day.weekNumber).toBe(6);
      expect(day.dayNumber).toBe(index + 1);
      expect(day.dateLabel).toBe('Semana 6');
    }

    const serializedWeek = JSON.stringify(week6);
    expect(serializedWeek).not.toContain('?');
    expect(serializedWeek).not.toContain('Ã');
    expect(serializedWeek).not.toContain('Â');
    expect(serializedWeek).not.toContain('Bienvenida');
  });

  it('keeps Semana 6 Sunday as Rodaje regenerativo', () => {
    const week6 = trainingWeeks.find((week) => week.id === 'week-6');
    const sunday = week6?.days.find((day) => day.weekday === 'Domingo');

    expect(sunday).toMatchObject({
      title: 'Rodaje regenerativo',
      dayNumber: 7,
    });
    expect(sunday?.sections).toEqual([
      expect.objectContaining({
        type: 'Engine',
        title: 'Rodaje regenerativo',
        lines: ['8 km Run', '70-75% FC', 'Z2 TJV', 'RPEs 5'],
        notes: ['Buscamos un rodaje para soltar piernas.'],
      }),
    ]);
  });

  it('gives every Semana 5 day session-specific training details and athlete-facing notes', () => {
    const week5 = trainingWeeks.find((week) => week.id === 'week-5');
    const sectionSignatures = week5?.days.map((day) => JSON.stringify(day.sections));

    expect(new Set(sectionSignatures).size).toBe(7);
    for (const day of week5?.days ?? []) {
      expect(day.sections.length).toBeGreaterThan(0);
      expect(day.sections.flatMap((section) => section.notes ?? []).length).toBeGreaterThan(0);
    }

    const serializedWeek = JSON.stringify(week5);
    expect(serializedWeek).not.toContain('Mock coherente');
    expect(serializedWeek).not.toContain('selector de semanas');
    expect(serializedWeek).not.toContain('datos reales');
  });
});
