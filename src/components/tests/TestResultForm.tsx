import { useId, useMemo, useState, type FormEvent } from 'react';
import type { TrainingTestDefinition, TrainingTestResult } from '../../types/tests';
import {
  calculateAverageSpeedKmh, calculateConcept2Watts, calculateEstimatedFtp, calculatePacePer500m,
  calculatePacePerKm, calculateVam, calculateWattsPerKg, formatSecondsAsDuration, parseDurationToSeconds,
} from '../../utils/testCalculations';

type Props = {
  test: TrainingTestDefinition;
  athleteWeightKg?: number | '';
  onSave: (result: TrainingTestResult) => Promise<void>;
};

const inputClass = 'mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition focus:border-hyrox-gold';

function asNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function calculate(testId: TrainingTestDefinition['id'], values: Record<string, string>, athleteWeightKg?: number | '') {
  const totalSeconds = parseDurationToSeconds(values.totalTime ?? '');
  const distance = asNumber(values.distanceMeters);
  const calculated: Record<string, number | string | null> = {};
  if (testId === 'ski-2k' || testId === 'row-2k') {
    const pace = totalSeconds ? calculatePacePer500m(totalSeconds, 2000) : null;
    calculated.pacePer500m = pace ? formatSecondsAsDuration(pace) : null;
    calculated.averageSpeedKmh = totalSeconds ? calculateAverageSpeedKmh(2000, totalSeconds) : null;
    if (testId === 'ski-2k') calculated.estimatedAverageWatts = pace ? calculateConcept2Watts(pace) : null;
  }
  if (testId === 'vam' && distance && totalSeconds) {
    calculated.vamKmh = calculateVam(distance, totalSeconds);
    const pace = calculatePacePerKm(totalSeconds, distance);
    calculated.pacePerKm = pace ? formatSecondsAsDuration(pace) : null;
  }
  if (testId === 'run-10k' && totalSeconds) {
    const pace = calculatePacePerKm(totalSeconds, 10000);
    calculated.pacePerKm = pace ? formatSecondsAsDuration(pace) : null;
    calculated.averageSpeedKmh = calculateAverageSpeedKmh(10000, totalSeconds);
  }
  if ((testId === 'sled-push-sprint' || testId === 'sled-pull-sprint') && distance && totalSeconds) {
    calculated.averageSpeedKmh = calculateAverageSpeedKmh(distance, totalSeconds);
  }
  if (testId === 'bike-ftp-20') {
    const averageWatts = asNumber(values.averageWatts);
    const ftp = averageWatts ? calculateEstimatedFtp(averageWatts) : null;
    calculated.estimatedFtpWatts = ftp;
    calculated.wattsPerKg = ftp && athleteWeightKg ? calculateWattsPerKg(ftp, Number(athleteWeightKg)) : null;
    if (ftp) calculated.powerZones = `Z1 <${Math.round(ftp * 0.55)} · Z2 ${Math.round(ftp * 0.56)}–${Math.round(ftp * 0.75)} · Z3 ${Math.round(ftp * 0.76)}–${Math.round(ftp * 0.9)} · Z4 ${Math.round(ftp * 0.91)}–${Math.round(ftp * 1.05)} W`;
  }
  if (testId === 'jim-vance-30') {
    calculated.rftp = values.averagePace || null;
    const lthr = asNumber(values.last20AverageHr);
    calculated.lthr = lthr;
    if (lthr) calculated.lthrZones = `Z1 <${Math.round(lthr * 0.85)} · Z2 ${Math.round(lthr * 0.85)}–${Math.round(lthr * 0.89)} · Z3 ${Math.round(lthr * 0.9)}–${Math.round(lthr * 0.94)} · Z4 ${Math.round(lthr * 0.95)}–${Math.round(lthr * 0.99)} ppm`;
  }
  return calculated;
}

