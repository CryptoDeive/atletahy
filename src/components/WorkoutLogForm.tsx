import { useEffect, useState } from 'react';
import { createDefaultWorkoutLog } from '../data/defaultAthleteState';
import type { WorkoutLog } from '../types/athlete';
import type { TrainingDay, TrainingWeek } from '../types/training';
import { validateWorkoutLog } from '../domain/fields/schemas';

interface WorkoutLogFormProps {
  activeWeek: TrainingWeek;
  activeDay: TrainingDay;
  date: string;
  savedLog: WorkoutLog | null;
  onSave: (log: WorkoutLog) => Promise<void> | void;
}

function toNumberOrEmpty(value: string) {
  return value === '' ? '' : Number(value);
}

function valueOrDash(value: string | number) {
  return value === '' ? '—' : value;
}

const fieldClass = 'mt-1 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-hyrox-gold';
const labelClass = 'text-[0.68rem] font-black uppercase tracking-[0.16em] text-hyrox-smoke';

function createLogId(weekId: string, dayId: string, date: string) {
  return `${weekId}-${dayId}-${date}`;
}

export function WorkoutLogForm({ activeWeek, activeDay, date, savedLog, onSave }: WorkoutLogFormProps) {
  const [log, setLog] = useState<WorkoutLog>(() =>
    savedLog ?? createDefaultWorkoutLog({ id: createLogId(activeWeek.id, activeDay.id, date), date, weekId: activeWeek.id, dayId: activeDay.id }),
  );
  const [savedMessage, setSavedMessage] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [invalidPath, setInvalidPath] = useState<string | null>(null);
  const errorId = 'workout-log-error';

  useEffect(() => {
    setLog(savedLog ?? createDefaultWorkoutLog({ id: createLogId(activeWeek.id, activeDay.id, date), date, weekId: activeWeek.id, dayId: activeDay.id }));
    setSavedMessage(false);
    setIsOpen(false);
  }, [activeWeek.id, activeDay.id, date]);

  useEffect(() => {
    if (!savedLog) return;
    setLog((current) => (current.id === savedLog.id ? current : savedLog));
  }, [savedLog]);

  function update<K extends keyof WorkoutLog>(key: K, value: WorkoutLog[K]) {
    setSavedMessage(false);
    setLog((current) => ({ ...current, [key]: value }));
    if (invalidPath === key) { setInvalidPath(null); setError(''); }
  }

  async function saveLog() {
    const normalizedLog = {
      ...log,
      id: log.id || createLogId(activeWeek.id, activeDay.id, date),
      date,
      weekId: activeWeek.id,
      dayId: activeDay.id,
    };
    const validation = validateWorkoutLog(normalizedLog);
    if (!validation.ok) { const issue = validation.issues[0]; setInvalidPath(issue?.path ?? null); setError(issue?.message ?? 'Revisa el registro.'); setTimeout(() => document.getElementById(`workout-${issue?.path}`)?.focus(), 0); return; }
    setError('');
    setInvalidPath(null);
    await onSave(validation.value);
    setLog(validation.value);
    setSavedMessage(true);
  }

  const summaryLog = savedLog ?? (savedMessage ? log : null);

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/30" aria-label="Registro del entrenamiento">
      <div className="flex flex-col gap-3 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl uppercase leading-none text-white">Registro del entrenamiento</h3>
            <span className={`rounded-full border px-2.5 py-1 font-mono text-[0.65rem] font-black uppercase tracking-[0.16em] ${summaryLog ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/[0.04] text-white/55'}`}>
              {summaryLog ? 'Guardado' : 'Sin registro'}
            </span>
          </div>
          {savedMessage ? <p className="mt-2 font-mono text-xs font-bold uppercase tracking-wide text-hyrox-gold">Registro guardado</p> : null}
          {summaryLog ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/70">
              <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1">{summaryLog.status}</span>
              <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1">{valueOrDash(summaryLog.durationMinutes)} min</span>
              <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1">RPE {valueOrDash(summaryLog.sessionRpe1To10)}</span>
              <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1">{valueOrDash(summaryLog.completionPercent)}% completado</span>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="workout-log-fields"
          onClick={() => setIsOpen((current) => !current)}
          className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-hyrox-gold hover:text-hyrox-gold"
        >
          {isOpen ? 'Cerrar registro del entrenamiento' : 'Abrir registro del entrenamiento'}
        </button>
      </div>

      {isOpen ? (
        <div id="workout-log-fields" className="border-t border-white/10 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className={labelClass}>Estado del entrenamiento</span>
              <select id="workout-status" aria-label="Estado del entrenamiento" aria-invalid={invalidPath === 'status'} aria-describedby={invalidPath === 'status' ? errorId : undefined} className={fieldClass} value={log.status} onChange={(event) => update('status', event.target.value as WorkoutLog['status'])}>
                <option value="completado">Completado</option>
                <option value="parcial">Parcial</option>
                <option value="saltado">Saltado</option>
                <option value="adaptado">Adaptado</option>
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Duración (min)</span>
              <input id="workout-durationMinutes" aria-label="Duración (min)" aria-invalid={invalidPath === 'durationMinutes'} aria-describedby={invalidPath === 'durationMinutes' ? errorId : undefined} className={fieldClass} type="number" min={log.status === 'saltado' ? 0 : 1} max={600} step={1} value={log.durationMinutes} onChange={(event) => update('durationMinutes', toNumberOrEmpty(event.target.value))} />
            </label>
            <label className="block">
              <span className={labelClass}>RPE sesión (1-10)</span>
              <input id="workout-sessionRpe1To10" aria-label="RPE sesión (1-10)" aria-invalid={invalidPath === 'sessionRpe1To10'} aria-describedby={invalidPath === 'sessionRpe1To10' ? errorId : undefined} className={fieldClass} type="number" min={1} max={10} step={1} value={log.sessionRpe1To10} onChange={(event) => update('sessionRpe1To10', toNumberOrEmpty(event.target.value))} />
            </label>
            <label className="block">
              <span className={labelClass}>FC media</span>
              <input id="workout-averageHr" aria-label="FC media" aria-invalid={invalidPath === 'averageHr'} aria-describedby={invalidPath === 'averageHr' ? errorId : undefined} className={fieldClass} type="number" min={25} max={240} step={1} value={log.averageHr} onChange={(event) => update('averageHr', toNumberOrEmpty(event.target.value))} />
            </label>
            <label className="block">
              <span className={labelClass}>FC máxima</span>
              <input id="workout-maxHr" aria-label="FC máxima" aria-invalid={invalidPath === 'maxHr'} aria-describedby={invalidPath === 'maxHr' ? errorId : undefined} className={fieldClass} type="number" min={25} max={240} step={1} value={log.maxHr} onChange={(event) => update('maxHr', toNumberOrEmpty(event.target.value))} />
            </label>
            <label className="block">
              <span className={labelClass}>Porcentaje completado</span>
              <input id="workout-completionPercent" aria-label="Porcentaje completado" aria-invalid={invalidPath === 'completionPercent'} aria-describedby={invalidPath === 'completionPercent' ? errorId : undefined} className={fieldClass} type="number" min={0} max={100} step={5} value={log.completionPercent} onChange={(event) => update('completionPercent', toNumberOrEmpty(event.target.value))} />
            </label>
            <label className="block md:col-span-3">
              <span className={labelClass}>Notas</span>
              <textarea id="workout-notes" aria-label="Notas" aria-invalid={invalidPath === 'notes'} aria-describedby={invalidPath === 'notes' ? errorId : undefined} className={`${fieldClass} min-h-20 resize-y`} value={log.notes} onChange={(event) => update('notes', event.target.value)} />
            </label>
            <label className="block md:col-span-3">
              <span className={labelClass}>Qué fue bien</span>
              <textarea id="workout-wentWell" aria-label="Qué fue bien" aria-invalid={invalidPath === 'wentWell'} aria-describedby={invalidPath === 'wentWell' ? errorId : undefined} className={`${fieldClass} min-h-20 resize-y`} value={log.wentWell} onChange={(event) => update('wentWell', event.target.value)} />
            </label>
            <label className="block md:col-span-3">
              <span className={labelClass}>Qué fue mal</span>
              <textarea id="workout-wentWrong" aria-label="Qué fue mal" aria-invalid={invalidPath === 'wentWrong'} aria-describedby={invalidPath === 'wentWrong' ? errorId : undefined} className={`${fieldClass} min-h-20 resize-y`} value={log.wentWrong} onChange={(event) => update('wentWrong', event.target.value)} />
            </label>
          </div>

          {error ? <p id={errorId} role="alert" className="mt-3 text-sm font-semibold text-red-300">{error}</p> : null}
          <button type="button" onClick={() => void saveLog()} className="mt-4 rounded-full border border-hyrox-gold bg-hyrox-gold px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-white">
            Guardar registro
          </button>
        </div>
      ) : null}
    </section>
  );
}
