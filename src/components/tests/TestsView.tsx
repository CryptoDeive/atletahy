import { useEffect, useMemo, useState } from 'react';
import { trainingTests } from '../../data/trainingTests';
import { deleteTrainingTestResult, getTrainingTestResults, saveTrainingTestResult } from '../../repositories/appRepository';
import type { TrainingTestCategory, TrainingTestId, TrainingTestResult } from '../../types/tests';
import { TestDetailView } from './TestDetailView';

type Props = { userId?: string | null; athleteWeightKg?: number | ''; initialTestId?: TrainingTestId; initialCategory?: TrainingTestCategory; onTestChange?: (testId: TrainingTestId | null) => void; onCategoryChange?: (category: 'Todos' | TrainingTestCategory) => void };
const categories: Array<'Todos' | TrainingTestCategory> = ['Todos', 'Ergómetros', 'Carrera', 'Sled', 'Umbral'];

function resultLabel(result?: TrainingTestResult) {
  if (!result) return 'Sin resultados';
  const raw = result.result;
  if (typeof raw.totalTime === 'string' && raw.totalTime) return raw.totalTime;
  if (typeof raw.maxLoadKg === 'number') return `${raw.maxLoadKg} kg`;
  if (typeof raw.averageWatts === 'number') return `${raw.averageWatts} W`;
  if (typeof raw.distanceMeters === 'number') return `${raw.distanceMeters} m`;
  return result.performedAt.slice(0, 10);
}

export function TestsView({ userId, athleteWeightKg, initialTestId, initialCategory, onTestChange, onCategoryChange }: Props) {
  const [selectedId, setSelectedId] = useState<TrainingTestId | null>(initialTestId ?? null);
  const [category, setCategory] = useState<(typeof categories)[number]>(categories.includes(initialCategory ?? 'Todos') ? initialCategory ?? 'Todos' : 'Todos');
  const [results, setResults] = useState<TrainingTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  async function refresh() {
    try { setResults(await getTrainingTestResults(userId)); setLoadError(''); }
    catch { setLoadError('No se pudieron cargar los resultados.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [userId]);

  const latestByTest = useMemo(() => results.reduce<Partial<Record<TrainingTestId, TrainingTestResult>>>((latest, result) => {
    if (!latest[result.testId]) latest[result.testId] = result;
    return latest;
  }, {}), [results]);
  const visibleTests = category === 'Todos' ? trainingTests : trainingTests.filter((test) => test.category === category);
  const selected = trainingTests.find((test) => test.id === selectedId);

  if (selected) return <TestDetailView test={selected} results={results.filter((result) => result.testId === selected.id)} athleteWeightKg={athleteWeightKg} onBack={() => { setSelectedId(null); onTestChange?.(null); }} onSave={async (result) => { await saveTrainingTestResult(userId, result); await refresh(); }} onDelete={async (id) => { await deleteTrainingTestResult(userId, id); await refresh(); }} />;

  return (
    <div id="tests-ergo" className="relative mx-auto max-w-7xl px-4 py-5 sm:px-5 lg:px-8" aria-busy={loading}>
      <section className="rounded-2xl border border-white/10 bg-hyrox-panel/80 p-5 shadow-panel sm:p-6">
        <div className="max-w-3xl"><p className="font-mono text-[0.65rem] font-black uppercase tracking-[0.22em] text-hyrox-gold">Rendimiento medible</p><h2 className="mt-2 font-display text-3xl uppercase leading-none text-white sm:text-4xl">Tests & Ergómetros</h2><p className="mt-3 text-sm font-semibold leading-relaxed text-white/60">Registra tus pruebas de rendimiento y utiliza sus resultados para ajustar ritmos, zonas y cargas.</p></div>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Filtros por categoría">{categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => { setCategory(item); onCategoryChange?.(item); }} className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition ${category === item ? 'border-hyrox-gold bg-hyrox-gold text-black' : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-hyrox-gold/50 hover:text-white'}`}>{item}</button>)}</div>
      </section>
      {loadError ? <p role="alert" className="mt-4 text-sm text-red-300">{loadError}</p> : null}
      {loading ? <p role="status" className="sr-only">Cargando resultados…</p> : null}
      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTests.map((test, index) => <article key={test.id} className="group flex min-h-56 flex-col rounded-2xl border border-white/[0.09] bg-hyrox-panel2/75 p-4 transition hover:-translate-y-0.5 hover:border-hyrox-gold/45 hover:shadow-gold"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[0.62rem] font-black uppercase tracking-[0.16em] text-hyrox-gold">{test.category}</span><span className="font-mono text-[0.62rem] text-white/25">{String(index + 1).padStart(2, '0')}</span></div><h3 className="mt-4 text-xl font-black uppercase leading-tight text-white">{test.title}</h3><p className="mt-2 flex-1 text-sm leading-relaxed text-white/50">{test.objective}</p><div className="mt-4 flex items-end justify-between gap-3 border-t border-white/[0.07] pt-3"><div><p className="text-[0.62rem] font-bold uppercase tracking-wider text-white/60">Último resultado</p><p className="mt-1 text-sm font-black text-white/75">{loading ? 'Cargando...' : resultLabel(latestByTest[test.id])}</p></div><button type="button" onClick={() => { setSelectedId(test.id); onTestChange?.(test.id); }} className="rounded-full border border-hyrox-gold/60 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-hyrox-gold transition group-hover:bg-hyrox-gold group-hover:text-black">Abrir test</button></div></article>)}
      </section>
    </div>
  );
}
