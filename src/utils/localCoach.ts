import type { CoachAdvice, CoachAdviceInput, ReadinessStatus } from '../types/coach';
import type { EquipmentAvailability, Injury, TrainingAvailability } from '../types/athlete';
import type { TrainingDay } from '../types/training';

type WorkoutKind = 'jim-vance-test' | 'strength' | 'z2' | 'vo2max' | 'engine' | 'rest' | 'metcon' | 'hyrox' | 'general';

function asNumber(value: number | '' | undefined | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function dayText(day: TrainingDay) {
  const sectionText = day.sections
    .flatMap((section) => [
      section.type,
      section.title,
      section.description,
      ...(section.lines ?? []),
      ...(section.notes ?? []),
      ...(section.blocks ?? []).flatMap((block) => [block.title, block.subtitle, ...(block.lines ?? []), ...(block.notes ?? [])]),
    ])
    .filter(Boolean)
    .join(' ');

  return `${day.title} ${day.summary} ${sectionText}`.toLowerCase();
}

function primaryWorkoutText(day: TrainingDay) {
  const sectionHeaders = day.sections
    .flatMap((section) => [section.type, section.title, section.description])
    .filter(Boolean)
    .join(' ');

  return `${day.title} ${sectionHeaders}`.toLowerCase();
}

function isRestDaySignal(primaryText: string) {
  return /\b(descanso|recovery|recuperaci[oó]n|movilidad|mobility)\b/.test(primaryText);
}

function detectWorkoutKind(day: TrainingDay): WorkoutKind {
  const text = dayText(day);
  const primaryText = primaryWorkoutText(day);

  if (primaryText.includes('jim vance') || text.includes('jim vance')) return 'jim-vance-test';
  if (primaryText.includes('vo₂') || primaryText.includes('vo2') || primaryText.includes('interval') || text.includes('vo₂') || text.includes('vo2') || text.includes('interval')) return 'vo2max';
  if (primaryText.includes('hyrox') || text.includes('hyrox')) return 'hyrox';
  if (primaryText.includes('metcon') || primaryText.includes('for time') || primaryText.includes('emom') || text.includes('metcon') || text.includes('for time') || text.includes('emom')) return 'metcon';
  if (primaryText.includes('z2') || primaryText.includes('zona 2') || primaryText.includes('rodaje') || primaryText.includes('capacidad aeróbica') || text.includes('z2') || text.includes('zona 2') || text.includes('rodaje') || text.includes('capacidad aeróbica')) return 'z2';
  if (primaryText.includes('engine') || primaryText.includes('skierg') || primaryText.includes('rowerg') || primaryText.includes('bikeerg') || text.includes('engine') || text.includes('skierg') || text.includes('rowerg') || text.includes('bikeerg')) return 'engine';
  if (primaryText.includes('fuerza') || primaryText.includes('strength') || primaryText.includes('press') || primaryText.includes('squat') || text.includes('fuerza') || text.includes('strength') || text.includes('press') || text.includes('squat')) return 'strength';
  if (isRestDaySignal(primaryText)) return 'rest';

  return 'general';
}

function isIntense(kind: WorkoutKind) {
  return ['jim-vance-test', 'vo2max', 'engine', 'metcon', 'hyrox'].includes(kind);
}

function isRunningRelated(kind: WorkoutKind, day: TrainingDay) {
  const text = dayText(day);
  return kind === 'z2' || kind === 'jim-vance-test' || text.includes('run') || text.includes('carrera') || text.includes('rodaje');
}

function injuryAreaMatchesWorkout(injury: Injury, kind: WorkoutKind, day: TrainingDay) {
  const area = injury.body_area.toLowerCase();
  const text = dayText(day);
  const lowerBody = /rodilla|tobillo|pie|cadera|gemelo|isquio|cuádriceps|pierna/.test(area);
  const upperBody = /hombro|codo|muñeca|espalda|pecho|brazo/.test(area);

  if (lowerBody && (isRunningRelated(kind, day) || /squat|lunge|sled|box|run|burpee|jump/.test(text))) return true;
  if (upperBody && (kind === 'strength' || /press|pull|ski|wall ball|snatch|push/.test(text))) return true;
  return text.includes(area) && area.length > 2;
}

function getStatusLabel(status: ReadinessStatus) {
  if (status === 'green') return 'Verde';
  if (status === 'yellow') return 'Amarillo';
  return 'Rojo';
}

function preferredTimeWindow(preferredTrainingTime: string): CoachAdvice['scheduling']['bestTimeWindow'] {
  const value = preferredTrainingTime.toLowerCase();
  if (value.includes('mañ') || value.includes('man') || value.includes('morning')) return 'morning';
  if (value.includes('medio') || value.includes('mediod') || value.includes('midday')) return 'midday';
  if (value.includes('tarde') || value.includes('afternoon')) return 'afternoon';
  if (value.includes('noche') || value.includes('evening')) return 'evening';
  return 'any';
}

function equipmentWarnings(equipment: EquipmentAvailability, kind: WorkoutKind, text: string) {
  const warnings: string[] = [];
  if (text.includes('skierg') && !equipment.skiErg) warnings.push('No tienes SkiErg marcado: sustituye por RowErg/BikeErg suave manteniendo el estímulo aeróbico.');
  if (text.includes('rowerg') && !equipment.rowErg) warnings.push('No tienes RowErg marcado: cambia por SkiErg, BikeErg o carrera controlada.');
  if ((text.includes('bikeerg') || text.includes('assault')) && !equipment.bikeErg && !equipment.assaultBike) warnings.push('No tienes bici marcada: usa ergómetro disponible y controla RPE.');
  if (text.includes('run') && !equipment.runningSpace && !equipment.treadmill) warnings.push('Sin espacio de carrera/cinta: reemplaza el bloque de carrera por ergómetro.');
  if ((kind === 'hyrox' || text.includes('sled')) && !equipment.sled) warnings.push('Sin trineo marcado: sustituye empujes por farmer carry pesado o bike/row con resistencia.');
  return warnings;
}

function shouldDoubleSession(kind: WorkoutKind, status: ReadinessStatus, availability: TrainingAvailability) {
  const enoughGap = (asNumber(availability.minHoursBetweenSessions) ?? 6) >= 6;
  const enoughTime = (asNumber(availability.maxSessionMinutes) ?? 0) >= 75;
  return status === 'green' && availability.canDoubleSession && enoughGap && enoughTime && ['engine', 'hyrox', 'metcon', 'strength'].includes(kind);
}

function determineReadiness(input: CoachAdviceInput, kind: WorkoutKind): { status: ReadinessStatus; reasons: string[]; matchedInjury: boolean } {
  const readiness = input.dailyReadiness;
  const sleep = asNumber(readiness?.sleepHours);
  const stress = asNumber(readiness?.stress1To5);
  const fatigue = asNumber(readiness?.fatigue1To5);
  const pain = asNumber(readiness?.pain0To10);
  const legSoreness = asNumber(readiness?.legSoreness1To5);
  const upperSoreness = asNumber(readiness?.upperSoreness1To5);
  const reasons: string[] = [];
  let matchedInjury = false;

  const severeInjury = input.activeInjuries.find((injury) => (asNumber(injury.pain_level_0_10) ?? 0) >= 7);
  const relevantInjury = input.activeInjuries.find((injury) => injuryAreaMatchesWorkout(injury, kind, input.activeWorkout.day));
  matchedInjury = Boolean(relevantInjury);

  if ((pain ?? 0) >= 7) reasons.push('dolor diario ≥ 7/10');
  if (severeInjury) reasons.push(`lesión activa con dolor ≥ 7/10 en ${severeInjury.body_area}`);
  if (sleep !== null && sleep < 5) reasons.push('sueño < 5 h');
  if ((fatigue ?? 0) >= 5 && (stress ?? 0) >= 4) reasons.push('fatiga 5/5 con estrés alto');
  if (isIntense(kind) && relevantInjury && (asNumber(relevantInjury.pain_level_0_10) ?? 0) >= 4) reasons.push(`entrenamiento intenso con dolor relevante en ${relevantInjury.body_area}`);

  if (reasons.length > 0) return { status: 'red', reasons, matchedInjury };

  if (sleep !== null && sleep >= 5 && sleep <= 6.5) reasons.push('sueño entre 5 y 6.5 h');
  if ((stress ?? 0) >= 4) reasons.push('estrés alto');
  if ((fatigue ?? 0) >= 4) reasons.push('fatiga alta');
  if (pain !== null && pain >= 4 && pain <= 6) reasons.push('dolor moderado');
  if ((legSoreness ?? 0) >= 4 && ['z2', 'vo2max', 'engine', 'hyrox', 'metcon', 'jim-vance-test'].includes(kind)) reasons.push('agujetas altas de piernas para carrera/engine');
  if ((upperSoreness ?? 0) >= 4 && kind === 'strength') reasons.push('agujetas altas de tren superior para fuerza');
  if (relevantInjury) reasons.push(`lesión activa relevante en ${relevantInjury.body_area}`);

  if (reasons.length > 0) return { status: 'yellow', reasons, matchedInjury };

  return { status: 'green', reasons: ['sueño/estrés/fatiga/dolor dentro de rango'], matchedInjury };
}

function baseAdvice(input: CoachAdviceInput, kind: WorkoutKind, status: ReadinessStatus, reasons: string[]): CoachAdvice {
  const isRed = status === 'red';
  const isYellow = status === 'yellow';
  const bestTimeWindow = preferredTimeWindow(input.availability.preferredTrainingTime);
  const text = dayText(input.activeWorkout.day);
  const doubleSessionRecommended = !isRed && shouldDoubleSession(kind, status, input.availability);
  const minimumHoursBetween = asNumber(input.availability.minHoursBetweenSessions) ?? 6;

  const advice: CoachAdvice = {
    readinessStatus: status,
    summary: `Estado ${getStatusLabel(status)}: ${reasons.join(', ')}. Ajuste local basado en check-in, lesiones y sesión del día.`,
    objective: 'Ejecutar la sesión manteniendo intención y calidad técnica.',
    strategy: [],
    pacing: [],
    techniqueFocus: ['Respiración estable, postura alta y transiciones sin prisa innecesaria.'],
    warmupAdjustments: ['Haz un calentamiento progresivo y valida dolor/RPE antes del bloque principal.'],
    riskWarnings: [],
    modifications: [],
    nutrition: {
      preWorkout: ['Prioriza comida digerible 2-3 h antes si la sesión es intensa o larga.'],
      intraWorkout: ['Agua a sorbos; añade carbohidrato si la sesión supera 75-90 min.'],
      postWorkout: ['Proteína y carbohidratos en las 2 h posteriores para recuperar.'],
      hydration: ['Llega con orina clara y añade sales si hace calor o sudas mucho.'],
    },
    scheduling: {
      bestTimeWindow,
      reason: bestTimeWindow === 'any' ? 'No hay preferencia horaria registrada; elige la ventana con menos estrés.' : 'Basado en tu horario preferido de Mi cuenta.',
      doubleSessionRecommended,
      ...(doubleSessionRecommended
        ? {
            doubleSessionPlan: {
              session1: kind === 'strength' ? 'Fuerza principal' : 'Bloque endurance/técnico',
              session2: kind === 'strength' ? 'Metcon suave o movilidad' : 'Fuerza/técnica complementaria sin ir a fallo',
              minimumHoursBetween,
            },
          }
        : {}),
    },
    checklist: ['Revisar material disponible', 'Registrar RPE y notas al terminar', 'Parar si aparece dolor agudo o creciente'],
  };

  if (isRed) {
    advice.strategy.push('No busques intensidad: cambia el objetivo a recuperar y moverte sin agravar síntomas.');
    advice.pacing.push('RPE 2-4, sin tramos máximos ni competición contra marcas.');
    advice.warmupAdjustments.push('Sustituye impacto por movilidad o ergómetro suave 15-30 min si no aumenta el dolor.');
    advice.riskWarnings.push('Dolor alto o fatiga extrema: no hagas doble sesión y consulta a un profesional si el dolor es persistente, agudo o empeora.');
    advice.modifications.push({ condition: 'Readiness rojo', recommendation: 'Reducir impacto y cambiar por movilidad, paseo o ergómetro suave.', keepOriginalIntent: false });
    advice.scheduling.doubleSessionRecommended = false;
    delete advice.scheduling.doubleSessionPlan;
  } else if (isYellow) {
    advice.strategy.push('Mantén la intención del día, pero baja volumen 10-25% y evita buscar marca.');
    advice.pacing.push('Controla RPE; si se dispara pronto, recorta repeticiones o descansos agresivos.');
    advice.warmupAdjustments.push('Amplía calentamiento 5-10 min con movilidad específica y progresiones submáximas.');
    advice.riskWarnings.push('No dobles sesión salvo movilidad o aeróbico muy suave separado.');
    advice.modifications.push({ condition: 'Readiness amarillo', recommendation: 'Conserva el estímulo, reduce volumen/carga y deja 2-3 reps en recámara.', keepOriginalIntent: true });
    advice.scheduling.doubleSessionRecommended = false;
    delete advice.scheduling.doubleSessionPlan;
  } else {
    advice.strategy.push('Ejecuta el plan respetando pacing y técnica; no conviertas el calentamiento en competición.');
    advice.pacing.push('Progresivo: empieza controlado, estabiliza y aprieta solo si mantienes técnica.');
  }

  input.activeInjuries.forEach((injury) => {
    const pain = asNumber(injury.pain_level_0_10);
    const label = `${injury.body_area}${injury.side ? ` ${injury.side}` : ''}`.trim();
    advice.riskWarnings.push(`Lesión activa: ${label || 'zona sin especificar'}${pain !== null ? ` (${pain}/10)` : ''}.`);
    advice.modifications.push({
      condition: `Lesión activa ${label || 'sin zona'}`,
      recommendation: injury.movement_restrictions || 'Evita movimientos que reproduzcan dolor y reduce rango/carga.',
      keepOriginalIntent: pain === null || pain < 7,
    });
  });

  advice.riskWarnings.push(...equipmentWarnings(input.equipment, kind, text));

  if (input.nutrition.caffeineTolerance) {
    advice.nutrition.caffeine = `Cafeína: úsala solo si la toleras (${input.nutrition.caffeineTolerance}) y no compromete sueño/ansiedad.`;
  }

  return advice;
}

export function generateLocalCoachAdvice(input: CoachAdviceInput): CoachAdvice {
  const kind = detectWorkoutKind(input.activeWorkout.day);
  const { status, reasons } = determineReadiness(input, kind);
  const advice = baseAdvice(input, kind, status, reasons);

  switch (kind) {
    case 'jim-vance-test':
      advice.objective = 'Estimar umbral, rFTP y LTHR con un esfuerzo máximo sostenible de 30 minutos.';
      advice.strategy.unshift('Calienta completo, no salgas a tope los primeros 10 min, sostén máxima intensidad controlable y pulsa LAP antes de los 30 min.');
      advice.pacing = ['0-10 min: fuerte controlado.', '10-25 min: estabiliza ritmo y respiración.', '25-30 min: aprieta si queda margen sin romper técnica.'];
      advice.nutrition.preWorkout = ['Come 2-3 h antes con carbohidrato fácil de digerir.', 'Evita fibra y grasa altas antes del test.'];
      advice.nutrition.hydration.push('Hidrátate antes del calentamiento; no llegues con sed.');
      advice.nutrition.caffeine = input.nutrition.caffeineTolerance ? 'Cafeína solo si ya la toleras bien en tests intensos.' : undefined;
      advice.scheduling.doubleSessionRecommended = false;
      delete advice.scheduling.doubleSessionPlan;
      break;
    case 'strength':
      advice.objective = 'Producir fuerza sin comprometer técnica ni rangos seguros.';
      advice.strategy.unshift('Prioriza series principales, respeta RIR/RPE y no compitas los accesorios.');
      advice.warmupAdjustments.unshift('Añade series progresivas de aproximación y movilidad específica de las articulaciones implicadas.');
      advice.techniqueFocus.unshift('Bracing sólido, tempo controlado y repeticiones limpias antes que más carga.');
      break;
    case 'z2':
      advice.objective = 'Acumular tiempo aeróbico sin deriva excesiva de frecuencia cardiaca.';
      advice.strategy.unshift('No compitas el rodaje; busca continuidad y respiración estable.');
      advice.pacing = ['Controla FC/RPE; si la FC sube, baja ritmo aunque el pace parezca fácil.', 'Mantén conversación corta posible y evita cambios bruscos.'];
      advice.nutrition.intraWorkout.unshift('Si dura 60 min o más, valora sales y agua planificada.');
      advice.scheduling.doubleSessionRecommended = false;
      delete advice.scheduling.doubleSessionPlan;
      break;
    case 'vo2max':
      advice.objective = 'Completar trabajo de alta intensidad controlada manteniendo calidad de repeticiones.';
      advice.strategy.unshift('Mantén calidad en cada repetición y no te quemes al inicio.');
      advice.riskWarnings.push('Si sueño malo o estrés alto, reduce repeticiones antes de forzar intensidad.');
      break;
    case 'engine':
    case 'hyrox':
    case 'metcon':
      advice.objective = 'Sostener rendimiento híbrido bajo fatiga con transiciones limpias.';
      advice.strategy.unshift('No salgas demasiado fuerte; controla respiración y técnica de estaciones.');
      advice.pacing = ['Empieza subumbral.', 'Sostén ritmo medio y transiciones limpias.', 'Aprieta solo al final si no se degrada la técnica.'];
      advice.techniqueFocus.unshift('Estaciones HYROX: rango válido, respiración y economía antes que velocidad caótica.');
      advice.nutrition.preWorkout.unshift('Incluye carbohidratos previos si vas a trabajar fuerte.');
      advice.nutrition.hydration.unshift('Añade sales si hace calor o el bloque es largo.');
      break;
    case 'rest':
      advice.objective = 'Recuperar, asimilar carga y llegar con más energía al siguiente entrenamiento.';
      advice.strategy = ['Movilidad suave, paseo ligero opcional, sueño e hidratación.'];
      advice.pacing = ['RPE 1-2; debe sentirse más fácil que un calentamiento.'];
      advice.riskWarnings.push('No conviertas el descanso en entrenamiento encubierto.');
      advice.scheduling.doubleSessionRecommended = false;
      delete advice.scheduling.doubleSessionPlan;
      break;
    default:
      advice.objective = 'Ejecutar el entrenamiento con intención clara y feedback de RPE/dolor.';
  }

  if (status === 'red') {
    advice.scheduling.doubleSessionRecommended = false;
    delete advice.scheduling.doubleSessionPlan;
  }

  return advice;
}
