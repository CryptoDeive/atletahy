import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AuthPanel, type AuthSessionInfo } from '../auth/AuthPanel';
import { createEmptyInjury } from '../../data/defaultAthleteState';
import { PrivacyAccountPanel } from './PrivacyAccountPanel';
import type { StorageContext } from '../../repositories/storageKeys';
import type {
  AthleteProfile,
  DailyReadiness,
  EquipmentAvailability,
  Injury,
  NutritionPreferences,
  PhysiologyMetrics,
  TrainingAvailability,
} from '../../types/athlete';

type AccountTab =
  | 'profile'
  | 'physiology'
  | 'availability'
  | 'equipment'
  | 'injuries'
  | 'nutrition'
  | 'readiness'
  | 'privacy';

interface AccountViewProps {
  profile: AthleteProfile;
  setProfile: Dispatch<SetStateAction<AthleteProfile>>;
  physiology: PhysiologyMetrics;
  setPhysiology: Dispatch<SetStateAction<PhysiologyMetrics>>;
  availability: TrainingAvailability;
  setAvailability: Dispatch<SetStateAction<TrainingAvailability>>;
  equipment: EquipmentAvailability;
  setEquipment: Dispatch<SetStateAction<EquipmentAvailability>>;
  injuries: Injury[];
  setInjuries: Dispatch<SetStateAction<Injury[]>>;
  nutrition: NutritionPreferences;
  setNutrition: Dispatch<SetStateAction<NutritionPreferences>>;
  dailyReadiness: DailyReadiness;
  setDailyReadiness: Dispatch<SetStateAction<DailyReadiness>>;
  onBackToTraining: () => void;
  authSession: AuthSessionInfo | null;
  onAuthSessionChange: (session: AuthSessionInfo | null) => void;
  onSaveAthleteState: () => Promise<void>;
  onSaveDailyReadiness: (readiness: DailyReadiness) => Promise<void>;
  onSyncLocalToSupabase: () => Promise<void>;
  onboardingPending: boolean;
  onEditOnboarding: () => void;
  initialTab?: string;
  onTabChange?: (tab: AccountTab) => void;
  onDirtyChange?: (dirty: boolean) => void;
  storageContext: StorageContext;
  healthDataConsentGranted?: boolean;
}


const tabs: { id: AccountTab; label: string }[] = [
  { id: 'profile', label: 'Perfil' },
  { id: 'physiology', label: 'Fisiología' },
  { id: 'availability', label: 'Disponibilidad' },
  { id: 'equipment', label: 'Material' },
  { id: 'injuries', label: 'Lesiones' },
  { id: 'nutrition', label: 'Nutrición' },
  { id: 'readiness', label: 'Check-in' },
  { id: 'privacy', label: 'Privacidad' },
];

const availableDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const equipmentLabels: { key: keyof EquipmentAvailability; label: string }[] = [
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

function calculateAge(birthDate: string) {
  if (!birthDate) return 'Pendiente';
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return 'Pendiente';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? `${age} años` : 'Pendiente';
}

function formatMainGoal(goal: AthleteProfile['mainGoal']) {
  if (goal === 'mejorar_marca') return 'Mejorar marca';
  if (goal === 'competir') return 'Competir';
  return 'Terminar';
}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-base font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-hyrox-gold';
}

function labelClass() {
  return 'text-xs font-black uppercase tracking-[0.16em] text-hyrox-smoke';
}

interface FieldProps {
  label: string;
  value: string | number;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: string) => void;
}

