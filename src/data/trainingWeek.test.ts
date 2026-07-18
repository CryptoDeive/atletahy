import { trainingWeek } from './trainingWeek';

describe('trainingWeek mock data', () => {
  it('contains seven Semana 6 days in PRETEMPORADA / Preparatorio Base with clean UTF-8 text', () => {
    expect(trainingWeek).toHaveLength(7);
    expect(trainingWeek.map((day) => day.weekday)).toEqual([
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ]);

    for (const [index, day] of trainingWeek.entries()) {
      expect(day.phase).toBe('PRETEMPORADA');
      expect(day.block).toBe('Preparatorio Base');
      expect(day.weekNumber).toBe(6);
      expect(day.dayNumber).toBe(index + 1);
      expect(day.dateLabel).toBe('Semana 6');
    }

    const serializedWeek = JSON.stringify(trainingWeek);
    expect(serializedWeek).not.toContain('?');
    expect(serializedWeek).not.toContain('Ã');
    expect(serializedWeek).not.toContain('Â');
    expect(serializedWeek).not.toContain('Bienvenida');
  });

  it('loads the exact Monday strength/accessory/metcon structure', () => {
    const monday = trainingWeek[0];

    expect(monday).toMatchObject({
      weekday: 'Lunes',
      title: 'Fuerza básica + Fuerza accesoria + Metcon',
      summary: 'Día de fuerza de tren superior con trabajo principal pesado, accesorios de empuje/tirón y cierre metabólico en ergómetros.',
    });
    expect(monday.sections.map((section) => section.title)).toEqual(['Fuerza básica', 'Fuerza accesoria', 'Metcon']);
    expect(JSON.stringify(monday)).toContain('Warm-up obligatorio');
    expect(JSON.stringify(monday)).toContain('4 Press vertical @95% 5RM — RIR 1 / RPEi 8,5');
    expect(JSON.stringify(monday)).toContain('Si no tienes dominada estricta');
    expect(JSON.stringify(monday)).toContain('EMOM 16’');
  });

  it('loads Test Jim Vance with protocol, zones, thresholds and LTHR details', () => {
    const tuesday = trainingWeek[1];

    expect(tuesday.title).toBe('Test Jim Vance');
    expect(JSON.stringify(tuesday)).toContain('Functional Threshold Pace / rFTP');
    expect(JSON.stringify(tuesday)).toContain('Frecuencia cardiaca media de los últimos 20’ → LTHR');
    expect(JSON.stringify(tuesday)).toContain('VT2 / MLSS ≈ intensidad media sostenida durante los 30’');
    expect(JSON.stringify(tuesday)).toContain('Z5c, capacidad anaeróbica: >106%');
  });

  it('contains Saturday Engine with PRO and Normal loads', () => {
    const saturday = trainingWeek.find((day) => day.weekday === 'Sábado');

    expect(saturday).toMatchObject({
      title: 'Engine',
      dayNumber: 6,
      isCompleted: false,
    });
    expect(saturday?.sections.map((section) => section.title)).toEqual(['Warm-up obligatorio', 'Strength', 'Endurance', 'For Time — 20’']);
    expect(JSON.stringify(saturday)).toContain('Zercher Reverse Lunge');
    expect(JSON.stringify(saturday)).toContain('200 m SkiErg');
    expect(saturday?.sections[3].loads).toEqual({
      PRO: ['Wall Ball: 9 / 6 kg', 'DB Snatch: 22,5 / 15 kg', 'Sandbag: 70 / 45 kg'],
      Normal: ['Wall Ball: 6 / 4 kg', 'DB Snatch: 20 / 12,5 kg', 'Sandbag: 45 / 30 kg'],
    });
  });

  it('contains Sunday as day 7 with regenerativo run details', () => {
    const sunday = trainingWeek.find((day) => day.weekday === 'Domingo');

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
});
