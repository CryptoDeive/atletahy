import { describe, expect, it } from 'vitest';
import { validCoachAdvice } from '../test/coachTestUtils';
import { validateCoachAdvice } from './coachAdviceValidation';

describe('validateCoachAdvice', () => {
  it('accepts a correct CoachAdvice object', () => {
    const result = validateCoachAdvice(validCoachAdvice);

    expect(result.ok).toBe(true);
    expect(result.advice).toEqual(validCoachAdvice);
  });

  it('rejects an invalid readinessStatus', () => {
    const result = validateCoachAdvice({ ...validCoachAdvice, readinessStatus: 'blue' });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/readinessStatus/i);
  });
});
