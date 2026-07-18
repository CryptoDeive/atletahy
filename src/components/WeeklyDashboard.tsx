import type { DailyReadiness, WorkoutLog } from '../types/athlete';
import type { TrainingWeek } from '../types/training';
import { getDateKeyForTrainingDay } from '../utils/date';
import {
  calculateAverageSessionRpe,
  calculateTotalRegisteredMinutes,
  calculateWeeklyCompletion,
  calculateWeeklyLoad,
  getLogForTrainingDay,
  getWeeklyReadinessWarning,
  type WeeklyWarningStatus,
} from '../utils/weeklyAnalytics';

interface WeeklyDashboardProps {
  activeWeek: TrainingWeek;
  activeDayId: string;
  workoutLogs: WorkoutLog[];
  readinessByDate: Record<string, DailyReadiness>;
}

const warningLabels: Record<WeeklyWarningStatus, string> = {
  green: 'Verde',
  yellow: 'Amarillo',
  red: 'Rojo',
};

const warningClasses: Record<WeeklyWarningStatus, string> = {
  green: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200',
  yellow: 'border-hyrox-gold/45 bg-hyrox-gold/10 text-hyrox-gold',
  red: 'border-red-400/40 bg-red-500/10 text-red-200',
};

function formatValue(value: number | null, digits = 1) {
  if (value === null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function DashboardMetric({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
      <p className="font-mono text-[0.62rem] font-black uppercase tracking-[0.16em] text-white/60">{label}</p>
      <p className={`mt-1 font-display text-2xl uppercase leading-none ${accent ? 'text-hyrox-gold' : 'text-white'}`}>{value}</p>
    </div>
  );
}

export function WeeklyDashboard({ activeWeek, activeDayId, workoutLogs, readinessByDate }: WeeklyDashboardProps) {
  const weekDayEntries = activeWeek.days.map((day) => ({ day, date: getDateKeyForTrainingDay(activeWeek, day) }));
  const weekLogs = weekDayEntries
    .map(({ day, date }) => getLogForTrainingDay(workoutLogs, activeWeek.id, day.id, date))
    .filter((log): log is WorkoutLog => Boolean(log));
  const completion = calculateWeeklyCompletion(activeWeek.days, workoutLogs, {
    weekId: activeWeek.id,
    activeDayId,
    getDateForDay: (day) => getDateKeyForTrainingDay(activeWeek, day),
  });
  const totalMinutes = calculateTotalRegisteredMinutes(weekLogs);
  const averageRpe = calculateAverageSessionRpe(weekLogs);
  const weeklyLoad = calculateWeeklyLoad(weekLogs);
  const weekReadiness = weekDayEntries
    .map(({ date }) => readinessByDate[date])
    .filter((readiness): readiness is DailyReadiness => Boolean(readiness))
    .sort((a, b) => a.date.localeCompare(b.date));
  const latestReadiness = weekReadiness.at(-1) ?? null;
  const warning = getWeeklyReadinessWarning(latestReadiness, weekLogs);

  return (
    <section aria-label="Dashboard semanal" className="rounded-2xl border border-hyrox-gold/20 bg-black/35 p-4 shadow-[0_0_0_1px_rgba(246,201,76,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">Dashboard semanal</p>
          <h2 className="mt-1 font-display text-3xl uppercase leading-none text-white">Semana {activeWeek.weekNumber}</h2>
          {weekLogs.length === 0 ? <p className="mt-2 text-sm font-semibold text-white/55">Sin registros esta semana</p> : null}
        </div>
        <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 font-mono text-[0.68rem] font-black uppercase tracking-[0.16em] ${warningClasses[warning]}`}>
          Alerta {warningLabels[warning]}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <DashboardMetric label="Cumplimiento" value={`${completion.completed} / ${completion.totalDays}`} accent />
        <DashboardMetric label="Parciales" value={completion.partial} />
        <DashboardMetric label="Saltados" value={completion.skipped} />
        <DashboardMetric label="Pendientes" value={completion.pending} />
        <DashboardMetric label="Minutos" value={totalMinutes} />
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardMetric label="RPE medio" value={formatValue(averageRpe)} />
        <DashboardMetric label="Carga semanal" value={weeklyLoad} accent />
        <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
          <p className="font-mono text-[0.62rem] font-black uppercase tracking-[0.16em] text-white/60">Último check-in</p>
          {latestReadiness ? (
            <p className="mt-1 text-xs font-bold uppercase leading-relaxed tracking-[0.1em] text-white/78">
              Sueño {formatValue(typeof latestReadiness.sleepHours === 'number' ? latestReadiness.sleepHours : null)}h · Estrés {formatValue(typeof latestReadiness.stress1To5 === 'number' ? latestReadiness.stress1To5 : null, 0)} · Fatiga {formatValue(typeof latestReadiness.fatigue1To5 === 'number' ? latestReadiness.fatigue1To5 : null, 0)} · Dolor {formatValue(typeof latestReadiness.pain0To10 === 'number' ? latestReadiness.pain0To10 : null, 0)}
            </p>
          ) : (
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-white/60">Sin check-in</p>
          )}
        </div>
      </div>
    </section>
  );
}