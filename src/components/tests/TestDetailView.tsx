import type { TrainingTestDefinition, TrainingTestResult } from '../../types/tests';
import { TestResultForm } from './TestResultForm';

type Props = {
  test: TrainingTestDefinition;
  results: TrainingTestResult[];
  athleteWeightKg?: number | '';
  onBack: () => void;
  onSave: (result: TrainingTestResult) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function primaryResult(result: TrainingTestResult): string {
  const raw = result.result;
  if (typeof raw.totalTime === 'string' && raw.totalTime) return raw.totalTime;
  if (typeof raw.maxLoadKg === 'number') return `${raw.maxLoadKg} kg`;
  if (typeof raw.averageWatts === 'number') return `${raw.averageWatts} W`;
  if (typeof raw.distanceMeters === 'number') return `${raw.distanceMeters} m`;
  return 'Registro completado';
}

export function TestDetailView({ test, results, athleteWeightKg, onBack, onSave, onDelete }: Props) {
  const latest = results[0];
  return (
    <div id="tests-ergo" className="relative mx-auto max-w-6xl px-4 py-5 sm:px-5 lg:px-8">
      <button type="button" onClick={onBack} className="mb-4 text-xs font-black uppercase tracking-[0.14em] text-hyrox-gold hover:text-white"><span aria-hidden="true">← </span>Volver a Tests</button>
      <section className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-4">
          <article className="rounded-2xl border border-white/10 bg-hyrox-panel/85 p-5 shadow-panel">
            <p className="font-mono text-[0.65rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">{test.category}</p>
            <h2 className="mt-2 font-display text-3xl uppercase leading-none text-white sm:text-4xl">{test.title}</h2>
            <p className="mt-4 text-base font-bold text-white/80">{test.objective}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/55">{test.shortDescription}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><h3 className="text-sm font-black uppercase tracking-wider text-white">Protocolo</h3><ol className="mt-2 space-y-2 text-sm text-white/60">{test.protocol.map((step, index) => <li key={step} className="flex gap-2"><span className="font-mono text-hyrox-gold">{index + 1}.</span>{step}</li>)}</ol></div><div><h3 className="text-sm font-black uppercase tracking-wider text-white">Recomendaciones</h3><ul className="mt-2 space-y-2 text-sm text-white/60">{test.recommendations.map((item) => <li key={item}>— {item}</li>)}</ul></div></div>
          </article>
          <div className="rounded-2xl border border-hyrox-gold/20 bg-hyrox-gold/[0.04] p-4"><p className="font-mono text-[0.62rem] font-bold uppercase tracking-wider text-hyrox-gold">Último resultado</p><p className="mt-1 text-xl font-black text-white">{latest ? primaryResult(latest) : 'Sin registros'}</p></div>
        </div>
        <TestResultForm test={test} athleteWeightKg={athleteWeightKg} onSave={onSave} />
      </section>
      <section className="mt-5 rounded-2xl border border-white/10 bg-hyrox-panel/75 p-4 sm:p-5">
        <div className="flex items-end justify-between"><div><p className="font-mono text-[0.62rem] font-bold uppercase tracking-wider text-hyrox-gold">Evolución</p><h3 className="mt-1 text-xl font-black text-white">Histórico del test</h3></div><span className="text-xs text-white/60">Últimos 10</span></div>
        {results.length === 0 ? <p className="mt-4 text-sm text-white/55">Todavía no has registrado resultados para este test.</p> : <div className="mt-4 space-y-2">{results.slice(0, 10).map((result) => <article key={result.id} className="grid gap-2 rounded-xl border border-white/[0.07] bg-black/20 p-3 sm:grid-cols-[8rem_1fr_auto] sm:items-center"><div><p className="font-mono text-xs text-white/55">{result.performedAt.slice(0, 10)}</p><p className="mt-1 font-black text-white">{primaryResult(result)}</p></div><div className="flex flex-wrap gap-1.5">{Object.entries(result.calculated).filter(([, value]) => value !== null).map(([key, value]) => <span key={key} className="rounded bg-white/[0.05] px-2 py-1 text-[0.7rem] text-white/60">{key}: {typeof value === 'number' ? Math.round(value * 100) / 100 : value}</span>)}{result.notes ? <p className="w-full truncate text-xs text-white/60">{result.notes}</p> : null}</div><button type="button" onClick={() => { if (window.confirm('¿Eliminar este resultado?')) void onDelete(result.id); }} className="text-xs font-bold uppercase tracking-wider text-red-300 hover:text-red-200">Eliminar</button></article>)}</div>}
      </section>
    </div>
  );
}
