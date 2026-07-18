import { describe, expect, it } from 'vitest';
import { trainingWeeks } from '../data/trainingWeeks';
import type { CoachAdviceInput } from '../types/athlete';
import { generateLocalCoachAdvice } from './localCoach';

function buildInput(overrides: Partial<CoachAdviceInput> = {}): CoachAdviceInput {
  const activeWeek = trainingWeeks[1];
  const activeDay = activeWeek.days[0];

  return {
    profile: {
      name: 'Deivi',
      birthDate: '1990-04-12',
      heightCm: 178,
      weightKg: 77,
      sex: 'male',
      hyroxCategory: 'Open Men',
      targetDate: '2026-10-01',
      mainGoal: 'mejorar_marca',
    },
    physiology: {
      restingHrBaseline: 50,
      restingHrToday: 54,
      maxHr: 190,
      lthr: 174,
      rftp: '4:20/km',
      z2PaceLow: '5:15/km',
      z2PaceHigh: '5:45/km',
      fiveKPace: '4:05/km',
      tenKPace: '4:20/km',
      hrvBaseline: 72,
    },
    availability: {
      availableDays: ['lunes', 'miércoles', 'sábado'],
      preferredTrainingTime: 'mañana',
      maxSessionMinutes: 90,
      canDoubleSession: true,
      minHoursBetweenSessions: 8,
      scheduleNotes: '',
    },
    equipment: {
      skiErg: true,
      rowErg: true,
      bikeErg: true,
      assaultBike: true,
      sled: true,
      wallBall: true,
      sandbag: true,
      kettlebells: true,
      dumbbells: true,
      barbellAndPlates: true,
      treadmill: true,
      runningSpace: true,
      plyoBox: true,
    },
    activeInjuries: [],
    nutrition: {
      goal: 'rendimiento',
      dietType: 'Omnívora',
      allergies: '',
      intolerances: '',
      caffeineTolerance: 'media',
      fastedTrainingPreference: 'evitar',
      mealTiming: '',
      supplements: '',
      notes: '',
    },
    dailyReadiness: {
      date: '2026-07-06',
      sleepHours: 7.5,
      sleepQuality1To5: 4,
      stress1To5: 2,
      fatigue1To5: 2,
      muscleSoreness1To5: 2,
      legSoreness1To5: 2,
      upperSoreness1To5: 2,
      motivation1To5: 5,
      hydration1To5: 4,
      pain0To10: 1,
      painLocation: '',
      notes: '',
    },
    activeWorkout: { week: activeWeek, day: activeDay },
    currentWorkoutLog: null,
    recentWorkoutLogs: [],
    ...overrides,
  };
}

describe('generateLocalCoachAdvice', () => {
  it('returns red readiness when pain_0_10 is at least 7', () => {
    const input = buildInput({
      dailyReadiness: { ...buildInput().dailyReadiness!, pain0To10: 7, painLocation: 'rodilla' },
    });

    const advice = generateLocalCoachAdvice(input);

    expect(advice.readinessStatus).toBe('red');
    expect(advice.riskWarnings.join(' ')).toMatch(/dolor|intensidad/i);
    expect(advice.scheduling.doubleSessionRecommended).toBe(false);
  });

  it('returns yellow readiness when sleep_hours is between 5 and 6.5', () => {
    const input = buildInput({ dailyReadiness: { ...buildInput().dailyReadiness!, sleepHours: 6 } });

    const advice = generateLocalCoachAdvice(input);

    expect(advice.readinessStatus).toBe('yellow');
    expect(advice.strategy.join(' ')).toMatch(/10-25|RPE|volumen/i);
  });

  it('returns green readiness when sleep, stress, fatigue and pain are correct', () => {
    const advice = generateLocalCoachAdvice(buildInput());

    expect(advice.readinessStatus).toBe('green');
    expect(advice.strategy.join(' ')).toMatch(/plan|pacing/i);
  });

  it('keeps Test Jim Vance as a single session', () => {
    const activeWeek = trainingWeeks[1];
    const input = buildInput({ activeWorkout: { week: activeWeek, day: activeWeek.days[1] } });

    const advice = generateLocalCoachAdvice(input);

    expect(advice.objective).toMatch(/umbral|rFTP|LTHR/i);
    expect(advice.scheduling.doubleSessionRecommended).toBe(false);
  });

  it('uses recovery as the objective on rest days', () => {
    const activeWeek = trainingWeeks[1];
    const input = buildInput({ activeWorkout: { week: activeWeek, day: activeWeek.days[4] } });

    const advice = generateLocalCoachAdvice(input);

    expect(advice.objective).toMatch(/recuper/i);
    expect(advice.riskWarnings.join(' ')).toMatch(/descanso/i);
    expect(advice.scheduling.doubleSessionRecommended).toBe(false);
  });

  it('does not classify intra-block Rest as a rest day when Week 6 Day 1 is strength plus metcon', () => {
    const activeWeek = trainingWeeks[1];
    const week6Day1 = activeWeek.days[0];
    const dayWithLocalizedRestLine = {
      ...week6Day1,
      sections: week6Day1.sections.map((section) =>
        section.id !== 'monday-metcon'
          ? section
          : {
              ...section,
              blocks: section.blocks?.map((block) =>
                block.id !== 'monday-emom'
                  ? block
                  : { ...block, lines: block.lines?.map((line) => (line === 'D) Rest' ? 'D) Descanso / Rest' : line)) },
              ),
            },
      ),
    };
    const input = buildInput({ activeWorkout: { week: activeWeek, day: dayWithLocalizedRestLine } });

    const advice = generateLocalCoachAdvice(input);

    expect(advice.objective).toMatch(/fuerza|rendimiento híbrido|metabólico|fatiga/i);
    expect(advice.objective).not.toMatch(/recuper/i);
    expect(advice.riskWarnings.join(' ')).not.toMatch(/descanso en entrenamiento encubierto/i);
  });

  it('can suggest a double session for green Engine work when availability allows it', () => {
    const activeWeek = trainingWeeks[1];
    const input = buildInput({ activeWorkout: { week: activeWeek, day: activeWeek.days[5] } });

    const advice = generateLocalCoachAdvice(input);

    expect(advice.readinessStatus).toBe('green');
    expect(advice.scheduling.doubleSessionRecommended).toBe(true);
    expect(advice.scheduling.doubleSessionPlan?.minimumHoursBetween).toBeGreaterThanOrEqual(6);
  });

  it('includes active injuries in risk warnings or modifications', () => {
    const input = buildInput({
      activeInjuries: [
        {
          id: 'inj-1',
          body_area: 'rodilla',
          side: 'derecha',
          pain_level_0_10: 5,
          status: 'active',
          movement_restrictions: 'Evitar saltos',
          notes: '',
        },
      ],
    });

    const advice = generateLocalCoachAdvice(input);
    const searchable = `${advice.riskWarnings.join(' ')} ${advice.modifications.map((mod) => `${mod.condition} ${mod.recommendation}`).join(' ')}`;

    expect(searchable).toMatch(/rodilla|saltos/i);
  });
});
