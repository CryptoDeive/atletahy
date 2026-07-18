import { useEffect, useMemo, useState, type ReactNode, type SetStateAction } from 'react';
import { createEmptyInjury } from '../../data/defaultAthleteState';
import type { AthleteState, EquipmentAvailability, Injury, MainGoal } from '../../types/athlete';

interface OnboardingViewProps {
  athleteState: AthleteState;
  onComplete: (nextState: AthleteState) => Promise<void> | void;
  onSkip: () => void;
  onSavingChange?: (isSaving: boolean) => void;
  draftStorageKey?: string;
  onDirtyChange?: (dirty: boolean) => void;
}

type StepId = 'objective' | 'level' | 'availability' | 'equipment' | 'injuries';

const steps: { id: StepId; label: string }[] = [
  { id: 'objective', label: 'Objetivo' },
  { id: 'level', label: 'Nivel' },
  { id: 'availability', label: 'Disponibilidad' },
  { id: 'equipment', label: 'Material' },
  { id: 'injuries', label: 'Lesiones' },
];

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const equipmentOptions: { key: keyof EquipmentAvailability; label: string }[] = [
  { key: 'skiErg', label: 'SkiErg' },
  { key: 'rowErg', label: 'RowErg' },
  { key: 'bikeErg', label: 'BikeErg' },
  { key: 'assaultBike', label: 'Assault Bike' },
  { key: 'sled', label: 'Sled' },
  { key: 'wallBall', label: 'Wall Ball' },
  { key: 'sandbag', label: 'Sandbag' },
  { key: 'kettlebells', label: 'Kettlebells' },
  { key: 'dumbbells', label: 'Dumbbells' },
  { key: 'barbellAndPlates', label: 'Barra y discos' },
  { key: 'treadmill', label: 'Cinta de correr' },
  { key: 'runningSpace', label: 'Espacio para correr' },
  { key: 'plyoBox', label: 'Cajón pliométrico' },
];

function toNumberOrEmpty(value: string) {
  return value === '' ? '' : Number(value);
}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-base font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-hyrox-gold';
}

function labelClass() {
  return 'text-xs font-black uppercase tracking-[0.16em] text-hyrox-smoke';
}

