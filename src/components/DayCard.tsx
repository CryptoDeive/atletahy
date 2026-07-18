import type { WorkoutLog } from '../types/athlete';
import type { TrainingDay, TrainingDayId } from '../types/training';
import { getWorkoutLogStatusLabel } from '../utils/weeklyAnalytics';
import { Badge } from './Badge';

interface DayCardProps {
  day: TrainingDay;
  isActive: boolean;
  workoutLog?: WorkoutLog | null;
  onSelect: (dayId: TrainingDayId) => void;
}

function getStatusTone(status: string, isActive: boolean): 'gold' | 'success' | 'steel' {
  if (isActive && (status === 'Activo' || status === 'Completado' || status === 'Adaptado')) return 'gold';
  if (status === 'Completado') return 'success';
  if (status === 'Parcial' || status === 'Adaptado') return 'gold';
  return 'steel';
}

export function DayCard({ day, isActive, workoutLog, onSelect }: DayCardProps) {
  const status = getWorkoutLogStatusLabel(workoutLog, isActive);
  const statusTone = getStatusTone(status, isActive);

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={() => onSelect(day.id)}
      className={`group h-full w-full rounded-xl border p-3 text-left transition duration-200 ${
        isActive
          ? 'border-hyrox-gold bg-hyrox-gold/10'
          : 'border-white/10 bg-white/[0.025] hover:border-hyrox-gold/60 hover:bg-white/[0.05]'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-hyrox-smoke">{day.weekday}</p>
          <p className="mt-0.5 font-mono text-[0.65rem] uppercase text-white/60">{day.dateLabel}</p>
        </div>
        <span aria-hidden="true" className={`text-xs ${isActive ? 'text-hyrox-gold' : 'text-white/20 group-hover:text-hyrox-gold/70'}`}>{'\u25CF'}</span>
      </div>
      <p className="font-display text-2xl uppercase leading-none text-white">D{day.dayNumber}</p>
      <p className="mt-2 min-h-9 text-sm font-bold uppercase leading-tight tracking-wide text-white">{day.title}</p>
      <div className="mt-3">
        <Badge tone={statusTone}>{status}</Badge>
      </div>
    </button>
  );
}