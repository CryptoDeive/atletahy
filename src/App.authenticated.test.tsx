import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./lib/supabaseClient', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

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

describe('HYROX Planner authenticated shell', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('shows OnboardingView when the user has a session and incomplete onboarding', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Configura tu preparación HYROX', level: 2 })).toBeInTheDocument());
    expect(screen.getByText('HYROX Planner')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Planifica tu preparación HYROX con IA', level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Dashboard semanal/i })).not.toBeInTheDocument();
  });

  it('shows Entrenamientos automatically when onboarding is completed', async () => {
    window.localStorage.setItem('atletahy:user-1:athlete-profile', JSON.stringify({
      name: '',
      birthDate: '',
      heightCm: '',
      weightKg: '',
      sex: '',
      hyroxCategory: 'Open',
      targetDate: '2026-11-22',
      mainGoal: 'terminar',
      targetTime: '01:20:00',
      onboardingCompleted: true,
      onboardingCompletedAt: '2026-07-09T10:00:00.000Z',
    }));
    window.localStorage.setItem('atletahy:user-1:training-availability', JSON.stringify({
      availableDays: ['Lunes', 'Miércoles', 'Viernes'],
      preferredTrainingTime: 'mañana',
      maxSessionMinutes: 75,
      canDoubleSession: false,
      minHoursBetweenSessions: '',
      scheduleNotes: '',
    }));

    render(<App />);

    await waitFor(() => expect(screen.getByRole('region', { name: /Dashboard semanal/i })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Configura tu preparación HYROX', level: 2 })).not.toBeInTheDocument();
  });

  it('allows skipping onboarding for the current session', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Configura tu preparación HYROX', level: 2 })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Saltar por ahora' }));

    await waitFor(() => expect(screen.getByRole('region', { name: /Dashboard semanal/i })).toBeInTheDocument());
  });

  it('saves AthleteState when finishing onboarding', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Configura tu preparación HYROX', level: 2 })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Fecha de competición'), { target: { value: '2026-11-22' } });
    fireEvent.change(screen.getByLabelText('Objetivo principal'), { target: { value: 'competir' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    fireEvent.change(screen.getByLabelText('Volumen actual carrera semanal km'), { target: { value: '32' } });
    fireEvent.change(screen.getByLabelText('Tirada larga actual km'), { target: { value: '14' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    fireEvent.click(screen.getByLabelText('Lunes'));
    fireEvent.click(screen.getByLabelText('Miércoles'));
    fireEvent.click(screen.getByLabelText('Viernes'));
    fireEvent.change(screen.getByLabelText('Tiempo máximo por sesión'), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText('Hora preferida'), { target: { value: 'mañana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    fireEvent.click(screen.getByLabelText('SkiErg'));
    fireEvent.click(screen.getByLabelText('Sled'));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    await waitFor(() => expect(screen.getByRole('region', { name: /Dashboard semanal/i })).toBeInTheDocument());
    const profile = JSON.parse(window.localStorage.getItem('atletahy:user-1:athlete-profile') ?? '{}');
    const metrics = JSON.parse(window.localStorage.getItem('atletahy:user-1:physiology-metrics') ?? '{}');
    const equipment = JSON.parse(window.localStorage.getItem('atletahy:user-1:equipment-availability') ?? '{}');
    expect(profile).toMatchObject({ targetDate: '2026-11-22', mainGoal: 'competir', onboardingCompleted: true });
    expect(profile.onboardingCompletedAt).toEqual(expect.any(String));
    expect(metrics).toMatchObject({ currentRunningVolumeKm: 32, currentLongRunKm: 14 });
    expect(equipment).toMatchObject({ skiErg: true, sled: true });
  });

  it('shows onboarding state in Mi perfil and opens edit onboarding', async () => {
    window.localStorage.setItem('atletahy:user-1:athlete-profile', JSON.stringify({
      name: '', birthDate: '', heightCm: '', weightKg: '', sex: '', hyroxCategory: 'Open',
      targetDate: '2026-11-22', mainGoal: 'terminar', targetTime: '', onboardingCompleted: true, onboardingCompletedAt: '2026-07-09T10:00:00.000Z',
    }));
    window.localStorage.setItem('atletahy:user-1:training-availability', JSON.stringify({
      availableDays: ['Lunes', 'Miércoles', 'Viernes'], preferredTrainingTime: 'mañana', maxSessionMinutes: 75, canDoubleSession: false, minHoursBetweenSessions: '', scheduleNotes: '',
    }));

    render(<App />);

    await waitFor(() => expect(screen.getByRole('region', { name: /Dashboard semanal/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('link', { name: 'Mi perfil' }));

    expect(await screen.findByText('Perfil configurado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar configuración inicial' }));

    expect(await screen.findByRole('heading', { name: 'Configura tu preparación HYROX', level: 2 })).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-11-22')).toBeInTheDocument();
  });
});
