import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { guestStorageContext, storageKey, type StorageContext } from '../repositories/storageKeys';

export function readFromLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeToLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function usePersistentState<T>(resource: string, fallback: T, context: StorageContext = guestStorageContext) {
  const fallbackRef = useRef(fallback);
  const key = useMemo(() => storageKey(context, resource), [context]);
  const [state, setState] = useState<{ key: string; value: T }>(() => ({
    key,
    value: readFromLocalStorage(key, fallbackRef.current),
  }));
  const value = state.key === key ? state.value : readFromLocalStorage(key, fallbackRef.current);

  useEffect(() => {
    setState((current) => current.key === key ? current : {
      key,
      value: readFromLocalStorage(key, fallbackRef.current),
    });
  }, [key]);

  useEffect(() => {
    if (state.key === key) writeToLocalStorage(key, state.value);
  }, [key, state]);

  const setValue = useCallback((action: SetStateAction<T>) => {
    setState((current) => {
      const currentValue = current.key === key ? current.value : readFromLocalStorage(key, fallbackRef.current);
      return {
        key,
        value: typeof action === 'function' ? (action as (value: T) => T)(currentValue) : action,
      };
    });
  }, [key]);

  return [value, setValue] as const;
}
