import type { CoachAdviceInput, DailyReadiness, WorkoutLog } from '../../types/athlete';
import type { TrainingDay, TrainingDayId, TrainingWeek, TrainingWeekId } from '../../types/training';
import { getDateKeyForTrainingDay } from '../../utils/date';
import { TrainingDayView } from '../TrainingDayView';
import { WeekCalendarPicker } from '../WeekCalendarPicker';
import { WeekSelector } from '../WeekSelector';
import { WeeklyDashboard } from '../WeeklyDashboard';

interface TrainingWorkspaceProps {
  availableTrainingWeeks: TrainingWeek[];
  activeWeek: TrainingWeek;
  activeDay: TrainingDay;
  activeDayDateKey: string;
  currentWorkoutLog: WorkoutLog | null;
  coachAdviceInput: CoachAdviceInput;
  coachAdviceKey: string;
  workoutLogs: Record<string, WorkoutLog>;
  dailyReadinessByDate: Record<string, DailyReadiness>;
  onSelectWeek: (weekId: TrainingWeekId) => void;
  onSelectDay: (dayId: TrainingDayId) => void;
  onSaveWorkoutLog: (log: WorkoutLog) => void;
  userId: string | null;
}

export function TrainingWorkspace({
  availableTrainingWeeks,
  activeWeek,
  activeDay,
  activeDayDateKey,
  currentWorkoutLog,
  coachAdviceInput,
  coachAdviceKey,
  workoutLogs,
  dailyReadinessByDate,
  onSelectWeek,
  onSelectDay,
  onSaveWorkoutLog,
  userId,
}: TrainingWorkspaceProps) {
  const workoutLogValues = Object.values(workoutLogs);

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-hyrox-panel/70 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            {activeWeek.phase === 'PRETEMPORADA' ? 'Pretemporada' : activeWeek.phase} · {activeWeek.block} · {activeWeek.label}
          </p>
          <WeekCalendarPicker weeks={availableTrainingWeeks} activeWeekId={activeWeek.id} onSelectWeek={onSelectWeek} />
        </div>
      </section>
      <WeekSelector
        days={activeWeek.days}
        weekId={activeWeek.id}
        activeDayId={activeDay.id}
        workoutLogs={workoutLogValues}
        getDateForDay={(day) => getDateKeyForTrainingDay(activeWeek, day)}
        onSelectDay={onSelectDay}
      />
      <WeeklyDashboard
        activeWeek={activeWeek}
        activeDayId={activeDay.id}
        workoutLogs={workoutLogValues}
        readinessByDate={dailyReadinessByDate}
      />
      <TrainingDayView
        activeWeek={activeWeek}
        activeDay={activeDay}
        todayKey={activeDayDateKey}
        savedWorkoutLog={currentWorkoutLog}
        coachAdviceInput={coachAdviceInput}
        coachAdviceKey={coachAdviceKey}
        onSaveWorkoutLog={onSaveWorkoutLog}
        userId={userId}
      />
    </>
  );
}
