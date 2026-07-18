import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthPanel } from './AuthPanel';

const authStateCallbacks: ((event: string, session: { user: { id: string; email?: string } } | null) => void)[] = [];
const authMock = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn((callback: (event: string, session: { user: { id: string; email?: string } } | null) => void) => {
    authStateCallbacks.push(callback);
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  }),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

vi.mock('../../lib/supabaseClient', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

describe('AuthPanel', () => {
  afterEach(() => {
    vi.clearAllMocks();
    authStateCallbacks.length = 0;
  });

  it('shows local mode when Supabase is not configured', () => {
    render(<AuthPanel />);

    expect(screen.getByText('Supabase no configurado. La app est\u00e1 usando modo local.')).toBeInTheDocument();
    expect(screen.getByText('Modo local')).toBeInTheDocument();
  });
});
