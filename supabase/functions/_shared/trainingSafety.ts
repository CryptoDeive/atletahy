export type TrainingSafetyLevel = 'green' | 'yellow' | 'red';
export type TrainingSafetyAssessment = { level: TrainingSafetyLevel; reasons: string[] };

type ReadinessLike = Record<string, unknown> | null | undefined;
type InjuryLike = { status?: unknown; pain_level_0_10?: unknown; movement_restrictions?: unknown };

const numberValue = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;

export function evaluateTrainingSafety({ dailyReadiness, injuries = [] }: { dailyReadiness: ReadinessLike; injuries?: InjuryLike[] }): TrainingSafetyAssessment {
  const reasons: string[] = [];
  const pain = numberValue(dailyReadiness?.pain0To10);
  const severeInjury = injuries.some((injury) => injury.status !== 'resolved' && ((numberValue(injury.pain_level_0_10) ?? 0) >= 7 || String(injury.movement_restrictions ?? '').trim().length > 0));
  if ((pain ?? 0) >= 7) reasons.push('Dolor diario alto');
  if (severeInjury) reasons.push('Lesión activa severa o con restricción de movimiento');
  if (reasons.length) return { level: 'red', reasons };

  const yellowSignals = [
    ['Fatiga alta', numberValue(dailyReadiness?.fatigue1To5), 4],
    ['Estrés alto', numberValue(dailyReadiness?.stress1To5), 4],
    ['Dolor moderado', pain, 4],
  ] as const;
  for (const [label, value, threshold] of yellowSignals) if ((value ?? 0) >= threshold) reasons.push(label);
  const sleep = numberValue(dailyReadiness?.sleepHours);
  if (sleep !== null && sleep < 6) reasons.push('Sueño insuficiente');
  if (injuries.some((injury) => injury.status === 'active')) reasons.push('Lesión activa');
  return { level: reasons.length ? 'yellow' : 'green', reasons };
}

export function applyCoachSafetyOverrides<T extends Record<string, any>>(advice: T, assessment: TrainingSafetyAssessment): T {
  if (assessment.level === 'green') return advice;
  const red = assessment.level === 'red';
  const warning = red
    ? `Seguridad: ${assessment.reasons.join(', ')}. Prioriza descanso o actividad muy suave y consulta a un profesional si persiste.`
    : `Seguridad: ${assessment.reasons.join(', ')}. Reduce carga y evita buscar récords o encadenar intensidad.`;
  if (red) return {
    ...advice,
    readinessStatus: 'red',
    summary: 'Las señales actuales requieren recuperación y una nueva valoración antes de retomar la carga.',
    objective: 'Priorizar descanso o movilidad indolora muy suave.',
    strategy: ['Descansa y reevalúa dolor, fatiga y restricciones antes de volver a entrenar.'],
    pacing: ['No se prescribe ritmo ni esfuerzo mientras persistan las señales de riesgo.'],
    techniqueFocus: ['Realiza solo movimientos cómodos y sin dolor, si decides hacer movilidad.'],
    warmupAdjustments: ['Omite el calentamiento deportivo; limita la actividad a movilidad muy suave e indolora.'],
    riskWarnings: [warning],
    modifications: [{ condition: assessment.reasons.join(', '), recommendation: 'Descanso o movilidad muy suave; sin carga deportiva.', keepOriginalIntent: false }],
    nutrition: {
      preWorkout: ['No necesitas preparación nutricional específica para descansar.'],
      intraWorkout: ['Mantén hidratación normal.'],
      postWorkout: ['Mantén una alimentación regular y suficiente.'],
      hydration: ['Bebe según sed y condiciones ambientales.'],
    },
    scheduling: {
      bestTimeWindow: 'any',
      reason: 'No se programa una sesión deportiva hasta reevaluar las señales de riesgo.',
      doubleSessionRecommended: false,
    },
    checklist: ['Reevalúa los síntomas antes de entrenar.', 'Consulta a un profesional si el dolor o la restricción persisten.'],
  } as T;

  return {
    ...advice,
    readinessStatus: 'yellow',
    summary: 'Las señales actuales aconsejan una sesión conservadora y de carga reducida.',
    objective: 'Mantener movimiento de calidad con esfuerzo cómodo y volumen reducido.',
    strategy: ['Realiza una sola sesión controlada y termina con sensación de margen.'],
    pacing: ['Usa un ritmo cómodo que permita hablar y reduce más si empeoran las sensaciones.'],
    techniqueFocus: ['Prioriza movimientos estables, fluidos y sin dolor.'],
    warmupAdjustments: ['Amplía la entrada progresiva y detente si las sensaciones no mejoran.'],
    riskWarnings: [`Seguridad: ${assessment.reasons.join(', ')}. Reduce la carga y reevalúa durante la sesión.`],
    modifications: [{ condition: assessment.reasons.join(', '), recommendation: 'Reduce el volumen al menos un 20% y mantén un esfuerzo cómodo.', keepOriginalIntent: false }],
    nutrition: {
      preWorkout: ['Mantén una comida habitual y fácil de digerir.'],
      intraWorkout: ['Agua según sed durante la sesión reducida.'],
      postWorkout: ['Prioriza una comida completa y recuperación suficiente.'],
      hydration: ['Llega hidratado y ajusta según el ambiente.'],
    },
    scheduling: {
      bestTimeWindow: 'any',
      doubleSessionRecommended: false,
      reason: 'Hoy conviene una sola sesión reducida en el momento con mejores sensaciones.',
    },
    checklist: ['Comprueba tus sensaciones al empezar.', 'Reduce o termina la sesión si empeoran dolor o fatiga.'],
  } as T;
}

