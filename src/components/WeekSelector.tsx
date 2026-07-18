import type { WorkoutLog } from '../types/athlete';
import type { TrainingDay, TrainingDayId } from '../types/training';
import { getLogForTrainingDay } from '../utils/weeklyAnalytics';
import { DayCard } from './DayCard';

interface WeekSelectorProps {
  days: TrainingDay[];
  weekId: string;
  activeDayId: TrainingDayId;
  workoutLogs: WorkoutLog[];
  getDateForDay: (day: TrainingDay) => string;
  onSelectDay: (dayId: TrainingDayId) => void;
}

export function WeekSelector({ days, weekId, activeDayId, workoutLogs, getDateForDay, onSelectDay }: WeekSelectorProps) {
  return (
    <section aria-label="Selector semanal" className="rounded-2xl border border-white/10 bg-hyrox-panel/70 p-2">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin md:grid md:grid-cols-7 md:overflow-visible md:pb-0" role="list">
        {days.map((day) => (
          <div key={day.id} role="listitem" className="w-36 flex-none md:w-auto md:min-w-0">
            <DayCard day={day} isActive={day.id === activeDayId} workoutLog={getLogForTrainingDay(workoutLogs, weekId, day.id, getDateForDay(day))} onSelect={onSelectDay} />
          </div>
        ))}
      </div>
    </section>
  );
}