export type UiErrorAction = 'retry' | 'sign-in' | 'contact-support' | 'none';

export interface UiError {
  code: string;
  message: string;
  action: UiErrorAction;
  retryable: boolean;
}

interface UiErrorDefaults {
  code?: string;
  message?: string;
  action?: UiErrorAction;
  retryable?: boolean;
}

function errorKind(error: unknown): string {
  if (error instanceof Error && error.name) return error.name;
  return typeof error === 'object' && error !== null ? 'UnknownObject' : typeof error;
}

/** Converts arbitrary infrastructure errors into a stable, non-sensitive UI contract. */
export function normalizeUiError(error: unknown, defaults: UiErrorDefaults = {}): UiError {
  void error;
  return {
    code: defaults.code ?? 'UNEXPECTED_ERROR',
    message: defaults.message ?? 'No se pudo completar la operación. Inténtalo de nuevo.',
    action: defaults.action ?? 'retry',
    retryable: defaults.retryable ?? true,
  };
}

/** Logs only an allow-listed diagnostic envelope; never the raw error or caller metadata. */
export function logUiError(context: string, error: unknown, metadata?: unknown): void {
  void metadata;
  const normalized = normalizeUiError(error);
  console.warn('[AtletaHY]', {
    context,
    code: normalized.code,
    kind: errorKind(error),
  });
}
