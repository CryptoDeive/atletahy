import type { Session } from '@supabase/supabase-js';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { AuthStatus } from './AuthStatus';
import { logUiError, normalizeUiError } from '../../errors/uiError';

export type AuthMode = 'login' | 'register';

export interface AuthSessionInfo {
  userId: string;
  email: string | null;
}

interface AuthPanelProps {
  onSessionChange?: (session: AuthSessionInfo | null) => void;
  preferredMode?: AuthMode;
  focusSignal?: number;
  compact?: boolean;
  publicFacing?: boolean;
}

function toSessionInfo(session: Session | null): AuthSessionInfo | null {
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    email: session.user.email ?? null,
  };
}

function inputClass() {
  return 'w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-hyrox-gold disabled:cursor-not-allowed disabled:opacity-45';
}

export function AuthPanel({ onSessionChange, preferredMode = 'login', focusSignal = 0, compact = false, publicFacing = false }: AuthPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionInfo, setSessionInfo] = useState<AuthSessionInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(preferredMode);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setAuthMode(preferredMode);
  }, [preferredMode]);

  useEffect(() => {
    if (focusSignal > 0) {
      emailInputRef.current?.focus();
    }
  }, [focusSignal]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSessionInfo(null);
      onSessionChange?.(null);
      return;
    }

    let isMounted = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        logUiError('auth.get-session', error);
        setMessage(normalizeUiError(error, { code: 'AUTH_SESSION_FAILED', message: 'No se pudo comprobar la sesión. Inténtalo de nuevo.' }).message);
        return;
      }
      const nextSession = toSessionInfo(data.session);
      setSessionInfo(nextSession);
      onSessionChange?.(nextSession);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextSession = toSessionInfo(session);
      setSessionInfo(nextSession);
      onSessionChange?.(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [onSessionChange]);

  async function handleLogin(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setAuthMode('login');
    if (!supabase) {
      setMessage(publicFacing ? 'El inicio de sesión no está disponible en este momento.' : 'Supabase no está configurado. Puedes ver la demo del plan en modo local.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (error) {
      logUiError('auth.sign-in', error);
      setMessage(normalizeUiError(error, { code: 'AUTH_SIGN_IN_FAILED', message: 'No se pudo iniciar sesión. Revisa tus datos e inténtalo de nuevo.' }).message);
    } else {
      setMessage('Sesión iniciada correctamente.');
    }
  }

  async function handleRegister() {
    setAuthMode('register');
    if (!supabase) {
      setMessage(publicFacing ? 'El registro no está disponible en este momento.' : 'Supabase no está configurado. Puedes ver la demo del plan en modo local.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setIsSubmitting(false);

    if (error) {
      logUiError('auth.sign-up', error);
      setMessage(normalizeUiError(error, { code: 'AUTH_SIGN_UP_FAILED', message: 'No se pudo completar el registro. Revisa tus datos e inténtalo de nuevo.' }).message);
    } else {
      setMessage(publicFacing ? 'Registro creado. Revisa tu correo para confirmar la cuenta.' : 'Registro creado. Revisa el correo si Supabase requiere confirmación.');
    }
  }

  async function handleLogout() {
    if (!supabase) return;

    setIsSubmitting(true);
    setMessage(null);
    const { error } = await supabase.auth.signOut();
    setIsSubmitting(false);

    if (error) {
      logUiError('auth.sign-out', error);
      setMessage(normalizeUiError(error, { code: 'AUTH_SIGN_OUT_FAILED', message: 'No se pudo cerrar la sesión. Inténtalo de nuevo.' }).message);
      return;
    }

    setSessionInfo(null);
    onSessionChange?.(null);
    setMessage(publicFacing ? 'Sesión cerrada.' : 'Sesión cerrada. La app sigue disponible en modo local.');
  }

  const form = (
    <form onSubmit={handleLogin} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <label className="block">
        <span className="sr-only">Email</span>
        <input
          ref={emailInputRef}
          className={inputClass()}
          type="email"
          placeholder="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required={Boolean(supabase)}
          disabled={isSubmitting}
        />
      </label>
      <label className="block">
        <span className="sr-only">Contraseña</span>
        <input
          className={inputClass()}
          type="password"
          placeholder="contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required={Boolean(supabase)}
          minLength={6}
          disabled={isSubmitting}
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition disabled:opacity-50 ${
            authMode === 'login' ? 'border-hyrox-gold bg-hyrox-gold text-black hover:bg-white' : 'border-white/15 bg-white/[0.04] text-white hover:border-hyrox-gold hover:text-hyrox-gold'
          }`}
        >
          {publicFacing ? 'Iniciar sesión' : 'Entrar'}
        </button>
        <button
          type="button"
          onClick={handleRegister}
          disabled={isSubmitting || Boolean(supabase && (!email || password.length < 6))}
          className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition disabled:opacity-50 ${
            authMode === 'register' ? 'border-hyrox-gold bg-hyrox-gold text-black hover:bg-white' : 'border-white/15 bg-white/[0.04] text-white hover:border-hyrox-gold hover:text-hyrox-gold'
          }`}
        >
          {publicFacing ? 'Crear cuenta' : 'Registrarme'}
        </button>
      </div>
    </form>
  );

  if (publicFacing) {
    return (
      <section aria-label="Acceso a AtletaHY" data-auth-mode={authMode} className={`rounded-2xl border border-white/10 bg-black/30 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">
              {authMode === 'register' ? 'Crea tu cuenta' : 'Inicia sesión'}
            </p>
            <p className="mt-1 text-sm font-semibold text-white/70">
              {authMode === 'register' ? 'Empieza a preparar tu próximo objetivo.' : 'Continúa con tu plan de entrenamiento.'}
            </p>
          </div>
          {sessionInfo ? (
            <button type="button" onClick={handleLogout} disabled={isSubmitting} className="w-fit rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-hyrox-gold hover:text-hyrox-gold disabled:opacity-50">
              Cerrar sesión
            </button>
          ) : form}
        </div>
        {message ? <p className="mt-3 text-xs font-semibold text-hyrox-gold/85">{message}</p> : null}
      </section>
    );
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <section aria-label="Autenticación Supabase" data-auth-mode={authMode} className={`rounded-2xl border border-white/10 bg-black/30 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">Persistencia</p>
              <p className="mt-1 text-sm font-semibold text-white/70">Supabase no configurado. La app está usando modo local.</p>
            </div>
            <AuthStatus />
          </div>
          {form}
        </div>
        {message ? <p className="mt-3 text-xs font-semibold text-hyrox-gold/85">{message}</p> : null}
      </section>
    );
  }

  return (
    <section aria-label="Autenticación Supabase" data-auth-mode={authMode} className={`rounded-2xl border border-white/10 bg-black/30 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.2em] text-hyrox-gold">Persistencia Supabase</p>
          <p className="mt-1 text-sm font-semibold text-white/70">
            {sessionInfo ? 'Tus guardados se enviarán a Supabase.' : 'Puedes iniciar sesión o seguir en local sin bloquear la app.'}
          </p>
          <div className="mt-2">
            <AuthStatus email={sessionInfo?.email} />
          </div>
        </div>

        {sessionInfo ? (
          <button type="button" onClick={handleLogout} disabled={isSubmitting} className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-hyrox-gold hover:text-hyrox-gold disabled:opacity-50">
            Cerrar sesión
          </button>
        ) : (
          form
        )}
      </div>
      {message ? <p className="mt-3 text-xs font-semibold text-hyrox-gold/85">{message}</p> : null}
    </section>
  );
}
