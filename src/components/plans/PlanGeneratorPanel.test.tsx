import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { validAthleteStateForPlan, validGeneratedTrainingPlan } from '../../test/planTestUtils';

const generateTrainingPlan = vi.fn();
const getActiveTrainingPlan = vi.fn();
const saveTrainingPlan = vi.fn();

vi.mock('../../services/planService', () => ({ generateTrainingPlan }));
vi.mock('../../repositories/appRepository', () => ({ getActiveTrainingPlan, saveTrainingPlan }));

describe('PlanGeneratorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveTrainingPlan.mockResolvedValue(null);
    saveTrainingPlan.mockImplementation(async (_userId, plan, input) => ({
      id: 'plan-1',
      userId: 'user-1',
      title: plan.title,
      status: 'active',
      targetRaceDate: plan.targetRaceDate,
      generatedAt: plan.generatedAt,
      inputSnapshotJson: input,
      planJson: plan,
      createdAt: '2026-07-09T10:00:00.000Z',
      updatedAt: '2026-07-09T10:00:00.000Z',
    }));
  });

  it('shows the generate CTA when there is no plan', async () => {
    const { PlanGeneratorPanel } = await import('./PlanGeneratorPanel');

    render(<PlanGeneratorPanel athleteState={validAthleteStateForPlan} dailyReadiness={null} recentWorkoutLogs={[]} userId="user-1" />);

    expect(await screen.findByRole('button', { name: /Generar mi plan con IA/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Crea tu plan con IA/i })).toBeInTheDocument();
  });

  it('warns when onboarding is incomplete', async () => {
    const { PlanGeneratorPanel } = await import('./PlanGeneratorPanel');

    render(<PlanGeneratorPanel athleteState={validAthleteStateForPlan} dailyReadiness={null} recentWorkoutLogs={[]} onboardingIncomplete />);

    expect(await screen.findByText(/Completa el onboarding para generar un plan m.s preciso/i)).toBeInTheDocument();
  });

  it('shows exact required-field blockers and deep-links to the matching profile tab', async () => {
    const onResolveBlocker = vi.fn();
    const { PlanGeneratorPanel } = await import('./PlanGeneratorPanel');

    render(<PlanGeneratorPanel
      athleteState={{
        ...validAthleteStateForPlan,
        availability: { ...validAthleteStateForPlan.availability, availableDays: [] },
      }}
      dailyReadiness={null}
      recentWorkoutLogs={[]}
      userId="user-1"
      onResolveBlocker={onResolveBlocker}
    />);

    expect(await screen.findByText('Días disponibles')).toBeInTheDocument();
    expect(screen.getByText(/Selecciona al menos un día/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generar mi plan con IA/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Completar en Mi perfil: Días disponibles/i }));
    expect(onResolveBlocker).toHaveBeenCalledWith('availability');
  });

  it('guards against double requests while generation is already in progress', async () => {
    let resolveGeneration: ((value: unknown) => void) | null = null;
    generateTrainingPlan.mockImplementation(() => new Promise((resolve) => {
      resolveGeneration = resolve;
    }));
    const { PlanGeneratorPanel } = await import('./PlanGeneratorPanel');

    render(<PlanGeneratorPanel athleteState={validAthleteStateForPlan} dailyReadiness={null} recentWorkoutLogs={[]} userId="user-1" />);
    const button = await screen.findByRole('button', { name: /Generar mi plan con IA/i });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(generateTrainingPlan).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('region', { name: /generador de plan ia/i })).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByText(/Generando plan IA/i)).toBeInTheDocument();

    resolveGeneration?.({ plan: validGeneratedTrainingPlan, source: 'openai' });
    await waitFor(() => expect(saveTrainingPlan).toHaveBeenCalledTimes(1));
  });

  it('announces asynchronous generation feedback', async () => {
    generateTrainingPlan.mockResolvedValue({ plan: null, source: 'fallback', code: 'OPENAI_TIMEOUT', status: 504 });
    const { PlanGeneratorPanel } = await import('./PlanGeneratorPanel');
    render(<PlanGeneratorPanel athleteState={validAthleteStateForPlan} dailyReadiness={null} recentWorkoutLogs={[]} />);

    fireEvent.click(await screen.findByRole('button', { name: /Generar mi plan con IA/i }));

    expect(await screen.findByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('generates, saves and shows a plan summary', async () => {
    generateTrainingPlan.mockResolvedValue({ plan: validGeneratedTrainingPlan, source: 'openai' });
    const { PlanGeneratorPanel } = await import('./PlanGeneratorPanel');

    render(<PlanGeneratorPanel athleteState={validAthleteStateForPlan} dailyReadiness={null} recentWorkoutLogs={[]} userId="user-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Generar mi plan con IA/i }));

    await waitFor(() => expect(saveTrainingPlan).toHaveBeenCalled());
    expect(await screen.findByText(validGeneratedTrainingPlan.title)).toBeInTheDocument();
    expect(screen.getByText(/Semanas:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver resumen/i })).toBeInTheDocument();
    expect(screen.queryByText(/Resumen del bloque/i)).not.toBeInTheDocument();
  });

  it('keeps the generated plan visible and retries only persistence after saving fails', async () => {
    const onPlanChange = vi.fn();
    generateTrainingPlan.mockResolvedValue({ plan: validGeneratedTrainingPlan, source: 'openai' });
    saveTrainingPlan
      .mockRejectedValueOnce(new Error('save failed'))
      .mockImplementationOnce(async (_userId, plan, input) => ({
        id: 'plan-1',
        userId: 'user-1',
        title: plan.title,
        status: 'active',
        targetRaceDate: plan.targetRaceDate,
        generatedAt: plan.generatedAt,
        inputSnapshotJson: input,
        planJson: plan,
        createdAt: '2026-07-09T10:00:00.000Z',
        updatedAt: '2026-07-09T10:00:00.000Z',
      }));
    const { PlanGeneratorPanel } = await import('./PlanGeneratorPanel');

    render(<PlanGeneratorPanel athleteState={validAthleteStateForPlan} dailyReadiness={null} recentWorkoutLogs={[]} userId="user-1" onPlanChange={onPlanChange} />);
    fireEvent.click(await screen.findByRole('button', { name: /Generar mi plan con IA/i }));

    expect(await screen.findByText('El plan se generó, pero no se pudo guardar.')).toBeInTheDocument();
    expect(screen.getByText(validGeneratedTrainingPlan.title)).toBeInTheDocument();
    expect(onPlanChange).toHaveBeenCalledWith(validGeneratedTrainingPlan, 'generation');

    fireEvent.click(screen.getByRole('button', { name: /Reintentar guardado/i }));

    await waitFor(() => expect(saveTrainingPlan).toHaveBeenCalledTimes(2));
    expect(generateTrainingPlan).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Plan generado y guardado/i)).toBeInTheDocument();
  });

  it('shows code-based frontend errors and supports retry + reset', async () => {
    generateTrainingPlan
      .mockResolvedValueOnce({ plan: null, source: 'fallback', code: 'OPENAI_TIMEOUT', status: 504, error: 'unsafe' })
      .mockResolvedValueOnce({ plan: validGeneratedTrainingPlan, source: 'openai' });
    const { PlanGeneratorPanel } = await import('./PlanGeneratorPanel');

    render(<PlanGeneratorPanel athleteState={validAthleteStateForPlan} dailyReadiness={null} recentWorkoutLogs={[]} userId="user-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /Generar mi plan con IA/i }));

    expect(await screen.findByText(/tard.\s+demasiado en responder/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ocultar mensaje/i }));
    await waitFor(() => expect(screen.queryByText(/tard.\s+demasiado en responder/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Generar mi plan con IA/i }));
    await waitFor(() => expect(saveTrainingPlan).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Plan generado y guardado/i)).toBeInTheDocument();
  });

  it('ignores a corrupt stored plan instead of rendering broken legacy data', async () => {
    getActiveTrainingPlan.mockResolvedValue({
      id: 'broken',
      userId: 'user-1',
      title: 'Corrupto',
      status: 'active',
      targetRaceDate: '2026-11-22',
      generatedAt: '2026-07-09T10:00:00.000Z',
      inputSnapshotJson: {},
      planJson: { weeks: [] },
      createdAt: '2026-07-09T10:00:00.000Z',
      updatedAt: '2026-07-09T10:00:00.000Z',
    });
    const { PlanGeneratorPanel } = await import('./PlanGeneratorPanel');

    render(<PlanGeneratorPanel athleteState={validAthleteStateForPlan} dailyReadiness={null} recentWorkoutLogs={[]} userId="user-1" />);

    expect(await screen.findByRole('heading', { name: /Crea tu plan con IA/i })).toBeInTheDocument();
    expect(screen.queryByText('Corrupto')).not.toBeInTheDocument();
  });

  it('notifies the training calendar immediately after regenerating', async () => {
    generateTrainingPlan.mockResolvedValue({ plan: validGeneratedTrainingPlan, source: 'openai' });
    const onPlanChange = vi.fn();
    const { PlanGeneratorPanel } = await import('./PlanGeneratorPanel');

    render(<PlanGeneratorPanel athleteState={validAthleteStateForPlan} dailyReadiness={null} recentWorkoutLogs={[]} onPlanChange={onPlanChange} />);
    fireEvent.click(await screen.findByRole('button', { name: /Generar mi plan con IA/i }));

    await waitFor(() => expect(onPlanChange).toHaveBeenCalledWith(validGeneratedTrainingPlan, 'generation'));
    expect(screen.getByRole('button', { name: 'Regenerar plan' })).toBeInTheDocument();
  });

  it('does not replace a newly generated calendar when the initial plan load finishes late', async () => {
    let resolveInitialLoad: ((value: null) => void) | null = null;
    getActiveTrainingPlan.mockImplementation(() => new Promise((resolve) => { resolveInitialLoad = resolve; }));
    generateTrainingPlan.mockResolvedValue({ plan: validGeneratedTrainingPlan, source: 'openai' });
    const onPlanChange = vi.fn();
    const { PlanGeneratorPanel } = await import('./PlanGeneratorPanel');

    render(<PlanGeneratorPanel athleteState={validAthleteStateForPlan} dailyReadiness={null} recentWorkoutLogs={[]} onPlanChange={onPlanChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Generar mi plan con IA/i }));
    await waitFor(() => expect(onPlanChange).toHaveBeenCalledWith(validGeneratedTrainingPlan, 'generation'));

    resolveInitialLoad?.(null);
    await waitFor(() => expect(getActiveTrainingPlan).toHaveBeenCalledTimes(1));
    expect(onPlanChange).toHaveBeenLastCalledWith(validGeneratedTrainingPlan, 'generation');
  });

  it('does not reset a user calendar selection when persistence finishes', async () => {
    let resolveSave: ((value: unknown) => void) | null = null;
    generateTrainingPlan.mockResolvedValue({ plan: validGeneratedTrainingPlan, source: 'openai' });
    saveTrainingPlan.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    const { PlanGeneratorPanel } = await import('./PlanGeneratorPanel');

    function Harness() {
      const [selection, setSelection] = useState('manual');
      return (
        <>
          <p>Selección: {selection}</p>
          <button type="button" onClick={() => setSelection('usuario')}>Elegir jueves</button>
          <PlanGeneratorPanel
            athleteState={validAthleteStateForPlan}
            dailyReadiness={null}
            recentWorkoutLogs={[]}
            onPlanChange={(plan) => { if (plan) setSelection('primer día'); }}
          />
        </>
      );
    }

    render(<Harness />);
    fireEvent.click(await screen.findByRole('button', { name: /Generar mi plan con IA/i }));
    await waitFor(() => expect(screen.getByText('Selección: primer día')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Elegir jueves' }));
    expect(screen.getByText('Selección: usuario')).toBeInTheDocument();

    resolveSave?.({
      id: 'plan-1', title: validGeneratedTrainingPlan.title, status: 'active',
      targetRaceDate: validGeneratedTrainingPlan.targetRaceDate, generatedAt: validGeneratedTrainingPlan.generatedAt,
      inputSnapshotJson: {}, planJson: validGeneratedTrainingPlan,
      createdAt: validGeneratedTrainingPlan.generatedAt, updatedAt: validGeneratedTrainingPlan.generatedAt,
    });

    await waitFor(() => expect(screen.getByText(/Plan generado y guardado/i)).toBeInTheDocument());
    expect(screen.getByText('Selección: usuario')).toBeInTheDocument();
  });
});
