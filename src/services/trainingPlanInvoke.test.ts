import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validPlanGenerationInput } from '../test/planTestUtils';
import { invokeTrainingPlanWithTimeout, TRAINING_PLAN_CLIENT_TIMEOUT_MS } from './trainingPlanInvoke';

describe('invokeTrainingPlanWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('preserves the exact payload body { input } and clears the timer on success', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { plan: { ok: true } }, error: null });

    const resultPromise = invokeTrainingPlanWithTimeout(validPlanGenerationInput, { invoke });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ data: { plan: { ok: true } }, error: null, timedOut: false });
    expect(invoke).toHaveBeenCalledWith({
      body: { input: validPlanGenerationInput },
      signal: expect.any(Object),
    });
    expect(invoke.mock.calls[0]?.[0]).not.toHaveProperty('timeout');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('marks local aborts as explicit timeouts without conflating generic fetch failures', async () => {
    const invoke = vi.fn().mockImplementation(async ({ signal }: { signal: AbortSignal }) => {
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
      return {
        data: null,
        error: { name: 'FunctionsFetchError', context: new DOMException('Timed out locally', 'AbortError') },
      };
    });

    const resultPromise = invokeTrainingPlanWithTimeout(validPlanGenerationInput, {
      invoke,
      timeoutMs: 25,
    });

    await vi.advanceTimersByTimeAsync(25);
    const result = await resultPromise;

    expect(result).toEqual({
      data: null,
      error: { name: 'FunctionsFetchError', context: expect.any(DOMException) },
      timedOut: true,
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(TRAINING_PLAN_CLIENT_TIMEOUT_MS).toBe(145_000);
  });
});
