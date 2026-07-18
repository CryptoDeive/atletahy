import { trainingWeeks } from '../data/trainingWeeks';
import { getCurrentWeekdayId, getDateKeyForTrainingDay, getDayForDate, getWeekForDate, isDateInRange } from './date';

describe('date utilities', () => {
  it.each([
    ['Sunday', '2026-07-05T10:00:00', 'sunday-rest-mobility'],
    ['Monday', '2026-07-06T10:00:00', 'monday-z2-mobility'],
    ['Tuesday', '2026-07-07T10:00:00', 'tuesday-lower-strength'],
    ['Wednesday', '2026-07-08T10:00:00', 'wednesday-run-intervals'],
    ['Thursday', '2026-07-09T10:00:00', 'thursday-active-recovery'],
    ['Friday', '2026-07-10T10:00:00', 'friday-functional-core'],
    ['Saturday', '2026-07-11T10:00:00', 'saturday-hp-hybrid'],
  ])('maps %s to the matching training day id', (_weekday, isoDate, expectedDayId) => {
    expect(getCurrentWeekdayId(new Date(isoDate))).toBe(expectedDayId);
  });

  it('checks inclusive date ranges using date-only values', () => {
    expect(isDateInRange(new Date('2026-06-29T00:01:00'), '2026-06-29', '2026-07-05')).toBe(true);
    expect(isDateInRange(new Date('2026-07-05T23:59:00'), '2026-06-29', '2026-07-05')).toBe(true);
    expect(isDateInRange(new Date('2026-07-06T00:00:00'), '2026-06-29', '2026-07-05')).toBe(false);
  });

  it('selects Semana 5 for dates between 2026-06-29 and 2026-07-05', () => {
    expect(getWeekForDate(new Date('2026-06-29T12:00:00'), trainingWeeks)?.id).toBe('week-5');
    expect(getWeekForDate(new Date('2026-07-05T12:00:00'), trainingWeeks)?.id).toBe('week-5');
  });

  it('selects Semana 6 for dates between 2026-07-06 and 2026-07-12', () => {
    expect(getWeekForDate(new Date('2026-07-06T12:00:00'), trainingWeeks)?.id).toBe('week-6');
    expect(getWeekForDate(new Date('2026-07-12T12:00:00'), trainingWeeks)?.id).toBe('week-6');
  });

  it('returns undefined for dates outside available weeks', () => {
    expect(getWeekForDate(new Date('2026-08-01T12:00:00'), trainingWeeks)).toBeUndefined();
  });

  it('returns the matching day only when the date belongs to the week', () => {
    const week6 = trainingWeeks.find((week) => week.id === 'week-6')!;

    expect(getDayForDate(new Date('2026-07-12T12:00:00'), week6)?.title).toBe('Rodaje regenerativo');
    expect(getDayForDate(new Date('2026-07-05T12:00:00'), week6)).toBeUndefined();
  });
  it('builds the calendar date key for a selected training day inside a week', () => {
    const week6 = trainingWeeks.find((week) => week.id === 'week-6')!;
    const tuesday = week6.days.find((day) => day.id === 'tuesday-lower-strength')!;

    expect(getDateKeyForTrainingDay(week6, tuesday)).toBe('2026-07-07');
  });
});

