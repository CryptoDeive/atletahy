import {
  defaultAthleteProfile,
  defaultEquipmentAvailability,
  defaultNutritionPreferences,
  defaultPhysiologyMetrics,
  defaultTrainingAvailability,
} from '../../data/defaultAthleteState';
import { validateAthleteState } from '../../domain/fields/schemas';
import { normalizeHyroxCategory, preserveLegacyOption } from '../../domain/fields/legacy';
import { DIET_VALUES } from '../../../supabase/functions/_shared/inputDomains';
import type { AthleteState, EquipmentAvailability, Injury, NutritionPreferences, PhysiologyMetrics, TrainingAvailability } from '../../types/athlete';
import type { Json } from '../../types/database';
import { fromNullableDate, fromNullableNumber, getSupabaseClient, toNullableDate, toNullableNumber, warnSupabaseError } from './supabaseRepositoryUtils';

type ProfileRow = import('../../types/database').Database['public']['Tables']['profiles']['Row'];
type MetricsRow = import('../../types/database').Database['public']['Tables']['athlete_metrics']['Row'];
type AvailabilityRow = import('../../types/database').Database['public']['Tables']['athlete_availability']['Row'];
type EquipmentRow = import('../../types/database').Database['public']['Tables']['athlete_equipment']['Row'];
type InjuryRow = import('../../types/database').Database['public']['Tables']['injuries']['Row'];
type NutritionRow = import('../../types/database').Database['public']['Tables']['nutrition_preferences']['Row'];

function mapProfile(row: ProfileRow | null | undefined): AthleteState['profile'] {
  if (!row) return defaultAthleteProfile;
  const sex = row.sex === 'female' || row.sex === 'male' || row.sex === 'other' ? row.sex : '';
  const category = normalizeHyroxCategory(row.hyrox_category, sex);
  return {
    name: row.name,
    birthDate: fromNullableDate(row.birth_date),
    heightCm: fromNullableNumber(row.height_cm),
    weightKg: fromNullableNumber(row.weight_kg),
    sex,
    hyroxCategory: typeof category === 'string' ? category : '',
    hyroxCategoryLegacy: typeof category === 'string' ? undefined : category,
    targetDate: fromNullableDate(row.target_race_date),
    mainGoal: row.main_goal,
    targetTime: row.target_time,
    onboardingCompleted: row.onboarding_completed,
    onboardingCompletedAt: row.onboarding_completed_at ?? '',
  };
}

function mapMetrics(row: MetricsRow | null | undefined): PhysiologyMetrics {
  if (!row) return defaultPhysiologyMetrics;
  return {
    restingHrBaseline: fromNullableNumber(row.resting_hr_baseline),
    restingHrToday: fromNullableNumber(row.resting_hr_today),
    maxHr: fromNullableNumber(row.max_hr),
    lthr: fromNullableNumber(row.lthr),
    rftp: row.rftp,
    z2PaceLow: row.z2_pace_low,
    z2PaceHigh: row.z2_pace_high,
    fiveKPace: row.five_k_pace,
    tenKPace: row.ten_k_pace,
    hrvBaseline: fromNullableNumber(row.hrv_baseline),
    currentRunningVolumeKm: fromNullableNumber(row.current_running_volume_km),
    currentLongRunKm: fromNullableNumber(row.current_long_run_km),
    hyroxExperience: row.hyrox_experience,
    strengthExperience: row.strength_experience,
  };
}

function mapAvailability(row: AvailabilityRow | null | undefined): TrainingAvailability {
  if (!row) return defaultTrainingAvailability;
  return {
    availableDays: Array.isArray(row.available_days) ? row.available_days.filter((day): day is string => typeof day === 'string') : [],
    preferredTrainingTime: row.preferred_training_time,
    maxSessionMinutes: fromNullableNumber(row.max_session_minutes),
    canDoubleSession: row.double_session_available,
    minHoursBetweenSessions: fromNullableNumber(row.min_hours_between_sessions),
    scheduleNotes: row.agenda_notes,
  };
}

