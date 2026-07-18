import { useId } from 'react';
import type { Option } from '../../domain/fields/options';
export function SelectField<T extends string>({ label, value, options, onChange, error, hint, required, disabled }: { label: string; value: T | ''; options: readonly Option<T>[]; onChange: (value: T) => void; error?: string; hint?: string; required?: boolean; disabled?: boolean }) {
  const id = useId(); const descriptionId = `${id}-description`;
  return <label className="block text-xs font-black uppercase tracking-[0.16em] text-hyrox-smoke" htmlFor={id}>{label}{required ? ' *' : ''}
    <select id={id} aria-label={label} value={value} disabled={disabled} required={required} aria-invalid={Boolean(error)} aria-describedby={error || hint ? descriptionId : undefined} onChange={(e) => onChange(e.target.value as T)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-base font-semibold normal-case tracking-normal text-white outline-none focus:border-hyrox-gold">
      <option value="">Selecciona una opción</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>{error || hint ? <span id={descriptionId} role={error ? 'alert' : undefined} className={`mt-1 block normal-case tracking-normal ${error ? 'text-red-300' : 'text-white/50'}`}>{error ?? hint}</span> : null}
  </label>;
}
