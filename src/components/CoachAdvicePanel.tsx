import { useEffect, useMemo, useState } from 'react';
import { getCoachAdvice, saveCoachAdvice, saveCoachAdviceFeedback } from '../repositories/appRepository';
import { generateCoachAdvice, type CoachAdviceSource } from '../services/coachService';
import type { CoachAdvice, CoachAdviceInput, ReadinessStatus } from '../types/coach';
import { applyCoachSafetyOverrides, evaluateTrainingSafety } from '../shared/trainingSafety';

interface CoachAdvicePanelProps {
  coachAdviceInput: CoachAdviceInput;
  adviceKey: string;
  latestAdvice?: CoachAdvice | null;
  userId?: string | null;
  aiConsentGranted?: boolean;
}

type AdviceUiStatus = 'idle' | 'generated' | 'loaded' | 'updated';

function hasDailyCheckIn(input: CoachAdviceInput) {
  const readiness = input.dailyReadiness;
  if (!readiness) return false;

  return [
    readiness.sleepHours,
    readiness.sleepQuality1To5,
    readiness.stress1To5,
    readiness.fatigue1To5,
    readiness.muscleSoreness1To5,
    readiness.legSoreness1To5,
    readiness.upperSoreness1To5,
    readiness.motivation1To5,
    readiness.hydration1To5,
    readiness.pain0To10,
    readiness.painLocation,
    readiness.notes,
  ].some((value) => value !== '' && value !== null && value !== undefined);
}

function readinessMeta(status: ReadinessStatus) {
  if (status === 'green') {
    return {
      label: 'Verde',
      className: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
      dot: 'bg-emerald-300',
    };
  }

  if (status === 'yellow') {
    return {
      label: 'Amarillo',
      className: 'border-hyrox-gold/50 bg-hyrox-gold/10 text-hyrox-gold',
      dot: 'bg-hyrox-gold',
    };
  }

  return {
    label: 'Rojo',
    className: 'border-red-400/50 bg-red-500/10 text-red-200',
    dot: 'bg-red-300',
  };
}

function sourceMeta(source: CoachAdviceSource, status: AdviceUiStatus, hasUserSession: boolean) {
  if (status === 'loaded' && hasUserSession) {
    return {
      label: 'Coach IA guardado',
      className: 'border-sky-300/40 bg-sky-300/10 text-sky-100',
    };
  }

  if (source === 'openai') {
    return {
      label: 'Coach IA',
      className: 'border-sky-300/40 bg-sky-300/10 text-sky-100',
    };
  }

  if (source === 'fallback') {
    return {
      label: 'Respaldo local',
      className: 'border-amber-300/45 bg-amber-300/10 text-amber-100',
    };
  }

  return {
    label: 'Coach local',
    className: 'border-white/15 bg-white/[0.05] text-white/70',
  };
}