function mapEquipment(row: EquipmentRow | null | undefined): EquipmentAvailability {
  if (!row) return defaultEquipmentAvailability;
  const equipment = typeof row.equipment === 'object' && row.equipment !== null && !Array.isArray(row.equipment)
    ? (row.equipment as Partial<Record<keyof EquipmentAvailability, unknown>>)
    : {};

  return {
    skiErg: equipment.skiErg === true,
    rowErg: equipment.rowErg === true,
    bikeErg: equipment.bikeErg === true,
    assaultBike: equipment.assaultBike === true,
    sled: equipment.sled === true,
    wallBall: equipment.wallBall === true,
    sandbag: equipment.sandbag === true,
    kettlebells: equipment.kettlebells === true,
    dumbbells: equipment.dumbbells === true,
    barbellAndPlates: equipment.barbellAndPlates === true,
    treadmill: equipment.treadmill === true,
    runningSpace: equipment.runningSpace === true,
    plyoBox: equipment.plyoBox === true,
  };
}

function mapInjury(row: InjuryRow): Injury {
  return {
    id: row.injury_id,
    body_area: row.body_area,
    side: row.side,
    pain_level_0_10: fromNullableNumber(row.pain_level_0_10),
    status: row.status,
    started_at: fromNullableDate(row.started_at),
    resolved_at: fromNullableDate(row.resolved_at),
    movement_restrictions: row.movement_restrictions,
    notes: row.notes,
  };
}

function mapNutrition(row: NutritionRow | null | undefined): NutritionPreferences {
  if (!row) return defaultNutritionPreferences;
  const diet = preserveLegacyOption(row.diet_type, DIET_VALUES);
  return {
    goal: row.goal,
    dietType: diet.value,
    dietTypeLegacy: diet.legacy,
    allergies: row.allergies,
    intolerances: row.intolerances,
    caffeineTolerance: row.caffeine_tolerance,
    fastedTrainingPreference: row.fasted_training_preference,
    mealTiming: row.usual_meal_times,
    supplements: row.supplements,
    notes: row.notes,
  };
}

