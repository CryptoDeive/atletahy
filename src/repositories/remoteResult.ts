export type RemoteErrorKind = 'network' | 'authorization' | 'session' | 'configuration' | 'unknown';

export type RemoteResult<T> =
  | { ok: true; found: true; value: T }
  | { ok: true; found: false }
  | { ok: false; kind: RemoteErrorKind; error: unknown };

function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  return typeof error.status === 'number' ? error.status : undefined;
}

export function classifyRemoteError(error: unknown): RemoteErrorKind {
  const status = statusOf(error);
  if (status === 401) return 'session';
  if (status === 403) return 'authorization';
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) return 'network';
  if (error instanceof Error && /configur/i.test(error.message)) return 'configuration';
  return 'unknown';
}

export async function readRemote<T>(operation: () => Promise<T>, isFound: (value: T) => boolean): Promise<RemoteResult<T>> {
  try {
    const value = await operation();
    return isFound(value) ? { ok: true, found: true, value } : { ok: true, found: false };
  } catch (error) {
    return { ok: false, kind: classifyRemoteError(error), error };
  }
}

export class RemoteReadError extends Error {
  constructor(public readonly kind: RemoteErrorKind, cause: unknown) {
    super(`No se pudieron leer los datos remotos (${kind}).`, { cause });
    this.name = 'RemoteReadError';
  }
}

export function unwrapRemote<T>(result: RemoteResult<T>, emptyValue: T): T {
  if (!result.ok) throw new RemoteReadError(result.kind, result.error);
  return result.found ? result.value : emptyValue;
}
