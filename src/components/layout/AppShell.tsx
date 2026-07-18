import { useEffect, useRef, type ReactNode } from 'react';
import { Header, type HeaderMode, type HeaderView } from '../Header';
import type { AuthMode } from '../auth/AuthPanel';

interface AppShellProps {
  mode: HeaderMode;
  activeView: HeaderView;
  authEmail?: string | null;
  onNavigate: (view: HeaderView) => void;
  onAuthIntent: (mode: AuthMode) => void;
  children: ReactNode;
  coachReady?: boolean;
  navigationDisabled?: boolean;
  focusKey?: string;
}

export function AppShell({ mode, activeView, authEmail, onNavigate, onAuthIntent, children, coachReady = true, navigationDisabled = false, focusKey }: AppShellProps) {
  const mainRef = useRef<HTMLElement>(null);
  const previousFocusKey = useRef(focusKey);

  useEffect(() => {
    if (focusKey && previousFocusKey.current !== focusKey) {
      mainRef.current?.focus({ preventScroll: true });
    }
    previousFocusKey.current = focusKey;
  }, [focusKey]);

  return (
    <div
      className={`min-h-screen bg-hyrox-black text-white ${mode === 'private' ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-0' : ''}`}
      data-coach-ready={coachReady ? 'true' : 'false'}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(246,201,76,0.08),transparent_28%)]" />
      <div className="pointer-events-none fixed inset-0 bg-grid bg-[length:72px_72px] opacity-[0.22]" />
      <a className="skip-link" href="#main-content">Saltar al contenido principal</a>
      <Header mode={mode} activeView={activeView} authEmail={authEmail} onNavigate={onNavigate} onAuthIntent={onAuthIntent} navigationDisabled={navigationDisabled} />
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