export function applyPlanSafetyOverrides<T extends Record<string, any>>(plan: T, assessment: TrainingSafetyAssessment): T {
  if (assessment.level === 'green') return plan;
  const red = assessment.level === 'red';
  if (red) return {
    ...plan,
    title: 'Plan temporal de recuperación',
    objective: 'Priorizar descanso y movilidad indolora muy suave hasta una nueva valoración.',
    assumptions: [`Safety override red: ${assessment.reasons.join(', ')}.`],
    nutritionNotes: ['Mantén hidratación y alimentación regulares durante la recuperación.'],
    weeks: (plan.weeks ?? []).map((week: any) => ({
      ...week,
      focus: 'Recuperación y reevaluación',
      notes: ['No retomes carga deportiva hasta reevaluar las señales de riesgo.'],
      days: (week.days ?? []).map((day: any) => {
        const rest = day.sessionType === 'rest';
        const duration = Math.min(typeof day.estimatedDurationMinutes === 'number' ? day.estimatedDurationMinutes : 20, 20);
        return {
          ...day,
          title: rest ? 'Descanso y recuperación' : 'Movilidad muy suave opcional',
          sessionType: rest ? 'rest' : 'mobility',
          objective: rest ? 'Descansar y reevaluar las señales de riesgo.' : 'Moverse de forma cómoda, suave e indolora.',
          estimatedDurationMinutes: duration,
          intensity: rest ? 'rest' : 'low',
          sections: [{
            title: rest ? 'Descanso' : 'Movilidad indolora',
            type: rest ? 'recovery' : 'mobility',
            durationMinutes: duration,
            description: rest ? 'Descanso completo o paseo cómodo solo si no hay dolor.' : 'Movilidad cómoda sin carga y sin provocar dolor.',
            exercises: [rest ? 'Descanso o paseo cómodo opcional' : 'Movilidad suave dentro de un rango indoloro'],
            intensity: 'Muy suave',
            notes: ['Detente si aparece o aumenta el dolor.'],
          }],
          notes: ['Reevalúa los síntomas antes de retomar el entrenamiento.'],
          nutritionNotes: ['Mantén hidratación normal.'],
          adaptationOptions: ['Elige descanso completo si hay dolor o restricción.'],
        };
      }),
    })),
  } as T;

  return {
    ...plan,
    title: 'Plan adaptado de carga reducida',
    objective: 'Mantener actividad segura con esfuerzo cómodo y volumen reducido.',
    assumptions: [`Safety override yellow: ${assessment.reasons.join(', ')}.`],
    nutritionNotes: ['Mantén hidratación y alimentación regulares para favorecer la recuperación.'],
    weeks: (plan.weeks ?? []).map((week: any) => ({
      ...week,
      focus: 'Carga reducida y técnica controlada',
      notes: ['Completa una sola sesión al día y reduce más si empeoran las sensaciones.'],
      days: (week.days ?? []).map((day: any) => {
        const rest = day.sessionType === 'rest';
        const originalDuration = typeof day.estimatedDurationMinutes === 'number' ? day.estimatedDurationMinutes : 20;
        const duration = rest ? Math.min(originalDuration, 20) : Math.max(0, Math.floor(originalDuration * 0.8));
        return {
          ...day,
          title: rest ? 'Descanso y recuperación' : 'Sesión controlada y reducida',
          objective: rest ? 'Facilitar la recuperación.' : 'Mantener movimiento de calidad con esfuerzo cómodo.',
          estimatedDurationMinutes: duration,
          intensity: rest ? 'rest' : day.intensity === 'low' ? 'low' : 'moderate',
          sections: [{
            title: rest ? 'Descanso' : 'Trabajo técnico controlado',
            type: rest ? 'recovery' : 'main',
            durationMinutes: duration,
            description: rest ? 'Descanso completo o paseo cómodo opcional.' : 'Trabajo sencillo, estable y con margen suficiente.',
            exercises: [rest ? 'Descanso o paseo cómodo' : 'Movimientos técnicos cómodos y controlados'],
            intensity: rest ? 'Muy suave' : 'Suave o moderada cómoda',
            notes: ['Reduce o termina si empeoran las sensaciones.'],
          }],
          notes: ['Realiza solo una sesión y prioriza la recuperación.'],
          nutritionNotes: ['Mantén hidratación normal.'],
          adaptationOptions: ['Reduce más el volumen o descansa si no mejoras durante la entrada progresiva.'],
        };
      }),
    })),
  } as T;
}
