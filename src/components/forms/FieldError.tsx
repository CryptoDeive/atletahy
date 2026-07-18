import { useId } from 'react';
export function FieldError({ id, error, hint }: { id?: string; error?: string; hint?: string }) {
  const generated = useId(); const resolvedId = id ?? generated;
  if (!error && !hint) return null;
  return <p id={resolvedId} role={error ? 'alert' : undefined} className={`mt-1 text-xs font-semibold ${error ? 'text-red-300' : 'text-white/50'}`}>{error ?? hint}</p>;
}
