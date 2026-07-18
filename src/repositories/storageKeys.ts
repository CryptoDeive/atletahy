export type StorageContext =
  | { kind: 'guest' }
  | { kind: 'user'; userId: string };

export type StorageResource =
  | 'athlete-profile'
  | 'physiology-metrics'
  | 'training-availability'
  | 'equipment-availability'
  | 'injuries'
  | 'nutrition-preferences'
  | 'daily-readiness'
  | 'workout-logs'
  | 'coach-advice'
  | 'training-plans'
  | 'training-test-results';

export const guestStorageContext: StorageContext = Object.freeze({ kind: 'guest' });

export function storageContextForUser(userId: string): StorageContext {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId || normalizedUserId.includes(':')) {
    throw new Error('La identidad de almacenamiento no es válida.');
  }
  return { kind: 'user', userId: normalizedUserId };
}

export function storageContextFor(userId?: string | null): StorageContext {
  return userId ? storageContextForUser(userId) : guestStorageContext;
}

export function storageKey(context: StorageContext, resource: StorageResource | string): string {
  const scope = context.kind === 'guest' ? 'guest' : context.userId;
  return `atletahy:${scope}:${resource}`;
}

export const athleteStorageResources = {
  profile: 'athlete-profile',
  physiology: 'physiology-metrics',
  availability: 'training-availability',
  equipment: 'equipment-availability',
  injuries: 'injuries',
  nutrition: 'nutrition-preferences',
} as const satisfies Record<string, StorageResource>;

export const readinessStorageResource = 'daily-readiness' satisfies StorageResource;
export const workoutLogsStorageResource = 'workout-logs' satisfies StorageResource;
export const coachAdviceStorageResource = 'coach-advice' satisfies StorageResource;
export const trainingPlansStorageResource = 'training-plans' satisfies StorageResource;
export const trainingTestResultsStorageResource = 'training-test-results' satisfies StorageResource;

/** Legacy keys remain readable only by the explicit import flow. */
export const legacyStorageKeys: Record<StorageResource, string> = {
  'athlete-profile': 'hyrox:athlete-profile',
  'physiology-metrics': 'hyrox:physiology-metrics',
  'training-availability': 'hyrox:training-availability',
  'equipment-availability': 'hyrox:equipment-availability',
  injuries: 'hyrox:injuries',
  'nutrition-preferences': 'hyrox:nutrition-preferences',
  'daily-readiness': 'hyrox:daily-readiness',
  'workout-logs': 'hyrox:workout-logs',
  'coach-advice': 'hyrox:coach-advice',
  'training-plans': 'hyrox:training-plans',
  'training-test-results': 'hyrox:training-test-results',
};

const resources = Object.keys(legacyStorageKeys) as StorageResource[];
const importMarkerResource = 'legacy-guest-import-v1';

export interface LocalImportResult {
  imported: boolean;
  copiedKeys: string[];
}

/**
 * Explicitly copies local guest/legacy data into one user's namespace.
 * It never deletes source data and never overwrites an existing user value.
 */
export function importLegacyAndGuestData(userId: string): LocalImportResult {
  if (typeof window === 'undefined') return { imported: false, copiedKeys: [] };

  const targetContext = storageContextForUser(userId);
  const markerKey = storageKey(targetContext, importMarkerResource);
  if (window.localStorage.getItem(markerKey) !== null) {
    return { imported: false, copiedKeys: [] };
  }

  const copiedKeys: string[] = [];
  for (const resource of resources) {
    const targetKey = storageKey(targetContext, resource);
    if (window.localStorage.getItem(targetKey) !== null) continue;

    const guestKey = storageKey(guestStorageContext, resource);
    const guestValue = window.localStorage.getItem(guestKey);
    const legacyValue = window.localStorage.getItem(legacyStorageKeys[resource]);
    const sourceValue = guestValue ?? legacyValue;
    if (sourceValue === null) continue;

    window.localStorage.setItem(targetKey, sourceValue);
    copiedKeys.push(targetKey);
  }

  window.localStorage.setItem(markerKey, JSON.stringify({ importedAt: new Date().toISOString(), copiedKeys }));
  return { imported: true, copiedKeys };
}

export function workoutLogStorageId(weekId: string, dayId: string, date?: string) {
  return date ? `${weekId}:${dayId}:${date}` : `${weekId}:${dayId}`;
}
