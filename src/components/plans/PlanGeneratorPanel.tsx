import { useEffect, useMemo, useRef, useState } from 'react';
import { getActiveTrainingPlan, saveTrainingPlan } from '../../repositories/appRepository';
import { sanitizeStoredTrainingPlan } from '../../repositories/trainingPlanPersistence';
import { generateTrainingPlan } from '../../services/planService';
import { getTrainingPlanErrorMessage } from '../../services/planErrorUtils';
import type { AthleteState, DailyReadiness, WorkoutLog } from '../../types/athlete';
import type { GeneratedTrainingPlan, GeneratedTrainingPlanErrorCode, GeneratedTrainingPlanSource, StoredTrainingPlan } from '../../types/plan';
import { buildPlanGenerationInput, type PlanGenerationInput } from '../../utils/planInput';
import { getPlanReadiness, type PlanReadinessTab } from '../../utils/planReadiness';

interface PlanGeneratorPanelProps {
  athleteState: AthleteState;
  dailyReadiness: DailyReadiness | null;
  recentWorkoutLogs: WorkoutLog[];
  userId?: string | null;
  onboardingIncomplete?: boolean;
  aiConsentGranted?: boolean;
  onPlanChange?: (plan: GeneratedTrainingPlan | null, reason: 'load' | 'generation') => void;
  onPlanLoadingChange?: (isLoading: boolean) => void;
  onResolveBlocker?: (tab: PlanReadinessTab) => void;
}

type GenerationPhase = 'idle' | 'preparing' | 'requesting' | 'saving';
type PendingPlanSave = { plan: GeneratedTrainingPlan; input: PlanGenerationInput; source: GeneratedTrainingPlanSource };

function phaseLabel(phase: GenerationPhase) {
  if (phase === 'preparing') return 'Preparando contexto del plan...';
  if (phase === 'requesting') return 'Generando plan IA...';
  if (phase === 'saving') return 'Guardando plan generado...';
  return null;
}

