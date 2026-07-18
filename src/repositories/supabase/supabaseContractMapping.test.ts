import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Supabase repository contract mapping', () => {
  it('maps athlete repository fields to the exact Supabase contract columns', () => {
    const source = readSource('src/repositories/supabase/supabaseAthleteRepository.ts');

    for (const column of [
      'target_race_date',
      'double_session_available',
      'agenda_notes',
      'equipment',
      'started_at',
      'resolved_at',
      'usual_meal_times',
    ]) {
      expect(source).toContain(column);
    }

    for (const oldColumn of ['target_date', 'can_double_session', 'schedule_notes', 'meal_timing', 'ski_erg']) {
      expect(source).not.toContain(oldColumn);
    }
  });

  it('maps readiness, workout log, and coach advice fields to exact Supabase columns', () => {
    const readiness = readSource('src/repositories/supabase/supabaseReadinessRepository.ts');
    const workoutLogs = readSource('src/repositories/supabase/supabaseWorkoutLogRepository.ts');
    const coachAdvice = readSource('src/repositories/supabase/supabaseCoachAdviceRepository.ts');
    const databaseTypes = readSource('src/types/database.ts');

    for (const column of ['sleep_quality_1_5', 'stress_1_5', 'pain_0_10', 'resting_hr', 'hrv']) {
      expect(readiness + databaseTypes).toContain(column);
    }

    for (const column of ['training_week_id', 'training_day_id', 'session_rpe', 'avg_hr', 'completed_percentage', 'what_went_well', 'what_went_wrong', 'started_at', 'finished_at', 'calories']) {
      expect(workoutLogs + databaseTypes).toContain(column);
    }

    for (const column of ['model', 'input_snapshot_json', 'advice_json', 'was_useful', 'user_feedback', 'generated_at']) {
      expect(coachAdvice + databaseTypes).toContain(column);
    }

    expect(readiness + workoutLogs + coachAdvice + databaseTypes).not.toContain('_1_to_5');
    expect(readiness + databaseTypes).not.toContain('pain_0_to_10');
    expect(workoutLogs + databaseTypes).not.toContain('row.week_id');
    expect(workoutLogs + databaseTypes).not.toContain('row.day_id');
    expect(workoutLogs + databaseTypes).not.toContain('\n  week_id:');
    expect(workoutLogs + databaseTypes).not.toContain('\n  day_id:');
    expect(workoutLogs + databaseTypes).not.toContain('session_rpe_1_to_10');
    expect(coachAdvice + databaseTypes).not.toContain('select(\'advice\')');
    expect(coachAdvice + databaseTypes).not.toContain('\n  advice:');
  });
});
