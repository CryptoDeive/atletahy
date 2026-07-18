import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  defaultAthleteProfile,
  defaultEquipmentAvailability,
  defaultNutritionPreferences,
  defaultPhysiologyMetrics,
  defaultTrainingAvailability,
} from '../../data/defaultAthleteState';
import type { AthleteState } from '../../types/athlete';
import { OnboardingView } from './OnboardingView';

function buildAthleteState(overrides: Partial<AthleteState> = {}): AthleteState {
  return {
    profile: { ...defaultAthleteProfile, ...overrides.profile },
    physiology: { ...defaultPhysiologyMetrics, ...overrides.physiology },
    availability: { ...defaultTrainingAvailability, ...overrides.availability },
    equipment: { ...defaultEquipmentAvailability, ...overrides.equipment },
    injuries: overrides.injuries ?? [],
    nutrition: { ...defaultNutritionPreferences, ...overrides.nutrition },
  };
}

function buildCompletableAthleteState(overrides: Partial<AthleteState> = {}): AthleteState {
  return buildAthleteState({
    ...overrides,
    profile: {
      targetDate: '2026-11-22',
      mainGoal: 'competir',
      hyroxCategory: 'women_open',
      ...overrides.profile,
    },
    availability: {
      availableDays: ['Lunes'],
      preferredTrainingTime: 'mañana',
      maxSessionMinutes: 75,
      ...overrides.availability,
    },
  });
}

function goToLastStep() {
  for (let index = 0; index < 5; index += 1) {
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  }
}

describe('OnboardingView finish flow', () => {
  it('never writes health data to the session draft before explicit health consent', async () => {
    const key = 'onboarding-sensitive-draft';
    render(<OnboardingView athleteState={buildCompletableAthleteState()} onComplete={vi.fn()} onSkip={vi.fn()} draftStorageKey={key} />);

    fireEvent.click(screen.getByRole('button', { name: /5\.\s*Lesiones/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));
    fireEvent.change(screen.getByLabelText('Zona'), { target: { value: 'rodilla-secreta' } });

    await waitFor(() => expect(window.sessionStorage.getItem(key)).not.toContain('rodilla-secreta'));
    const stored = JSON.parse(window.sessionStorage.getItem(key) ?? '{}');
    expect(stored.injuries).toBeUndefined();
    expect(stored.nutrition).toBeUndefined();
    expect(stored.physiology?.restingHrBaseline).toBeUndefined();
  });
  it('requests health and AI consent separately without preselecting either choice', () => {
    render(<OnboardingView athleteState={buildCompletableAthleteState()} onComplete={vi.fn()} onSkip={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /6\.\s*Privacidad/i }));
    expect(screen.getByLabelText(/traten mis datos de salud/i)).not.toBeChecked();
    expect(screen.getByLabelText(/comuniquen a OpenAI/i)).not.toBeChecked();
  });

  it('does not allow AI consent unless health-data processing is also accepted', () => {
    render(<OnboardingView athleteState={buildCompletableAthleteState()} onComplete={vi.fn()} onSkip={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /6\.\s*Privacidad/i }));
    expect(screen.getByLabelText(/comuniquen a OpenAI/i)).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/traten mis datos de salud/i));
    expect(screen.getByLabelText(/comuniquen a OpenAI/i)).toBeEnabled();
  });
  it('renders Spanish copy without placeholder characters or mojibake', () => {
    render(<OnboardingView athleteState={buildAthleteState()} onComplete={vi.fn()} onSkip={vi.fn()} />);

    expect(screen.getByText('Paso 1 · Objetivo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /3\.\s*Disponibilidad/i }));
    fireEvent.click(screen.getByLabelText('Lunes'));
    expect(screen.getByText('Recomendado: al menos 3 días disponibles por semana para una preparación HYROX más sólida.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /5\.\s*Lesiones/i }));
    expect(screen.getByText('Paso 5 · Lesiones/molestias')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sí' })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Ã|Â|\uFFFD|d\?as|m\?s|s\?lida/);
  });

  it('validates required competition date before finishing', async () => {
    const onComplete = vi.fn();
    render(
      <OnboardingView
        athleteState={buildCompletableAthleteState({
          profile: {
            targetDate: '',
          },
        })}
        onComplete={onComplete}
        onSkip={vi.fn()}
      />,
    );

    goToLastStep();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/fecha de competición/i));
    expect(screen.getByLabelText('Fecha de competición')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('validates required main goal before finishing', async () => {
    const onComplete = vi.fn();
    render(
      <OnboardingView
        athleteState={buildCompletableAthleteState({
          profile: {
            mainGoal: '' as AthleteState['profile']['mainGoal'],
          },
        })}
        onComplete={onComplete}
        onSkip={vi.fn()}
      />,
    );

    goToLastStep();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/objetivo principal/i));
    expect(screen.getByLabelText('Objetivo principal')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('validates required availability days before finishing', async () => {
    const onComplete = vi.fn();
    render(
      <OnboardingView
        athleteState={buildCompletableAthleteState({
          availability: {
            availableDays: [],
          },
        })}
        onComplete={onComplete}
        onSkip={vi.fn()}
      />,
    );

    goToLastStep();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/al menos 1 día/i));
    expect(screen.getByLabelText('Tiempo máximo por sesión')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('validates required session duration before finishing', async () => {
    const onComplete = vi.fn();
    render(
      <OnboardingView
        athleteState={buildCompletableAthleteState({
          availability: {
            maxSessionMinutes: '',
          },
        })}
        onComplete={onComplete}
        onSkip={vi.fn()}
      />,
    );

    goToLastStep();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/tiempo máximo por sesión/i));
    expect(screen.getByLabelText('Tiempo máximo por sesión')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('validates required preferred training time before finishing', async () => {
    const onComplete = vi.fn();
    render(
      <OnboardingView
        athleteState={buildCompletableAthleteState({
          availability: {
            preferredTrainingTime: '',
          },
        })}
        onComplete={onComplete}
        onSkip={vi.fn()}
      />,
    );

    goToLastStep();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/hora preferida/i));
    expect(screen.getByLabelText('Hora preferida')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows Guardando... and prevents double submit while completion is pending', async () => {
    let resolveCompletion: (() => void) | undefined;
    const onComplete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCompletion = resolve;
        }),
    );

    render(<OnboardingView athleteState={buildCompletableAthleteState()} onComplete={onComplete} onSkip={vi.fn()} />);

    goToLastStep();
    const finalizeButton = screen.getByRole('button', { name: 'Finalizar' });
    fireEvent.click(finalizeButton);
    fireEvent.click(finalizeButton);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();

    resolveCompletion?.();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Finalizar' })).toBeEnabled());
  });

  it('ignores step navigation, back and skip while completion is pending', async () => {
    let resolveCompletion: (() => void) | undefined;
    const onComplete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCompletion = resolve;
        }),
    );
    const onSkip = vi.fn();

    render(<OnboardingView athleteState={buildCompletableAthleteState()} onComplete={onComplete} onSkip={onSkip} />);

    goToLastStep();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    fireEvent.click(screen.getByRole('button', { name: /1\.\s*Objetivo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saltar por ahora' }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
    expect(screen.getByText(/Tú decides sobre tus datos sensibles/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument();

    resolveCompletion?.();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Finalizar' })).toBeEnabled());
  });

  it('keeps skip available when onboarding is not saving', () => {
    const onSkip = vi.fn();
    render(<OnboardingView athleteState={buildAthleteState()} onComplete={vi.fn()} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole('button', { name: 'Saltar por ahora' }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
