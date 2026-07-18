import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCoachAdviceInput, validCoachAdvice } from '../test/coachTestUtils';

const genericFallbackError = 'No se pudo usar Coach IA real. Se ha generado una recomendación local.';

async function importServiceWithSupabaseMock({
  configured,
  session,
  invoke,
}: {
  configured: boolean;
  session: unknown;
  invoke?: ReturnType<typeof vi.fn>;
}) {
  vi.resetModules();
  const invokeMock = invoke ?? vi.fn();
  const getSession = vi.fn().mockResolvedValue({ data: { session }, error: null });

  vi.doMock('../lib/supabaseClient', () => ({
    isSupabaseConfigured: configured,
    supabase: configured
      ? {
          auth: { getSession },
          functions: { invoke: invokeMock },
        }
      : null,
  }));

  const service = await import('./coachService');
  return { ...service, invokeMock, getSession };
}

describe('generateCoachAdvice', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.doUnmock('../lib/supabaseClient');
  });

  it('returns local advice when Supabase is not configured', async () => {
    const { generateCoachAdvice, invokeMock } = await importServiceWithSupabaseMock({ configured: false, session: null });

    const result = await generateCoachAdvice(buildCoachAdviceInput());

    expect(result.source).toBe('local');
    expect(result.advice.summary).toMatch(/Estado/i);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('returns local advice when there is no session', async () => {
    const { generateCoachAdvice, invokeMock } = await importServiceWithSupabaseMock({ configured: true, session: null });

    const result = await generateCoachAdvice(buildCoachAdviceInput());

    expect(result.source).toBe('local');
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('calls the Edge Function when Supabase is configured and a session exists', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { advice: validCoachAdvice }, error: null });
    const { generateCoachAdvice, invokeMock } = await importServiceWithSupabaseMock({
      configured: true,
      session: { access_token: 'redacted-test-token', user: { id: 'user-1' } },
      invoke,
    });
    const input = buildCoachAdviceInput();

    const result = await generateCoachAdvice(input);

    expect(result.source).toBe('openai');
    expect(result.advice).toEqual(validCoachAdvice);
    expect(invokeMock).toHaveBeenCalledWith('generate-coach-advice', { body: { input } });
  });

  it('falls back to local advice when the Edge Function fails', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: new Error('edge failed') });
    const { generateCoachAdvice } = await importServiceWithSupabaseMock({
      configured: true,
      session: { access_token: 'redacted-test-token', user: { id: 'user-1' } },
      invoke,
    });

    const result = await generateCoachAdvice(buildCoachAdviceInput());

    expect(result.source).toBe('fallback');
    expect(result.error).toBe(genericFallbackError);
    expect(result.advice.summary).toMatch(/Estado/i);
  });

  it('preserves quota status and Retry-After instead of hiding a 429', async () => {
    const context = new Response(JSON.stringify({ error: 'Límite diario de Coach IA alcanzado.', code: 'AI_QUOTA_EXCEEDED' }), {
      status: 429,
      headers: { 'Retry-After': '3600', 'Content-Type': 'application/json' },
    });
    const invoke = vi.fn().mockResolvedValue({ data: null, error: { name: 'FunctionsHttpError', context } });
    const { generateCoachAdvice } = await importServiceWithSupabaseMock({
      configured: true,
      session: { access_token: 'redacted-test-token', user: { id: 'user-1' } },
      invoke,
    });

    const result = await generateCoachAdvice(buildCoachAdviceInput());

    expect(result.source).toBe('fallback');
    expect(result.code).toBe('AI_QUOTA_EXCEEDED');
    expect(result.status).toBe(429);
    expect(result.retryAfterSeconds).toBe(3600);
    expect(result.error).toMatch(/límite diario/i);
    expect(result.error).toMatch(/1 hora/i);
  });
});
