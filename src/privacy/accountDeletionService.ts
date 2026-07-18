import { supabase } from '../lib/supabaseClient';
import { ACCOUNT_DELETION_CONFIRMATION } from './accountPrivacy';

export interface AccountDeletionInput {
  confirmation: string;
  currentPassword: string;
}

export type AccountDeletionResult =
  | { ok: true; code: 'ACCOUNT_DELETED'; message: string }
  | { ok: false; code: string; message: string };

type AccountDeletionClient = {
  functions: { invoke: (name: string, options: { body: AccountDeletionInput }) => Promise<{ data: unknown; error: unknown }> };
  auth: { signOut: (options: { scope: 'local' }) => Promise<{ error: unknown }> };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Tu sesión ya no es válida. Inicia sesión de nuevo.',
  CONFIRMATION_REQUIRED: 'Escribe la frase de confirmación exacta.',
  REAUTHENTICATION_REQUIRED: 'No se pudo verificar tu contraseña actual.',
  SERVICE_NOT_CONFIGURED: 'La eliminación de cuenta todavía no está disponible.',
  ACCOUNT_DELETION_FAILED: 'No se pudo eliminar la cuenta. Inténtalo de nuevo más tarde.',
};

export async function requestAccountDeletion(
  input: AccountDeletionInput,
  { client = supabase as AccountDeletionClient | null }: { client?: AccountDeletionClient | null } = {},
): Promise<AccountDeletionResult> {
  if (input.confirmation !== ACCOUNT_DELETION_CONFIRMATION || !input.currentPassword) {
    return { ok: false, code: 'CONFIRMATION_REQUIRED', message: messages.CONFIRMATION_REQUIRED };
  }
  if (!client) return { ok: false, code: 'SERVICE_NOT_CONFIGURED', message: messages.SERVICE_NOT_CONFIGURED };

  try {
    const { data, error } = await client.functions.invoke('delete-account', { body: input });
    if (!error && isRecord(data) && data.deleted === true && data.code === 'ACCOUNT_DELETED') {
      await client.auth.signOut({ scope: 'local' });
      return { ok: true, code: 'ACCOUNT_DELETED', message: 'Tu cuenta y sus datos asociados se han eliminado.' };
    }
    const code = isRecord(data) && typeof data.code === 'string' && data.code in messages ? data.code : 'ACCOUNT_DELETION_FAILED';
    return { ok: false, code, message: messages[code] ?? messages.ACCOUNT_DELETION_FAILED };
  } catch {
    return { ok: false, code: 'ACCOUNT_DELETION_FAILED', message: messages.ACCOUNT_DELETION_FAILED };
  }
}