function Field({ label, value, type = 'text', min, max, step, onChange }: FieldProps) {
  const id = label.toLowerCase().replaceAll(' ', '-').replaceAll('(', '').replaceAll(')', '');
  return (
    <label className="block">
      <span className={labelClass()}>{label}</span>
      <input
        id={id}
        className={fieldClass()}
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function TextArea({ label, value, onChange }: TextAreaProps) {
  return (
    <label className="block md:col-span-2">
      <span className={labelClass()}>{label}</span>
      <textarea className={`${fieldClass()} min-h-24 resize-y`} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

interface SelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function SelectField({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="block">
      <span className={labelClass()}>{label}</span>
      <select className={fieldClass()} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 p-5 shadow-panel sm:p-6" aria-label={title}>
      <div className="border-b border-white/10 pb-4">
        <h3 className="font-display text-2xl uppercase leading-none text-white">{title}</h3>
      </div>
      <div className="mt-5 grid gap-x-5 gap-y-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function AccountView({
  profile,
  setProfile,
  physiology,
  setPhysiology,
  availability,
  setAvailability,
  equipment,
  setEquipment,
  injuries,
  setInjuries,
  nutrition,
  setNutrition,
  dailyReadiness,
  setDailyReadiness,
  onBackToTraining,
  authSession,
  onAuthSessionChange,
  onSaveAthleteState,
  onSaveDailyReadiness,
  onSyncLocalToSupabase,
  onboardingPending,
  onEditOnboarding,
  initialTab,
  onTabChange,
  onDirtyChange,
  storageContext,
  healthDataConsentGranted = true,
}: AccountViewProps) {
  const safeInitialTab = tabs.some((tab) => tab.id === initialTab) ? initialTab as AccountTab : 'profile';
  const [activeTab, setActiveTab] = useState<AccountTab>(safeInitialTab);
  const [readinessSaved, setReadinessSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const ageLabel = useMemo(() => calculateAge(profile.birthDate), [profile.birthDate]);

  useEffect(() => {
    const nextTab = tabs.some((tab) => tab.id === initialTab) ? initialTab as AccountTab : 'profile';
    setActiveTab(nextTab);
  }, [initialTab]);

  function markDirty() {
    setProfileSaved(false);
    onDirtyChange?.(true);
  }

  function updateProfile<K extends keyof AthleteProfile>(key: K, value: AthleteProfile[K]) {
    markDirty();
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function updatePhysiology<K extends keyof PhysiologyMetrics>(key: K, value: PhysiologyMetrics[K]) {
    markDirty();
    setPhysiology((current) => ({ ...current, [key]: value }));
  }

  function updateAvailability<K extends keyof TrainingAvailability>(key: K, value: TrainingAvailability[K]) {
    markDirty();
    setAvailability((current) => ({ ...current, [key]: value }));
  }

  function updateNutrition<K extends keyof NutritionPreferences>(key: K, value: NutritionPreferences[K]) {
    markDirty();
    setNutrition((current) => ({ ...current, [key]: value }));
  }

  function updateReadiness<K extends keyof DailyReadiness>(key: K, value: DailyReadiness[K]) {
    setReadinessSaved(false);
    setDailyReadiness((current) => ({ ...current, [key]: value }));
  }

  function updateInjury(id: string, patch: Partial<Injury>) {
    markDirty();
    setInjuries((current) => current.map((injury) => (injury.id === id ? { ...injury, ...patch } : injury)));
  }

  function toggleDay(day: string, checked: boolean) {
    markDirty();
    setAvailability((current) => ({
      ...current,
      availableDays: checked ? [...current.availableDays, day] : current.availableDays.filter((availableDay) => availableDay !== day),
    }));
  }

  function addInjury() {
    markDirty();
    setInjuries((current) => [...current, createEmptyInjury(`injury-${Date.now()}-${current.length}`)]);
  }

  async function handleSaveProfile() {
    setProfileSaving(true);
    setProfileSaved(false);
    setProfileSaveError(null);
    try {
      await onSaveAthleteState();
      setProfileSaved(true);
      onDirtyChange?.(false);
    } catch {
      markDirty();
      setProfileSaveError('No se pudieron guardar los cambios. Inténtalo de nuevo.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSyncLocalToSupabase() {
    setSyncStatus('Sincronizando...');
    try {
      await onSyncLocalToSupabase();
      setSyncStatus('Datos locales sincronizados con Supabase.');
    } catch {
      setSyncStatus('No se pudo sincronizar. Revisa la configuración y la sesión.');
    }
  }

  async function handleSaveReadiness() {
    setReadinessSaved(true);
    try {
      await onSaveDailyReadiness(dailyReadiness);
    } catch {
      setReadinessSaved(false);
    }
  }

  function renderActiveSection() {
    if (!healthDataConsentGranted && ['physiology', 'injuries', 'nutrition', 'readiness'].includes(activeTab)) {
      return (
        <section className="rounded-2xl border border-sky-300/25 bg-sky-300/5 p-5 shadow-panel">
          <h3 className="font-display text-2xl uppercase text-sky-100">Datos de salud desactivados</h3>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-sky-50/75">Esta sección puede contener categorías especiales de datos. Para introducirlas o guardarlas debes otorgar antes el consentimiento explícito desde la pestaña Privacidad. Puedes retirarlo de nuevo en cualquier momento.</p>
          <button type="button" onClick={() => { setActiveTab('privacy'); onTabChange?.('privacy'); }} className="mt-4 rounded-full border border-sky-200/40 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-sky-100">Ir a Privacidad</button>
        </section>
      );
    }
    if (activeTab === 'profile') {
      return (
        <SectionShell title="Perfil básico">
          <Field label="Nombre" value={profile.name} onChange={(value) => updateProfile('name', value)} />
          <Field label="Fecha de nacimiento" type="date" value={profile.birthDate} onChange={(value) => updateProfile('birthDate', value)} />
          <div className="rounded-xl border border-hyrox-gold/20 bg-hyrox-gold/10 p-3">
            <p className={labelClass()}>Edad calculada</p>
            <p className="mt-2 font-mono text-lg font-bold text-hyrox-gold">{ageLabel}</p>
          </div>
          <Field label="Altura (cm)" type="number" value={profile.heightCm} onChange={(value) => updateProfile('heightCm', toNumberOrEmpty(value))} />
          <Field label="Peso (kg)" type="number" value={profile.weightKg} onChange={(value) => updateProfile('weightKg', toNumberOrEmpty(value))} />
          <SelectField
            label="Sexo"
            value={profile.sex ?? ''}
            onChange={(value) => updateProfile('sex', value)}
            options={[
              { value: '', label: 'Opcional' },
              { value: 'female', label: 'Femenino' },
              { value: 'male', label: 'Masculino' },
              { value: 'other', label: 'Otro / no especificar' },
            ]}
          />
          <Field label="Categoría HYROX" value={profile.hyroxCategory} onChange={(value) => updateProfile('hyroxCategory', value)} />
          <Field label="Fecha objetivo" type="date" value={profile.targetDate} onChange={(value) => updateProfile('targetDate', value)} />
          <SelectField
            label="Objetivo principal"
            value={profile.mainGoal}
            onChange={(value) => updateProfile('mainGoal', value as AthleteProfile['mainGoal'])}
            options={[
              { value: 'terminar', label: 'Terminar' },
              { value: 'mejorar_marca', label: 'Mejorar marca' },
              { value: 'competir', label: 'Competir' },
            ]}
          />
        </SectionShell>
      );
    }

    if (activeTab === 'physiology') {
      return (
        <SectionShell title="Marcadores fisiológicos">
          <Field label="FC reposo baseline" type="number" value={physiology.restingHrBaseline} onChange={(value) => updatePhysiology('restingHrBaseline', toNumberOrEmpty(value))} />
          <Field label="FC reposo hoy" type="number" value={physiology.restingHrToday} onChange={(value) => updatePhysiology('restingHrToday', toNumberOrEmpty(value))} />
          <Field label="FC máxima" type="number" value={physiology.maxHr} onChange={(value) => updatePhysiology('maxHr', toNumberOrEmpty(value))} />
          <Field label="LTHR" type="number" value={physiology.lthr} onChange={(value) => updatePhysiology('lthr', toNumberOrEmpty(value))} />
          <Field label="rFTP" value={physiology.rftp} onChange={(value) => updatePhysiology('rftp', value)} />
          <Field label="Z2 pace low" value={physiology.z2PaceLow} onChange={(value) => updatePhysiology('z2PaceLow', value)} />
          <Field label="Z2 pace high" value={physiology.z2PaceHigh} onChange={(value) => updatePhysiology('z2PaceHigh', value)} />
          <Field label="Ritmo 5K" value={physiology.fiveKPace} onChange={(value) => updatePhysiology('fiveKPace', value)} />
          <Field label="Ritmo 10K" value={physiology.tenKPace} onChange={(value) => updatePhysiology('tenKPace', value)} />
          <Field label="HRV baseline" type="number" value={physiology.hrvBaseline ?? ''} onChange={(value) => updatePhysiology('hrvBaseline', toNumberOrEmpty(value))} />
        </SectionShell>
      );
    }

    if (activeTab === 'availability') {
      return (
        <SectionShell title="Disponibilidad">
          <div className="md:col-span-2">
            <p className={labelClass()}>Días disponibles</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableDays.map((day) => (
                <label key={day} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-bold uppercase tracking-wide text-white/80">
                  <input className="mr-2 accent-hyrox-gold" type="checkbox" checked={availability.availableDays.includes(day)} onChange={(event) => toggleDay(day, event.target.checked)} />
                  {day}
                </label>
              ))}
            </div>
          </div>
          <Field label="Hora preferida de entrenamiento" value={availability.preferredTrainingTime} onChange={(value) => updateAvailability('preferredTrainingTime', value)} />
          <Field label="Tiempo máximo por sesión" type="number" value={availability.maxSessionMinutes} onChange={(value) => updateAvailability('maxSessionMinutes', toNumberOrEmpty(value))} />
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm font-bold uppercase tracking-wide text-white/80">
            <input className="accent-hyrox-gold" type="checkbox" checked={availability.canDoubleSession} onChange={(event) => updateAvailability('canDoubleSession', event.target.checked)} />
            Posibilidad de doble sesión
          </label>
          <Field label="Separación mínima entre sesiones" type="number" value={availability.minHoursBetweenSessions} onChange={(value) => updateAvailability('minHoursBetweenSessions', toNumberOrEmpty(value))} />
          <TextArea label="Notas de agenda" value={availability.scheduleNotes} onChange={(value) => updateAvailability('scheduleNotes', value)} />
        </SectionShell>
      );
    }

    if (activeTab === 'equipment') {
      return (
        <SectionShell title="Material disponible">
          <div className="md:col-span-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {equipmentLabels.map((item) => (
              <label key={item.key} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-bold uppercase tracking-wide text-white/80">
                <input className="mr-2 accent-hyrox-gold" type="checkbox" checked={equipment[item.key]} onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  markDirty();
                  setEquipment((current) => ({ ...current, [item.key]: event.target.checked }));
                }} />
                {item.label}
              </label>
            ))}
          </div>
        </SectionShell>
      );
    }

    if (activeTab === 'injuries') {
      return (
        <SectionShell title="Lesiones">
          <div className="md:col-span-2 flex justify-end">
            <button type="button" onClick={addInjury} className="rounded-full border border-hyrox-gold/70 bg-hyrox-gold px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black">
              Añadir lesión
            </button>
          </div>
          {injuries.length === 0 ? <p className="text-sm font-semibold text-white/60">Sin lesiones activas registradas.</p> : null}
          {injuries.map((injury) => (
            <div key={injury.id} className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Zona corporal" value={injury.body_area} onChange={(value) => updateInjury(injury.id, { body_area: value })} />
                <Field label="Lado" value={injury.side} onChange={(value) => updateInjury(injury.id, { side: value })} />
                <Field label="Dolor (0-10)" type="number" min={0} max={10} value={injury.pain_level_0_10} onChange={(value) => updateInjury(injury.id, { pain_level_0_10: toNumberOrEmpty(value) })} />
                <SelectField
                  label="Estado lesión"
                  value={injury.status}
                  onChange={(value) => updateInjury(injury.id, { status: value as Injury['status'] })}
                  options={[
                    { value: 'active', label: 'Activa' },
                    { value: 'improving', label: 'Mejorando' },
                    { value: 'resolved', label: 'Resuelta' },
                  ]}
                />
                <TextArea label="Restricciones de movimiento" value={injury.movement_restrictions} onChange={(value) => updateInjury(injury.id, { movement_restrictions: value })} />
                <TextArea label="Notas lesión" value={injury.notes} onChange={(value) => updateInjury(injury.id, { notes: value })} />
              </div>
              <button type="button" onClick={() => {
                markDirty();
                setInjuries((current) => current.filter((item) => item.id !== injury.id));
              }} className="mt-3 rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/70 hover:border-hyrox-gold hover:text-hyrox-gold">
                Eliminar lesión
              </button>
            </div>
          ))}
        </SectionShell>
      );
    }

    if (activeTab === 'nutrition') {
      return (
        <SectionShell title="Preferencias nutricionales">
          <SelectField
            label="Objetivo nutricional"
            value={nutrition.goal}
            onChange={(value) => updateNutrition('goal', value as NutritionPreferences['goal'])}
            options={[
              { value: 'rendimiento', label: 'Rendimiento' },
              { value: 'mantenimiento', label: 'Mantenimiento' },
              { value: 'perdida_grasa', label: 'Pérdida grasa' },
            ]}
          />
          <Field label="Tipo de dieta" value={nutrition.dietType} onChange={(value) => updateNutrition('dietType', value)} />
          <Field label="Alergias" value={nutrition.allergies} onChange={(value) => updateNutrition('allergies', value)} />
          <Field label="Intolerancias" value={nutrition.intolerances} onChange={(value) => updateNutrition('intolerances', value)} />
          <Field label="Tolerancia a cafeína" value={nutrition.caffeineTolerance} onChange={(value) => updateNutrition('caffeineTolerance', value)} />
          <Field label="Entrenar en ayunas" value={nutrition.fastedTrainingPreference} onChange={(value) => updateNutrition('fastedTrainingPreference', value)} />
          <TextArea label="Horarios habituales de comida" value={nutrition.mealTiming} onChange={(value) => updateNutrition('mealTiming', value)} />
          <Field label="Suplementos opcionales" value={nutrition.supplements ?? ''} onChange={(value) => updateNutrition('supplements', value)} />
          <TextArea label="Notas nutrición" value={nutrition.notes} onChange={(value) => updateNutrition('notes', value)} />
        </SectionShell>
      );
    }

    if (activeTab === 'privacy') {
      return <PrivacyAccountPanel storageContext={storageContext} authenticated={Boolean(authSession)} />;
    }

    return (
      <SectionShell title="Check-in diario">
        <Field label="Horas de sueño" type="number" step={0.5} value={dailyReadiness.sleepHours} onChange={(value) => updateReadiness('sleepHours', toNumberOrEmpty(value))} />
        <Field label="Calidad sueño (1-5)" type="number" min={1} max={5} value={dailyReadiness.sleepQuality1To5} onChange={(value) => updateReadiness('sleepQuality1To5', toNumberOrEmpty(value))} />
        <Field label="Estrés (1-5)" type="number" min={1} max={5} value={dailyReadiness.stress1To5} onChange={(value) => updateReadiness('stress1To5', toNumberOrEmpty(value))} />
        <Field label="Fatiga (1-5)" type="number" min={1} max={5} value={dailyReadiness.fatigue1To5} onChange={(value) => updateReadiness('fatigue1To5', toNumberOrEmpty(value))} />
        <Field label="Agujetas generales (1-5)" type="number" min={1} max={5} value={dailyReadiness.muscleSoreness1To5} onChange={(value) => updateReadiness('muscleSoreness1To5', toNumberOrEmpty(value))} />
        <Field label="Agujetas piernas (1-5)" type="number" min={1} max={5} value={dailyReadiness.legSoreness1To5} onChange={(value) => updateReadiness('legSoreness1To5', toNumberOrEmpty(value))} />
        <Field label="Agujetas torso (1-5)" type="number" min={1} max={5} value={dailyReadiness.upperSoreness1To5} onChange={(value) => updateReadiness('upperSoreness1To5', toNumberOrEmpty(value))} />
        <Field label="Motivación (1-5)" type="number" min={1} max={5} value={dailyReadiness.motivation1To5} onChange={(value) => updateReadiness('motivation1To5', toNumberOrEmpty(value))} />
        <Field label="Hidratación (1-5)" type="number" min={1} max={5} value={dailyReadiness.hydration1To5} onChange={(value) => updateReadiness('hydration1To5', toNumberOrEmpty(value))} />
        <Field label="Dolor (0-10)" type="number" min={0} max={10} value={dailyReadiness.pain0To10} onChange={(value) => updateReadiness('pain0To10', toNumberOrEmpty(value))} />
        <Field label="Localización del dolor" value={dailyReadiness.painLocation} onChange={(value) => updateReadiness('painLocation', value)} />
        <TextArea label="Notas del check-in" value={dailyReadiness.notes} onChange={(value) => updateReadiness('notes', value)} />
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleSaveReadiness} className="rounded-full border border-hyrox-gold bg-hyrox-gold px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black">
            Guardar check-in
          </button>
          {readinessSaved ? <p className="font-mono text-xs font-bold uppercase tracking-wide text-hyrox-gold">Check-in guardado para hoy.</p> : null}
        </div>
      </SectionShell>
    );
  }

  return (
    <section id="account" className="rounded-2xl border border-white/10 bg-hyrox-panel/85 p-4 sm:p-6">
      <section aria-labelledby="profile-title" className="rounded-2xl border border-hyrox-gold/20 bg-[radial-gradient(circle_at_85%_0%,rgba(246,201,76,0.12),transparent_34%)] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-hyrox-gold">Perfil de atleta</p>
            <h2 id="profile-title" className="mt-2 font-display text-4xl uppercase leading-none text-white sm:text-5xl">Mi perfil</h2>
            <p className="mt-3 text-base font-semibold leading-relaxed text-white/75">
              Gestiona los datos que utiliza AtletaHY para adaptar tu planificación.
            </p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-white/50">
              Gestiona tus datos de atleta, métricas, disponibilidad, material, recuperación y preferencias.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:max-w-sm xl:justify-end">
            <button type="button" onClick={handleSaveProfile} disabled={profileSaving} className="rounded-full border border-hyrox-gold bg-hyrox-gold px-5 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-white disabled:cursor-wait disabled:opacity-70">
              {profileSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={onBackToTraining} className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-hyrox-gold hover:text-hyrox-gold">
              Volver a entrenamientos
            </button>
            <div className="w-full text-right">
              {profileSaved ? <p className="font-mono text-xs font-bold uppercase tracking-wide text-hyrox-gold">Cambios guardados</p> : null}
              {profileSaveError ? <p role="alert" className="text-sm font-semibold text-red-300">{profileSaveError}</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: 'Nombre', value: profile.name || 'Pendiente' },
            { label: 'Edad', value: ageLabel },
            { label: 'Peso', value: profile.weightKg === '' ? 'Pendiente' : `${profile.weightKg} kg` },
            { label: 'Categoría HYROX', value: profile.hyroxCategory || 'Pendiente' },
            { label: 'Objetivo', value: formatMainGoal(profile.mainGoal) },
            { label: 'Fecha de competición', value: profile.targetDate || 'Pendiente' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-black/30 p-3.5">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-white/45">{item.label}</p>
              <p className="mt-1 truncate text-sm font-black text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Estado de configuración" className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm font-black uppercase tracking-[0.12em] ${onboardingPending ? 'text-hyrox-gold' : 'text-emerald-200'}`}>
          {onboardingPending ? 'Configuración pendiente' : 'Perfil configurado'}
        </p>
        <button type="button" onClick={onEditOnboarding} className="w-fit rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-hyrox-gold hover:text-hyrox-gold">
          Editar configuración inicial
        </button>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Secciones de Mi perfil" className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin lg:flex-col lg:gap-3 lg:overflow-visible">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => { setActiveTab(tab.id); onTabChange?.(tab.id); }}
                className={`min-w-max rounded-xl border px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] transition ${
                  isActive ? 'border-hyrox-gold bg-hyrox-gold text-black' : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-hyrox-gold hover:text-hyrox-gold'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
        {renderActiveSection()}
      </div>

      <section aria-label="Sesión" className="mt-6 border-t border-white/10 pt-5">
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Sesión</h3>
            <p className="mt-1 text-sm font-semibold text-white/75">{authSession?.email ?? 'Sin sesión activa'}</p>
          </div>
          <AuthPanel onSessionChange={onAuthSessionChange} publicFacing compact />
        </div>
      </section>
    </section>
  );
}
