import { AuthPanel, type AuthMode, type AuthSessionInfo } from '../auth/AuthPanel';

interface HomePageProps {
  authenticated: boolean;
  authMode: AuthMode;
  authFocusSignal: number;
  onAuthIntent: (mode: AuthMode) => void;
  onDemo: () => void;
  onOpenApp: () => void;
  onSessionChange: (session: AuthSessionInfo | null) => void;
}

const howItWorks = [
  {
    title: 'DEFINE TU OBJETIVO',
    text: 'Fecha de competición, nivel, disponibilidad, material y molestias.',
  },
  {
    title: 'ENTRENA SEMANA A SEMANA',
    text: 'Carrera, fuerza, estaciones HYROX, técnica y recuperación.',
  },
  {
    title: 'LA IA ADAPTA EL PLAN',
    text: 'Analiza sueño, estrés, fatiga, dolor y cumplimiento.',
  },
];

export function HomePage({ authenticated, authMode, authFocusSignal, onAuthIntent, onDemo, onOpenApp, onSessionChange }: HomePageProps) {
  const showAuthPanel = authFocusSignal > 0;

  return (
    <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-5 lg:px-8" id="home">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(135deg,rgba(18,20,24,0.98),rgba(5,5,5,0.99))] px-5 py-10 shadow-panel sm:px-8 sm:py-12 lg:px-12 lg:py-14">
        <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-hyrox-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-44 w-2/3 -skew-x-12 border-t border-hyrox-gold/20 bg-hyrox-gold/[0.025]" />
        <div className="relative max-w-5xl">
          <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.28em] text-hyrox-gold">
            ENTRENAMIENTO HÍBRIDO / PREPARACIÓN HYROX
          </p>
          <h1 className="mt-5 max-w-5xl font-display text-4xl uppercase leading-[0.9] tracking-tight text-white sm:text-5xl lg:text-7xl">
            PREPARA TU HYROX CON UN PLAN QUE SE ADAPTA A TI
          </h1>
          <p className="mt-6 max-w-3xl text-base font-semibold leading-relaxed text-white/68 sm:text-lg">
            Define tu competición, registra cómo llegas cada día y recibe una planificación que ajusta entrenamiento, recuperación y estrategia semana a semana.
          </p>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-white/42">
            Entrenamiento híbrido y preparación HYROX con IA
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {authenticated ? (
              <button
                type="button"
                onClick={onOpenApp}
                className="rounded-full border border-hyrox-gold bg-hyrox-gold px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-white"
              >
                Ir a entrenamientos
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onAuthIntent('register')}
                  className="rounded-full border border-hyrox-gold bg-hyrox-gold px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-white"
                >
                  Crear cuenta
                </button>
                <button
                  type="button"
                  onClick={() => onAuthIntent('login')}
                  className="rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-hyrox-gold hover:text-hyrox-gold"
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={onDemo}
                  className="rounded-full border border-white/10 bg-black/30 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/72 transition hover:border-white/35 hover:text-white"
                >
                  Ver demo
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {!authenticated ? (
        <div
          id="entrar"
          aria-hidden={!showAuthPanel}
          className={showAuthPanel ? 'rounded-3xl border border-hyrox-gold/20 bg-hyrox-panel/70 p-4 sm:p-5' : 'hidden'}
        >
          <AuthPanel
            compact
            publicFacing
            preferredMode={authMode}
            focusSignal={authFocusSignal}
            onSessionChange={onSessionChange}
          />
        </div>
      ) : null}

      <section id="como-funciona" aria-labelledby="how-title" className="rounded-3xl border border-white/10 bg-hyrox-panel/70 p-4 sm:p-5">
        <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.22em] text-hyrox-gold">Cómo funciona</p>
        <h2 id="how-title" className="mt-1 font-display text-3xl uppercase leading-none text-white sm:text-4xl">
          UN PLAN QUE EVOLUCIONA CONTIGO
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {howItWorks.map((step, index) => (
            <article key={step.title} className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <span className="font-mono text-xs font-black uppercase tracking-[0.18em] text-hyrox-gold">0{index + 1}</span>
              <h3 className="mt-3 font-display text-2xl uppercase leading-none text-white">{step.title}</h3>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-white/62">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-hyrox-gold/20 bg-black/35 px-5 py-6 text-center sm:px-8" aria-labelledby="cta-title">
        <h2 id="cta-title" className="font-display text-3xl uppercase leading-none text-white sm:text-4xl">EMPIEZA TU PREPARACIÓN</h2>
        <p className="mt-3 text-sm font-semibold text-white/60">Configura tu perfil y crea un plan adaptado a tu realidad.</p>
        {authenticated ? (
          <button type="button" onClick={onOpenApp} className="mt-5 rounded-full border border-hyrox-gold bg-hyrox-gold px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-white">Volver a mis entrenamientos</button>
        ) : (
          <button type="button" onClick={() => onAuthIntent('register')} className="mt-5 rounded-full border border-hyrox-gold bg-hyrox-gold px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-white">Crear cuenta</button>
        )}
      </section>

      <p className="px-4 pb-3 text-center text-[0.68rem] font-semibold leading-relaxed text-white/35">
        AtletaHY es una aplicación independiente de planificación para entrenamiento híbrido y preparación HYROX. No está afiliada oficialmente a HYROX.
      </p>
    </div>
  );
}
