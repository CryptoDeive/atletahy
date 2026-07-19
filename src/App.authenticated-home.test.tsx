import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(async () => ({
    data: { session: { user: { id: 'user-1', email: 'deivi@example.com' } } },
    error: null,
  })),
}));

vi.mock('./lib/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { getSession } },
}));

vi.mock('./components/auth/AuthPanel', () => ({
  AuthPanel: () => null,
}));

vi.mock('./repositories/appRepository', () => ({
  getAthleteState: vi.fn(async () => null),
  getDailyReadiness: vi.fn(async () => null),
  getWorkoutLogs: vi.fn(async () => []),
  saveAthleteState: vi.fn(),
  saveDailyReadiness: vi.fn(),
  saveWorkoutLog: vi.fn(),
  syncLocalDataToSupabase: vi.fn(),
}));

import App from './App';

describe('authenticated home', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('recognizes the persisted session and replaces every guest action with app navigation', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByRole('link', { name: 'Entrenamientos' })).toBeInTheDocument());

    const header = screen.getByRole('banner');
    expect(within(header).getByText('ATLETAHY')).toBeInTheDocument();
    expect(within(header).getByText('HYBRID TRAINING WITH AI')).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'Entrenamientos' })).toBeInTheDocument();
    expect(within(header).queryByRole('link', { name: /C.mo funciona/i })).not.toBeInTheDocument();
    expect(within(header).queryByRole('link', { name: /Iniciar sesi.n/i })).not.toBeInTheDocument();
    expect(within(header).queryByRole('button', { name: 'Crear cuenta' })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Ir a entrenamientos/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear cuenta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Iniciar sesi.n/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver demo' })).not.toBeInTheDocument();
  });
});
