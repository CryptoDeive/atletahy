import { describe, expect, it } from 'vitest';
import { validCoachAdvice } from '../../../src/test/coachTestUtils';
import { validGeneratedTrainingPlan, validPlanGenerationInput } from '../../../src/test/planTestUtils';
import { validateGeneratedTrainingPlan } from './trainingPlanContract';
import { applyCoachSafetyOverrides, applyPlanSafetyOverrides, evaluateTrainingSafety } from './trainingSafety';

describe('deterministic training safety', () => {
  it('classifies pain >= 7 or a severe active injury as red', () => {
    expect(evaluateTrainingSafety({ dailyReadiness: { pain0To10: 7 }, injuries: [] }).level).toBe('red');
    expect(evaluateTrainingSafety({ dailyReadiness: null, injuries: [{ status: 'active', pain_level_0_10: 8 }] }).level).toBe('red');
  });

  it('classifies high fatigue, stress or low sleep as yellow', () => {
    expect(evaluateTrainingSafety({ dailyReadiness: { fatigue1To5: 4, sleepHours: 5 }, injuries: [] }).level).toBe('yellow');
  });

  it('prevents double sessions and high intensity in red coach advice', () => {
    const red = applyCoachSafetyOverrides({ ...validCoachAdvice, scheduling: { ...validCoachAdvice.scheduling, doubleSessionRecommended: true } }, { level: 'red', reasons: ['Dolor alto'] });
    expect(red.readinessStatus).toBe('red');
    expect(red.scheduling.doubleSessionRecommended).toBe(false);
    expect(red.scheduling.doubleSessionPlan).toBeUndefined();
    expect(red.riskWarnings.join(' ')).toMatch(/dolor|descanso/i);
  });

  it('downgrades high-intensity generated days before rendering for red athletes', () => {
    const redInput = { ...validPlanGenerationInput, dailyReadiness: { date: '2026-07-15', pain0To10: 8 } } as never;
    const safe = applyPlanSafetyOverrides(validGeneratedTrainingPlan, evaluateTrainingSafety({ dailyReadiness: redInput.dailyReadiness, injuries: [] }));
    expect(safe.weeks.flatMap((week) => week.days).some((day) => day.intensity === 'high')).toBe(false);
  });

  it('preserves rest/rest days and the complete plan contract for red athletes', () => {
    const safe = applyPlanSafetyOverrides(validGeneratedTrainingPlan, { level: 'red', reasons: ['Dolor alto'] });
    const restDays = safe.weeks.flatMap((week) => week.days).filter((day) => day.sessionType === 'rest');

    expect(restDays.length).toBeGreaterThan(0);
    expect(restDays.every((day) => day.intensity === 'rest')).toBe(true);
    expect(validateGeneratedTrainingPlan(safe).ok).toBe(true);
  });

  it('removes every renderable high-intensity prescription from a red plan', () => {
    const unsafe = structuredClone(validGeneratedTrainingPlan);
    unsafe.title = 'Plan VO2max y máximos';
    unsafe.objective = 'Buscar récord con pacing agresivo';
    unsafe.assumptions = ['Mantener alta intensidad'];
    unsafe.weeks[0].focus = 'Sprint máximo';
    unsafe.weeks[0].notes = ['RPE 9'];
    unsafe.weeks[0].days[0] = {
      ...unsafe.weeks[0].days[0],
      title: 'VO2max',
      objective: 'Pacing agresivo a RPE 9',
      notes: ['Alta intensidad'],
      adaptationOptions: ['Buscar récord'],
      sections: [{
        ...unsafe.weeks[0].days[0].sections[0],
        title: 'Sprint máximo',
        description: 'Trabajo VO2max a RPE 9',
        exercises: ['10 sprints all-out'],
        intensity: 'RPE 9',
        notes: ['Sin bajar el ritmo'],
      }],
    };

    const safe = applyPlanSafetyOverrides(unsafe, { level: 'red', reasons: ['Dolor alto'] });
    const allRenderableText = JSON.stringify(safe);

    expect(allRenderableText).not.toMatch(/VO2|maxim|máxim|récord|record|alta intensidad|RPE\s*[7-9]|sprint|all-out|pacing agresivo/i);
    expect(safe.weeks.flatMap((week) => week.days).every((day) => day.sessionType === 'rest' ? day.intensity === 'rest' : day.intensity === 'low')).toBe(true);
    expect(validateGeneratedTrainingPlan(safe).ok).toBe(true);
  });

  it('replaces contradictory red Coach strategy, pacing and prescriptions', () => {
    const unsafe = {
      ...validCoachAdvice,
      summary: 'Haz VO2max a RPE 9',
      objective: 'Buscar récord',
      strategy: ['Sprint all-out'],
      pacing: ['Pacing agresivo'],
      techniqueFocus: ['Mantener intensidad máxima'],
      warmupAdjustments: ['Preparar alta intensidad'],
      riskWarnings: ['No reduzcas'],
      checklist: ['Completar RPE 9'],
      nutrition: { ...validCoachAdvice.nutrition, caffeine: 'Dosis alta para máximo rendimiento' },
    };

    const safe = applyCoachSafetyOverrides(unsafe, { level: 'red', reasons: ['Dolor alto'] });

    expect(JSON.stringify(safe)).not.toMatch(/VO2|maxim|máxim|récord|record|alta intensidad|RPE\s*[7-9]|sprint|all-out|pacing agresivo|no reduzcas/i);
    expect(safe.scheduling.doubleSessionRecommended).toBe(false);
  });

  it('removes every incompatible rendered prescription from a yellow plan while retaining safe training', () => {
    const unsafe = structuredClone(validGeneratedTrainingPlan);
    unsafe.title = 'Plan VO2max y récords';
    unsafe.objective = 'Sprint all-out con pacing agresivo';
    unsafe.assumptions = ['Mantener RPE 9'];
    unsafe.weeks[0].focus = 'Intensidad máxima';
    unsafe.weeks[0].notes = ['Doble intensidad'];
    unsafe.weeks[0].days[0] = {
      ...unsafe.weeks[0].days[0],
      title: 'VO2max',
      objective: 'Buscar récord a RPE 9',
      notes: ['Sprint all-out'],
      adaptationOptions: ['Pacing agresivo'],
      sections: [{
        ...unsafe.weeks[0].days[0].sections[0],
        title: 'Máximo esfuerzo',
        description: 'Doble intensidad VO2max',
        exercises: ['Sprints all-out'],
        intensity: 'RPE 9',
        notes: ['Buscar récord'],
      }],
    };
    const originalDuration = unsafe.weeks[0].days[0].estimatedDurationMinutes;

    const safe = applyPlanSafetyOverrides(unsafe, { level: 'yellow', reasons: ['Fatiga alta'] });
    const days = safe.weeks.flatMap((week) => week.days);

    expect(JSON.stringify(safe)).not.toMatch(/VO2|maxim|máxim|récord|record|alta intensidad|doble intensidad|RPE\s*[7-9]|sprint|all-out|pacing agresivo/i);
    expect(days.some((day) => day.sessionType !== 'rest')).toBe(true);
    expect(days.every((day) => day.sessionType === 'rest' ? day.intensity === 'rest' : ['low', 'moderate'].includes(day.intensity))).toBe(true);
    expect(safe.weeks[0].days[0].estimatedDurationMinutes).toBeLessThan(originalDuration);
    expect(validateGeneratedTrainingPlan(safe).ok).toBe(true);
  });

  it('replaces contradictory yellow Coach strategy, pacing and checklist content', () => {
    const unsafe = {
      ...validCoachAdvice,
      summary: 'VO2max a RPE 9',
      objective: 'Buscar récord',
      strategy: ['Sprint all-out'],
      pacing: ['Pacing agresivo'],
      techniqueFocus: ['Esfuerzo máximo'],
      warmupAdjustments: ['Preparar doble intensidad'],
      riskWarnings: ['No reduzcas'],
      modifications: [{ condition: 'Fatiga', recommendation: 'Mantén RPE 9', keepOriginalIntent: true }],
      checklist: ['Completar VO2max'],
      nutrition: { ...validCoachAdvice.nutrition, caffeine: 'Dosis alta para sprint máximo' },
    };

    const safe = applyCoachSafetyOverrides(unsafe, { level: 'yellow', reasons: ['Fatiga alta'] });

    expect(JSON.stringify(safe)).not.toMatch(/VO2|maxim|máxim|récord|record|alta intensidad|doble intensidad|RPE\s*[7-9]|sprint|all-out|pacing agresivo|no reduzcas/i);
    expect(safe.readinessStatus).toBe('yellow');
    expect(safe.scheduling.doubleSessionRecommended).toBe(false);
  });
});
