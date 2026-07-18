import { useState } from 'react';
import type { TrainingSection as TrainingSectionType } from '../types/training';
import { Badge } from './Badge';
import { TrainingBlock } from './TrainingBlock';

interface TrainingSectionProps {
  section: TrainingSectionType;
}

export function TrainingSection({ section }: TrainingSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(section.collapsed);
  const isOpen = !isCollapsed;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-hyrox-panel2/75">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={`training-section-${section.id}`}
        onClick={() => setIsCollapsed((current) => !current)}
        className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="gold">{section.type}</Badge>
            {section.description && <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-hyrox-smoke">{section.description}</span>}
          </div>
          <h3 className="font-display text-xl uppercase leading-none text-white sm:text-2xl">{section.title}</h3>
        </div>
        <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.18em] transition ${isOpen ? 'border-hyrox-gold/70 text-hyrox-gold' : 'border-white/15 text-white/60'}`}>
          {isOpen ? 'Cerrar' : 'Abrir'}
        </span>
      </button>

      {isOpen && (
        <div id={`training-section-${section.id}`} className="space-y-3 border-t border-white/10 p-4">
          {section.lines && (
            <ul className="grid gap-2 text-base font-semibold text-white/88">
              {section.lines.map((line) => (
                <li key={line} className="flex gap-2 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                  <span aria-hidden="true" className="text-hyrox-gold">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}

          {section.blocks?.map((block, index) => <TrainingBlock key={block.id} block={block} index={index} />)}

          {section.loads && (
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(section.loads).map(([group, loads]) => (
                <div key={group} className="rounded-2xl border border-hyrox-gold/15 bg-hyrox-gold/[0.045] p-4">
                  <h4 className="font-display text-lg uppercase text-hyrox-gold">Cargas {group}</h4>
                  <ul className="mt-3 space-y-2 font-mono text-sm text-white/88">
                    {loads.map((load) => (
                      <li key={load} className="flex gap-2 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                        <span aria-hidden="true" className="text-hyrox-gold">•</span>
                        <span>{load}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {section.notes && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <h4 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-hyrox-smoke">Notas</h4>
              <ul className="mt-3 space-y-2 text-sm font-semibold leading-relaxed text-white/70">
                {section.notes.map((note) => (
                  <li key={note} className="flex gap-2">
                    <span aria-hidden="true" className="text-hyrox-gold">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
