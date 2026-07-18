import type { PlanGenerationInput } from '../utils/planInput';

export const TRAINING_PLAN_CLIENT_TIMEOUT_MS = 145_000;

type InvokeTrainingPlanOptions = {
  body: { input: PlanGenerationInput };
  signal: AbortSignal;
};

type InvokeTrainingPlanResult<TData = unknown, TError = unknown> = {
  data: TData | null;
  error: TError | null;
  timedOut: boolean;
};

export async function invokeTrainingPlanWithTimeout<TData = unknown, TError = unknown>(
  input: PlanGenerationInput,
  {
    invoke,
    timeoutMs = TRAINING_PLAN_CLIENT_TIMEOUT_MS,
    createAbortController = () => new AbortController(),
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
  }: {
    invoke: (options: InvokeTrainingPlanOptions) => Promise<{ data: TData | null; error: TError | null }>;
    timeoutMs?: number;
    createAbortController?: () => AbortController;
    setTimeoutFn?: typeof setTimeout;
    clearTimeoutFn?: typeof clearTimeout;
  },
): Promise<InvokeTrainingPlanResult<TData, TError>> {
  let timedOut = false;
  const controller = createAbortController();
  const timeoutId = setTimeoutFn(() => {
    timedOut = true;
    controller.abort('TRAINING_PLAN_CLIENT_TIMEOUT');
  }, timeoutMs);

  try {
    const result = await invoke({
      body: { input },
      signal: controller.signal,
    });

    return {
      data: result.data,
      error: result.error,
      timedOut: timedOut || controller.signal.aborted,
    };
  } finally {
    clearTimeoutFn(timeoutId);
  }
}
