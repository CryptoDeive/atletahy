import type { TrainingDay } from '../types/training';

const baseMeta = {
  dateLabel: 'Semana 6',
  phase: 'PRETEMPORADA',
  block: 'Preparatorio Base',
  weekNumber: 6,
  isCompleted: false,
} as const;

export const trainingWeek: TrainingDay[] = [
  {
    ...baseMeta,
    id: 'monday-z2-mobility',
    weekday: 'Lunes',
    dayNumber: 1,
    title: 'Fuerza básica + Fuerza accesoria + Metcon',
    summary: 'Día de fuerza de tren superior con trabajo principal pesado, accesorios de empuje/tirón y cierre metabólico en ergómetros.',
    sections: [
      {
        id: 'monday-basic-strength',
        type: 'Fuerza',
        title: 'Fuerza básica',
        collapsed: false,
        blocks: [
          {
            id: 'monday-warm-up',
            title: 'Warm-up obligatorio',
            subtitle: '3 rondas for quality',
            lines: ['10 KB Halo @16/12 kg — RPEs 6-7', '10 Elevación “Y” @2x2,5/2 kg', '5 Elevación “O” @2x2,5/2 kg'],
            restAfter: '1’',
          },
          {
            id: 'monday-press',
            title: 'Press vertical',
            subtitle: '4 rondas for quality',
            lines: ['4 Press vertical @95% 5RM — RIR 1 / RPEi 8,5', '8 Push Press WB @9/6 kg'],
            restAfter: '2’',
          },
          {
            id: 'monday-pull-up',
            title: 'Weighted Pull Up',
            subtitle: '4 rondas for quality',
            lines: ['4 / 3 Weighted Pull Up — RIR 1 / RPEi 8,5'],
            restAfter: '2’',
          },
        ],
        notes: [
          'Si no tienes dominada estricta, puedes asistirte con goma para llegar al RPE estimado o trabajar remo tumbado con pies en altura, 4-6 reps, sosteniendo 2” arriba en cada repetición.',
        ],
      },
      {
        id: 'monday-accessory-strength',
        type: 'Fuerza',
        title: 'Fuerza accesoria',
        collapsed: false,
        blocks: [
          {
            id: 'monday-accessory-superset',
            title: 'Superset',
            subtitle: '4 rondas for quality',
            lines: ['8 Press banca inclinado @2xDB — RIR 2 / RPEs 8', '12 Remo tumbado banco inclinado @2xDB — RIR 2 / RPEs 8'],
            restAfter: '2’',
          },
        ],
        notes: ['Los pesos no tienen por qué coincidir entre ejercicios.'],
      },
      {
        id: 'monday-metcon',
        type: 'Metcon',
        title: 'Metcon',
        collapsed: false,
        blocks: [
          {
            id: 'monday-emom',
            title: 'EMOM 16’',
            lines: ['A) 16 / 13 cal Row', 'B) 18 / 15 cal BikeErg', 'C) 16 / 13 cal Ski', 'D) Rest'],
          },
        ],
      },
    ],
  },
  {
    ...baseMeta,
    id: 'tuesday-lower-strength',
    weekday: 'Martes',
    dayNumber: 2,
    title: 'Test Jim Vance',
    summary: 'Test de carrera para estimar umbral funcional, ritmo de umbral y frecuencia cardiaca de umbral. Día exigente, requiere controlar bien el calentamiento y registrar datos.',
    sections: [
      {
        id: 'tuesday-jim-vance-test',
        type: 'Test',
        title: 'Test Jim Vance',
        description: 'El test de Jim Vance busca estimar directamente el umbral a partir del rendimiento del atleta.',
        collapsed: false,
        blocks: [
          {
            id: 'tuesday-warm-up-protocol',
            title: 'Protocolo — calentamiento obligatorio',
            subtitle: '15’ de calentamiento obligatorio',
            lines: ['10’ Easy Run — RPEi 5 / < Z2', '2’ Run — RPEi 7 / + ritmo actual', '3’ Easy Run — RPEi 5 / < Z2'],
          },
          {
            id: 'tuesday-test',
            title: 'Y directo a test — pulsa LAP',
            lines: ['30’ a la máxima intensidad sostenible'],
          },
          {
            id: 'tuesday-records',
            title: 'Se registran',
            lines: ['Ritmo medio de los 30’ → Functional Threshold Pace / rFTP', 'Frecuencia cardiaca media de los últimos 20’ → LTHR'],
          },
          {
            id: 'tuesday-thresholds',
            title: 'Umbrales',
            lines: ['VT2 / MLSS ≈ intensidad media sostenida durante los 30’', 'LTHR = FC media de los últimos 20’'],
          },
          {
            id: 'tuesday-zones',
            title: 'Zonas con frecuencia cardiaca / LTHR',
            lines: ['Z1: <85%', 'Z2: 85-89%', 'Z3, tempo e interumbral: 90-94%', 'Z4, MLSS: 95-99%', 'Z5a, VT2 / potencia aeróbica: 100-102%', 'Z5b, VO₂max: 103-106%', 'Z5c, capacidad anaeróbica: >106%'],
          },
        ],
        notes: [
          'Durante los primeros 10 minutos se elimina el desacople aeróbico de la frecuencia cardiaca que todavía está estabilizándose.',
          'La media de los últimos 20’ representa mejor la FC asociada al máximo estado estable de lactato.',
        ],
      },
    ],
  },
  {
    ...baseMeta,
    id: 'wednesday-run-intervals',
    weekday: 'Miércoles',
    dayNumber: 3,
    title: 'Fuerza básica + VO₂max Ski + Metcon',
    summary: 'Día mixto de pierna, potencia, intervalos intensos en SkiErg y metcon final con fatiga acumulada de tren inferior.',
    sections: [
      {
        id: 'wednesday-basic-strength',
        type: 'Fuerza',
        title: 'Fuerza básica',
        collapsed: false,
        blocks: [
          {
            id: 'wednesday-warm-up',
            title: 'Warm-up obligatorio',
            subtitle: '3 rondas for quality',
            lines: ['8 / 8 Bulgarian Split con peso corporal', '12 Box Step Up pliométrico'],
            restAfter: '1’30”',
          },
          {
            id: 'wednesday-back-squat',
            title: 'Back Squat',
            subtitle: '4 rondas for quality',
            lines: ['3 Back Squat @1x80% → 3x5RM', 'RIR 3 → 1 / RPEs 6 → 9'],
            restAfter: '2’',
          },
          {
            id: 'wednesday-cluster',
            title: 'Potencia',
            subtitle: '6 rondas for quality',
            lines: ['3 Cluster @50/35 kg', 'No T&G'],
            restAfter: '45”',
          },
        ],
        notes: ['Si no tienes experiencia en movimientos olímpicos, trabaja con 2 DB @20/12,5 kg.', 'Si tienes experiencia, puedes cargar con 60/40 kg.'],
      },
      {
        id: 'wednesday-vo2max-ski',
        type: 'Engine',
        title: 'VO₂max — Ski',
        collapsed: false,
        blocks: [{ id: 'wednesday-ski-intervals', title: 'For quality', lines: ['1x: 15 x 40” Ski @RT500 / RPEi 9 + 20” off'] }],
        notes: ['No te preocupes si el ritmo baja.', 'La clave es que se mantenga el RPE en cada ronda.'],
      },
      {
        id: 'wednesday-metcon',
        type: 'Metcon',
        title: 'Metcon',
        collapsed: false,
        blocks: [
          { id: 'wednesday-for-time', title: 'For time', lines: ['40 / 25 cal Assault', '30 m Burpee Broad Jump', '20 Box Step Up @SB 30/20 kg', '1000 m RowErg'] },
        ],
        notes: [
          'No te vuelvas loco.',
          'Es un wod para ser inteligente en la Assault y currar siempre subumbral.',
          'La clave estará en soportar la fatiga muscular del tren inferior post bici.',
        ],
      },
    ],
  },
  {
    ...baseMeta,
    id: 'thursday-active-recovery',
    weekday: 'Jueves',
    dayNumber: 4,
    title: 'Capacidad aeróbica extensiva',
    summary: 'Rodaje largo controlado en Z2 para construir base aeróbica. Día clave para acumular minutos sin pasarse de intensidad.',
    sections: [
      {
        id: 'thursday-extensive-run',
        type: 'Engine',
        title: 'Carrera extensiva',
        collapsed: false,
        blocks: [
          {
            id: 'thursday-warm-up',
            title: 'Warm-up obligatorio',
            lines: ['5’ Run — RPEi 5', '2’ Run — RPEi 7', '1’ Run — RPEi 5', '2’ Run — RPEi 7', 'Y directo a bloque principal.'],
          },
          {
            id: 'thursday-main',
            title: 'For quality',
            lines: ['60’ Run', '75% FC / Z2 TJV / RPEs 6-7'],
          },
          {
            id: 'thursday-reference',
            title: 'Referencia orientativa',
            lines: ['5:10-5:15/km sería Z2 baja', '4:45-4:50/km sería Z2 alta'],
          },
        ],
        notes: [
          'Recuerda que tu ritmo de Z2 puede tener una ventana de unos ±15”/km o más, dependiendo del tiempo total del rodaje y la climatología.',
          'En ambas seguirías estando en Z2. La acumulación de tiempo total puede hacer que tengas que ir modificando el ritmo en base a RPE y FC.',
          'TJV = Test Jim Vance.',
          'El tiempo límite de la capacidad aeróbica va de 1h30’ hasta 4h, pero esto no implica que ya hayas desarrollado ese tiempo límite en ti.',
          'Los tiempos totales se corresponden con Zona 2, pero si todavía no has adaptado tu sistema a correr 1h o más con una frecuencia adecuada, es prácticamente imposible sostener la misma Zona 2 al mismo ritmo durante 1h. Tu sistema necesitará otras vías para aguantar ese tiempo, salvo que pares o bajes drásticamente el ritmo.',
        ],
      },
    ],
  },
  {
    ...baseMeta,
    id: 'friday-functional-core',
    weekday: 'Viernes',
    dayNumber: 5,
    title: 'Descanso obligatorio',
    summary: 'Día de descarga. El objetivo es recuperar, asimilar el trabajo de la semana y llegar fresco al sábado.',
    sections: [
      {
        id: 'friday-mandatory-rest',
        type: 'Recovery',
        title: 'Descanso obligatorio',
        collapsed: false,
        lines: ['Día de descanso obligatorio', 'Movilidad suave', 'Paseo ligero si apetece', 'Hidratación', 'Sueño', 'Descarga de piernas', 'Nada de impacto', 'Nada de trabajo intenso'],
      },
    ],
  },
  {
    ...baseMeta,
    id: 'saturday-hp-hybrid',
    weekday: 'Sábado',
    dayNumber: 6,
    title: 'Engine',
    summary: 'Día híbrido exigente con calentamiento específico, fuerza pesada, bloque de endurance y final For Time con cargas.',
    sections: [
      {
        id: 'saturday-warm-up',
        type: 'Warm-up',
        title: 'Warm-up obligatorio',
        collapsed: false,
        blocks: [
          {
            id: 'saturday-warm-up-block',
            title: '3 rondas for quality',
            lines: ['1’ BikeErg — RPE 5 → 8', '15 Goblet Squat @24/16 kg', '1’ SkiErg — RPE 5 → 8', '12,5 m Sled Push @P.O PRO'],
            restAfter: '1’',
          },
        ],
      },
      {
        id: 'saturday-strength',
        type: 'Strength',
        title: 'Strength',
        collapsed: false,
        blocks: [
          { id: 'saturday-zercher', title: '6’ para encontrar 6 heavy reps de:', lines: ['Zercher Reverse Lunge'] },
          { id: 'saturday-push', title: '2’ rest total y directo a:', subtitle: '6’ para encontrar 2 heavy reps de:', lines: ['Push Press', 'Push Jerk si tienes técnica'] },
          { id: 'saturday-strength-transition', title: 'Transición', lines: ['8’ rest total y directo a:'] },
        ],
      },
      {
        id: 'saturday-endurance',
        type: 'Endurance',
        title: 'Endurance',
        collapsed: false,
        blocks: [
          { id: 'saturday-endurance-block', title: '24’ para acumular máximos metros de:', lines: ['200 m SkiErg', '400 m Run', '600 m RowErg'] },
          { id: 'saturday-endurance-transition', title: 'Transición', lines: ['10’ rest y directo a:'] },
        ],
      },
      {
        id: 'saturday-for-time',
        type: 'For Time',
        title: 'For Time — 20’',
        collapsed: false,
        blocks: [
          {
            id: 'saturday-reps',
            title: 'Repeticiones',
            lines: ['30 / 24 / 18 / 12 / 6 → Wall Balls', '3 / 5 / 7 / 9 / 11 → Box Jump Over', '30 / 24 / 18 / 12 / 6 → DB Snatch alterno', '1 / 3 / 5 / 7 / 9 → Sandbag Pick Up'],
          },
        ],
        loads: {
          PRO: ['Wall Ball: 9 / 6 kg', 'DB Snatch: 22,5 / 15 kg', 'Sandbag: 70 / 45 kg'],
          Normal: ['Wall Ball: 6 / 4 kg', 'DB Snatch: 20 / 12,5 kg', 'Sandbag: 45 / 30 kg'],
        },
      },
    ],
  },
  {
    ...baseMeta,
    id: 'sunday-rest-mobility',
    weekday: 'Domingo',
    dayNumber: 7,
    title: 'Rodaje regenerativo',
    summary: 'Rodaje suave para soltar piernas y cerrar la semana sin añadir fatiga excesiva.',
    sections: [
      {
        id: 'sunday-regenerative-run',
        type: 'Engine',
        title: 'Rodaje regenerativo',
        collapsed: false,
        lines: ['8 km Run', '70-75% FC', 'Z2 TJV', 'RPEs 5'],
        notes: ['Buscamos un rodaje para soltar piernas.'],
      },
    ],
  },
];
