import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCoachAdviceInput, validCoachAdvice } from '../test/coachTestUtils';
import type { CoachAdvice } from '../types/coach';

const generateCoachAdvice = vi.fn();
const getCoachAdvice = vi.fn();
const saveCoachAdvice = vi.fn();
const saveCoachAdviceFeedback = vi.fn();

vi.mock('../services/coachService', () => ({
  generateCoachAdvice,
}));

vi.mock('../repositories/appRepository', () => ({
  getCoachAdvice,
  saveCoachAdvice,
  saveCoachAdviceFeedback,
}));

const adviceKey = 'week-6:day-1:2026-07-09';

function updatedAdvice(overrides: Partial<CoachAdvice> = {}): CoachAdvice {
  return {
    ...validCoachAdvice,
    summary: 'Consejo regenerado para este día.',
    objective: 'Ajustar la sesión con nueva información.',
    ...overrides,
  };
}

describe('CoachAdvicePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCoachAdvice.mockResolvedValue(null);
    saveCoachAdvice.mockResolvedValue(undefined);
    saveCoachAdviceFeedback.mockResolvedValue(true);
  });

  it('loads and opens saved advice for the selected day', async () => {
    getCoachAdvice.mockResolvedValue(validCoachAdvice);
    const { CoachAdvicePanel } = await import('./CoachAdvicePanel');

    render(<CoachAdvicePanel coachAdviceInput={buildCoachAdviceInput()} adviceKey={adviceKey} userId="user-1" />);

    await waitFor(() => expect(getCoachAdvice).toHaveBeenCalledWith('user-1', adviceKey));
    expect(await screen.findByText('Coach IA guardado')).toBeInTheDocument();
    expect(screen.getByText('Consejo cargado de Supabase')).toBeInTheDocument();
    expect(screen.getByText(validCoachAdvice.summary)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /regenerar consejo/i })).toBeInTheDocument();
  });

  it('shows generate advice button when there is no saved advice', async () => {
    const { CoachAdvicePanel } = await import('./CoachAdvicePanel');

    render(<CoachAdvicePanel coachAdviceInput={buildCoachAdviceInput()} adviceKey={adviceKey} userId="user-1" />);

    await waitFor(() => expect(getCoachAdvice).toHaveBeenCalledWith('user-1', adviceKey));
    expect(screen.getByRole('button', { name: /generar consejo/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /regenerar consejo/i })).not.toBeInTheDocument();
  });

  it('shows remote advice without visual status or source badges', async () => {
    generateCoachAdvice.mockResolvedValue({ advice: validCoachAdvice, source: 'openai' });
    const { CoachAdvicePanel } = await import('./CoachAdvicePanel');

    render(<CoachAdvicePanel coachAdviceInput={buildCoachAdviceInput()} adviceKey={adviceKey} userId="user-1" />);

    fireEvent.click(screen.getByRole('button', { name: /generar consejo/i }));

    expect(screen.getByRole('region', { name: /coach ia/i })).toHaveAttribute('aria-busy', 'true');

    expect(await screen.findByText('Coach IA')).toBeInTheDocument();
    expect(screen.getByText('Consejo generado ahora')).toBeInTheDocument();
    expect(screen.queryByText(/^Verde$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Estado verde$/i)).not.toBeInTheDocument();
    await waitFor(() => expect(saveCoachAdvice).toHaveBeenCalledWith('user-1', adviceKey, validCoachAdvice, expect.objectContaining({ source: 'openai' })));
  });

  it('announces source errors without relying on color', async () => {
    generateCoachAdvice.mockResolvedValue({ advice: validCoachAdvice, source: 'fallback', error: 'Servicio no disponible.' });
    const { CoachAdvicePanel } = await import('./CoachAdvicePanel');
    render(<CoachAdvicePanel coachAdviceInput={buildCoachAdviceInput()} adviceKey={adviceKey} userId="user-1" />);

    fireEvent.click(screen.getByRole('button', { name: /generar consejo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio no disponible.');
  });

  it('regenerates and replaces a saved advice with the same key', async () => {
    getCoachAdvice.mockResolvedValue(validCoachAdvice);
    const regeneratedAdvice = updatedAdvice();
    generateCoachAdvice.mockResolvedValue({ advice: regeneratedAdvice, source: 'openai' });
    const { CoachAdvicePanel } = await import('./CoachAdvicePanel');

    render(<CoachAdvicePanel coachAdviceInput={buildCoachAdviceInput()} adviceKey={adviceKey} userId="user-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /regenerar consejo/i }));

    await waitFor(() => expect(generateCoachAdvice).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(saveCoachAdvice).toHaveBeenCalledWith('user-1', adviceKey, regeneratedAdvice, expect.objectContaining({ source: 'openai' })));
    expect(await screen.findByText('Consejo actualizado')).toBeInTheDocument();
    expect(screen.getByText(regeneratedAdvice.summary)).toBeInTheDocument();
  });

  it('saves useful feedback with optional comment when there is a session and advice key', async () => {
    getCoachAdvice.mockResolvedValue(validCoachAdvice);
    const { CoachAdvicePanel } = await import('./CoachAdvicePanel');

    render(<CoachAdvicePanel coachAdviceInput={buildCoachAdviceInput()} adviceKey={adviceKey} userId="user-1" />);

    await screen.findByText(validCoachAdvice.summary);
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));
    fireEvent.change(screen.getByLabelText(/comentario para mejorar/i), { target: { value: 'Me ayudó a ajustar el ritmo.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar comentario' }));

    await waitFor(() => expect(saveCoachAdviceFeedback).toHaveBeenLastCalledWith('user-1', adviceKey, true, 'Me ayudó a ajustar el ritmo.'));
  });

  it('saves not useful feedback when the user taps No', async () => {
    getCoachAdvice.mockResolvedValue(validCoachAdvice);
    const { CoachAdvicePanel } = await import('./CoachAdvicePanel');

    render(<CoachAdvicePanel coachAdviceInput={buildCoachAdviceInput()} adviceKey={adviceKey} userId="user-1" />);

    await screen.findByText(validCoachAdvice.summary);
    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    await waitFor(() => expect(saveCoachAdviceFeedback).toHaveBeenCalledWith('user-1', adviceKey, false, ''));
  });

  it('keeps local fallback generation working without a session', async () => {
    generateCoachAdvice.mockResolvedValue({ advice: validCoachAdvice, source: 'local' });
    const { CoachAdvicePanel } = await import('./CoachAdvicePanel');

    render(<CoachAdvicePanel coachAdviceInput={buildCoachAdviceInput({ dailyReadiness: null })} adviceKey={adviceKey} />);

    expect(screen.getByText(/Completa el check-in diario/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /generar consejo/i }));

    expect(await screen.findByText('Coach local')).toBeInTheDocument();
    expect(await screen.findByText('Consejo generado ahora')).toBeInTheDocument();
    await waitFor(() => expect(saveCoachAdvice).toHaveBeenCalledWith(null, adviceKey, validCoachAdvice, expect.objectContaining({ source: 'local' })));
  });

  it('does not try to persist feedback without a session', async () => {
    getCoachAdvice.mockResolvedValue(validCoachAdvice);
    const { CoachAdvicePanel } = await import('./CoachAdvicePanel');

    render(<CoachAdvicePanel coachAdviceInput={buildCoachAdviceInput()} adviceKey={adviceKey} />);

    await screen.findByText(validCoachAdvice.summary);
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));

    expect(saveCoachAdviceFeedback).not.toHaveBeenCalled();
    expect(screen.getByText(/inicia sesión para guardar el feedback/i)).toBeInTheDocument();
  });

  it('keeps the fallback warning without showing a local-backup badge', async () => {
    generateCoachAdvice.mockResolvedValue({
      advice: validCoachAdvice,
      source: 'fallback',
      error: 'No se pudo usar Coach IA real. Se ha generado una recomendación local.',
    });
    const { CoachAdvicePanel } = await import('./CoachAdvicePanel');

    render(<CoachAdvicePanel coachAdviceInput={buildCoachAdviceInput()} adviceKey={adviceKey} userId="user-1" />);

    fireEvent.click(screen.getByRole('button', { name: /generar consejo/i }));

    expect(await screen.findByText(/No se pudo usar Coach IA real/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Respaldo local$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Verde$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Estado verde$/i)).not.toBeInTheDocument();
    expect(saveCoachAdvice).not.toHaveBeenCalled();
  });
});


