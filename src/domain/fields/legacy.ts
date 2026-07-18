import { HYROX_CATEGORIES, type HyroxCategory } from './options';
export type LegacyValue = { value: string; label: string; ambiguous: true };
export function preserveLegacyOption(raw: unknown, canonical: readonly string[]): { value: string; legacy?: LegacyValue } {
  if (typeof raw !== 'string' || !raw.trim()) return { value: '' };
  const value = raw.trim();
  return canonical.includes(value)
    ? { value }
    : { value: '', legacy: { value, label: `${value} (valor anterior — vuelve a seleccionar)`, ambiguous: true } };
}
export function normalizeHyroxCategory(raw: unknown, sex?: string): HyroxCategory | LegacyValue | '' {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  const value = raw.trim(); if (HYROX_CATEGORIES.some((option) => option.value === value)) return value as HyroxCategory;
  const lower = value.toLowerCase();
  if (lower === 'open' && sex === 'female') return 'women_open'; if (lower === 'open' && sex === 'male') return 'men_open';
  if (lower === 'pro' && sex === 'female') return 'women_pro'; if (lower === 'pro' && sex === 'male') return 'men_pro';
  return { value, label: `${value} (valor anterior — vuelve a seleccionar)`, ambiguous: true };
}