export function TestResultForm({ test, athleteWeightKg, onSave }: Props) {
  const initialValues = (): Record<string, string> => test.id === 'jim-vance-30' ? { blockMinutes: '30', validExecution: 'false' } : { validExecution: 'false' };
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [performedAt, setPerformedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const formId = useId();
  const errorId = `${formId}-error`;
  const preview = useMemo(() => calculate(test.id, values, athleteWeightKg), [athleteWeightKg, test.id, values]);

  function update(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setStatus('idle');
    if (invalidField === key) {
      setInvalidField(null);
      setError('');
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const missing = test.fields.find((field) => field.required && field.type !== 'boolean' && !values[field.key]?.trim());
    const invalidDuration = test.fields.find((field) => field.type === 'duration' && values[field.key]?.trim() && parseDurationToSeconds(values[field.key]) === null);
    if (!performedAt || missing || invalidDuration) {
      const nextInvalidField = !performedAt ? 'performedAt' : (missing ?? invalidDuration)?.key ?? null;
      setInvalidField(nextInvalidField);
      setError(invalidDuration ? `Revisa el formato de ${invalidDuration.label}.` : `Completa ${missing?.label ?? 'la fecha'}.`);
      if (nextInvalidField) document.getElementById(`${formId}-${nextInvalidField}`)?.focus();
      return;
    }
    setError('');
    setInvalidField(null);
    setStatus('saving');
    const now = new Date().toISOString();
    const resultValues: Record<string, unknown> = {};
    for (const field of test.fields) {
      const value = values[field.key] ?? '';
      resultValues[field.key] = field.type === 'number' ? (value ? Number(value) : null) : field.type === 'boolean' ? value === 'true' : value;
    }
    try {
      await onSave({
        id: globalThis.crypto?.randomUUID?.() ?? `test-${Date.now()}`,
        testId: test.id,
        performedAt: new Date(`${performedAt}T12:00:00`).toISOString(),
        result: resultValues,
        calculated: preview,
        notes: values.notes ?? '',
        createdAt: now,
        updatedAt: now,
      });
      setStatus('saved');
      setValues(initialValues());
    } catch {
      setStatus('idle');
      setError('No se pudo guardar el resultado. Inténtalo de nuevo.');
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-hyrox-panel2/80 p-4 sm:p-5" noValidate>
      <div className="mb-4 flex items-end justify-between gap-3"><div><p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.18em] text-hyrox-gold">Nuevo registro</p><h3 className="mt-1 text-xl font-bold text-white">Guardar resultado</h3></div><span className="text-xs text-white/60">hh:mm:ss.ms</span></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold uppercase tracking-wider text-white/65">Fecha<input id={`${formId}-performedAt`} aria-label="Fecha" aria-invalid={invalidField === 'performedAt'} aria-describedby={invalidField === 'performedAt' ? errorId : undefined} className={inputClass} type="date" value={performedAt} onChange={(event) => { setPerformedAt(event.target.value); if (invalidField === 'performedAt') { setInvalidField(null); setError(''); } }} required /></label>
        {test.fields.map((field) => (
          <label key={field.key} className={`${field.type === 'textarea' ? 'sm:col-span-2' : ''} text-xs font-bold uppercase tracking-wider text-white/65`}>
            {field.label}{field.required ? ' *' : ''}
            {field.type === 'select' ? <select id={`${formId}-${field.key}`} aria-label={field.label} aria-invalid={invalidField === field.key} aria-describedby={invalidField === field.key ? errorId : undefined} className={inputClass} value={values[field.key] ?? ''} onChange={(event) => update(field.key, event.target.value)}><option value="">Selecciona</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select>
              : field.type === 'boolean' ? <select id={`${formId}-${field.key}`} aria-label={field.label} className={inputClass} value={values[field.key] ?? 'false'} onChange={(event) => update(field.key, event.target.value)}><option value="true">Sí</option><option value="false">No</option></select>
              : field.type === 'textarea' ? <textarea id={`${formId}-${field.key}`} aria-label={field.label} aria-invalid={invalidField === field.key} aria-describedby={invalidField === field.key ? errorId : undefined} className={`${inputClass} min-h-20 resize-y`} value={values[field.key] ?? ''} onChange={(event) => update(field.key, event.target.value)} />
              : <input id={`${formId}-${field.key}`} aria-label={field.label} aria-invalid={invalidField === field.key} aria-describedby={invalidField === field.key ? errorId : undefined} className={inputClass} type={field.type === 'number' ? 'number' : 'text'} min={field.min} step={field.step} placeholder={field.placeholder} value={values[field.key] ?? ''} readOnly={test.id === 'jim-vance-30' && field.key === 'blockMinutes'} onChange={(event) => update(field.key, event.target.value)} />}
          </label>
        ))}
      </div>
      {Object.values(preview).some((value) => value !== null) ? <div className="mt-4 rounded-xl border border-hyrox-gold/20 bg-hyrox-gold/[0.04] p-3"><p className="font-mono text-[0.62rem] font-bold uppercase tracking-wider text-hyrox-gold">Cálculo automático</p><div className="mt-2 flex flex-wrap gap-2">{Object.entries(preview).filter(([, value]) => value !== null).map(([key, value]) => <span key={key} className="rounded-md bg-white/[0.06] px-2 py-1 text-xs text-white/75">{key}: {typeof value === 'number' ? Math.round(value * 100) / 100 : value}</span>)}</div></div> : null}
      {error ? <p id={errorId} role="alert" className="mt-3 text-sm font-semibold text-red-300">{error}</p> : null}
      {status === 'saved' ? <p role="status" className="mt-3 text-sm font-bold text-emerald-300">Resultado guardado</p> : null}
      <button type="submit" disabled={status === 'saving'} className="mt-4 rounded-full bg-hyrox-gold px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-white disabled:cursor-wait disabled:opacity-60">{status === 'saving' ? 'Guardando...' : 'Guardar resultado'}</button>
    </form>
  );
}
