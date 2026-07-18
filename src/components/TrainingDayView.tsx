import { lazy, Suspense } from 'react';
import type { CoachAdviceInput, WorkoutLog } from '../types/athlete';
import type { TrainingDay, TrainingWeek } from '../types/training';
import { Badge } from './Badge';
import { TrainingSection } from './TrainingSection';
import { WorkoutLogForm } from './WorkoutLogForm';

const CoachAdvicePanel = lazy(() => import('./CoachAdvicePanel').then((module) => ({ default: module.CoachAdvicePanel })));

interface TrainingDayViewProps {
  activeWeek: TrainingWeek;
  activeDay: TrainingDay;
  todayKey: string;
  savedWorkoutLog: WorkoutLog | null;
  coachAdviceInput: CoachAdviceInput;
  coachAdviceKey: string;
  onSaveWorkoutLog: (log: WorkoutLog) => void;
  userId?: string | null;
}


export function TrainingDayView({ activeWeek, activeDay, todayKey, savedWorkoutLog, coachAdviceInput, coachAdviceKey, onSaveWorkoutLog, userId = null }: TrainingDayViewProps) {
  return (
    <section id="training" className="rounded-2xl border border-white/10 bg-hyrox-panel/85 p-4 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-hyrox-smoke">
            {activeWeek.phase} · {activeWeek.block} · Semana {activeWeek.weekNumber} · Día {activeDay.dayNumber}
          </p>
          <h2 className="mt-2 font-display text-3xl uppercase leading-none text-white sm:text-4xl">{activeDay.title}</h2>
          <p className="mt-3 max-w-3xl text-base font-semibold leading-relaxed text-white/70">{activeDay.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="gold">{activeDay.weekday}</Badge>
          <Badge tone={activeDay.isCompleted ? 'success' : 'steel'}>{activeDay.isCompleted ? 'Sesión completada' : 'Plan activo'}</Badge>
        </div>
      </div>

      {activeDay.sessionType ? (
        <section aria-label="Detalles del entrenamiento generado" className="mt-4 grid gap-2 rounded-2xl border border-hyrox-gold/15 bg-black/25 p-4 sm:grid-cols-3">
          <p className="text-sm font-semibold text-white/65">Tipo: <span className="text-white">{activeDay.sessionType}</span></p>
          <p className="text-sm font-semibold text-white/65">Duración: <span className="text-white">{activeDay.estimatedDurationMinutes} min</span></p>
          <p className="text-sm font-semibold text-white/65">Intensidad: <span className="text-white">{activeDay.intensity}</span></p>
        </section>
      ) : null}

      <Suspense fallback={<p role="status" aria-live="polite" className="mt-4 text-sm font-semibold text-white/70">Cargando Coach IA…</p>}>
        <CoachAdvicePanel coachAdviceInput={coachAdviceInput} adviceKey={coachAdviceKey} userId={userId} />
      </Suspense>

      <div className="mt-4 grid gap-3">
        {activeDay.sections.map((section) => (
          <TrainingSection key={`${activeDay.id}-${section.id}`} section={section} />
        ))}
      </div>

      {activeDay.coachNotes?.length || activeDay.nutritionNotes?.length || activeDay.adaptationOptions?.length ? (
        <section aria-label="Guía del entrenamiento generado" className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            { title: 'Notas del coach', items: activeDay.coachNotes },
            { title: 'Nutrición', items: activeDay.nutritionNotes },
            { title: 'Adaptaciones', items: activeDay.adaptationOptions },
          ].map(({ title, items }) => items?.length ? (
            <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="font-display text-xl uppercase text-hyrox-gold">{title}</h3>
              <ul className="mt-2 space-y-2 text-sm font-semibold leading-relaxed text-white/70">{items.map((item) => <li key={item}>• {item}</li>)}</ul>
            </div>
          ) : null)}
        </section>
      ) : null}

      <WorkoutLogForm activeWeek={activeWeek} activeDay={activeDay} date={todayKey} savedLog={savedWorkoutLog} onSave={onSaveWorkoutLog} />
    </section>
  );
}
