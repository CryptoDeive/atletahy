import { fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

describe('Header private navigation', () => {
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
});
