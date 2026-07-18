import type { ValidationResult } from './numbers';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function parseIsoDate(raw: string) { if (!ISO_DATE.test(raw)) return null; const date = new Date(`${raw}T00:00:00Z`); return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== raw ? null : date; }
export function validateNotFutureDate(raw: string, today = new Date()): ValidationResult<string> {
  const date = parseIsoDate(raw); const limit = today.toISOString().slice(0, 10);
  if (!date || raw > limit) return { ok: false, issues: [{ path: 'date', code: 'date', message: 'La fecha no puede ser futura.' }] };
  return { ok: true, value: raw };
}
export function validateAdultBirthDate(raw: string, today = new Date()): ValidationResult<string> {
  const date = parseIsoDate(raw); if (!date) return { ok: false, issues: [{ path: 'birthDate', code: 'date', message: 'Introduce una fecha válida.' }] };
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  if (today.getUTCMonth() < date.getUTCMonth() || (today.getUTCMonth() === date.getUTCMonth() && today.getUTCDate() < date.getUTCDate())) age--;
  if (age < 18 || age > 120) return { ok: false, issues: [{ path: 'birthDate', code: 'age', message: 'Debes tener entre 18 y 120 años.' }] };
  return { ok: true, value: raw };
}
export function validateNotPastDate(raw: string, today = new Date()): ValidationResult<string> {
  const date = parseIsoDate(raw); const limit = today.toISOString().slice(0, 10);
  if (!date || raw < limit) return { ok: false, issues: [{ path: 'targetDate', code: 'date', message: 'La fecha objetivo no puede estar en el pasado.' }] };
  return { ok: true, value: raw };
}