function Field({ label, value, type = 'text', min, max, onChange }: { label: string; value: string | number; type?: string; min?: number; max?: number; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className={labelClass()}>{label}</span>
      <input className={fieldClass()} type={type} min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className={labelClass()}>{label}</span>
      <select className={fieldClass()} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block md:col-span-2">
      <span className={labelClass()}>{label}</span>
      <textarea className={`${fieldClass()} min-h-24 resize-y`} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function StepCard({ children }: { children: ReactNode }) {
  return <section className="rounded-3xl border border-white/10 bg-black/30 p-4 shadow-panel sm:p-5">{children}</section>;
}

export function OnboardingView({ athleteState, onComplete, onSkip, onSavingChange, draftStorageKey, onDirtyChange }: OnboardingViewProps) {
  const [draft, rawSetDraft] = useState<AthleteState>(() => {
    if (!draftStorageKey) return athleteState;
    try {
      const saved = window.sessionStorage.getItem(draftStorageKey);
      return saved ? JSON.parse(saved) as AthleteState : athleteState;
    } catch {
      return athleteState;
    }
  });
  const [isDirty, setIsDirty] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const hasActiveInjury = draft.injuries.some((injury) => injury.status === 'active');
  const availableDaysCount = draft.availability.availableDays.length;
  const showDaysWarning = availableDaysCount > 0 && availableDaysCount < 3;
  const progress = useMemo(() => Math.round(((stepIndex + 1) / steps.length) * 100), [stepIndex]);

  useEffect(() => {
    return () => {
      onSavingChange?.(false);
    };
  }, [onSavingChange]);

  useEffect(() => {
    if (!isDirty || !draftStorageKey) return;
    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [draft, draftStorageKey, isDirty]);

  function setDraft(value: SetStateAction<AthleteState>) {
    setIsDirty(true);
    onDirtyChange?.(true);
    rawSetDraft(value);
  }

  function updateProfile<K extends keyof AthleteState['profile']>(key: K, value: AthleteState['profile'][K]) {
    setError('');
    setDraft((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  }

  function updatePhysiology<K extends keyof AthleteState['physiology']>(key: K, value: AthleteState['physiology'][K]) {
    setError('');
    setDraft((current) => ({ ...current, physiology: { ...current.physiology, [key]: value } }));
  }

  function updateAvailability<K extends keyof AthleteState['availability']>(key: K, value: AthleteState['availability'][K]) {
    setError('');
    setDraft((current) => ({ ...current, availability: { ...current.availability, [key]: value } }));
  }

  function toggleDay(day: string, checked: boolean) {
    setError('');
    setDraft((current) => ({
      ...current,
      availability: {
        ...current.availability,
        availableDays: checked ? [...current.availability.availableDays, day] : current.availability.availableDays.filter((item) => item !== day),
      },
    }));
  }

  function toggleEquipment(key: keyof EquipmentAvailability, checked: boolean) {
    setError('');
    setDraft((current) => ({ ...current, equipment: { ...current.equipment, [key]: checked } }));
  }

  function ensureInjury() {
    setDraft((current) => {
      if (current.injuries.some((injury) => injury.status === 'active')) return current;
      return { ...current, injuries: [createEmptyInjury(`onboarding-injury-${Date.now()}`), ...current.injuries] };
    });
  }

  function setNoActiveInjury() {
    setDraft((current) => ({ ...current, injuries: current.injuries.filter((injury) => injury.status !== 'active') }));
  }

  function updateFirstActiveInjury(patch: Partial<Injury>) {
    setError('');
    setDraft((current) => {
      const index = current.injuries.findIndex((injury) => injury.status === 'active');
      if (index < 0) {
        return { ...current, injuries: [{ ...createEmptyInjury(`onboarding-injury-${Date.now()}`), ...patch }] };
      }
      return {
        ...current,
        injuries: current.injuries.map((injury, injuryIndex) => (injuryIndex === index ? { ...injury, ...patch } : injury)),
      };
    });
  }

  function goToStep(index: number) {
    if (isSaving) {
      return;
    }

    setError('');
    setStepIndex(index);
  }

  function goBack() {
    if (isSaving) {
      return;
    }

    setError('');
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  function goNext() {
    if (isSaving) {
      return;
    }

    setError('');
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function handleSkip() {
    if (isSaving) {
      return;
    }

    onSkip();
  }

  async function finish() {
    if (isSaving) {
      return;
    }

    if (!draft.profile.targetDate) {
      setStepIndex(0);
      setError('La fecha de competición es obligatoria para finalizar.');
      return;
    }

    if (!draft.profile.mainGoal) {
      setStepIndex(0);
      setError('El objetivo principal es obligatorio para finalizar.');
      return;
    }

    if (draft.availability.availableDays.length < 1) {
      setStepIndex(2);
      setError('Selecciona al menos 1 día disponible por semana para finalizar.');
      return;
    }

    if (!draft.availability.maxSessionMinutes) {
      setStepIndex(2);
      setError('El tiempo máximo por sesión es obligatorio para finalizar.');
      return;
    }

    if (!draft.availability.preferredTrainingTime) {
      setStepIndex(2);
      setError('La hora preferida es obligatoria para finalizar.');
      return;
    }

    setError('');
    setIsSaving(true);
    onSavingChange?.(true);
    try {
      await onComplete({
        ...draft,
        profile: {
          ...draft.profile,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        },
      });
      if (draftStorageKey) window.sessionStorage.removeItem(draftStorageKey);
      setIsDirty(false);
      onDirtyChange?.(false);
    } catch {
      setError('No se pudo guardar el onboarding. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
      onSavingChange?.(false);
    }
  }

  function renderStep() {
    if (steps[stepIndex].id === 'objective') {
      return (
        <StepCard>
          <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">Paso 1 · Objetivo</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Fecha de competición" type="date" value={draft.profile.targetDate} onChange={(value) => updateProfile('targetDate', value)} />
            <SelectField
              label="Objetivo principal"
              value={draft.profile.mainGoal}
              onChange={(value) => updateProfile('mainGoal', value as MainGoal)}
              options={[
                { value: 'terminar', label: 'Terminar' },
                { value: 'mejorar_marca', label: 'Mejorar marca' },
                { value: 'competir', label: 'Competir' },
              ]}
            />
            <SelectField
              label="Categoría"
              value={draft.profile.hyroxCategory}
              onChange={(value) => updateProfile('hyroxCategory', value)}
              options={[
                { value: '', label: 'Seleccionar' },
                { value: 'Open', label: 'Open' },
                { value: 'Pro', label: 'Pro' },
                { value: 'Doubles', label: 'Doubles' },
                { value: 'Relay', label: 'Relay' },
                { value: 'Otro', label: 'Otro' },
              ]}
            />
            <Field label="Marca objetivo opcional" value={draft.profile.targetTime ?? ''} onChange={(value) => updateProfile('targetTime', value)} />
          </div>
        </StepCard>
      );
    }

    if (steps[stepIndex].id === 'level') {
      return (
        <StepCard>
          <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">Paso 2 · Nivel actual</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SelectField label="Experiencia HYROX" value={draft.physiology.hyroxExperience ?? ''} onChange={(value) => updatePhysiology('hyroxExperience', value)} options={[{ value: '', label: 'Seleccionar' }, { value: 'primera vez', label: 'Primera vez' }, { value: '1-2 carreras', label: '1-2 carreras' }, { value: '3+ carreras', label: '3+ carreras' }]} />
            <Field label="Volumen actual carrera semanal km" type="number" value={draft.physiology.currentRunningVolumeKm ?? ''} onChange={(value) => updatePhysiology('currentRunningVolumeKm', toNumberOrEmpty(value))} />
            <Field label="Tirada larga actual km" type="number" value={draft.physiology.currentLongRunKm ?? ''} onChange={(value) => updatePhysiology('currentLongRunKm', toNumberOrEmpty(value))} />
            <Field label="Ritmo 5K opcional" value={draft.physiology.fiveKPace} onChange={(value) => updatePhysiology('fiveKPace', value)} />
            <Field label="Ritmo 10K opcional" value={draft.physiology.tenKPace} onChange={(value) => updatePhysiology('tenKPace', value)} />
            <SelectField label="Experiencia fuerza" value={draft.physiology.strengthExperience ?? ''} onChange={(value) => updatePhysiology('strengthExperience', value)} options={[{ value: '', label: 'Seleccionar' }, { value: 'baja', label: 'Baja' }, { value: 'media', label: 'Media' }, { value: 'alta', label: 'Alta' }]} />
          </div>
        </StepCard>
      );
    }

    if (steps[stepIndex].id === 'availability') {
      return (
        <StepCard>
          <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">Paso 3 · Disponibilidad</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className={labelClass()}>Días disponibles por semana</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {days.map((day) => (
                  <label key={day} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold uppercase tracking-wide text-white/80">
                    <input className="mr-2 accent-hyrox-gold" type="checkbox" checked={draft.availability.availableDays.includes(day)} onChange={(event) => toggleDay(day, event.target.checked)} />
                    {day}
                  </label>
                ))}
              </div>
              {showDaysWarning ? <p className="mt-2 text-sm font-semibold text-hyrox-gold">Recomendado: al menos 3 días disponibles por semana para una preparación HYROX más sólida.</p> : null}
            </div>
            <Field label="Tiempo máximo por sesión" type="number" value={draft.availability.maxSessionMinutes} onChange={(value) => updateAvailability('maxSessionMinutes', toNumberOrEmpty(value))} />
            <SelectField label="Hora preferida" value={draft.availability.preferredTrainingTime} onChange={(value) => updateAvailability('preferredTrainingTime', value)} options={[{ value: '', label: 'Seleccionar' }, { value: 'mañana', label: 'Mañana' }, { value: 'mediodía', label: 'Mediodía' }, { value: 'tarde', label: 'Tarde' }, { value: 'noche', label: 'Noche' }]} />
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm font-bold uppercase tracking-wide text-white/80">
              <input className="accent-hyrox-gold" type="checkbox" checked={draft.availability.canDoubleSession} onChange={(event) => updateAvailability('canDoubleSession', event.target.checked)} />
              Posibilidad de doble sesión
            </label>
          </div>
        </StepCard>
      );
    }

    if (steps[stepIndex].id === 'equipment') {
      return (
        <StepCard>
          <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">Paso 4 · Material</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {equipmentOptions.map((item) => (
              <label key={item.key} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-bold uppercase tracking-wide text-white/80">
                <input className="mr-2 accent-hyrox-gold" type="checkbox" checked={draft.equipment[item.key]} onChange={(event) => toggleEquipment(item.key, event.target.checked)} />
                {item.label}
              </label>
            ))}
          </div>
        </StepCard>
      );
    }

    const injury = draft.injuries.find((item) => item.status === 'active') ?? createEmptyInjury('preview-injury');
    return (
      <StepCard>
        <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">Paso 5 · Lesiones/molestias</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className={labelClass()}>¿Tienes lesión o molestia activa?</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={ensureInjury} className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${hasActiveInjury ? 'border-hyrox-gold bg-hyrox-gold text-black' : 'border-white/15 text-white/70'}`}>Sí</button>
              <button type="button" onClick={setNoActiveInjury} className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${!hasActiveInjury ? 'border-hyrox-gold bg-hyrox-gold text-black' : 'border-white/15 text-white/70'}`}>No</button>
            </div>
          </div>
          {hasActiveInjury ? (
            <>
              <Field label="Zona" value={injury.body_area} onChange={(value) => updateFirstActiveInjury({ body_area: value })} />
              <Field label="Dolor 0-10" type="number" min={0} max={10} value={injury.pain_level_0_10} onChange={(value) => updateFirstActiveInjury({ pain_level_0_10: toNumberOrEmpty(value) })} />
              <TextArea label="Movimientos que molestan" value={injury.movement_restrictions} onChange={(value) => updateFirstActiveInjury({ movement_restrictions: value })} />
              <TextArea label="Notas" value={injury.notes} onChange={(value) => updateFirstActiveInjury({ notes: value })} />
            </>
          ) : <p className="text-sm font-semibold text-white/60">Sin lesión activa registrada para este onboarding.</p>}
        </div>
      </StepCard>
    );
  }

  return (
    <div id="onboarding" className="relative mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:px-8">
      <section className="overflow-hidden rounded-[1.75rem] border border-hyrox-gold/20 bg-[linear-gradient(135deg,rgba(18,20,24,0.96),rgba(5,5,5,0.98))] p-5 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.28em] text-hyrox-gold">Onboarding inicial</p>
            <h2 className="mt-3 font-display text-4xl uppercase leading-none text-white sm:text-5xl">Configura tu preparación HYROX</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-white/65">
              Con estos datos la IA podrá adaptar carga, recuperación, nutrición y estrategia semana a semana.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-hyrox-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {steps.map((step, index) => (
              <button key={step.id} type="button" onClick={() => goToStep(index)} disabled={isSaving} className={`rounded-xl border px-2 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${index === stepIndex ? 'border-hyrox-gold bg-hyrox-gold text-black' : index < stepIndex ? 'border-hyrox-gold/35 bg-hyrox-gold/[0.08] text-hyrox-gold' : 'border-white/10 bg-white/[0.03] text-white/45'} disabled:cursor-not-allowed disabled:opacity-45`}>
                {index + 1}. {step.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? <p role="alert" className="rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm font-bold text-red-100">{error}</p> : null}
      {renderStep()}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-hyrox-panel/70 p-3">
        <button type="button" onClick={goBack} disabled={isSaving || stepIndex === 0} className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-hyrox-gold hover:text-hyrox-gold disabled:cursor-not-allowed disabled:opacity-35">
          Atrás
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleSkip} disabled={isSaving} className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/72 transition hover:border-hyrox-gold hover:text-hyrox-gold disabled:cursor-not-allowed disabled:opacity-45">
            Saltar por ahora
          </button>
          {stepIndex < steps.length - 1 ? (
            <button type="button" onClick={goNext} disabled={isSaving} className="rounded-full border border-hyrox-gold bg-hyrox-gold px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">
              Siguiente
            </button>
          ) : (
            <button type="button" onClick={finish} disabled={isSaving} className="rounded-full border border-hyrox-gold bg-hyrox-gold px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-white disabled:opacity-60">
              {isSaving ? 'Guardando...' : 'Finalizar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
