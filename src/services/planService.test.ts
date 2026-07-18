import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validGeneratedTrainingPlan, validPlanGenerationInput } from '../test/planTestUtils';

function functionsHttpError(status: number, body: unknown) {
  return {
    name: 'FunctionsHttpError',
    context: {
      status,
      clone() {
        return this;
      },
      async json() {
        return body;
      },
    },
  };
}

async function importServiceWithSupabaseMock({ configured, session, invoke, applySafetyOverride }: { configured: boolean; session: unknown; invoke?: ReturnType<typeof vi.fn>; applySafetyOverride?: (plan: unknown) => unknown }) {
  vi.resetModules();
  const invokeMock = invoke ?? vi.fn();
  const getSession = vi.fn().mockResolvedValue({ data: { session }, error: null });

  vi.doMock('../lib/supabaseClient', () => ({
    isSupabaseConfigured: configured,
    supabase: configured ? { auth: { getSession }, functions: { invoke: invokeMock } } : null,
  }));
  if (applySafetyOverride) {
    vi.doMock('../shared/trainingSafety', () => ({
      evaluateTrainingSafety: () => ({ level: 'red', reasons: ['test'] }),
      applyPlanSafetyOverrides: applySafetyOverride,
    }));
  }

  const service = await import('./planService');
  return { ...service, invokeMock, getSession };
}

describe('generateTrainingPlan', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock('../lib/supabaseClient');
    vi.doUnmock('../shared/trainingSafety');
    vi.useRealTimers();
  });

  it('invokes the Edge Function with payload { input } and a client abort signal when there is a session', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { plan: validGeneratedTrainingPlan }, error: null });
    const { generateTrainingPlan, invokeMock } = await importServiceWithSupabaseMock({
      configured: true,
      session: { access_token: 'redacted-test-token', user: { id: 'user-1' } },
      invoke,
    });

    const resultPromise = generateTrainingPlan(validPlanGenerationInput);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.source).toBe('openai');
    expect(result.plan).toEqual(validGeneratedTrainingPlan);
    expect(invokeMock).toHaveBeenCalledWith('generate-training-plan', {
      body: { input: validPlanGenerationInput },
      signal: expect.any(Object),
    });
    expect(invokeMock.mock.calls[0]?.[1]).not.toHaveProperty('timeout');
  });

  it('returns a controlled unauthorized error if there is no session', async () => {
    const { generateTrainingPlan, invokeMock } = await importServiceWithSupabaseMock({ configured: true, session: null });

    const result = await generateTrainingPlan(validPlanGenerationInput);

    expect(result.source).toBe('fallback');
    expect(result.plan).toBeNull();
    expect(result.code).toBe('AUTH_REQUIRED');
    expect(result.status).toBe(401);
    expect(result.error).toMatch(/Inicia sesi.n/i);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('preserves safe timeout code and status from invoke errors', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: functionsHttpError(504, { error: 'No se pudo generar el plan.', code: 'OPENAI_TIMEOUT' }),
    });
    const { generateTrainingPlan } = await importServiceWithSupabaseMock({
      configured: true,
      session: { access_token: 'redacted-test-token', user: { id: 'user-1' } },
      invoke,
    });

    const result = await generateTrainingPlan(validPlanGenerationInput);

    expect(result).toMatchObject({
      plan: null,
      source: 'fallback',
      code: 'OPENAI_TIMEOUT',
      status: 504,
    });
    expect(result.error).toMatch(/tard.\s+demasiado/i);
  });

  it('maps local client abort timeouts to OPENAI_TIMEOUT without treating generic fetch errors as timeouts', async () => {
    const invoke = vi.fn().mockImplementation(async (_name: string, { signal }: { signal: AbortSignal }) => {
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
      return {
        data: null,
        error: { name: 'FunctionsFetchError', context: new DOMException('Local abort', 'AbortError') },
      };
    });
    const { generateTrainingPlan } = await importServiceWithSupabaseMock({
      configured: true,
      session: { access_token: 'redacted-test-token', user: { id: 'user-1' } },
      invoke,
    });

    const resultPromise = generateTrainingPlan(validPlanGenerationInput);
    await vi.advanceTimersByTimeAsync(145000);
    const result = await resultPromise;

    expect(result).toMatchObject({
      plan: null,
      source: 'fallback',
      code: 'OPENAI_TIMEOUT',
      status: 504,
    });
  });

  it('rejects plans that fail frontend contract validation even if invoke returns 200', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { plan: { ...validGeneratedTrainingPlan, generatedWeeks: 1 } },
      error: null,
    });
    const { generateTrainingPlan } = await importServiceWithSupabaseMock({
      configured: true,
      session: { access_token: 'redacted-test-token', user: { id: 'user-1' } },
      invoke,
    });

    const result = await generateTrainingPlan(validPlanGenerationInput);

    expect(result).toMatchObject({
      plan: null,
      source: 'fallback',
      code: 'INVALID_PLAN_RESPONSE',
      status: 502,
    });
  });

  it('revalidates the complete plan after client safety overrides', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { plan: validGeneratedTrainingPlan }, error: null });
    const { generateTrainingPlan } = await importServiceWithSupabaseMock({
      configured: true,
      session: { access_token: 'redacted-test-token', user: { id: 'user-1' } },
      invoke,
      applySafetyOverride: (plan) => ({ ...(plan as object), generatedWeeks: 1 }),
    });

    const result = await generateTrainingPlan(validPlanGenerationInput);

    expect(result).toMatchObject({ plan: null, source: 'fallback', code: 'INVALID_PLAN_RESPONSE', status: 502 });
  });

  it('rejects an undefined input before invoking the Edge Function', async () => {
    const { generateTrainingPlan, invokeMock } = await importServiceWithSupabaseMock({
      configured: true,
      session: { access_token: 'redacted-test-token', user: { id: 'user-1' } },
    });

    const result = await generateTrainingPlan(undefined as never);

    expect(result).toMatchObject({
      plan: null,
      source: 'fallback',
      code: 'INVALID_INPUT',
      status: 400,
    });
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('rejects structurally invalid input before reading the session or invoking', async () => {
    const { generateTrainingPlan, invokeMock, getSession } = await importServiceWithSupabaseMock({
      configured: true,
      session: { access_token: 'redacted-test-token', user: { id: 'user-1' } },
    });

    const result = await generateTrainingPlan({
      ...validPlanGenerationInput,
      objective: {},
    } as never);

    expect(result).toMatchObject({ code: 'INVALID_INPUT', status: 400 });
    expect(getSession).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('emits only safe development stages around a successful remote request', async () => {
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const invoke = vi.fn().mockResolvedValue({ data: { plan: validGeneratedTrainingPlan }, error: null });
    const { generateTrainingPlan } = await importServiceWithSupabaseMock({
      configured: true,
      session: { access_token: 'redacted-test-token', user: { id: 'user-1' } },
      invoke,
    });

    await generateTrainingPlan(validPlanGenerationInput);

    const output = JSON.stringify(consoleInfo.mock.calls);
    expect(output).toContain('PLAN_REMOTE_STARTED');
    expect(output).toContain('PLAN_REMOTE_SESSION_FOUND');
    expect(output).toContain('PLAN_REMOTE_INVOKE_STARTED');
    expect(output).toContain('PLAN_REMOTE_SUCCESS');
    expect(output).not.toContain('redacted-test-token');
    expect(output).not.toContain(validPlanGenerationInput.objective.targetRaceDate);
    consoleInfo.mockRestore();
  });
});
