import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell accessibility', () => {
  it('provides a skip link and a single focusable main landmark', () => {
    render(
      <AppShell mode="private" activeView="trainings" onNavigate={vi.fn()} onAuthIntent={vi.fn()}>
        <h2>Entrenamientos</h2>
      </AppShell>,
    );

    expect(screen.getByRole('link', { name: /saltar al contenido principal/i })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
  });

  it('moves focus to main content after route changes', () => {
    const props = { mode: 'private' as const, onNavigate: vi.fn(), onAuthIntent: vi.fn() };
    const { rerender } = render(
      <AppShell {...props} activeView="trainings" focusKey="/app/trainings">
        <h2>Entrenamientos</h2>
      </AppShell>,
    );

    rerender(
      <AppShell {...props} activeView="tests" focusKey="/app/tests">
        <h2>Tests</h2>
      </AppShell>,
    );

    expect(screen.getByRole('main')).toHaveFocus();
  });
});
