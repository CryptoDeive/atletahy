import type { DailyReadiness, WorkoutLog } from '../types/athlete';
import type { TrainingDay } from '../types/training';

export const HIGH_WEEKLY_LOAD = 2500;

export type WeeklyWarningStatus = 'green' | 'yellow' | 'red';
export type DayStatusLabel = 'Completado' | 'Parcial' | 'Saltado' | 'Adaptado' | 'Activo' | 'Pendiente';

export interface WeeklyDashboardStats {
  totalDays: number;
  completed: number;
  partial: number;
  skipped: number;
  adapted: number;
  active: number;
  pending: number;
  totalMinutes: number;
  averageSessionRpe: number | null;
  weeklyLoad: number;
  warningStatus: WeeklyWarningStatus;
}

type MaybeSnakeWorkoutLog = Partial<WorkoutLog> & {
  workout_log_id?: string;
  training_week_id?: string;
  training_day_id?: string;
  duration_minutes?: number | '' | null;
  session_rpe?: number | '' | null;
  completed_percentage?: number | '' | null;
  updated_at?: string | null;
  created_at?: string | null;
  finished_at?: string | null;
  started_at?: string | null;
  status?: string;
};

type CompletionOptions = {
  weekId?: string;
  activeDayId?: string;
  getDateForDay?: (day: TrainingDay, index: number) => string;
};

function getWeekId(log: MaybeSnakeWorkoutLog) {
  return log.weekId ?? log.training_week_id ?? '';
}

function getDayId(log: MaybeSnakeWorkoutLog) {
  return log.dayId ?? log.training_day_id ?? '';
}

function getDuration(log: MaybeSnakeWorkoutLog) {
  return log.durationMinutes ?? log.duration_minutes ?? '';
}

function getSessionRpe(log: MaybeSnakeWorkoutLog) {
  return log.sessionRpe1To10 ?? log.session_rpe ?? '';
}

function toValidNumber(value: number | '' | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function recencyValue(log: MaybeSnakeWorkoutLog, index: number) {
  const timestamp = log.updated_at ?? log.finishedAt ?? log.finished_at ?? log.startedAt ?? log.started_at ?? log.created_at;
  const parsed = timestamp ? Date.parse(timestamp) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : index;
}

export function normalizeWorkoutLogStatus(status: string | undefined): Exclude<DayStatusLabel, 'Activo' | 'Pendiente'> | null {
  switch (status) {
    case 'completed':
    case 'completado':
      return 'Completado';
    case 'partially_completed':
    case 'parcial':
      return 'Parcial';
    case 'skipped':
    case 'saltado':
      return 'Saltado';
    case 'adapted':
    case 'adaptado':
      return 'Adaptado';
    default:
      return null;
  }
}

export function getWorkoutLogStatusLabel(log: MaybeSnakeWorkoutLog | null | undefined, isActive: boolean): DayStatusLabel {
  const logStatus = normalizeWorkoutLogStatus(log?.status);
  if (logStatus) return logStatus;
  return isActive ? 'Activo' : 'Pendiente';
}

export function getLogForTrainingDay<TLog extends MaybeSnakeWorkoutLog>(logs: TLog[], weekId: string, dayId: string, date: string): TLog | null {
  const matches = logs
    .map((log, index) => ({ log, index }))
    .filter(({ log }) => getWeekId(log) === weekId && getDayId(log) === dayId && log.date === date);

  if (matches.length === 0) return null;

  return matches.reduce((latest, candidate) =>
    recencyValue(candidate.log, candidate.index) >= recencyValue(latest.log, latest.index) ? candidate : latest,
  ).log;
}

export function calculateWeeklyCompletion(days: TrainingDay[], logs: MaybeSnakeWorkoutLog[], options: CompletionOptions = {}) {
  const firstLogWithWeek = logs.find((log) => getWeekId(log));
  const weekId = options.weekId ?? (firstLogWithWeek ? getWeekId(firstLogWithWeek) : '');

  return days.reduce(
    (stats, day, index) => {
      const date = options.getDateForDay?.(day, index) ?? '';
      const matchingLog = weekId && date ? getLogForTrainingDay(logs, weekId, day.id, date) : logs.find((log) => getDayId(log) === day.id) ?? null;
      const label = getWorkoutLogStatusLabel(matchingLog, day.id === options.activeDayId);

      if (label === 'Completado') stats.completed += 1;
      if (label === 'Parcial') stats.partial += 1;
      if (label === 'Saltado') stats.skipped += 1;
      if (label === 'Adaptado') stats.adapted += 1;
      if (label === 'Activo') stats.active += 1;
      if (label === 'Pendiente') stats.pending += 1;
      return stats;
    },
    { totalDays: days.length, completed: 0, partial: 0, skipped: 0, adapted: 0, active: 0, pending: 0 },
  );
}

export function calculateWeeklyLoad(logs: MaybeSnakeWorkoutLog[]) {
  return logs.reduce((total, log) => {
    const duration = toValidNumber(getDuration(log));
    const rpe = toValidNumber(getSessionRpe(log));
    return duration === null || rpe === null ? total : total + duration * rpe;
  }, 0);
}

export function calculateAverageSessionRpe(logs: MaybeSnakeWorkoutLog[]) {
  const values = logs.map(getSessionRpe).map(toValidNumber).filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function calculateTotalRegisteredMinutes(logs: MaybeSnakeWorkoutLog[]) {
  return logs.reduce((total, log) => total + (toValidNumber(getDuration(log)) ?? 0), 0);
}

export function getWeeklyReadinessWarning(readiness: DailyReadiness | null | undefined, logs: MaybeSnakeWorkoutLog[]): WeeklyWarningStatus {
  const pain = toValidNumber(readiness?.pain0To10);
  const fatigue = toValidNumber(readiness?.fatigue1To5);
  const stress = toValidNumber(readiness?.stress1To5);
  const load = calculateWeeklyLoad(logs);

  if ((pain ?? 0) >= 7 || (fatigue ?? 0) >= 5) return 'red';
  if ((pain ?? 0) >= 4 || (fatigue ?? 0) >= 4 || (stress ?? 0) >= 4 || load > HIGH_WEEKLY_LOAD) return 'yellow';
  return 'green';
}