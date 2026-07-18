interface BadgeProps {
  children: React.ReactNode;
  tone?: 'gold' | 'steel' | 'success';
}

const toneClasses = {
  gold: 'border-hyrox-gold/60 bg-hyrox-gold/12 text-hyrox-gold',
  steel: 'border-white/10 bg-white/[0.06] text-hyrox-smoke',
  success: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
};

export function Badge({ children, tone = 'steel' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
