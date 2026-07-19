import { HYROX_CATEGORY_VALUES, MAIN_GOAL_VALUES, TRAINING_TIME_VALUES } from '../../supabase/functions/_shared/inputDomains';
import type { AthleteState } from '../types/athlete';

export type PlanReadinessTab = 'profile' | 'availability' | 'privacy';

export type PlanReadinessBlocker = {
  path: string;
  label: string;
  tab: PlanReadinessTab;
  message: string;
};

export type PlanReadiness = {
  ready: boolean;
  blockers: PlanReadinessBlocker[];
};

function isNotPastIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value && value >= new Date().toISOString().slice(0, 10);
}

export function getPlanReadiness(
  state: AthleteState,
  options: { requireAiConsent?: boolean; aiConsentGranted?: boolean } = {},
): PlanReadiness {
  const blockers: PlanReadinessBlocker[] = [];
  const add = (blocker: PlanReadinessBlocker) => blockers.push(blocker);

  if (!isNotPastIsoDate(state.profile.targetDate)) add({ path: 'profile.targetDate', label: 'Fecha de competición', tab: 'profile', message: 'Indica una fecha de competición válida que no esté en el pasado.' });
  if (!MAIN_GOAL_VALUES.includes(state.profile.mainGoal as never)) add({ path: 'profile.mainGoal', label: 'Objetivo principal', tab: 'profile', message: 'Selecciona el objetivo principal de tu preparación.' });
  if (!HYROX_CATEGORY_VALUES.includes(state.profile.hyroxCategory as never)) add({ path: 'profile.hyroxCategory', label: 'Categoría HYROX', tab: 'profile', message: 'Selecciona una categoría HYROX oficial.' });
  if (state.availability.availableDays.length === 0) add({ path: 'availability.availableDays', label: 'Días disponibles', tab: 'availability', message: 'Selecciona al menos un día disponible por semana.' });
  const minutes = state.availability.maxSessionMinutes;
  if (typeof minutes !== 'number' || minutes < 15 || minutes > 360 || (minutes - 15) % 5 !== 0) add({ path: 'availability.maxSessionMinutes', label: 'Tiempo máximo por sesión', tab: 'availability', message: 'Indica entre 15 y 360 minutos, en intervalos de 5.' });
  if (!TRAINING_TIME_VALUES.includes(state.availability.preferredTrainingTime as never)) add({ path: 'availability.preferredTrainingTime', label: 'Hora preferida', tab: 'availability', message: 'Selecciona cuándo prefieres entrenar.' });
  if (options.requireAiConsent && !options.aiConsentGranted) add({ path: 'consent.healthDataWithAi', label: 'Consentimiento para IA', tab: 'privacy', message: 'Autoriza el uso de datos de salud con IA para generar tu plan.' });

  return { ready: blockers.length === 0, blockers };
}
