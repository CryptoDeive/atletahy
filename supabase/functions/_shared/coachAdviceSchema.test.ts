import { describe, expect, it } from 'vitest';
import { validateCoachAdvice } from './coachAdviceSchema';

const validCoachAdvice = {
  readinessStatus: 'green',
  summary: 'Listo para entrenar con control.',
  objective: 'Completar la sesión manteniendo técnica y pacing.',
  strategy: ['Empieza conservador y progresa si el RPE se mantiene estable.'],
  pacing: ['Mantén Z2 en el bloque aeróbico.'],
  techniqueFocus: ['Prioriza postura estable en estaciones.'],
  warmupAdjustments: ['Añade movilidad de cadera y tobillo.'],
  riskWarnings: ['Para si aparece dolor agudo.'],
  modifications: [
    {
      condition: 'Fatiga mayor de lo esperado',
      recommendation: 'Reduce volumen un 20%.',
      keepOriginalIntent: true,
    },
  ],
  nutrition: {
    preWorkout: ['Carbohidrato fácil de digerir si entrenas con hambre.'],
    intraWorkout: ['Agua en sesiones cortas.'],
    postWorkout: ['Proteína y carbohidrato tras entrenar.'],
    hydration: ['Bebe según sed y temperatura.'],
    caffeine: 'Opcional si ya la toleras.',
  },
  scheduling: {
    bestTimeWindow: 'morning',
    reason: 'Encaja con la disponibilidad y reduce interferencias.',
    doubleSessionRecommended: false,
  },
  checklist: ['Calentar', 'Controlar RPE', 'Registrar sensaciones'],
};

describe('coachAdviceSchema', () => {
  it('accepts a valid CoachAdvice response', () => {
    const validation = validateCoachAdvice(validCoachAdvice);

    expect(validation).toEqual({ ok: true, advice: validCoachAdvice });
  });

  it('rejects an invalid readinessStatus', () => {
    const validation = validateCoachAdvice({
      ...validCoachAdvice,
      readinessStatus: 'blue',
    });

    expect(validation).toEqual({ ok: false, error: 'readinessStatus inválido' });
  });

  it('rejects overlong strings, oversized arrays and unknown fields', () => {
    expect(validateCoachAdvice({ ...validCoachAdvice, summary: 'x'.repeat(1001) }).ok).toBe(false);
    expect(validateCoachAdvice({ ...validCoachAdvice, strategy: Array.from({ length: 11 }, () => 'ok') }).ok).toBe(false);
    expect(validateCoachAdvice({ ...validCoachAdvice, unexpected: true }).ok).toBe(false);
  });

  it('rejects unknown nested output fields', () => {
    expect(validateCoachAdvice({ ...validCoachAdvice, nutrition: { ...validCoachAdvice.nutrition, unexpected: true } }).ok).toBe(false);
    expect(validateCoachAdvice({ ...validCoachAdvice, scheduling: { ...validCoachAdvice.scheduling, unexpected: true } }).ok).toBe(false);
    expect(validateCoachAdvice({ ...validCoachAdvice, modifications: [{ ...validCoachAdvice.modifications[0], unexpected: true }] }).ok).toBe(false);
  });

  it('rejects unbounded nested output strings and invalid double-session ranges', () => {
    expect(validateCoachAdvice({ ...validCoachAdvice, modifications: [{ ...validCoachAdvice.modifications[0], recommendation: 'x'.repeat(1001) }] }).ok).toBe(false);
    expect(validateCoachAdvice({ ...validCoachAdvice, nutrition: { ...validCoachAdvice.nutrition, caffeine: 'x'.repeat(1001) } }).ok).toBe(false);
    expect(validateCoachAdvice({ ...validCoachAdvice, scheduling: { ...validCoachAdvice.scheduling, reason: 'x'.repeat(1001) } }).ok).toBe(false);
    expect(validateCoachAdvice({
      ...validCoachAdvice,
      scheduling: { ...validCoachAdvice.scheduling, doubleSessionRecommended: true, doubleSessionPlan: { session1: 'Rodaje', session2: 'Fuerza', minimumHoursBetween: -1 } },
    }).ok).toBe(false);
  });
});
