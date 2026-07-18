import type {
  GeneratedTrainingDay,
  GeneratedTrainingIntensity,
  GeneratedTrainingPlan,
  GeneratedTrainingSection,
  GeneratedTrainingSessionType,
  GeneratedTrainingWeek,
} from '../../types/plan';
import { applyPlanSafetyOverrides, evaluateTrainingSafety, type TrainingSafetyAssessment } from '../../shared/trainingSafety';

const sessionTypeLabels: Record<GeneratedTrainingSessionType, string> = {
  run: 'Run',
  strength: 'Strength',
  hyrox: 'HYROX',
  engine: 'Engine',
  mobility: 'Mobility',
  rest: 'Rest',
};

const intensityLabels: Record<GeneratedTrainingIntensity, string> = {
  rest: 'Descanso',
  low: 'Baja',
  moderate: 'Media',
  high: 'Alta',
};

function SmallList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/70">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span aria-hidden="true" className="mt-2 h-1 w-1 flex-none rounded-full bg-hyrox-gold" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionCard({ section }: { section: GeneratedTrainingSection }) {
  return (
    <article className="rounded-xl border border-white/[0.08] bg-black/25 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h5 className="font-bold text-white">{section.title}</h5>
        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white/55">{section.type}</span>
        <span className="text-xs font-semibold text-hyrox-gold">{section.durationMinutes} min</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/68">{section.description}</p>
      <SmallList items={section.exercises} />
      <SmallList items={section.notes} />
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/60">Intensidad: {section.intensity}</p>
    </article>
  );
}

function DayCard({ day }: { day: GeneratedTrainingDay }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[0.66rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">{day.weekday ? `${day.weekday} · ` : ''}{day.date}</p>
          <h4 className="mt-1 font-display text-2xl uppercase leading-none text-white">{day.title}</h4>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-white/68">{day.objective}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className="rounded-full border border-hyrox-gold/35 bg-hyrox-gold/10 px-3 py-1 font-mono text-[0.65rem] font-black uppercase tracking-[0.15em] text-hyrox-gold">{sessionTypeLabels[day.sessionType]}</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white/65">{day.estimatedDurationMinutes} min</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white/65">{intensityLabels[day.intensity]}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {day.sections.map((section, index) => <SectionCard key={section.id ?? `${day.date}-${section.title}-${index}`} section={section} />)}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
          <p className="font-mono text-[0.64rem] font-black uppercase tracking-[0.18em] text-white/60">Notas</p>
          <SmallList items={day.notes} />
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
          <p className="font-mono text-[0.64rem] font-black uppercase tracking-[0.18em] text-white/60">Nutrición</p>
          <SmallList items={day.nutritionNotes} />
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
          <p className="font-mono text-[0.64rem] font-black uppercase tracking-[0.18em] text-white/60">Adaptaciones</p>
          <SmallList items={day.adaptationOptions} />
        </div>
      </div>
    </article>
  );
}

function WeekBlock({ week }: { week: GeneratedTrainingWeek }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-hyrox-panel/65 p-4 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.22em] text-hyrox-gold">Semana {week.weekNumber}</p>
          <h3 className="mt-1 font-display text-3xl uppercase leading-none text-white">{week.focus}</h3>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">{week.startDate} → {week.endDate}</p>
      </div>
      <SmallList items={week.notes} />
      <div className="mt-4 space-y-3">
        {week.days.map((day, index) => <DayCard key={day.id ?? `${week.weekNumber}-${day.date}-${index}`} day={day} />)}
      </div>
    </section>
  );
}

export function GeneratedPlanView({ plan, safety = { level: 'green', reasons: [] } }: { plan: GeneratedTrainingPlan; safety?: TrainingSafetyAssessment }) {
  plan = applyPlanSafetyOverrides(plan, safety);
  return (
    <div className="space-y-4" aria-label="Plan generado">
      <section className="rounded-3xl border border-hyrox-gold/25 bg-gradient-to-br from-hyrox-gold/[0.12] via-hyrox-panel/75 to-black/30 p-5 shadow-panel">
        <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.24em] text-hyrox-gold">Plan IA</p>
        <h2 className="mt-2 font-display text-4xl uppercase leading-none text-white">{plan.title}</h2>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-white/70">{plan.objective}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em] text-white/65">
          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">Carrera: {plan.targetRaceDate}</span>
          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">Generadas: {plan.generatedWeeks}/{plan.totalWeeks} semanas</span>
        </div>
      </section>

      {plan.assumptions.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <h3 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-hyrox-gold">Supuestos</h3>
          <SmallList items={plan.assumptions} />
        </section>
      ) : null}

      {plan.nutritionNotes.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <h3 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-hyrox-gold">Notas nutricionales</h3>
          <SmallList items={plan.nutritionNotes} />
        </section>
      ) : null}

      {plan.weeks.map((week, index) => <WeekBlock key={week.id ?? `${week.weekNumber}-${index}`} week={week} />)}
    </div>
  );
}
