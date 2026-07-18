import type { MouseEvent } from 'react';
import type { AuthMode } from './auth/AuthPanel';
import { AuthStatus } from './auth/AuthStatus';

export type HeaderMode = 'public' | 'private';
export type HeaderView = 'publicHome' | 'trainings' | 'tests' | 'account' | 'onboarding';

interface HeaderProps {
  mode: HeaderMode;
  activeView: HeaderView;
  onNavigate: (view: HeaderView) => void;
  onAuthIntent: (mode: AuthMode) => void;
  authEmail?: string | null;
  navigationDisabled?: boolean;
}

function navClass(isActive = false, isDisabled = false) {
  return `rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition ${
    isDisabled ? 'cursor-not-allowed opacity-45' : 'hover:border-hyrox-gold hover:text-hyrox-gold'
  } ${
    isActive ? 'border-hyrox-gold/70 bg-hyrox-gold text-black' : 'border-white/10 bg-white/[0.03] text-hyrox-smoke'
  }`;
}

export function Header({ mode, activeView, onNavigate, onAuthIntent, authEmail, navigationDisabled = false }: HeaderProps) {
  function handlePrivateNavigate(event: MouseEvent<HTMLAnchorElement>, nextView: HeaderView) {
    event.preventDefault();
    if (navigationDisabled) {
      return;
    }

    onNavigate(nextView);
  }

  if (mode === 'public') {
    return (
      <header className="sticky top-0 z-20 border-b border-white/10 bg-hyrox-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-8">
          <a
            href="#home"
            onClick={(event) => {
              event.preventDefault();
              onNavigate('publicHome');
            }}
            className="group block"
          >
            <p className="text-[0.65rem] font-black uppercase tracking-[0.32em] text-hyrox-gold">ATLETAHY</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-white/62">HYBRID TRAINING WITH AI</p>
          </a>
          <div className="flex items-center gap-2 sm:justify-end">
            <nav aria-label="Principal" className="hidden gap-2 md:flex">
              <a href="#como-funciona" className={navClass(false)}>Cómo funciona</a>
              <a
                href="#entrar"
                onClick={(event) => {
                  event.preventDefault();
                  onAuthIntent('login');
                }}
                className={navClass(false)}
              >
                Iniciar sesión
              </a>
            </nav>
            <button
              type="button"
              onClick={() => onAuthIntent('register')}
              className="rounded-full border border-hyrox-gold bg-hyrox-gold px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-white"
            >
              Crear cuenta
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-hyrox-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-8">
        <button
          type="button"
          onClick={() => onNavigate('trainings')}
          disabled={navigationDisabled}
          className="text-left disabled:cursor-not-allowed disabled:opacity-45"
        >
          <p className="text-[0.65rem] font-black uppercase tracking-[0.32em] text-hyrox-gold">Base season</p>
          <h1 className="font-display text-2xl uppercase leading-none tracking-tight text-white sm:text-3xl">HYROX Planner</h1>
        </button>
        <div className="flex items-center gap-2 sm:justify-end">
          {activeView !== 'account' ? (
            <div className="hidden md:block">
              <AuthStatus email={authEmail} compact />
            </div>
          ) : null}
          <nav
            aria-label="Principal"
            className="fixed inset-x-3 bottom-0 z-30 grid grid-cols-3 gap-1 rounded-t-2xl border border-white/10 bg-hyrox-black/95 px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-panel backdrop-blur sm:static sm:flex sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"
          >
            <a
              href="#training"
              onClick={(event) => handlePrivateNavigate(event, 'trainings')}
              aria-disabled={navigationDisabled}
              aria-current={activeView === 'trainings' ? 'page' : undefined}
              tabIndex={navigationDisabled ? -1 : undefined}
              className={navClass(activeView === 'trainings', navigationDisabled)}
            >
              Entrenamientos
            </a>
            <a
              href="#tests-ergo"
              onClick={(event) => handlePrivateNavigate(event, 'tests')}
              aria-disabled={navigationDisabled}
              aria-current={activeView === 'tests' ? 'page' : undefined}
              tabIndex={navigationDisabled ? -1 : undefined}
              className={navClass(activeView === 'tests', navigationDisabled)}
            >
              Tests & Ergs
            </a>
            <a
              href="#account"
              onClick={(event) => handlePrivateNavigate(event, 'account')}
              aria-disabled={navigationDisabled}
              aria-current={activeView === 'account' ? 'page' : undefined}
              tabIndex={navigationDisabled ? -1 : undefined}
              className={navClass(activeView === 'account', navigationDisabled)}
            >
              Mi perfil
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
