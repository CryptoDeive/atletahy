import type { TrainingBlock as TrainingBlockType } from '../types/training';
import { Badge } from './Badge';

interface TrainingBlockProps {
  block: TrainingBlockType;
  index: number;
}

export function TrainingBlock({ block, index }: TrainingBlockProps) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-4">
      <div className="absolute left-0 top-0 h-full w-0.5 bg-hyrox-gold/70" />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 pl-2">
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-hyrox-gold">Bloque {String(index + 1).padStart(2, '0')}</p>
          <h4 className="mt-1 font-display text-xl uppercase text-white">{block.title}</h4>
          {block.subtitle && <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-hyrox-smoke">{block.subtitle}</p>}
        </div>
        {block.restAfter && <Badge tone="gold">Descanso: {block.restAfter}</Badge>}
      </div>
      <ol className="space-y-2 pl-2 font-mono text-sm text-white/88">
        {block.lines.map((line) => (
          <li key={line} className="flex gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
            <span aria-hidden="true" className="text-hyrox-gold">//</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
      {block.notes && (
        <ul className="mt-3 space-y-1.5 pl-2 text-sm font-semibold text-hyrox-smoke">
          {block.notes.map((note) => (
            <li key={note} className="flex gap-2 rounded-xl border border-hyrox-gold/10 bg-hyrox-gold/[0.04] px-3 py-2">
              <span aria-hidden="true" className="text-hyrox-gold">•</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
