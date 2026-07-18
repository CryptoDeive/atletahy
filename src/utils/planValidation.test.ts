import { describe, expect, it } from 'vitest';
import { validGeneratedTrainingPlan } from '../test/planTestUtils';
import { trainingPlanJsonSchema } from '../../supabase/functions/_shared/trainingPlanSchema';
import { validateGeneratedTrainingPlan } from './planValidation';

describe('validateGeneratedTrainingPlan', () => {
  it('accepts a valid 2-week generated plan', () => {
    const result = validateGeneratedTrainingPlan(validGeneratedTrainingPlan);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.generatedWeeks).toBe(2);
      expect(result.plan.weeks).toHaveLength(2);
      expect(result.plan.weeks.every((week) => week.days.length === 7)).toBe(true);
    }
  });

  it('rejects a plan without exactly 2 weeks of 7 days', () => {
    const result = validateGeneratedTrainingPlan({
      ...validGeneratedTrainingPlan,
      weeks: [
        validGeneratedTrainingPlan.weeks[0],
      ],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects totalWeeks when it does not match the two returned weeks', () => {
    const result = validateGeneratedTrainingPlan({
      ...validGeneratedTrainingPlan,
      totalWeeks: 8,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects more than 3 items per section in the V1 plan', () => {
    const firstDay = validGeneratedTrainingPlan.weeks[0].days[0];
    const result = validateGeneratedTrainingPlan({
      ...validGeneratedTrainingPlan,
      weeks: [
        {
          ...validGeneratedTrainingPlan.weeks[0],
          days: [
            {
              ...firstDay,
              sections: [{
                ...firstDay.sections[0],
                exercises: ['Uno', 'Dos', 'Tres', 'Cuatro'],
              }],
            },
            ...validGeneratedTrainingPlan.weeks[0].days.slice(1),
          ],
        },
        validGeneratedTrainingPlan.weeks[1],
      ],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects rest days that do not use sessionType="rest"', () => {
    const result = validateGeneratedTrainingPlan({
      ...validGeneratedTrainingPlan,
      weeks: [
        {
          ...validGeneratedTrainingPlan.weeks[0],
          days: validGeneratedTrainingPlan.weeks[0].days.map((day, index) => index === 2 ? { ...day, sessionType: 'mobility' } : day),
        },
        validGeneratedTrainingPlan.weeks[1],
      ],
    });
    expect(result.ok).toBe(false);
  });

  it('keeps the strict OpenAI schema free of optional id properties', () => {
    const weekSchema = trainingPlanJsonSchema.properties.weeks.items;
    const daySchema = weekSchema.properties.days.items;
    const sectionSchema = daySchema.properties.sections.items;

    expect(weekSchema.properties).not.toHaveProperty('id');
    expect(daySchema.properties).not.toHaveProperty('id');
    expect(sectionSchema.properties).not.toHaveProperty('id');
  });

  it('keeps unsupported string length keywords out of the strict OpenAI schema', () => {
    expect(JSON.stringify(trainingPlanJsonSchema)).not.toMatch(/minLength|maxLength/);
  });

  it('uses supported single-value enums instead of const in the strict OpenAI schema', () => {
    expect(trainingPlanJsonSchema.properties.totalWeeks).toEqual({ type: 'number', enum: [2] });
    expect(trainingPlanJsonSchema.properties.generatedWeeks).toEqual({ type: 'number', enum: [2] });
    expect(JSON.stringify(trainingPlanJsonSchema)).not.toMatch(/"const"/);
  });

  it('reports the current maximum of 3 global notes', () => {
    const assumptions = validateGeneratedTrainingPlan({
      ...validGeneratedTrainingPlan,
      assumptions: ['1', '2', '3', '4'],
    });
    const nutrition = validateGeneratedTrainingPlan({
      ...validGeneratedTrainingPlan,
      nutritionNotes: ['1', '2', '3', '4'],
    });

    expect(assumptions).toEqual({ ok: false, error: 'assumptions debe contener entre 1 y 3 strings.' });
    expect(nutrition).toEqual({ ok: false, error: 'nutritionNotes debe contener entre 1 y 3 strings.' });
  });
});
