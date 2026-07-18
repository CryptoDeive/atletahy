import type { TrainingDay, TrainingDayId, TrainingWeek } from '../types/training';

const weekdayIdByDateIndex: Record<number, TrainingDayId> = {
  0: 'sunday-rest-mobility',
  1: 'monday-z2-mobility',
  2: 'tuesday-lower-strength',
  3: 'wednesday-run-intervals',
  4: 'thursday-active-recovery',
  5: 'friday-functional-core',
  6: 'saturday-hp-hybrid',
};

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDateInRange(date: Date, startDate: string, endDate: string): boolean {
  const dateKey = toDateKey(date);
  return dateKey >= startDate && dateKey <= endDate;
}

export function getWeekForDate(date: Date, weeks: TrainingWeek[]): TrainingWeek | undefined {
  return weeks.find((week) => isDateInRange(date, week.startDate, week.endDate));
}

export function getDayForDate(date: Date, week: TrainingWeek): TrainingDay | undefined {
  if (!isDateInRange(date, week.startDate, week.endDate)) {
    return undefined;
  }

  return week.days[date.getDay() === 0 ? 6 : date.getDay() - 1];
}

export function getCurrentWeekdayId(date: Date): TrainingDayId {
  return weekdayIdByDateIndex[date.getDay()];
}

export function getDateKeyForTrainingDay(week: TrainingWeek, day: TrainingDay): string {
  const [year, month, date] = week.startDate.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, date));
  startDate.setUTCDate(startDate.getUTCDate() + Math.max(day.dayNumber - 1, 0));
  return startDate.toISOString().slice(0, 10);
}
