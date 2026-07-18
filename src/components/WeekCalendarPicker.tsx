import { useEffect, useMemo, useRef, useState } from 'react';
import type { TrainingWeek, TrainingWeekId } from '../types/training';

interface WeekCalendarPickerProps {
  weeks: TrainingWeek[];
  activeWeekId: TrainingWeekId;
  onSelectWeek: (weekId: TrainingWeekId) => void;
}

const weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function isDateInsideWeek(date: string, week: TrainingWeek): boolean {
  return date >= week.startDate && date <= week.endDate;
}

function formatRange(week: TrainingWeek): string {
  const format = (value: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)).replace('.', '');
  return `${format(week.startDate)} - ${format(week.endDate)}`;
}

export function WeekCalendarPicker({ weeks, activeWeekId, onSelectWeek }: WeekCalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeWeek = weeks.find((week) => week.id === activeWeekId) ?? weeks[0];

  const calendarDays = useMemo(() => {
    if (weeks.length === 0) return [];
    const start = new Date(`${weeks.reduce((value, week) => week.startDate < value ? week.startDate : value, weeks[0].startDate)}T00:00:00Z`);
    const end = new Date(`${weeks.reduce((value, week) => week.endDate > value ? week.endDate : value, weeks[0].endDate)}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 7);
    const days = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      days.push({ day: cursor.getUTCDate(), date: cursor.toISOString().slice(0, 10) });
    }
    return days;
  }, [weeks]);

  const calendarTitle = activeWeek
    ? new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${activeWeek.startDate}T00:00:00Z`))
    : '';
  const displayCalendarTitle = calendarTitle ? `${calendarTitle.charAt(0).toUpperCase()}${calendarTitle.slice(1)}` : '';

  const dateToWeek = useMemo(
    () =>
      new Map(
        calendarDays.map((day) => [day.date, weeks.find((week) => isDateInsideWeek(day.date, week))]),
      ),
    [weeks],
  );

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function selectWeek(weekId: TrainingWeekId) {
    onSelectWeek(weekId);
    setIsOpen(false);
  }

  return (
    <div ref={rootRef} className="relative flex justify-end">
      <button
        type="button"
        aria-label="Abrir selector de semana"
        aria-expanded={isOpen}
        aria-controls="week-calendar-picker"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:border-hyrox-gold hover:text-hyrox-gold"
      >
        <span aria-hidden="true" className="text-hyrox-gold">▦</span>
        <span>{activeWeek?.label}</span>
      </button>

      {isOpen ? (
        <div id="week-calendar-picker" className="absolute right-0 top-12 z-30 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-hyrox-gold/30 bg-[#11130f] p-4 shadow-2xl shadow-black/60">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-lg uppercase leading-none text-white">{displayCalendarTitle}</p>
              <p className="mt-1 text-xs font-semibold text-white/50">Elige cualquier día disponible</p>
            </div>
            <span className="rounded-full bg-hyrox-gold px-2 py-1 font-mono text-[0.65rem] font-black uppercase text-black">
              {activeWeek?.label}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[0.7rem] font-black uppercase text-white/60">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const week = dateToWeek.get(day.date);
              const isAvailable = Boolean(week);
              const isActive = week?.id === activeWeekId;
              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={!isAvailable}
                  aria-label={week ? `${day.day}, ${week.label}` : `${day.day}, no disponible`}
                  onClick={() => week && selectWeek(week.id)}
                  className={`aspect-square rounded-xl border text-sm font-black transition ${
                    isActive
                      ? 'border-hyrox-gold bg-hyrox-gold text-black shadow-lg shadow-hyrox-gold/10'
                      : isAvailable
                        ? 'border-hyrox-gold/25 bg-hyrox-gold/10 text-white hover:border-hyrox-gold hover:bg-hyrox-gold/20'
                        : 'cursor-not-allowed border-white/5 bg-white/[0.02] text-white/20 opacity-50'
                  }`}
                >
                  {day.day}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-2">
            {weeks.map((week) => {
              const isActive = week.id === activeWeekId;
              return (
                <button
                  key={week.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => selectWeek(week.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                    isActive
                      ? 'border-hyrox-gold bg-hyrox-gold/15 text-hyrox-gold'
                      : 'border-white/10 bg-white/[0.03] text-white/80 hover:border-hyrox-gold/70 hover:text-white'
                  }`}
                >
                  {week.label} · {formatRange(week)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
