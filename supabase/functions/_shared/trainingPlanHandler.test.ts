import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validGeneratedTrainingPlan, validPlanGenerationInput } from '../../../src/test/planTestUtils';
import { createTrainingPlanHandler } from './trainingPlanHandler';

function createDeps(overrides: Partial<Parameters<typeof createTrainingPlanHandler>[0]> = {}) {
  const telemetry: Array<{ stage: string; event: Record<string, unknown> }> = [];

  return {
    handler: createTrainingPlanHandler({
      getEnv(name) {
        if (name === 'SUPABASE_URL') return 'https://example.supabase.co';
        if (name === 'SUPABASE_PUBLISHABLE_KEY') return 'publishable-key';
        if (name === 'OPENAI_API_KEY') return 'redacted-openai-key';
        return undefined;
      },
      createSupabaseClient() {
        return {
          auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
          },
          rpc: vi.fn().mockResolvedValue({ data: [{ allowed: true, remaining: 2, retry_after_seconds: 0 }], error: null }),
        };
      },
      fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: JSON.stringify(validGeneratedTrainingPlan) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })),
      log(stage, event) {
        telemetry.push({ stage, event });
      },
      ...overrides,
    }),
    telemetry,
  };
}

describe('createTrainingPlanHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a consistent 405 envelope with a stable existing code', async () => {
    const { handler } = createDeps();

    const response = await handler(new Request('https://example.com', { method: 'GET' }));

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });

  it('covers 400, 401 and 500 guard responses without leaking request data', async () => {
    const { handler: unauthorizedHandler } = createDeps();
    const unauthorized = await unauthorizedHandler(new Request('https://example.com', { method: 'POST', body: JSON.stringify({ input: validPlanGenerationInput }) }));
    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.clone().json()).resolves.toMatchObject({
      code: 'AUTH_REQUIRED',
    });

    const { handler: invalidInputHandler } = createDeps();
    const invalidInput = await invalidInputHandler(new Request('https://example.com', {
      method: 'POST',
      headers: { Authorization: 'Bearer safe-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ nope: true }),
    }));
    expect(invalidInput.status).toBe(400);

    const { handler: extraKeysHandler } = createDeps();
    const extraKeys = await extraKeysHandler(new Request('https://example.com', {
      method: 'POST',
      headers: { Authorization: 'Bearer safe-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: validPlanGenerationInput, extra: true }),
    }));
    expect(extraKeys.status).toBe(400);
    await expect(extraKeys.json()).resolves.toMatchObject({
      code: 'INVALID_INPUT',
    });

    const { handler: configHandler } = createDeps({
      getEnv(name) {
        if (name === 'OPENAI_API_KEY') return undefined;
        if (name === 'SUPABASE_URL') return 'https://example.supabase.co';
        if (name === 'SUPABASE_PUBLISHABLE_KEY') return 'publishable-key';
        return undefined;
      },
    });
    const serverConfig = await configHandler(new Request('https://example.com', {
      method: 'POST',
      headers: { Authorization: 'Bearer safe-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: validPlanGenerationInput }),
    }));
    expect(serverConfig.status).toBe(500);
    await expect(serverConfig.json()).resolves.toMatchObject({
      code: 'OPENAI_NOT_CONFIGURED',
    });
  });

  it('maps upstream failures to 502 and uses shared response extraction on success', async () => {
    const upstream = createDeps({
      fetch: vi.fn()
        .mockResolvedValueOnce(new Response('upstream fail', { status: 500 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          output: [
            { content: [{ text: JSON.stringify(validGeneratedTrainingPlan) }] },
          ],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })),
    });

    const request = new Request('https://example.com', {
      method: 'POST',
      headers: { Authorization: 'Bearer safe-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: validPlanGenerationInput }),
    });

    const upstreamFailure = await upstream.handler(request.clone());
    expect(upstreamFailure.status).toBe(502);
    await expect(upstreamFailure.json()).resolves.toMatchObject({
      code: 'OPENAI_ERROR',
    });

    const success = await upstream.handler(request);
    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({
      plan: validGeneratedTrainingPlan,
      source: 'openai',
    });
  });

  it('maps fetch aborts to 504, clears timeout cleanup, and emits telemetry without PII', async () => {
    const fetch = vi.fn().mockImplementation((_url: string, { signal }: { signal: AbortSignal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')), { once: true });
    }));
    const { handler, telemetry } = createDeps({ fetch, openAiTimeoutMs: 25 });

    const responsePromise = handler(new Request('https://example.com', {
      method: 'POST',
      headers: { Authorization: 'Bearer safe-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: validPlanGenerationInput }),
    }));

    await vi.advanceTimersByTimeAsync(25);
    const response = await responsePromise;

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toMatchObject({
      code: 'OPENAI_TIMEOUT',
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(telemetry.every(({ event }) => !('input' in event) && !('authorization' in event))).toBe(true);
    expect(telemetry.some(({ stage, event }) => stage === 'failed' && event.errorCode === 'OPENAI_TIMEOUT')).toBe(true);
  });

  it('emits the required safe success stages and only the allowed telemetry fields', async () => {
    const { handler, telemetry } = createDeps();

    const response = await handler(new Request('https://example.com', {
      method: 'POST',
      headers: { Authorization: 'Bearer safe-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: validPlanGenerationInput }),
    }));

    expect(response.status).toBe(200);
    expect(telemetry.map(({ stage }) => stage)).toEqual([
      'request_received',
      'auth_ok',
      'openai_started',
      'openai_completed',
      'parse_ok',
      'validation_ok',
    ]);
    expect(telemetry.every(({ event }) => Object.keys(event).every((key) => [
      'elapsedMs', 'openAiStatus', 'errorCode', 'weeksReturned',
    ].includes(key)))).toBe(true);
  });

  it('rejects oversized plan inputs before authentication or OpenAI', async () => {
    const fetch = vi.fn();
    const createSupabaseClient = vi.fn();
    const { handler } = createDeps({ fetch, createSupabaseClient });
    const oversizedInput = {
      ...validPlanGenerationInput,
      objective: { ...validPlanGenerationInput.objective, category: 'x'.repeat(70_000) },
    };

    const response = await handler(new Request('https://example.com', {
      method: 'POST',
      headers: { Authorization: 'Bearer safe-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: oversizedInput }),
    }));

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_INPUT' });
    expect(createSupabaseClient).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects structurally invalid input before authentication or OpenAI', async () => {
    const fetch = vi.fn();
    const createSupabaseClient = vi.fn();
    const { handler } = createDeps({ fetch, createSupabaseClient });

    const response = await handler(new Request('https://example.com', {
      method: 'POST',
      headers: { Authorization: 'Bearer safe-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { ...validPlanGenerationInput, objective: {} } }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_INPUT' });
    expect(createSupabaseClient).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns 429 with Retry-After when the training plan quota is exhausted', async () => {
    const fetch = vi.fn();
    const { handler } = createDeps({
      fetch,
      createSupabaseClient: () => ({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
        rpc: vi.fn().mockResolvedValue({ data: [{ allowed: false, remaining: 0, retry_after_seconds: 300 }], error: null }),
      }),
    });
    const response = await handler(new Request('https://example.com', {
      method: 'POST', headers: { Authorization: 'Bearer safe-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ input: validPlanGenerationInput }),
    }));
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('300');
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['client creation', () => createDeps({ createSupabaseClient: vi.fn(() => { throw new Error('client failed'); }) })],
    ['getUser', () => createDeps({
      createSupabaseClient: () => ({ auth: { getUser: vi.fn().mockRejectedValue(new Error('auth failed')) }, rpc: vi.fn() }),
    })],
  ])('returns a safe failed envelope when %s throws', async (_label, setup) => {
    const { handler, telemetry } = setup();
    const response = await handler(new Request('https://example.com', {
      method: 'POST',
      headers: { Authorization: 'Bearer safe-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: validPlanGenerationInput }),
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'No se pudo validar la sesión.', code: 'OPENAI_ERROR' });
    expect(telemetry.at(-1)).toMatchObject({ stage: 'failed', event: { errorCode: 'OPENAI_ERROR' } });
  });

  it('maps coachNotes to the existing notes fields without changing the stored contract', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: JSON.stringify(validGeneratedTrainingPlan) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const { handler } = createDeps({ fetch });

    await handler(new Request('https://example.com', {
      method: 'POST',
      headers: { Authorization: 'Bearer safe-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: validPlanGenerationInput }),
    }));

    const openAiBody = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(openAiBody.instructions).toContain('coachNotes');
    expect(openAiBody.instructions).toContain('arrays notes');
    expect(openAiBody.instructions).toContain('máximo de 3');
  });
});
