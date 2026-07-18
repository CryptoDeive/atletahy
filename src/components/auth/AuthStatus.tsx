import { isSupabaseConfigured } from '../../lib/supabaseClient';

interface AuthStatusProps {
  email?: string | null;
  compact?: boolean;
}

export function AuthStatus({ email, compact = false }: AuthStatusProps) {
  const label = email ? `Sesión iniciada: ${email}` : isSupabaseConfigured ? 'Supabase conectado' : 'Modo local';
  const tone = email ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100' : isSupabaseConfigured ? 'border-hyrox-gold/40 bg-hyrox-gold/10 text-hyrox-gold' : 'border-white/10 bg-white/[0.04] text-white/65';

  return (
    <span className={`inline-flex items-center rounded-full border font-mono font-black uppercase tracking-[0.14em] ${tone} ${compact ? 'px-2 py-1 text-[0.58rem]' : 'px-3 py-1.5 text-[0.66rem]'}`}>
      {label}
    </span>
  );
}
