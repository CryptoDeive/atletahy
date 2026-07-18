import type { ValidationResult } from './numbers';
import { isPaceString } from '../../../supabase/functions/_shared/inputDomains';
export function parseDuration(raw: unknown, range: { minSeconds: number; maxSeconds: number }): ValidationResult<number> {
  if (typeof raw !== 'string' || !/^(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d{1,3})?$/.test(raw)) return { ok: false, issues: [{ path: 'duration', code: 'format', message: 'Usa mm:ss o hh:mm:ss.' }] };
  const parts = raw.split(':').map(Number); const [hours, minutes, seconds] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  if (minutes >= 60 || seconds >= 60) return { ok: false, issues: [{ path: 'duration', code: 'format', message: 'La duración no es válida.' }] };
  const value = hours * 3600 + minutes * 60 + seconds;
  if (value < range.minSeconds || value > range.maxSeconds) return { ok: false, issues: [{ path: 'duration', code: 'range', message: 'La duración está fuera del rango permitido.' }] };
  return { ok: true, value };
}
export function parsePace(raw: unknown): ValidationResult<string> {
  if (typeof raw !== 'string' || !/^\d{2}:\d{2}$/.test(raw)) return { ok: false, issues: [{ path: 'pace', code: 'format', message: 'Usa el formato mm:ss.' }] };
  if (!isPaceString(raw)) return { ok: false, issues: [{ path: 'pace', code: 'range', message: 'El ritmo debe estar entre 02:00 y 15:00 min/km.' }] };
  return { ok: true, value: raw };
}
