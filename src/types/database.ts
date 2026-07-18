export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type RowTimestamps = {
  created_at: string;
  updated_at: string;
};

type TableDefinition<Row, Insert = Omit<Row, 'id' | 'created_at' | 'updated_at'> & { id?: string }, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type FunctionDefinition<Args, Returns> = {
  Args: Args;
  Returns: Returns;
};

type MainGoal = 'terminar' | 'mejorar_marca' | 'competir';
type InjuryStatus = 'active' | 'improving' | 'resolved';
type NutritionGoal = 'rendimiento' | 'mantenimiento' | 'perdida_grasa';
type WorkoutLogStatus = 'completado' | 'parcial' | 'saltado' | 'adaptado';

type ProfileRow = RowTimestamps & {
  id: string;
  user_id: string;
  name: string;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  sex: string | null;
  hyrox_category: string;
  target_race_date: string | null;
  main_goal: MainGoal;
  target_time: string;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
};

type ProfileInsert = Partial<RowTimestamps> & {
  id?: string;
  user_id: string;
  name?: string;
  birth_date?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  sex?: string | null;
  hyrox_category?: string;
  target_race_date?: string | null;
  main_goal?: MainGoal;
  target_time?: string;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
};

type MetricsRow = RowTimestamps & {
  id: string;
  user_id: string;
  resting_hr_baseline: number | null;
  resting_hr_today: number | null;
  max_hr: number | null;
  lthr: number | null;
  rftp: string;
  z2_pace_low: string;
  z2_pace_high: string;
  five_k_pace: string;
  ten_k_pace: string;
  hrv_baseline: number | null;
  current_running_volume_km: number | null;
  current_long_run_km: number | null;
  hyrox_experience: string;
  strength_experience: string;
};

type AvailabilityRow = RowTimestamps & {
  id: string;
  user_id: string;
  available_days: Json[];
  preferred_training_time: string;
  max_session_minutes: number | null;
  double_session_available: boolean;
  min_hours_between_sessions: number | null;
  agenda_notes: string;
};

type EquipmentRow = RowTimestamps & {
  id: string;
  user_id: string;
  equipment: Json;
};

type InjuryRow = RowTimestamps & {
  id: string;
  user_id: string;
  injury_id: string;
  body_area: string;
  side: string;
  pain_level_0_10: number | null;
  status: InjuryStatus;
  started_at: string | null;
  resolved_at: string | null;
  movement_restrictions: string;
  notes: string;
};

type NutritionRow = RowTimestamps & {
  id: string;
  user_id: string;
  goal: NutritionGoal;
  diet_type: string;
  allergies: string;
  intolerances: string;
  caffeine_tolerance: string;
  fasted_training_preference: string;
  usual_meal_times: string;
  supplements: string;
  notes: string;
};

type ReadinessRow = RowTimestamps & {
  id: string;
  user_id: string;
  date: string;
  sleep_hours: number | null;
  sleep_quality_1_5: number | null;
  stress_1_5: number | null;
  fatigue_1_5: number | null;
  muscle_soreness_1_5: number | null;
  leg_soreness_1_5: number | null;
  upper_soreness_1_5: number | null;
  motivation_1_5: number | null;
  hydration_1_5: number | null;
  pain_0_10: number | null;
  resting_hr: number | null;
  hrv: number | null;
  pain_location: string;
  notes: string;
};

type WorkoutLogRow = RowTimestamps & {
  id: string;
  user_id: string;
  workout_log_id: string;
  date: string;
  training_week_id: string;
  training_day_id: string;
  status: WorkoutLogStatus;
  started_at: string | null;
  finished_at: string | null;
  duration_minutes: number | null;
  session_rpe: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  calories: number | null;
  completed_percentage: number | null;
  notes: string;
  what_went_well: string;
  what_went_wrong: string;
};



type TrainingPlanRow = RowTimestamps & {
  id: string;
  user_id: string;
  title: string;
  status: string;
  target_race_date: string | null;
  generated_at: string | null;
  input_snapshot_json: Json;
  plan_json: Json;
};

type TrainingPlanInsert = Partial<RowTimestamps> & {
  id?: string;
  user_id: string;
  title: string;
  status?: string;
  target_race_date?: string | null;
  generated_at?: string | null;
  input_snapshot_json?: Json;
  plan_json: Json;
};

type CoachAdviceRow = RowTimestamps & {
  id: string;
  user_id: string;
  advice_key: string;
  model: string;
  input_snapshot_json: Json;
  advice_json: Json;
  was_useful: boolean | null;
  user_feedback: string;
  generated_at: string;
};

type TrainingTestResultRow = RowTimestamps & {
  id: string;
  user_id: string;
  test_id: string;
  performed_at: string;
  result_json: Json;
  calculated_json: Json;
  notes: string | null;
};

type TrainingTestResultInsert = Partial<RowTimestamps> & {
  id?: string;
  user_id: string;
  test_id: string;
  performed_at: string;
  result_json?: Json;
  calculated_json?: Json;
  notes?: string | null;
};

type ConsentEventRow = {
  id: string;
  user_id: string;
  purpose: 'health_data' | 'health_data_ai' | 'legal_terms' | 'adult_declaration';
  granted: boolean;
  policy_version: string;
  recorded_at: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<ProfileRow, ProfileInsert>;
      athlete_metrics: TableDefinition<MetricsRow>;
      athlete_availability: TableDefinition<AvailabilityRow>;
      athlete_equipment: TableDefinition<EquipmentRow>;
      injuries: TableDefinition<InjuryRow>;
      nutrition_preferences: TableDefinition<NutritionRow>;
      daily_readiness: TableDefinition<ReadinessRow>;
      workout_logs: TableDefinition<WorkoutLogRow>;
      coach_advices: TableDefinition<CoachAdviceRow>;
      training_plans: TableDefinition<TrainingPlanRow, TrainingPlanInsert>;
      training_test_results: TableDefinition<TrainingTestResultRow, TrainingTestResultInsert>;
      consent_events: TableDefinition<ConsentEventRow, never, never>;
    };
    Views: Record<string, never>;
    Functions: {
      record_health_consents: FunctionDefinition<{
        p_health_data: boolean;
        p_health_data_ai: boolean;
        p_policy_version: string;
      }, undefined>;
      consume_ai_quota: FunctionDefinition<{
        p_feature: 'coach_advice' | 'training_plan';
      }, { allowed: boolean; remaining: number; retry_after_seconds: number }>;
      save_training_plan_atomic: FunctionDefinition<{
        p_generated_at?: string | null;
        p_input_snapshot_json?: Json;
        p_plan_json: Json;
        p_target_race_date?: string | null;
        p_title: string;
      }, TrainingPlanRow>;
      set_active_training_plan_atomic: FunctionDefinition<{
        p_plan_id: string;
      }, TrainingPlanRow>;
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
