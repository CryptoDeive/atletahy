import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./components/plans/PlanGeneratorPanel', async () => {
  const React = await import('react');
  const { validGeneratedTrainingPlan } = await import('./test/planTestUtils');
  return {
    PlanGeneratorPanel: ({ onPlanChange }: { onPlanChange?: (plan: typeof validGeneratedTrainingPlan, reason: 'load' | 'generation') => void }) => React.createElement(
      'section',
      { 'aria-label': 'Generador de plan IA simulado' },
      React.createElement('button', { type: 'button', onClick: () => onPlanChange?.(validGeneratedTrainingPlan, 'generation') }, 'Generar plan de prueba'),
      React.createElement('button', { type: 'button', onClick: () => onPlanChange?.(validGeneratedTrainingPlan, 'load') }, 'Cargar plan de prueba'),
    ),
  };
});

import App from './App';

describe('generated plan calendar selection', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.localStorage.clear();
  });

  function renderTraining() {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver demo' }));
  }

  it('selects the first week and first day after generation even when today is inside the plan', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-07-15T10:00:00'));
    renderTraining();
    fireEvent.click(await screen.findByRole('button', { name: 'Generar plan de prueba' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Run Z2 + movilidad', level: 2 })).toBeInTheDocument());
    expect(screen.getByText(/PLAN IA · Base aeróbica y técnica HYROX · Semana 1 · Día 1/i)).toBeInTheDocument();
  });

  it('can still select today when an already active plan is loaded initially', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-07-15T10:00:00'));
    renderTraining();
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar plan de prueba' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Descanso activo', level: 2 })).toBeInTheDocument());
  });
});
