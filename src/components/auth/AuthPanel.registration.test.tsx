import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(async () => ({ error: null })),
  signUp: vi.fn(async () => ({ error: null })),
  unsubscribe: vi.fn(),
}));

vi.mock('../../lib/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: mocks.unsubscribe } } })),
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signOut: vi.fn(async () => ({ error: null })),
    },
  },
}));

import { AuthPanel } from './AuthPanel';

describe('AuthPanel registration submission', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submits registration rather than login when Enter submits registration mode', async () => {
    render(<AuthPanel preferredMode="register" publicFacing />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'athlete@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByLabelText(/Confirmo que tengo 18 años/));
    fireEvent.click(screen.getByLabelText(/He leído y acepto/));

    const form = screen.getByLabelText('Email').closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledTimes(1));
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({ emailRedirectTo: window.location.origin }),
    }));
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
});
