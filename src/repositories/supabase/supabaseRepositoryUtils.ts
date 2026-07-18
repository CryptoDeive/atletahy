import { supabase } from '../../lib/supabaseClient';
import { logUiError } from '../../errors/uiError';

export function getSupabaseClient() {
  return supabase;
}

export function toNullableNumber(value: number | '' | undefined): number | null {
  return value === '' || value === undefined ? null : value;
}

export function fromNullableNumber(value: number | null | undefined): number | '' {
  return value ?? '';
}

export function toNullableDate(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

export function fromNullableDate(value: string | null | undefined): string {
  return value ?? '';
}

export function warnSupabaseError(context: string, error: unknown) {
  if (error) {
    logUiError(`supabase.${context}`, error);
  }
}
