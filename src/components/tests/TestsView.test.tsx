import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestsView } from './TestsView';

vi.mock('../../lib/supabaseClient', () => ({ isSupabaseConfigured: false, supabase: null }));

describe('TestsView', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => { cleanup(); window.localStorage.clear(); });

  it('shows all eleven test cards without images', async () => {
    const { container } = render(<TestsView userId={null} athleteWeightKg={70} />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: /abrir test/i })).toHaveLength(11));
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('opens a test with its description and form, then returns', async () => {
    render(<TestsView userId={null} athleteWeightKg={70} />);
    await waitFor(() => expect(screen.getByText('Test 2K SkiErg')).toBeInTheDocument());
    const card = screen.getByText('Test 2K SkiErg').closest('article');
    fireEvent.click(within(card as HTMLElement).getByRole('button', { name: /abrir test/i }));
    expect(screen.getByRole('heading', { name: 'Test 2K SkiErg' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar resultado' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Tests' }));
    expect(screen.getByRole('heading', { name: 'Tests & Ergómetros' })).toBeInTheDocument();
  });

  it('saves a valid result and refreshes the history', async () => {
    render(<TestsView userId={null} athleteWeightKg={70} initialTestId="ski-2k" />);
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-07-15' } });
    fireEvent.change(screen.getByLabelText('Tiempo total'), { target: { value: '7:40' } });
    fireEvent.change(screen.getByLabelText('Damper'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar resultado' }));
    await waitFor(() => expect(screen.getByText('Resultado guardado')).toBeInTheDocument());
    expect(screen.getByText('2026-07-15')).toBeInTheDocument();
    expect(screen.queryByText('Todavía no has registrado resultados para este test.')).not.toBeInTheDocument();
  });
});
