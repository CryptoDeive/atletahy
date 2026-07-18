import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  saveAthleteState: vi.fn(),
  getAthleteState: vi.fn(async () => null),
  getDailyReadiness: vi.fn(async () => null),
  getWorkoutLogs: vi.fn(async () => []),
  saveDailyReadiness: vi.fn(async () => undefined),
  saveWorkoutLog: vi.fn(async () => undefined),
  syncLocalDataToSupabase: vi.fn(async () => undefined),
}));

vi.mock('./lib/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}));

vi.mock('./repositories/appRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./repositories/appRepository')>();

  return {
    ...actual,
    getAthleteState: mocks.getAthleteState,
    getDailyReadiness: mocks.getDailyReadiness,
    getWorkoutLogs: mocks.getWorkoutLogs,
    saveAthleteState: mocks.saveAthleteState,
    saveDailyReadiness: mocks.saveDailyReadiness,
    saveWorkoutLog: mocks.saveWorkoutLog,
    syncLocalDataToSupabase: mocks.syncLocalDataToSupabase,
  };
});

vi.mock('./components/auth/AuthPanel', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    AuthPanel: ({ onSessionChange }: { onSessionChange?: (session: { userId: string; email: string }) => void }) => {
      React.useEffect(() => {
        onSessionChange?.({ userId: 'user-1', email: 'deivi@example.com' });
      }, [onSessionChange]);

      return <button type="button">Cerrar sesión</button>;
    },
  };
});

import App from './App';

function fillOnboardingUntilFinish() {
  fireEvent.change(screen.getByLabelText('Fecha de competición'), { target: { value: '2026-11-22' } });
  fireEvent.change(screen.getByLabelText('Objetivo principal'), { target: { value: 'competir' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.click(screen.getByLabelText('Lunes'));
  fireEvent.change(screen.getByLabelText('Tiempo máximo por sesión'), { target: { value: '75' } });
  fireEvent.change(screen.getByLabelText('Hora preferida'), { target: { value: 'mañana' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
}

describe('App onboarding completion persistence', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.clearAllMocks();
    mocks.getAthleteState.mockResolvedValue(null);
    mocks.getDailyReadiness.mockResolvedValue(null);
    mocks.getWorkoutLogs.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('updates App and navigates to Entrenamientos only after saveAthleteState succeeds', async () => {
    let resolveSave: (() => void) | undefined;
    mocks.saveAthleteState.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Configura tu preparación HYROX', level: 2 })).toBeInTheDocument());
    fillOnboardingUntilFinish();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    await waitFor(() => expect(mocks.saveAthleteState).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        profile: expect.objectContaining({
          targetDate: '2026-11-22',
          mainGoal: 'competir',
          onboardingCompleted: true,
          onboardingCompletedAt: expect.any(String),
        }),
        availability: expect.objectContaining({
          availableDays: ['Lunes'],
          maxSessionMinutes: 75,
          preferredTrainingTime: 'mañana',
        }),
      }),
    ));
    expect(screen.getByRole('heading', { name: 'Configura tu preparación HYROX', level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Dashboard semanal/i })).not.toBeInTheDocument();

    await waitFor(() => expect(mocks.saveAthleteState).toHaveBeenCalled());
    await act(async () => { resolveSave?.(); });
    await waitFor(() => expect(screen.getByRole('region', { name: /Dashboard semanal/i })).toBeInTheDocument());
  });

  it('keeps onboarding visible and shows an error when saveAthleteState fails', async () => {
    mocks.saveAthleteState.mockRejectedValue(new Error('Supabase unavailable'));

    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Configura tu preparación HYROX', level: 2 })).toBeInTheDocument());
    fillOnboardingUntilFinish();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo guardar/i));
    expect(screen.getByRole('heading', { name: 'Configura tu preparación HYROX', level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Dashboard semanal/i })).not.toBeInTheDocument();
  });

  it('keeps onboarding mounted and blocks global navigation while saveAthleteState is pending, then unlocks after success', async () => {
    let resolveSave: (() => void) | undefined;
    mocks.saveAthleteState.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Configura tu preparación HYROX', level: 2 })).toBeInTheDocument());
    fillOnboardingUntilFinish();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    expect(screen.getByRole('button', { name: /HYROX Planner/i })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Entrenamientos' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('link', { name: 'Plan IA' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tests & Ergs' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(screen.getByRole('button', { name: /1\.\s*Objetivo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saltar por ahora' }));
    fireEvent.click(screen.getByRole('button', { name: /HYROX Planner/i }));
    fireEvent.click(screen.getByRole('link', { name: 'Mi perfil' }));

    expect(screen.getByRole('heading', { name: 'Configura tu preparación HYROX', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
    expect(screen.getByText(/Tú decides sobre tus datos sensibles/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Dashboard semanal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mi perfil', level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Generador de plan IA', level: 2 })).not.toBeInTheDocument();

    await waitFor(() => expect(mocks.saveAthleteState).toHaveBeenCalledTimes(1));
    await act(async () => { resolveSave?.(); });
    await waitFor(() => expect(screen.getByRole('region', { name: /Dashboard semanal/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('link', { name: 'Mi perfil' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Mi perfil', level: 2 })).toBeInTheDocument());
  });

  it('re-enables global navigation after saveAthleteState fails', async () => {
    let rejectSave: ((error?: unknown) => void) | undefined;
    mocks.saveAthleteState.mockImplementation(
      () =>
        new Promise<void>((_, reject) => {
          rejectSave = reject;
        }),
    );

    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Configura tu preparación HYROX', level: 2 })).toBeInTheDocument());
    fillOnboardingUntilFinish();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    expect(screen.getByRole('button', { name: /HYROX Planner/i })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(screen.getByRole('link', { name: 'Mi perfil' }));
    expect(screen.queryByRole('heading', { name: 'Mi perfil', level: 2 })).not.toBeInTheDocument();

    await waitFor(() => expect(mocks.saveAthleteState).toHaveBeenCalled());
    rejectSave?.(new Error('Supabase unavailable'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo guardar/i));

    expect(screen.getByRole('button', { name: /HYROX Planner/i })).not.toBeDisabled();
    expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('aria-disabled', 'false');

    fireEvent.click(screen.getByRole('link', { name: 'Mi perfil' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Mi perfil', level: 2 })).toBeInTheDocument());
  });
});
