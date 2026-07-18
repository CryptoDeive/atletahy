import type { GeneratedTrainingPlanErrorCode } from '../shared/trainingPlanContract';

export type NormalizedTrainingPlanError = {
  code: GeneratedTrainingPlanErrorCode;
  status: number;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKnownPlanErrorCode(value: unknown): value is GeneratedTrainingPlanErrorCode {
  return typeof value === 'string' && [
    'AUTH_REQUIRED',
    'INVALID_INPUT',
    'OPENAI_NOT_CONFIGURED',
    'OPENAI_TIMEOUT',
    'OPENAI_ERROR',
    'INVALID_OPENAI_RESPONSE',
    'INVALID_PLAN_RESPONSE',
    'AI_QUOTA_EXCEEDED',
  ].includes(value);
}

function extractStatus(error: unknown) {
  if (isRecord(error) && typeof error.status === 'number') return error.status;
  if (isRecord(error) && isRecord(error.context) && typeof error.context.status === 'number') return error.context.status;
  return undefined;
}

async function readErrorBody(error: unknown) {
  const context = isRecord(error) ? error.context : undefined;
  if (!context) return null;

  if (isRecord(context) && 'body' in context && context.body !== undefined) {
    return context.body;
  }

  if (typeof (context as Response).clone === 'function' && typeof (context as Response).json === 'function') {
    try {
      return await (context as Response).clone().json();
    } catch {
      return null;
    }
  }

  return null;
}

function extractCodeFromBody(body: unknown) {
  if (!isRecord(body)) return undefined;
  if (isKnownPlanErrorCode(body.code)) return body.code;
  if (isRecord(body.error) && isKnownPlanErrorCode(body.error.code)) return body.error.code;
  return undefined;
}

export function getTrainingPlanErrorMessage(code: GeneratedTrainingPlanErrorCode) {
  switch (code) {
    case 'INVALID_INPUT':
      return 'Revisa tu perfil y disponibilidad: faltan datos necesarios para generar el plan.';
    case 'AUTH_REQUIRED':
      return 'Inicia sesión de nuevo para generar el plan IA.';
    case 'OPENAI_NOT_CONFIGURED':
      return 'Plan IA no está disponible ahora mismo por configuración del servidor.';
    case 'OPENAI_TIMEOUT':
      return 'Plan IA tardó demasiado en responder. Reinténtalo en unos minutos.';
    case 'AI_QUOTA_EXCEEDED':
      return 'Has alcanzado el límite diario de planes IA. Podrás volver a intentarlo mañana.';
    case 'INVALID_OPENAI_RESPONSE':
      return 'Plan IA devolvió una respuesta inválida. Reinténtalo.';
    case 'INVALID_PLAN_RESPONSE':
      return 'Plan IA devolvió un plan incompleto o fuera del contrato. Reinténtalo.';
    case 'OPENAI_ERROR':
    default:
      return 'No se pudo generar el plan IA por un problema temporal del servicio.';
  }
}

function fallbackCodeFromStatus(status?: number): GeneratedTrainingPlanErrorCode {
  if (status === 400) return 'INVALID_INPUT';
  if (status === 401) return 'AUTH_REQUIRED';
  if (status === 500) return 'OPENAI_NOT_CONFIGURED';
  if (status === 504) return 'OPENAI_TIMEOUT';
  if (status === 429) return 'AI_QUOTA_EXCEEDED';
  return 'OPENAI_ERROR';
}

export async function normalizeTrainingPlanInvokeError(error: unknown): Promise<NormalizedTrainingPlanError> {
  const status = extractStatus(error) ?? (isRecord(error) && error.name === 'FunctionsFetchError' ? 502 : 502);
  const body = await readErrorBody(error);
  const code = extractCodeFromBody(body) ?? fallbackCodeFromStatus(status);

  return {
    status,
    code,
    message: getTrainingPlanErrorMessage(code),
  };
}