export function PlanGeneratorPanel({ athleteState, dailyReadiness, recentWorkoutLogs, userId = null, onboardingIncomplete = false, aiConsentGranted = true, onPlanChange, onPlanLoadingChange, onResolveBlocker }: PlanGeneratorPanelProps) {
  const [storedPlan, setStoredPlan] = useState<StoredTrainingPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageCode, setMessageCode] = useState<GeneratedTrainingPlanErrorCode | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase>('idle');
  const [pendingSave, setPendingSave] = useState<PendingPlanSave | null>(null);
  const inFlightRef = useRef(false);
  const generatedSinceLoadRef = useRef(false);
  const readiness = useMemo(
    () => getPlanReadiness(athleteState, { requireAiConsent: Boolean(userId), aiConsentGranted }),
    [aiConsentGranted, athleteState, userId],
  );
  const generationBlocked = Boolean(userId && !readiness.ready);

  useEffect(() => {
    let isMounted = true;
    generatedSinceLoadRef.current = false;
    setIsLoadingPlan(true);
    onPlanLoadingChange?.(true);
    void getActiveTrainingPlan(userId)
      .then((value) => {
        if (!isMounted || generatedSinceLoadRef.current) return;
        const safePlan = sanitizeStoredTrainingPlan(value);
        setStoredPlan(safePlan);
        onPlanChange?.(safePlan?.planJson ?? null, 'load');
      })
      .catch(() => {
        if (!isMounted || generatedSinceLoadRef.current) return;
        setStoredPlan(null);
        onPlanChange?.(null, 'load');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingPlan(false);
          onPlanLoadingChange?.(false);
        }
      });
    return () => { isMounted = false; };
  }, [onPlanChange, onPlanLoadingChange, userId]);

  function resetGenerationFeedback() {
    setGenerationPhase('idle');
    setMessage(null);
    setMessageCode(null);
  }

  async function persistGeneratedPlan(pending: PendingPlanSave) {
    setGenerationPhase('saving');
    try {
      const savedPlan = await saveTrainingPlan(userId, pending.plan, pending.input);
      setStoredPlan(savedPlan);
      setPendingSave(null);
      setShowSummary(false);
      setGenerationPhase('idle');
      setMessageCode(null);
      setMessage(pending.source === 'openai' ? 'Plan generado y guardado.' : 'Plan guardado con respaldo local.');
    } catch {
      setGenerationPhase('idle');
      setMessageCode(null);
      setMessage('El plan se generó, pero no se pudo guardar.');
    }
  }

  async function handleGeneratePlan() {
    if (inFlightRef.current || isGenerating) return;
    if (generationBlocked) {
      setMessage('Completa los campos indicados antes de generar tu plan.');
      return;
    }
    if (userId && !aiConsentGranted) {
      setMessage('Activa el consentimiento opcional de datos de salud e IA desde Mi cuenta antes de usar la IA remota.');
      return;
    }
    inFlightRef.current = true;
    setIsGenerating(true);
    resetGenerationFeedback();
    try {
      setGenerationPhase('preparing');
      const input = buildPlanGenerationInput({ athleteState, dailyReadiness, recentWorkoutLogs });
      setGenerationPhase('requesting');
      const result = await generateTrainingPlan(input);
      if (!result.plan) {
        setGenerationPhase('idle');
        setMessageCode(result.code ?? null);
        setMessage(result.code ? getTrainingPlanErrorMessage(result.code) : (result.error ?? 'No se pudo generar el plan IA.'));
        return;
      }
      const pending = { plan: result.plan, input, source: result.source };
      generatedSinceLoadRef.current = true;
      setPendingSave(pending);
      onPlanChange?.(result.plan, 'generation');
      await persistGeneratedPlan(pending);
    } catch {
      setGenerationPhase('idle');
      setMessageCode(null);
      setMessage('No se pudo generar el plan IA.');
    } finally {
      inFlightRef.current = false;
      setIsGenerating(false);
    }
  }

  async function handleRetrySave() {
    if (!pendingSave || inFlightRef.current || isGenerating) return;
    inFlightRef.current = true;
    setIsGenerating(true);
    resetGenerationFeedback();
    try { await persistGeneratedPlan(pendingSave); }
    finally { inFlightRef.current = false; setIsGenerating(false); }
  }

  const plan = pendingSave?.plan ?? storedPlan?.planJson ?? null;
  const currentDate = new Date().toISOString().slice(0, 10);
  const currentWeek = plan?.weeks.find((week) => currentDate >= week.startDate && currentDate <= week.endDate) ?? plan?.weeks[0];
  const phaseText = phaseLabel(generationPhase);

  return (
    <section aria-label="Generador de plan IA" aria-busy={isGenerating || isLoadingPlan} className="overflow-hidden rounded-2xl border border-hyrox-gold/20 bg-hyrox-panel/75 shadow-panel">
      <div className="bg-[radial-gradient(circle_at_20%_0%,rgba(246,201,76,0.14),transparent_42%)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[0.66rem] font-black uppercase tracking-[0.22em] text-hyrox-gold">Plan IA</p>
            <h2 className="mt-1 font-display text-3xl uppercase leading-none text-white">{plan ? plan.title : 'Crea tu plan con IA'}</h2>
            {!plan ? <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/62">Genera un bloque inicial adaptado a tu objetivo, disponibilidad, material y estado actual.</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void handleGeneratePlan()} disabled={isGenerating || generationBlocked} className="rounded-full border border-hyrox-gold bg-hyrox-gold px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55">
              {isGenerating ? 'Generando plan...' : plan ? 'Regenerar plan' : 'Generar mi plan con IA'}
            </button>
            {!isGenerating && messageCode ? <button type="button" onClick={() => void handleGeneratePlan()} className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em]">Reintentar</button> : null}
            {!isGenerating && pendingSave ? <button type="button" onClick={() => void handleRetrySave()} className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em]">Reintentar guardado</button> : null}
            {!isGenerating && message ? <button type="button" onClick={resetGenerationFeedback} className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em]">Ocultar mensaje</button> : null}
          </div>
        </div>
        {userId && readiness.blockers.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/[0.08] p-4" role="status" aria-label="Datos necesarios para generar el plan">
            <p className="text-sm font-black text-amber-100">Completa estos datos para generar tu plan:</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {readiness.blockers.map((blocker) => (
                <li key={blocker.path} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-sm font-black text-white">{blocker.label}</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-white/65">{blocker.message}</p>
                  {onResolveBlocker ? <button type="button" onClick={() => onResolveBlocker(blocker.tab)} aria-label={`Completar en Mi perfil: ${blocker.label}`} className="mt-3 text-[0.68rem] font-black uppercase tracking-[0.14em] text-hyrox-gold underline decoration-hyrox-gold/40 underline-offset-4">Completar en Mi perfil</button> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : onboardingIncomplete ? <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">Completa el onboarding para generar un plan más preciso.</p> : null}
        {(phaseText || message) ? <div role="status" aria-live="polite" aria-atomic="true">
          {phaseText ? <p className="mt-4 text-sm font-semibold text-white/70">{phaseText}</p> : null}
          {message ? <p className="mt-2 text-sm font-semibold text-hyrox-gold">{message}</p> : null}
        </div> : null}
      </div>
      <div className="border-t border-white/10 p-4 sm:p-5">
        {isLoadingPlan ? <p role="status" className="text-sm font-semibold text-white/60">Cargando plan guardado…</p> : null}
        {plan ? (
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="grid gap-2 text-sm font-semibold text-white/65 sm:grid-cols-3">
                <p>Competición: <span className="text-white">{plan.targetRaceDate}</span></p>
                <p>Semanas: <span className="text-white">{plan.generatedWeeks}</span></p>
                <p>Foco actual: <span className="text-white">{currentWeek?.focus ?? '—'}</span></p>
              </div>
              <button type="button" onClick={() => setShowSummary((value) => !value)} className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-hyrox-gold hover:text-hyrox-gold">{showSummary ? 'Ocultar resumen' : 'Ver resumen'}</button>
            </div>
            {showSummary ? <p className="mt-4 border-t border-white/10 pt-4 text-sm font-semibold leading-relaxed text-white/68">{plan.objective}</p> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
