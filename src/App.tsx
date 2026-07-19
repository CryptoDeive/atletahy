import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import type { AuthMode, AuthSessionInfo } from './components/auth/AuthPanel';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './components/marketing/HomePage';
import { TrainingWorkspace } from './components/training/TrainingWorkspace';
import {
  createDefaultDailyReadiness,
  defaultAthleteProfile,
  defaultEquipmentAvailability,
  defaultNutritionPreferences,
  defaultPhysiologyMetrics,
  defaultTrainingAvailability,
} from './data/defaultAthleteState';
import { defaultWeek, trainingWeeks } from './data/trainingWeeks';
import {
  getAthleteState as getAthleteStateFromAppRepository,
  getDailyReadiness as getDailyReadinessFromAppRepository,
  getWorkoutLogs as getWorkoutLogsFromAppRepository,
  saveAthleteState as saveAthleteStateToAppRepository,
  saveDailyReadiness as saveDailyReadinessToAppRepository,
  saveWorkoutLog as saveWorkoutLogToAppRepository,
  syncLocalDataToSupabase,
} from './repositories/appRepository';
import type { AthleteState, DailyReadiness, Injury, WorkoutLog } from './types/athlete';
import type { GeneratedTrainingPlan } from './types/plan';
import type { TrainingWeek, TrainingWeekId } from './types/training';
import { buildCoachAdviceInput } from './utils/coachAdvice';
import { getDateKeyForTrainingDay, getDayForDate, getWeekForDate } from './utils/date';
import { getLogForTrainingDay } from './utils/weeklyAnalytics';
import { usePersistentState } from './utils/persistence';
import { adaptGeneratedPlanToTrainingWeeks } from './utils/generatedPlanAdapter';
import { getPlanReadiness } from './utils/planReadiness';
import { storageContextFor } from './repositories/storageKeys';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';
import type { TrainingTestCategory, TrainingTestId } from './types/tests';
import { LegalPage, type LegalDocument } from './legal/LegalPage';
import { canUseHealthDataWithAi, type ConsentChoices, type ConsentRecord } from './legal/consent';
import { loadConsent, saveConsent } from './legal/consentRepository';

const AccountView = lazy(() => import('./components/account/AccountView').then((module) => ({ default: module.AccountView })));
const TestsView = lazy(() => import('./components/tests/TestsView').then((module) => ({ default: module.TestsView })));
const OnboardingView = lazy(() => import('./components/onboarding/OnboardingView').then((module) => ({ default: module.OnboardingView })));
const PlanGeneratorPanel = lazy(() => import('./components/plans/PlanGeneratorPanel').then((module) => ({ default: module.PlanGeneratorPanel })));

type AppView = 'publicHome' | 'trainings' | 'tests' | 'account' | 'onboarding';

type RouteMode = 'demo' | 'app';
const RETURN_TO_KEY = 'atletahy:return-to';

function ScreenLoader({ label }: { label: string }) {
  return <div role="status" aria-live="polite" className="mx-auto w-full max-w-7xl px-4 py-5 text-sm font-semibold text-white/70">{label}</div>;
}

function PlanCalendarLoading() {
  return (
    <section role="status" aria-label="Cargando calendario personal" className="overflow-hidden rounded-2xl border border-white/10 bg-hyrox-panel/55 p-5">
      <div className="h-2 w-28 animate-pulse rounded-full bg-hyrox-gold/50" />
      <p className="mt-4 font-display text-2xl uppercase text-white">Cargando tu calendario</p>
      <p className="mt-2 text-sm font-semibold text-white/55">Estamos comprobando si ya tienes un plan activo.</p>
    </section>
  );
}

