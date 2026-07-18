import { describe, expect, it } from 'vitest';
import { getTrainingPlanErrorMessage, normalizeTrainingPlanInvokeError } from './planErrorUtils';

describe('normalizeTrainingPlanInvokeError', () => {
  it('preserves structured timeout code and status from Edge Function errors', async () => {
    const error = {
      name: 'FunctionsHttpError',
      context: {
        status: 504,
        clone() {
          return this;
        },
        async json() {
          return { error: 'No se pudo generar el plan.', code: 'OPENAI_TIMEOUT' };
        },
      },
    };

    await expect(normalizeTrainingPlanInvokeError(error)).resolves.toEqual({
      code: 'OPENAI_TIMEOUT',
      status: 504,
      message: getTrainingPlanErrorMessage('OPENAI_TIMEOUT'),
    });
  });

  it('maps fetch-level failures to safe upstream defaults', async () => {
    const error = { name: 'FunctionsFetchError', context: { reason: 'network down' } };

    await expect(normalizeTrainingPlanInvokeError(error)).resolves.toEqual({
      code: 'OPENAI_ERROR',
      status: 502,
      message: getTrainingPlanErrorMessage('OPENAI_ERROR'),
    });
  });

  it('maps structured status codes across the supported response matrix', async () => {
    await expect(normalizeTrainingPlanInvokeError({
      name: 'FunctionsHttpError',
      context: {
        status: 400,
        clone() {
          return this;
        },
        async json() {
          return { error: 'Entrada inválida.', code: 'INVALID_INPUT' };
        },
      },
    })).resolves.toEqual({
      code: 'INVALID_INPUT',
      status: 400,
      message: getTrainingPlanErrorMessage('INVALID_INPUT'),
    });

    await expect(normalizeTrainingPlanInvokeError({
      name: 'FunctionsHttpError',
      context: {
        status: 401,
        clone() {
          return this;
        },
        async json() {
          return { error: 'Sesión requerida.', code: 'AUTH_REQUIRED' };
        },
      },
    })).resolves.toEqual({
      code: 'AUTH_REQUIRED',
      status: 401,
      message: getTrainingPlanErrorMessage('AUTH_REQUIRED'),
    });

    await expect(normalizeTrainingPlanInvokeError({
      name: 'FunctionsHttpError',
      context: {
        status: 500,
        clone() {
          return this;
        },
        async json() {
          return { error: 'OpenAI no configurado.', code: 'OPENAI_NOT_CONFIGURED' };
        },
      },
    })).resolves.toEqual({
      code: 'OPENAI_NOT_CONFIGURED',
      status: 500,
      message: getTrainingPlanErrorMessage('OPENAI_NOT_CONFIGURED'),
    });
  });
});
