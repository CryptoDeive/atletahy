import {
  athleteStorageResources,
  coachAdviceStorageResource,
  readinessStorageResource,
  storageKey,
  trainingPlansStorageResource,
  trainingTestResultsStorageResource,
  workoutLogsStorageResource,
  type StorageContext,
  type StorageResource,
} from '../repositories/storageKeys';

const exportableResources: StorageResource[] = [
  ...Object.values(athleteStorageResources),
  readinessStorageResource,
  workoutLogsStorageResource,
  coachAdviceStorageResource,
  trainingPlansStorageResource,
  trainingTestResultsStorageResource,
];

export interface LocalAccountExport {
  format: 'atletahy-local-export';
  version: 1;
  scope: 'guest' | 'user';
  exportedAt: string;
  data: Partial<Record<StorageResource, unknown>>;
}

export const ACCOUNT_DELETION_CONFIRMATION = 'ELIMINAR MI CUENTA';

export type AccountDeletionPreparation =
  | { status: 'blocked'; executed: false; code: string; message: string }
  | { status: 'prepared'; executed: false; code: 'ACCOUNT_DELETION_SERVER_REQUIRED'; message: string };

export function buildLocalAccountExport(context: StorageContext, now = new Date()): LocalAccountExport {
  const data: Partial<Record<StorageResource, unknown>> = {};
  if (typeof window !== 'undefined') {
    for (const resource of exportableResources) {
      const rawValue = window.localStorage.getItem(storageKey(context, resource));
      if (rawValue === null) continue;
      try {
        data[resource] = JSON.parse(rawValue) as unknown;
      } catch {
        // Invalid local data is omitted instead of copying an untrusted raw payload.
      }
    }
  }

  return {
    format: 'atletahy-local-export',
    version: 1,
    scope: context.kind,
    exportedAt: now.toISOString(),
    data,
  };
}

export function downloadLocalAccountExport(context: StorageContext): void {
  const payload = JSON.stringify(buildLocalAccountExport(context), null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `atletahy-datos-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Removes only app data owned by the confirmed active local namespace. */
export function clearLocalAccountData(context: StorageContext): void {
  if (typeof window === 'undefined') return;
  for (const resource of exportableResources) {
    window.localStorage.removeItem(storageKey(context, resource));
  }
}

export function prepareAccountDeletion(input: {
  authenticated: boolean;
  acknowledged: boolean;
  phrase: string;
}): AccountDeletionPreparation {
  if (!input.authenticated) {
    return { status: 'blocked', executed: false, code: 'AUTH_REQUIRED', message: 'Inicia sesión para gestionar la eliminación de la cuenta.' };
  }
  if (!input.acknowledged || input.phrase !== ACCOUNT_DELETION_CONFIRMATION) {
    return { status: 'blocked', executed: false, code: 'CONFIRMATION_REQUIRED', message: 'Confirma el alcance y escribe la frase exacta.' };
  }
  return {
    status: 'prepared',
    executed: false,
    code: 'ACCOUNT_DELETION_SERVER_REQUIRED',
    message: 'Solicitud preparada. La cuenta no se ha eliminado: esta operación requiere un servicio seguro en el servidor.',
  };
}