function statusText(status: AdviceUiStatus, hasUserSession: boolean) {
  if (status === 'generated') return 'Consejo generado ahora';
  if (status === 'loaded') return hasUserSession ? 'Consejo cargado de Supabase' : 'Consejo guardado local';
  if (status === 'updated') return 'Consejo actualizado';
  return null;
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/25 p-3">
      <h4 className="font-mono text-[0.66rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">{title}</h4>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/78">
        {items.map((item) => (
          <li key={`${title}-${item}`} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 h-1 w-1 flex-none rounded-full bg-hyrox-gold/80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CoachAdvicePanel({ coachAdviceInput, adviceKey, latestAdvice = null, userId = null, aiConsentGranted = true }: CoachAdvicePanelProps) {
  const [rawAdvice, setAdvice] = useState<CoachAdvice | null>(latestAdvice);
  const [adviceSource, setAdviceSource] = useState<CoachAdviceSource>('local');
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [uiStatus, setUiStatus] = useState<AdviceUiStatus>(latestAdvice ? 'generated' : 'idle');
  const [isOpen, setIsOpen] = useState(Boolean(latestAdvice));
  const [isGenerating, setIsGenerating] = useState(false);
  const [wasUseful, setWasUseful] = useState<boolean | null>(null);
  const [userFeedback, setUserFeedback] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const checkInCompleted = useMemo(() => hasDailyCheckIn(coachAdviceInput), [coachAdviceInput]);
  const hasUserSession = Boolean(userId);

  useEffect(() => {
    let isMounted = true;
    setIsOpen(Boolean(latestAdvice));
    setAdvice(latestAdvice);
    setAdviceSource('local');
    setSourceError(null);
    setUiStatus(latestAdvice ? 'generated' : 'idle');
    setWasUseful(null);
    setUserFeedback('');
    setFeedbackMessage(null);

    void getCoachAdvice(userId, adviceKey)
      .then((storedAdvice) => {
        if (!isMounted || !storedAdvice) return;
        setAdvice(storedAdvice);
        setAdviceSource(userId ? 'openai' : 'local');
        setUiStatus('loaded');
        setIsOpen(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setSourceError('No se pudo cargar el consejo guardado. Puedes generar uno nuevo.');
      });

    return () => {
      isMounted = false;
    };
  }, [adviceKey, latestAdvice, userId]);

  async function handleGenerateAdvice() {
    if (userId && !aiConsentGranted) {
      setSourceError('Activa el consentimiento opcional de salud e IA desde Mi cuenta antes de usar la IA remota.');
      return;
    }
    const hadAdvice = Boolean(advice);
    setIsGenerating(true);
    setFeedbackMessage(null);
    try {
      const result = await generateCoachAdvice(coachAdviceInput);
      setAdvice(result.advice);
      setAdviceSource(result.source);
      setSourceError(result.error ?? null);
      setUiStatus(hadAdvice ? 'updated' : 'generated');
      setWasUseful(null);
      setUserFeedback('');
      setIsOpen(true);

      if (result.source === 'openai' && userId) {
        void saveCoachAdvice(userId, adviceKey, result.advice, { source: 'openai', inputSnapshot: coachAdviceInput });
      } else if (result.source === 'local' && !userId) {
        void saveCoachAdvice(userId, adviceKey, result.advice, { source: 'local', inputSnapshot: coachAdviceInput });
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function persistFeedback(nextWasUseful: boolean, nextFeedback: string) {
    setWasUseful(nextWasUseful);
    setUserFeedback(nextFeedback);

    if (!userId || !adviceKey) {
      setFeedbackMessage('Inicia sesión para guardar el feedback en Supabase.');
      return;
    }

    try {
      await saveCoachAdviceFeedback(userId, adviceKey, nextWasUseful, nextFeedback);
      setFeedbackMessage('Feedback guardado.');
    } catch {
      setFeedbackMessage('No se pudo guardar el feedback.');
    }
  }

  const advice = rawAdvice ? applyCoachSafetyOverrides(rawAdvice, evaluateTrainingSafety({ dailyReadiness: coachAdviceInput.dailyReadiness as unknown as Record<string, unknown>, injuries: coachAdviceInput.activeInjuries })) : null;
  const meta = advice ? readinessMeta(advice.readinessStatus) : null;
  const source = sourceMeta(adviceSource, uiStatus, hasUserSession);
  const currentStatusText = statusText(uiStatus, hasUserSession);
  const nutritionItems = advice
    ? [
        ...advice.nutrition.preWorkout.map((item) => `Antes: ${item}`),
        ...advice.nutrition.intraWorkout.map((item) => `Durante: ${item}`),
        ...advice.nutrition.postWorkout.map((item) => `Después: ${item}`),
        ...advice.nutrition.hydration.map((item) => `Hidratación: ${item}`),
        ...(advice.nutrition.caffeine ? [`Cafeína: ${advice.nutrition.caffeine}`] : []),
      ]
    : [];
  const schedulingItems = advice
    ? [
        `Ventana: ${advice.scheduling.bestTimeWindow}`,
        advice.scheduling.reason,
      ]
    : [];
  const doubleSessionItems = advice
    ? [
        advice.scheduling.doubleSessionRecommended ? 'Recomendada solo si mantienes sensaciones verdes.' : 'No recomendada para hoy.',
        ...(advice.scheduling.doubleSessionPlan
          ? [
              `Sesión 1: ${advice.scheduling.doubleSessionPlan.session1}`,
              `Sesión 2: ${advice.scheduling.doubleSessionPlan.session2}`,
              `Separación mínima: ${advice.scheduling.doubleSessionPlan.minimumHoursBetween} h`,
            ]
          : []),
      ]
    : [];
  const modificationItems = advice
    ? advice.modifications.map((modification) =>
        `${modification.condition}: ${modification.recommendation} ${modification.keepOriginalIntent ? '(mantiene intención)' : '(cambia intención)'}`,
      )
    : [];

  return (
    <section aria-label="Coach IA" aria-busy={isGenerating} className="mt-4 overflow-hidden rounded-2xl border border-hyrox-gold/20 bg-black/35 shadow-[0_0_0_1px_rgba(246,201,76,0.04)]">
      <div className="flex flex-col gap-3 bg-gradient-to-r from-hyrox-gold/[0.09] to-transparent p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl uppercase leading-none text-white">Coach IA</h3>
            {advice && meta ? (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.65rem] font-black uppercase tracking-[0.16em] ${meta.className}`}>
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            ) : null}
            {advice ? (
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[0.65rem] font-black uppercase tracking-[0.16em] ${source.className}`}>
                {source.label}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-white/62">Genera una estrategia personalizada para este entrenamiento.</p>
          {currentStatusText ? (
            <p className="mt-1 text-xs font-semibold text-white/50">{currentStatusText}</p>
          ) : null}
          {uiStatus === 'loaded' && hasUserSession ? (
            <p className="mt-1 text-xs font-semibold text-white/45">Consejo guardado</p>
          ) : null}
          {!checkInCompleted ? (
            <p className="mt-1 max-w-2xl text-xs font-semibold text-hyrox-gold/80">Completa el check-in diario en Mi cuenta para recibir un consejo más preciso.</p>
          ) : null}
          {sourceError ? (
            <p role="alert" className="mt-1 max-w-2xl text-xs font-semibold text-amber-200/85">{sourceError}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateAdvice}
            disabled={isGenerating || Boolean(userId && !aiConsentGranted)}
            className="rounded-full border border-hyrox-gold bg-hyrox-gold px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-white disabled:cursor-wait disabled:opacity-70"
          >
            {isGenerating ? 'Generando...' : advice ? 'Regenerar consejo' : 'Generar consejo'}
          </button>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls="coach-advice-content"
            onClick={() => setIsOpen((current) => !current)}
            className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-hyrox-gold hover:text-hyrox-gold"
          >
            {isOpen ? 'Cerrar Coach IA' : 'Abrir Coach IA'}
          </button>
        </div>
      </div>

      {isOpen && advice && meta ? (
        <div id="coach-advice-content" className="grid gap-3 border-t border-white/10 p-4 lg:grid-cols-2">
          <div className={`lg:col-span-2 rounded-xl border px-3 py-2 ${meta.className}`}>
            <p className="flex items-center gap-2 font-mono text-xs font-black uppercase tracking-[0.18em]">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
              Estado {meta.label}
            </p>
          </div>

          <div className="lg:col-span-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <h4 className="font-mono text-[0.66rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">Resumen</h4>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-white/78">{advice.summary}</p>
          </div>

          <div className="lg:col-span-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <h4 className="font-mono text-[0.66rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">Objetivo</h4>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-white/78">{advice.objective}</p>
          </div>

          <ListBlock title="Estrategia" items={advice.strategy} />
          <ListBlock title="Pacing" items={advice.pacing} />
          <ListBlock title="Técnica" items={advice.techniqueFocus} />
          <ListBlock title="Calentamiento" items={advice.warmupAdjustments} />
          <ListBlock title="Adaptaciones" items={modificationItems} />
          <ListBlock title="Riesgos" items={advice.riskWarnings} />
          <ListBlock title="Nutrición" items={nutritionItems} />
          <ListBlock title="Mejor hora para entrenar" items={schedulingItems} />
          <ListBlock title="Doble sesión" items={doubleSessionItems} />
          <ListBlock title="Checklist" items={advice.checklist} />

          <div className="lg:col-span-2 rounded-xl border border-white/[0.07] bg-black/25 p-3">
            <p className="font-mono text-[0.66rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">¿Te ha resultado útil?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void persistFeedback(true, userFeedback)}
                className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] transition ${wasUseful === true ? 'border-emerald-300 bg-emerald-300 text-black' : 'border-white/15 bg-white/[0.04] text-white/75 hover:border-emerald-300 hover:text-emerald-200'}`}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => void persistFeedback(false, userFeedback)}
                className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] transition ${wasUseful === false ? 'border-red-300 bg-red-300 text-black' : 'border-white/15 bg-white/[0.04] text-white/75 hover:border-red-300 hover:text-red-200'}`}
              >
                No
              </button>
            </div>
            <label className="mt-3 block text-xs font-semibold text-white/60" htmlFor={`coach-feedback-${adviceKey}`}>
              Comentario para mejorar próximos consejos
            </label>
            <textarea
              id={`coach-feedback-${adviceKey}`}
              value={userFeedback}
              onChange={(event) => {
                const nextFeedback = event.target.value;
                setUserFeedback(nextFeedback);
                if (wasUseful !== null) {
                  void persistFeedback(wasUseful, nextFeedback);
                }
              }}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-hyrox-gold"
              placeholder="Opcional"
            />
            {feedbackMessage ? <p role="status" className="mt-2 text-xs font-semibold text-white/50">{feedbackMessage}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
