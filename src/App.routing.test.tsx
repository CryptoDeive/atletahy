import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./lib/supabaseClient', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

describe('deep routing and protected drafts', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores a demo test detail from the URL and keeps the test id in history', async () => {
    window.history.replaceState({}, '', '/demo/tests/ski-2k');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Test 2K SkiErg', level: 2 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /volver a tests/i }));
    expect(window.location.pathname).toBe('/demo/tests');
    fireEvent.click(screen.getAllByRole('button', { name: /abrir test/i })[0]);
    expect(window.location.pathname).toMatch(/^\/demo\/tests\//);
  });

  it('restores profile tabs and test filters from a non-sensitive query string', async () => {
    window.history.replaceState({}, '', '/demo/profile?tab=nutrition');
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Nutrición' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('link', { name: 'Tests & Ergs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Carrera' }));
    expect(window.location.search).toBe('?category=Carrera');
  });

  it('redirects an unauthenticated private deep link only after auth resolution and preserves its destination', async () => {
    window.history.replaceState({}, '', '/app/tests/ski-2k');

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(window.sessionStorage.getItem('atletahy:return-to')).toBe('/app/tests/ski-2k');
    expect(screen.getByRole('heading', { name: /prepara tu hyrox/i })).toBeInTheDocument();
  });

  it('offers stay, discard and save choices before leaving a dirty profile', async () => {
    window.history.replaceState({}, '', '/demo/profile');
    render(<App />);
    const name = await screen.findByLabelText('Nombre');
    fireEvent.change(name, { target: { value: 'Borrador aislado' } });

    fireEvent.click(screen.getByRole('link', { name: 'Entrenamientos' }));
    expect(screen.getByRole('dialog', { name: /cambios sin guardar/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Permanecer' }));
    expect(window.location.pathname).toBe('/demo/profile');
    expect(screen.getByDisplayValue('Borrador aislado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Entrenamientos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(window.location.pathname).toBe('/demo/trainings');
  });

  it('warns before unloading a dirty onboarding draft and isolates its autosave by identity', async () => {
    window.history.replaceState({}, '', '/demo/onboarding');
    render(<App />);
    const date = await screen.findByLabelText('Fecha de competición');
    fireEvent.change(date, { target: { value: '2027-01-20' } });

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(window.sessionStorage.getItem('atletahy:guest:onboarding-draft')).toContain('2027-01-20');
  });

  it('removes the scoped onboarding draft when changes are discarded', async () => {
    window.history.replaceState({}, '', '/demo/onboarding');
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Fecha de competición'), { target: { value: '2027-01-20' } });
    expect(window.sessionStorage.getItem('atletahy:guest:onboarding-draft')).toContain('2027-01-20');

    fireEvent.click(screen.getByRole('link', { name: 'Entrenamientos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));

    expect(window.sessionStorage.getItem('atletahy:guest:onboarding-draft')).toBeNull();
    expect(window.location.pathname).toBe('/demo/trainings');
  });

  it('uses the same stay, discard and save dialog for browser history navigation', async () => {
    window.history.replaceState({}, '', '/demo/trainings');
    window.history.pushState({}, '', '/demo/profile');
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Nombre'), { target: { value: 'Cambio pendiente' } });

    window.history.back();

    const dialog = await screen.findByRole('dialog', { name: /cambios sin guardar/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Permanecer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar borrador' })).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/demo/profile'));
  });

  it('manages focus, traps Tab, closes on Escape and restores the trigger', async () => {
    window.history.replaceState({}, '', '/demo/profile');
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Nombre'), { target: { value: 'Cambio accesible' } });
    const trigger = screen.getByRole('link', { name: 'Entrenamientos' });
    trigger.focus();
    fireEvent.click(trigger);

    const stay = screen.getByRole('button', { name: 'Permanecer' });
    const save = screen.getByRole('button', { name: 'Guardar borrador' });
    await waitFor(() => expect(stay).toHaveFocus());

    save.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(stay).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(save).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /cambios sin guardar/i })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps visible App copy free from placeholder-corrupted question marks', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('Comprobando sesión…');
    expect(source).toContain('permanecer aquí.');
    expect(source).not.toContain('sesi?n');
    expect(source).not.toContain('?Quieres salir');
    expect(source).not.toContain('aqu?.');
  });
});