function EmptyTrainingPlan({ ready, onOpenProfile }: { ready: boolean; onOpenProfile: () => void }) {
  return (
    <section aria-label="Calendario sin plan" className="relative overflow-hidden rounded-2xl border border-white/10 bg-hyrox-panel/60 p-5 sm:p-7">
      <div className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full border border-hyrox-gold/20 bg-hyrox-gold/[0.04]" />
      <p className="font-mono text-[0.66rem] font-black uppercase tracking-[0.22em] text-hyrox-gold">Primer bloque</p>
      <h2 className="mt-2 max-w-xl font-display text-4xl uppercase leading-none text-white sm:text-5xl">Tu calendario empieza aquí</h2>
      <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-white/62">
        {ready ? 'Aún no tienes entrenamientos asignados. Genera tu primer plan con IA y aparecerá aquí, separado de la demo.' : 'Completa los datos indicados para preparar un calendario adaptado a tu objetivo y disponibilidad.'}
      </p>
      {!ready ? <button type="button" onClick={onOpenProfile} className="mt-5 rounded-full border border-hyrox-gold px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-hyrox-gold transition hover:bg-hyrox-gold hover:text-black">Completar Mi perfil</button> : <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-white/45">Usa “Generar mi plan con IA” para crear tus primeras dos semanas.</p>}
    </section>
  );
}

function parseRoute(pathname: string): { view: AppView; mode: RouteMode | null; testId?: TrainingTestId; legalDocument?: LegalDocument } {
  if (pathname === '/') return { view: 'publicHome', mode: null };
  if (pathname === '/aviso-legal') return { view: 'publicHome', mode: null, legalDocument: 'notice' };
  if (pathname === '/politica-privacidad') return { view: 'publicHome', mode: null, legalDocument: 'privacy' };
  if (pathname === '/politica-cookies') return { view: 'publicHome', mode: null, legalDocument: 'cookies' };
  const match = pathname.match(/^\/(demo|app)\/(trainings|tests|profile|onboarding)(?:\/([^/]+))?\/?$/);
  if (!match) return { view: 'publicHome', mode: null };
  const section = match[2];
  return {
    mode: match[1] as RouteMode,
    view: section === 'profile' ? 'account' : section as AppView,
    testId: section === 'tests' && match[3] ? decodeURIComponent(match[3]) as TrainingTestId : undefined,
  };
}

function routeForView(view: AppView, mode: RouteMode, testId?: TrainingTestId) {
  const section = view === 'account' ? 'profile' : view;
  return `/${mode}/${section}${view === 'tests' && testId ? `/${encodeURIComponent(testId)}` : ''}`;
}

function getInitialWeek(today: Date): TrainingWeek {
  return getWeekForDate(today, trainingWeeks) ?? defaultWeek;
}

function getInitialDayId(today: Date, week: TrainingWeek) {
  return getDayForDate(today, week)?.id ?? week.days[0].id;
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function workoutLogKey(weekId: string, dayId: string, date: string) {
  return `${weekId}:${dayId}:${date}`;
}

function toWorkoutLogRecord(logs: WorkoutLog[]) {
  return Object.fromEntries(logs.map((log) => [workoutLogKey(log.weekId, log.dayId, log.date), log]));
}

function isOnboardingIncomplete(state: AthleteState) {
  const hasTarget = Boolean(state.profile.targetDate);
  const hasGoal = Boolean(state.profile.mainGoal);
  const hasBasicAvailability = state.availability.availableDays.length > 0 && Boolean(state.availability.maxSessionMinutes) && Boolean(state.availability.preferredTrainingTime);
  return state.profile.onboardingCompleted !== true || !hasTarget || !hasGoal || !hasBasicAvailability;
}

function RoutedApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = useMemo(() => parseRoute(location.pathname), [location.pathname]);
  const [today] = useState(() => new Date());
  const todayKey = useMemo(() => formatDateKey(today), [today]);
  const view = route.view;
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authFocusSignal, setAuthFocusSignal] = useState(0);
  const [authSession, setAuthSession] = useState<AuthSessionInfo | null>(null);
  const [authResolved, setAuthResolved] = useState(!isSupabaseConfigured);
  const [consentRecord, setConsentRecord] = useState<ConsentRecord | null>(null);
  const [onboardingBypassed, setOnboardingBypassed] = useState(false);
  const [isOnboardingSaving, setIsOnboardingSaving] = useState(false);
  const hadSessionRef = useRef(false);
  const activeUserId = authSession?.userId ?? null;
  const storageContext = useMemo(() => storageContextFor(activeUserId), [activeUserId]);
  const storageIdentityKey = activeUserId ? `user:${activeUserId}` : 'guest';
  const [activeGeneratedPlan, setActiveGeneratedPlan] = useState<GeneratedTrainingPlan | null>(null);
  const [isActivePlanLoading, setIsActivePlanLoading] = useState(false);
  const availableTrainingWeeks = useMemo(
    () => activeGeneratedPlan ? adaptGeneratedPlanToTrainingWeeks(activeGeneratedPlan) : route.mode === 'demo' ? trainingWeeks : [],
    [activeGeneratedPlan, route.mode],
  );
  const [activeWeekId, setActiveWeekId] = useState<TrainingWeekId>(() => getInitialWeek(today).id);
  const activeWeek = useMemo(
    () => availableTrainingWeeks.find((week) => week.id === activeWeekId) ?? availableTrainingWeeks[0] ?? defaultWeek,
    [activeWeekId, availableTrainingWeeks],
  );
  const [activeDayId, setActiveDayId] = useState(() => getInitialDayId(today, getInitialWeek(today)));

  const activeDay = useMemo(
    () => activeWeek.days.find((day) => day.id === activeDayId) ?? activeWeek.days[0],
    [activeDayId, activeWeek],
  );

  const [profile, setProfile] = usePersistentState('athlete-profile', defaultAthleteProfile, storageContext);
  const [physiology, setPhysiology] = usePersistentState('physiology-metrics', defaultPhysiologyMetrics, storageContext);
  const [availability, setAvailability] = usePersistentState('training-availability', defaultTrainingAvailability, storageContext);
  const [equipment, setEquipment] = usePersistentState('equipment-availability', defaultEquipmentAvailability, storageContext);
  const [injuries, setInjuries] = usePersistentState<Injury[]>('injuries', [], storageContext);
  const [nutrition, setNutrition] = usePersistentState('nutrition-preferences', defaultNutritionPreferences, storageContext);
  const [dailyReadinessByDate, setDailyReadinessByDate] = usePersistentState<Record<string, DailyReadiness>>('daily-readiness', {}, storageContext);
  const [workoutLogs, setWorkoutLogs] = useState<Record<string, WorkoutLog>>({});
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [dirtyView, setDirtyView] = useState<'account' | 'onboarding' | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const profileBaselineRef = useRef<AthleteState | null>(null);
  const lastSafeLocationRef = useRef(`${location.pathname}${location.search}`);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const restoreFocusOnCloseRef = useRef(true);
  const unsavedDialogRef = useRef<HTMLDivElement | null>(null);
  const stayButtonRef = useRef<HTMLButtonElement | null>(null);
  const onboardingDraftStorageKey = `atletahy:${activeUserId ?? 'guest'}:onboarding-draft`;

  const activeDayDateKey = useMemo(() => getDateKeyForTrainingDay(activeWeek, activeDay), [activeDay, activeWeek]);
  const dailyReadiness = dailyReadinessByDate[todayKey] ?? createDefaultDailyReadiness(todayKey);
  const currentWorkoutLog = getLogForTrainingDay(Object.values(workoutLogs), activeWeek.id, activeDay.id, activeDayDateKey);
  const recentWorkoutLogs = useMemo(() => Object.values(workoutLogs).slice(-7), [workoutLogs]);

  const athleteState: AthleteState = useMemo(
    () => ({ profile, physiology, availability, equipment, injuries, nutrition }),
    [availability, equipment, injuries, nutrition, physiology, profile],
  );
  const planReadiness = useMemo(
    () => getPlanReadiness(athleteState, { requireAiConsent: Boolean(activeUserId), aiConsentGranted: route.mode === 'demo' || canUseHealthDataWithAi(consentRecord) }),
    [activeUserId, athleteState, consentRecord, route.mode],
  );
  const onboardingIncomplete = isOnboardingIncomplete(athleteState);
  const shouldRenderOnboarding = view === 'onboarding' || (view === 'trainings' && Boolean(activeUserId) && !onboardingBypassed && onboardingIncomplete);
  const isOnboardingNavigationLocked = shouldRenderOnboarding && isOnboardingSaving;

  const coachAdviceInput = useMemo(
    () =>
      buildCoachAdviceInput({
        profile,
        physiology,
        availability,
        equipment,
        injuries,
        nutrition,
        dailyReadiness,
        activeWeek,
        activeDay,
        workoutLog: currentWorkoutLog,
        recentWorkoutLogs,
      }),
    [activeDay, activeWeek, availability, currentWorkoutLog, dailyReadiness, equipment, injuries, nutrition, physiology, profile, recentWorkoutLogs],
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthResolved(true);
      return;
    }
    if (!supabase.auth?.getSession) return;
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthSession(data.session?.user ? { userId: data.session.user.id, email: data.session.user.email ?? null } : null);
      setAuthResolved(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!authResolved || route.mode !== 'app' || authSession) return;
    window.sessionStorage.setItem(RETURN_TO_KEY, `${location.pathname}${location.search}`);
    navigate('/', { replace: true });
  }, [authResolved, authSession, location.pathname, location.search, navigate, route.mode]);

  const go = useCallback((path: string) => {
    if (dirtyView && path !== `${location.pathname}${location.search}`) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      restoreFocusOnCloseRef.current = true;
      setPendingPath(path);
      return;
    }
    navigate(path);
  }, [dirtyView, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!dirtyView) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyView]);

  useEffect(() => {
    if (!dirtyView) {
      lastSafeLocationRef.current = `${location.pathname}${location.search}`;
      return;
    }
    const handlePopState = () => {
      const destination = `${window.location.pathname}${window.location.search}`;
      if (destination === lastSafeLocationRef.current) return;
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      restoreFocusOnCloseRef.current = true;
      setPendingPath(destination);
      navigate(lastSafeLocationRef.current, { replace: true });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [dirtyView, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!pendingPath) return;

    stayButtonRef.current?.focus();
    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        restoreFocusOnCloseRef.current = true;
        setPendingPath(null);
        return;
      }
      if (event.key !== 'Tab') return;

      const controls = Array.from(
        unsavedDialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? [],
      );
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
      if (restoreFocusOnCloseRef.current) previousFocusRef.current?.focus();
    };
  }, [pendingPath]);

  const handleAuthSessionChange = useCallback((session: AuthSessionInfo | null) => {
    setAuthResolved(true);
    setIsOnboardingSaving(false);
    if (session) {
      hadSessionRef.current = true;
      setAuthSession((currentSession) => {
        if (currentSession?.userId !== session.userId) {
          setOnboardingBypassed(false);
          const returnTo = window.sessionStorage.getItem(RETURN_TO_KEY);
          window.sessionStorage.removeItem(RETURN_TO_KEY);
          navigate(returnTo?.startsWith('/app/') ? returnTo : '/app/trainings', { replace: true });
        }
        return session;
      });
      return;
    }

    setAuthSession(null);
    setOnboardingBypassed(false);
    if (hadSessionRef.current) navigate('/', { replace: true });
    hadSessionRef.current = false;
  }, [navigate]);

  const handleAuthIntent = useCallback((mode: AuthMode) => {
    navigate('/');
    setAuthMode(mode);
    setAuthFocusSignal((current) => current + 1);
    window.setTimeout(() => document.getElementById('entrar')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0);
  }, [navigate]);

  const handleNavigate = useCallback((nextView: AppView) => {
    if (isOnboardingNavigationLocked && nextView !== 'onboarding') return;
    go(routeForView(nextView, route.mode === 'demo' ? 'demo' : 'app'));
  }, [go, isOnboardingNavigationLocked, route.mode]);

  useEffect(() => {
    setActiveGeneratedPlan(null);
    setIsActivePlanLoading(Boolean(activeUserId));
    setWorkoutLogs({});
    setDataLoadError(null);
  }, [activeUserId, storageIdentityKey]);

  useEffect(() => {
    let mounted = true;
    const refresh = () => { void loadConsent(storageContext).then((record) => { if (mounted) setConsentRecord(record); }); };
    refresh();
    window.addEventListener('atletahy:consent-changed', refresh);
    return () => { mounted = false; window.removeEventListener('atletahy:consent-changed', refresh); };
  }, [storageContext]);

  useEffect(() => {
    if (!activeUserId) return;

    let isMounted = true;
    void getAthleteStateFromAppRepository(activeUserId).then((remoteState) => {
      if (!isMounted || !remoteState) return;
      setProfile(remoteState.profile);
      setPhysiology(remoteState.physiology);
      setAvailability(remoteState.availability);
      setEquipment(remoteState.equipment);
      setInjuries(remoteState.injuries);
      setNutrition(remoteState.nutrition);
    }).catch(() => {
      if (isMounted) setDataLoadError('No se pudieron cargar los datos de tu cuenta. No se han usado datos locales de otra identidad.');
    });

    void getDailyReadinessFromAppRepository(activeUserId, todayKey).then((remoteReadiness) => {
      if (!isMounted || !remoteReadiness) return;
      setDailyReadinessByDate((current) => ({ ...current, [remoteReadiness.date]: remoteReadiness }));
    }).catch(() => {
      if (isMounted) setDataLoadError('No se pudieron cargar los datos de tu cuenta. No se han usado datos locales de otra identidad.');
    });

    return () => {
      isMounted = false;
    };
  }, [activeUserId, setAvailability, setDailyReadinessByDate, setEquipment, setInjuries, setNutrition, setPhysiology, setProfile, todayKey]);

  useEffect(() => {
    let isMounted = true;
    void getWorkoutLogsFromAppRepository(activeUserId).then((logs) => {
      if (!isMounted) return;
      setWorkoutLogs(toWorkoutLogRecord(logs));
    }).catch(() => {
      if (isMounted) setDataLoadError('No se pudieron cargar los datos de tu cuenta. No se han usado datos locales de otra identidad.');
    });

    return () => {
      isMounted = false;
    };
  }, [activeUserId]);

  function handleSelectWeek(weekId: TrainingWeekId) {
    const nextWeek = availableTrainingWeeks.find((week) => week.id === weekId) ?? availableTrainingWeeks[0] ?? defaultWeek;
    setActiveWeekId(nextWeek.id);
    setActiveDayId(getInitialDayId(today, nextWeek));
  }

  const handlePlanChange = useCallback((plan: GeneratedTrainingPlan | null, reason: 'load' | 'generation') => {
    setActiveGeneratedPlan(plan);
    const nextWeeks = plan ? adaptGeneratedPlanToTrainingWeeks(plan) : trainingWeeks;
    const nextWeek = reason === 'generation'
      ? nextWeeks[0] ?? defaultWeek
      : getWeekForDate(today, nextWeeks) ?? nextWeeks[0] ?? defaultWeek;
    setActiveWeekId(nextWeek.id);
    setActiveDayId(reason === 'generation' ? nextWeek.days[0].id : getInitialDayId(today, nextWeek));
  }, [today]);

  const handlePlanLoadingChange = useCallback((loading: boolean) => {
    setIsActivePlanLoading(loading);
  }, []);

  const openPlanBlocker = useCallback((tab: 'profile' | 'availability' | 'privacy') => {
    go(`${routeForView('account', route.mode === 'demo' ? 'demo' : 'app')}?tab=${encodeURIComponent(tab)}`);
  }, [go, route.mode]);

  function handleSaveWorkoutLog(log: WorkoutLog) {
    setWorkoutLogs((current) => ({ ...current, [workoutLogKey(log.weekId, log.dayId, log.date)]: log }));
    void saveWorkoutLogToAppRepository(activeUserId, log).then(() => getWorkoutLogsFromAppRepository(activeUserId)).then((logs) => {
      setWorkoutLogs((current) => ({ ...current, ...toWorkoutLogRecord(logs) }));
    });
  }

  function setDailyReadiness(value: DailyReadiness | ((current: DailyReadiness) => DailyReadiness)) {
    setDailyReadinessByDate((current) => {
      const nextReadiness = typeof value === 'function' ? value(current[todayKey] ?? createDefaultDailyReadiness(todayKey)) : value;
      return { ...current, [todayKey]: nextReadiness };
    });
  }

  async function handleSaveAthleteState(nextState: AthleteState) {
    await saveAthleteStateToAppRepository(activeUserId, nextState);
  }

  async function handleCompleteOnboarding(nextState: AthleteState) {
    setIsOnboardingSaving(true);
    try {
      await saveAthleteStateToAppRepository(activeUserId, nextState);
      setProfile(nextState.profile);
      setPhysiology(nextState.physiology);
      setAvailability(nextState.availability);
      setEquipment(nextState.equipment);
      setInjuries(nextState.injuries);
      setNutrition(nextState.nutrition);
      setOnboardingBypassed(false);
      setDirtyView(null);
      navigate(routeForView('trainings', route.mode === 'demo' ? 'demo' : 'app'));
    } finally {
      setIsOnboardingSaving(false);
    }
  }

  async function handleConsentChange(choices: ConsentChoices) {
    const { record } = await saveConsent(storageContext, choices);
    setConsentRecord(record);
  }

  function handleSkipOnboarding() {
    setIsOnboardingSaving(false);
    setOnboardingBypassed(true);
    go(routeForView('trainings', route.mode === 'demo' ? 'demo' : 'app'));
  }

  function handleEditOnboarding() {
    go(routeForView('onboarding', route.mode === 'demo' ? 'demo' : 'app'));
  }

  async function handleSaveDailyReadiness(readiness: DailyReadiness) {
    await saveDailyReadinessToAppRepository(activeUserId, readiness);
  }

  async function handleSyncLocalToSupabase() {
    if (!activeUserId) {
      throw new Error('No hay sesión activa.');
    }

    await syncLocalDataToSupabase(activeUserId);
  }

  const isLegalPage = Boolean(route.legalDocument);
  const isPublicHome = view === 'publicHome' && !isLegalPage;
  const shellMode = view === 'publicHome' && !authSession ? 'public' : 'private';
  if (!authResolved && route.mode === 'app') return <main className="min-h-screen bg-hyrox-black p-8 text-white">Comprobando sesión…</main>;
  return (
    <AppShell
      mode={shellMode}
      activeView={view}
      authEmail={authSession?.email}
      onNavigate={handleNavigate}
      onBrandNavigate={() => go('/')}
      onAuthIntent={handleAuthIntent}
      coachReady={coachAdviceInput.activeInjuries.length >= 0}
      navigationDisabled={isOnboardingNavigationLocked}
      focusKey={`${location.pathname}${location.search}`}
    >
      {dataLoadError ? (
        <p role="alert" className="mx-auto mt-4 w-[calc(100%-2rem)] max-w-7xl rounded-xl border border-red-400/40 bg-red-950/50 px-4 py-3 text-sm font-semibold text-red-100">
          {dataLoadError}
        </p>
      ) : null}
      {isPublicHome ? (
        <HomePage
          authenticated={Boolean(authSession)}
          authMode={authMode}
          authFocusSignal={authFocusSignal}
          onAuthIntent={handleAuthIntent}
          onDemo={() => navigate('/demo/trainings')}
          onOpenApp={() => navigate('/app/trainings')}
          onSessionChange={handleAuthSessionChange}
        />
      ) : null}
      {route.legalDocument ? <LegalPage document={route.legalDocument} /> : null}

      {view === 'account' ? (
        <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:px-8">
          <Suspense fallback={<ScreenLoader label="Cargando perfil…" />}><AccountView
            key={storageIdentityKey}
            profile={profile}
            setProfile={setProfile}
            physiology={physiology}
            setPhysiology={setPhysiology}
            availability={availability}
            setAvailability={setAvailability}
            equipment={equipment}
            setEquipment={setEquipment}
            injuries={injuries}
            setInjuries={setInjuries}
            nutrition={nutrition}
            setNutrition={setNutrition}
            dailyReadiness={dailyReadiness}
            setDailyReadiness={setDailyReadiness}
            onBackToTraining={() => handleNavigate('trainings')}
            authSession={authSession}
            onAuthSessionChange={handleAuthSessionChange}
            onSaveAthleteState={handleSaveAthleteState}
            onSaveDailyReadiness={handleSaveDailyReadiness}
            onSyncLocalToSupabase={handleSyncLocalToSupabase}
            onboardingPending={onboardingIncomplete}
            onEditOnboarding={handleEditOnboarding}
            initialTab={new URLSearchParams(location.search).get('tab') ?? undefined}
            onTabChange={(tab) => navigate(`${location.pathname}?tab=${encodeURIComponent(tab)}`, { replace: true })}
            onDirtyChange={(dirty) => {
              if (dirty && !profileBaselineRef.current) profileBaselineRef.current = athleteState;
              setDirtyView(dirty ? 'account' : null);
              if (!dirty) profileBaselineRef.current = null;
            }}
            storageContext={storageContext}
            healthDataConsentGranted={route.mode === 'demo' || Boolean(consentRecord?.healthData)}
          /></Suspense>
        </div>
      ) : null}

      {view === 'tests' ? <Suspense fallback={<ScreenLoader label="Cargando tests…" />}><TestsView
        key={storageIdentityKey}
        userId={activeUserId}
        athleteWeightKg={profile.weightKg}
        initialTestId={route.testId}
        initialCategory={(new URLSearchParams(location.search).get('category') as TrainingTestCategory | null) ?? undefined}
        onTestChange={(testId) => navigate(routeForView('tests', route.mode === 'demo' ? 'demo' : 'app', testId ?? undefined))}
        onCategoryChange={(category) => navigate(`${routeForView('tests', route.mode === 'demo' ? 'demo' : 'app')}?category=${encodeURIComponent(category)}`, { replace: true })}
      /></Suspense> : null}

      {shouldRenderOnboarding ? <Suspense fallback={<ScreenLoader label="Cargando configuración inicial…" />}><OnboardingView key={storageIdentityKey} athleteState={athleteState} onComplete={handleCompleteOnboarding} onConsentChange={handleConsentChange} onSkip={handleSkipOnboarding} onSavingChange={setIsOnboardingSaving} draftStorageKey={onboardingDraftStorageKey} onDirtyChange={(dirty) => { if (view === 'onboarding') setDirtyView(dirty ? 'onboarding' : null); }} /></Suspense> : null}

      {view === 'trainings' && !shouldRenderOnboarding ? (
        <div key={storageIdentityKey} data-training-workspace className="relative mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:px-8">
          <Suspense fallback={<ScreenLoader label="Cargando generador de planes…" />}><PlanGeneratorPanel
            athleteState={athleteState}
            dailyReadiness={dailyReadiness}
            recentWorkoutLogs={recentWorkoutLogs}
            userId={activeUserId}
            onboardingIncomplete={onboardingIncomplete}
            aiConsentGranted={route.mode === 'demo' || canUseHealthDataWithAi(consentRecord)}
            onPlanChange={handlePlanChange}
            onPlanLoadingChange={handlePlanLoadingChange}
            onResolveBlocker={openPlanBlocker}
          /></Suspense>
          {route.mode === 'app' && isActivePlanLoading ? <PlanCalendarLoading /> : null}
          {availableTrainingWeeks.length > 0 ? <TrainingWorkspace
            availableTrainingWeeks={availableTrainingWeeks}
            activeWeek={activeWeek}
            activeDay={activeDay}
            activeDayDateKey={activeDayDateKey}
            currentWorkoutLog={currentWorkoutLog}
            coachAdviceInput={coachAdviceInput}
            coachAdviceKey={workoutLogKey(activeWeek.id, activeDay.id, activeDayDateKey)}
            workoutLogs={workoutLogs}
            dailyReadinessByDate={dailyReadinessByDate}
            onSelectWeek={handleSelectWeek}
            onSelectDay={setActiveDayId}
            onSaveWorkoutLog={handleSaveWorkoutLog}
            userId={activeUserId}
            aiConsentGranted={route.mode === 'demo' || canUseHealthDataWithAi(consentRecord)}
          /> : null}
          {route.mode === 'app' && !isActivePlanLoading && availableTrainingWeeks.length === 0 ? <EmptyTrainingPlan ready={planReadiness.ready} onOpenProfile={() => openPlanBlocker(planReadiness.blockers[0]?.tab ?? 'profile')} /> : null}
        </div>
      ) : null}
      {pendingPath ? (
        <div ref={unsavedDialogRef} role="dialog" aria-modal="true" aria-labelledby="unsaved-title" className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-hyrox-gold/30 bg-hyrox-panel p-5 shadow-panel">
            <h2 id="unsaved-title" className="font-display text-3xl uppercase">Cambios sin guardar</h2>
            <p className="mt-3 text-sm text-white/70">Puedes guardar el borrador, descartar los cambios o permanecer aquí.</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button ref={stayButtonRef} type="button" onClick={() => { restoreFocusOnCloseRef.current = true; setPendingPath(null); }} className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold uppercase">Permanecer</button>
              <button type="button" onClick={() => {
                if (dirtyView === 'account' && profileBaselineRef.current) {
                  const baseline = profileBaselineRef.current;
                  setProfile(baseline.profile); setPhysiology(baseline.physiology); setAvailability(baseline.availability);
                  setEquipment(baseline.equipment); setInjuries(baseline.injuries); setNutrition(baseline.nutrition);
                }
                if (dirtyView === 'onboarding') window.sessionStorage.removeItem(onboardingDraftStorageKey);
                const destination = pendingPath;
                restoreFocusOnCloseRef.current = false;
                setDirtyView(null); setPendingPath(null); profileBaselineRef.current = null;
                navigate(destination);
              }} className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold uppercase">Descartar</button>
              <button type="button" onClick={async () => {
                if (dirtyView === 'account') await handleSaveAthleteState(athleteState);
                const destination = pendingPath;
                restoreFocusOnCloseRef.current = false;
                setDirtyView(null); setPendingPath(null); profileBaselineRef.current = null;
                navigate(destination);
              }} className="rounded-full bg-hyrox-gold px-4 py-2 text-xs font-black uppercase text-black">Guardar borrador</button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

export default function App() {
  return <BrowserRouter><RoutedApp /></BrowserRouter>;
}
