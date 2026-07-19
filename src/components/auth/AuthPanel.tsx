import type { Session } from '@supabase/supabase-js';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { AuthStatus } from './AuthStatus';
import { logUiError, normalizeUiError } from '../../errors/uiError';
import { buildSignupLegalMetadata } from '../../legal/consent';

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
  const [isAdult, setIsAdult] = useState(false);
  const [acceptsLegal, setAcceptsLegal] = useState(false);
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

  function normalizedEmail() {
    const value = email.trim().toLowerCase();
    if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setMessage('Introduce un correo electrónico válido.'); emailInputRef.current?.focus(); return null; }
    return value;
  }

  async function handleLogin(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setAuthMode('login');
    if (!supabase) {
      setMessage(publicFacing ? 'El inicio de sesión no está disponible en este momento.' : 'Supabase no está configurado. Puedes ver la demo del plan en modo local.');
      return;
    }

    const safeEmail = normalizedEmail(); if (!safeEmail) return;
    setIsSubmitting(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email: safeEmail, password });
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
    if (!isAdult || !acceptsLegal) {
      setMessage('Para crear la cuenta debes confirmar que tienes 18 años y aceptar las condiciones y la política de privacidad.');
      return;
    }
    if (!supabase) {
      setMessage(publicFacing ? 'El registro no está disponible en este momento.' : 'Supabase no está configurado. Puedes ver la demo del plan en modo local.');
      return;
    }

    const safeEmail = normalizedEmail(); if (!safeEmail) return;
    setIsSubmitting(true);
    setMessage(null);
    const { error } = await supabase.auth.signUp({
      email: safeEmail,
      password,
      options: {
        data: buildSignupLegalMetadata(),
        emailRedirectTo: window.location.origin,
      },
    });
    setIsSubmitting(false);

    if (error) {
      logUiError('auth.sign-up', error);
      setMessage(normalizeUiError(error, { code: 'AUTH_SIGN_UP_FAILED', message: 'No se pudo completar el registro. Revisa tus datos e inténtalo de nuevo.' }).message);
    } else {
      setAuthMode('login');
      setMessage(publicFacing
        ? 'Si la cuenta necesita confirmación, recibirás un correo. Si ya estaba creada o confirmada, inicia sesión con tus datos.'
        : 'Si la cuenta necesita confirmación, recibirás un correo. Si ya existía, puedes iniciar sesión.');
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authMode === 'register') void handleRegister();
    else void handleLogin();
  }

  const form = (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <label className="block">
        <span className="sr-only">Email</span>
        <input
          ref={emailInputRef}
          className={inputClass()}
          type="email"
          placeholder="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={254}
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
          onClick={() => authMode === 'register' ? void handleRegister() : setAuthMode('register')}
          disabled={isSubmitting || Boolean(authMode === 'register' && supabase && (!email || password.length < 6 || !isAdult || !acceptsLegal))}
          className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition disabled:opacity-50 ${
            authMode === 'register' ? 'border-hyrox-gold bg-hyrox-gold text-black hover:bg-white' : 'border-white/15 bg-white/[0.04] text-white hover:border-hyrox-gold hover:text-hyrox-gold'
          }`}
        >
          {publicFacing ? 'Crear cuenta' : 'Registrarme'}
        </button>
      </div>
      </div>
      {authMode === 'register' ? (
        <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-xs font-semibold leading-relaxed text-white/70">
          <p>Información básica: responsable {`SOLUCIONES DE IA Y SEGURIDAD DAVID GONZALEZ ARMAS, S.L.`}; tratamos tus datos para crear y prestar la cuenta. Puedes ejercer tus derechos en david@davidgonzalezarmas.com.</p>
          <label className="flex items-start gap-2"><input className="mt-1 accent-hyrox-gold" type="checkbox" checked={isAdult} onChange={(event) => setIsAdult(event.target.checked)} /> Confirmo que tengo 18 años o más.</label>
          <label className="flex items-start gap-2"><input className="mt-1 accent-hyrox-gold" type="checkbox" checked={acceptsLegal} onChange={(event) => setAcceptsLegal(event.target.checked)} /> <span>He leído y acepto el <a className="text-hyrox-gold underline" href="/aviso-legal">aviso legal</a> y la <a className="text-hyrox-gold underline" href="/politica-privacidad">política de privacidad</a>.</span></label>
          <p>Los consentimientos opcionales para datos de salud e IA se pedirán por separado durante la configuración.</p>
        </div>
      ) : null}
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
