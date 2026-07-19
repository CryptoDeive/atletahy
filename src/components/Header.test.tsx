import { fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

describe('Header private navigation', () => {
  it('uses an accessible home link for the private brand', () => {
    const onBrandNavigate = vi.fn();

    render(
      <Header
        mode="private"
        activeView="trainings"
        onNavigate={vi.fn()}
        onBrandNavigate={onBrandNavigate}
        onAuthIntent={vi.fn()}
      />,
    );

    const brand = screen.getByRole('link', { name: 'Ir a la página de inicio de AtletaHY' });
    expect(brand).toHaveAttribute('href', '/');
    fireEvent.click(brand);
    expect(onBrandNavigate).toHaveBeenCalledOnce();
  });

  it('keeps the responsive shell source encoded as UTF-8 without BOM', () => {
    for (const sourcePath of ['src/components/Header.tsx', 'src/components/layout/AppShell.tsx']) {
      const source = readFileSync(resolve(process.cwd(), sourcePath));
      expect([...source.subarray(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf]);
      expect(new TextDecoder('utf-8', { fatal: true }).decode(source)).toBeTruthy();
    }
  });

  it('offers an accessible mobile navigation and marks the active section', () => {
    const onNavigate = vi.fn();

    render(
      <Header
        mode="private"
        activeView="tests"
        onNavigate={onNavigate}
        onAuthIntent={vi.fn()}
        authEmail="atleta@example.com"
      />,
    );

    const mobileNav = screen.getByRole('navigation', { name: 'Principal' });
    expect(mobileNav).toHaveClass('fixed');
    expect(mobileNav).toHaveClass('sm:static');
    expect(mobileNav).toHaveClass('pb-[max(0.75rem,env(safe-area-inset-bottom))]');

    const trainingsLink = within(mobileNav).getByRole('link', { name: 'Entrenamientos' });
    const testsLink = within(mobileNav).getByRole('link', { name: 'Tests & Ergs' });
    const accountLink = within(mobileNav).getByRole('link', { name: 'Mi perfil' });

    expect(trainingsLink).toHaveAttribute('href', '#training');
    expect(testsLink).toHaveAttribute('aria-current', 'page');
    expect(accountLink).not.toHaveAttribute('aria-current');

    fireEvent.click(accountLink);
    expect(onNavigate).toHaveBeenCalledWith('account');
  });

  it('keeps mobile navigation inert while navigation is disabled', () => {
    const onNavigate = vi.fn();

    render(
      <Header
        mode="private"
        activeView="onboarding"
        onNavigate={onNavigate}
        onAuthIntent={vi.fn()}
        navigationDisabled
      />,
    );

    const mobileNav = screen.getByRole('navigation', { name: 'Principal' });
    const trainingsLink = within(mobileNav).getByRole('link', { name: 'Entrenamientos' });

    expect(trainingsLink).toHaveAttribute('aria-disabled', 'true');
    expect(trainingsLink).toHaveAttribute('tabindex', '-1');
    fireEvent.click(trainingsLink);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('does not expose technical connection state when there is no authenticated user', () => {
    render(
      <Header
        mode="private"
        activeView="trainings"
        onNavigate={vi.fn()}
        onAuthIntent={vi.fn()}
        authEmail={null}
      />,
    );

    expect(screen.queryByText('Supabase conectado')).not.toBeInTheDocument();
    expect(screen.queryByText('Modo local')).not.toBeInTheDocument();
  });

  it('keeps the mobile bottom navigation fixed without a transformed header ancestor', () => {
    const { container } = render(
      <Header
        mode="private"
        activeView="trainings"
        onNavigate={vi.fn()}
        onAuthIntent={vi.fn()}
      />,
    );

    const header = container.querySelector('header');
    const navigation = screen.getByRole('navigation', { name: 'Principal' });

    expect(header).not.toHaveClass('backdrop-blur');
    expect(navigation).not.toHaveClass('backdrop-blur');
    expect(navigation).toHaveClass('fixed', 'bottom-0');
  });
});