export async function getAthleteStateFromSupabase(userId: string): Promise<AthleteState | null> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase no está configurado.');

  const [profileResult, metricsResult, availabilityResult, equipmentResult, injuriesResult, nutritionResult] = await Promise.all([
    client.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    client.from('athlete_metrics').select('*').eq('user_id', userId).maybeSingle(),
    client.from('athlete_availability').select('*').eq('user_id', userId).maybeSingle(),
    client.from('athlete_equipment').select('*').eq('user_id', userId).maybeSingle(),
    client.from('injuries').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    client.from('nutrition_preferences').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  const readError = profileResult.error || metricsResult.error || availabilityResult.error || equipmentResult.error || injuriesResult.error || nutritionResult.error;
  if (readError) {
    warnSupabaseError('No se pudo leer el estado del atleta', readError);
    throw readError;
  }

  const hasAnyRemoteState = Boolean(
    profileResult.data || metricsResult.data || availabilityResult.data || equipmentResult.data || (injuriesResult.data?.length ?? 0) > 0 || nutritionResult.data,
  );
  if (!hasAnyRemoteState) return null;

  return {
    profile: mapProfile(profileResult.data),
    physiology: mapMetrics(metricsResult.data),
    availability: mapAvailability(availabilityResult.data),
    equipment: mapEquipment(equipmentResult.data),
    injuries: (injuriesResult.data ?? []).map(mapInjury),
    nutrition: mapNutrition(nutritionResult.data),
  };
}

export async function saveAthleteStateToSupabase(userId: string, state: AthleteState): Promise<void> {
  const validation = validateAthleteState(state); if (!validation.ok) throw new Error(validation.issues[0]?.message ?? 'Datos del atleta no válidos.');
  state = validation.value;
  const client = getSupabaseClient();
  if (!client) return;

  const results = await Promise.all([
    client.from('profiles').upsert(
      {
        user_id: userId,
        name: state.profile.name,
        birth_date: toNullableDate(state.profile.birthDate),
        height_cm: toNullableNumber(state.profile.heightCm),
        weight_kg: toNullableNumber(state.profile.weightKg),
        sex: state.profile.sex || null,
        hyrox_category: state.profile.hyroxCategory,
        target_race_date: toNullableDate(state.profile.targetDate),
        main_goal: state.profile.mainGoal,
        target_time: state.profile.targetTime ?? '',
        onboarding_completed: state.profile.onboardingCompleted === true,
        onboarding_completed_at: state.profile.onboardingCompletedAt || null,
      },
      { onConflict: 'user_id' },
    ),
    client.from('athlete_metrics').upsert(
      {
        user_id: userId,
        resting_hr_baseline: toNullableNumber(state.physiology.restingHrBaseline),
        resting_hr_today: toNullableNumber(state.physiology.restingHrToday),
        max_hr: toNullableNumber(state.physiology.maxHr),
        lthr: toNullableNumber(state.physiology.lthr),
        rftp: state.physiology.rftp,
        z2_pace_low: state.physiology.z2PaceLow,
        z2_pace_high: state.physiology.z2PaceHigh,
        five_k_pace: state.physiology.fiveKPace,
        ten_k_pace: state.physiology.tenKPace,
        hrv_baseline: toNullableNumber(state.physiology.hrvBaseline),
        current_running_volume_km: toNullableNumber(state.physiology.currentRunningVolumeKm),
        current_long_run_km: toNullableNumber(state.physiology.currentLongRunKm),
        hyrox_experience: state.physiology.hyroxExperience ?? '',
        strength_experience: state.physiology.strengthExperience ?? '',
      },
      { onConflict: 'user_id' },
    ),
    client.from('athlete_availability').upsert(
      {
        user_id: userId,
        available_days: state.availability.availableDays,
        preferred_training_time: state.availability.preferredTrainingTime,
        max_session_minutes: toNullableNumber(state.availability.maxSessionMinutes),
        double_session_available: state.availability.canDoubleSession,
        min_hours_between_sessions: toNullableNumber(state.availability.minHoursBetweenSessions),
        agenda_notes: state.availability.scheduleNotes,
      },
      { onConflict: 'user_id' },
    ),
    client.from('athlete_equipment').upsert(
      {
        user_id: userId,
        equipment: { ...state.equipment } as Json,
      },
      { onConflict: 'user_id' },
    ),
    client.from('nutrition_preferences').upsert(
      {
        user_id: userId,
        goal: state.nutrition.goal,
        diet_type: state.nutrition.dietType,
        allergies: state.nutrition.allergies,
        intolerances: state.nutrition.intolerances,
        caffeine_tolerance: state.nutrition.caffeineTolerance,
        fasted_training_preference: state.nutrition.fastedTrainingPreference,
        usual_meal_times: state.nutrition.mealTiming,
        supplements: state.nutrition.supplements ?? '',
        notes: state.nutrition.notes,
      },
      { onConflict: 'user_id' },
    ),
  ]);

  const upsertError = results.find((result) => result.error)?.error;
  if (upsertError) {
    warnSupabaseError('No se pudo guardar el estado del atleta', upsertError);
    throw upsertError;
  }

  const deleteResult = await client.from('injuries').delete().eq('user_id', userId);
  if (deleteResult.error) {
    warnSupabaseError('No se pudieron reemplazar las lesiones', deleteResult.error);
    throw deleteResult.error;
  }

  if (state.injuries.length === 0) return;

  const insertResult = await client.from('injuries').insert(
    state.injuries.map((injury) => ({
      user_id: userId,
      injury_id: injury.id,
      body_area: injury.body_area,
      side: injury.side,
      pain_level_0_10: toNullableNumber(injury.pain_level_0_10),
      status: injury.status,
      started_at: toNullableDate(injury.started_at),
      resolved_at: toNullableDate(injury.resolved_at),
      movement_restrictions: injury.movement_restrictions,
      notes: injury.notes,
    })),
  );

  if (insertResult.error) {
    warnSupabaseError('No se pudieron guardar las lesiones', insertResult.error);
    throw insertResult.error;
  }
}
