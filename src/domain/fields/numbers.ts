export type FieldIssue = { path: string; code: string; message: string };
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; issues: FieldIssue[] };

export function parseBoundedNumber(raw: unknown, config: { min: number; max: number; step?: number; integer?: boolean; path?: string }): ValidationResult<number> {
  const path = config.path ?? 'value';
  const normalized = typeof raw === 'string' ? raw.trim().replace(',', '.') : raw;
  const value = typeof normalized === 'number' ? normalized : typeof normalized === 'string' && normalized !== '' ? Number(normalized) : Number.NaN;
  if (!Number.isFinite(value)) return { ok: false, issues: [{ path, code: 'number', message: 'Introduce un número válido.' }] };
  if (value < config.min || value > config.max) return { ok: false, issues: [{ path, code: 'range', message: `Debe estar entre ${config.min} y ${config.max}.` }] };
  if (config.integer && !Number.isInteger(value)) return { ok: false, issues: [{ path, code: 'integer', message: 'Debe ser un número entero.' }] };
  if (config.step) {
    const quotient = (value - config.min) / config.step;
    if (Math.abs(quotient - Math.round(quotient)) > 1e-9) return { ok: false, issues: [{ path, code: 'step', message: `Usa incrementos de ${config.step}.` }] };
  }
  return { ok: true, value };
}

export function optionalBoundedNumber(raw: unknown, config: Parameters<typeof parseBoundedNumber>[1]): ValidationResult<number | ''> {
  if (raw === '' || raw === null || raw === undefined) return { ok: true, value: '' };
  return parseBoundedNumber(raw, config);
}
