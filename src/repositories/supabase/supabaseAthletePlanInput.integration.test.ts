import { describe, expect, it } from 'vitest';
import { buildPlanGenerationInput, validatePlanGenerationInput } from '../../utils/planInput';
import { mapAthleteStateFromRows } from './supabaseAthleteRepository';

describe('Supabase athlete state to Plan IA input', () => {
  it('maps persisted rows into an input accepted by the shared validator', () => {
    const state = mapAthleteStateFromRows({
      profile: {
        name: '', birth_date: null, height_cm: null, weight_kg: null, sex: null,
        hyrox_category: 'women_open', target_race_date: '2026-11-22', main_goal: 'competir',
        target_time: '', onboarding_completed: true, onboarding_completed_at: '2026-07-19T08:00:00.000Z',
      },
      metrics: {
        resting_hr_baseline: null, resting_hr_today: null, max_hr: null, lthr: null,
        rftp: '', z2_pace_low: '', z2_pace_high: '', five_k_pace: '', ten_k_pace: '',
        hrv_baseline: null, current_running_volume_km: null, current_long_run_km: null,
        hyrox_experience: '', strength_experience: '',
      },
      availability: {
        available_days: ['Lunes', 'Miércoles', 'Viernes'], preferred_training_time: 'mañana',
        max_session_minutes: 75, double_session_available: false, min_hours_between_sessions: null, agenda_notes: '',
      },
      equipment: { equipment: {} },
      injuries: [],
      nutrition: {
        goal: 'rendimiento', diet_type: '', allergies: '', intolerances: '', caffeine_tolerance: '',
        fasted_training_preference: '', usual_meal_times: '', supplements: '', notes: '',
      },
    } as never);

    const input = buildPlanGenerationInput({ athleteState: state });
    expect(validatePlanGenerationInput(input)).toBe(true);
    expect(input.nutrition).not.toHaveProperty('dietTypeLegacy');
  });
});
