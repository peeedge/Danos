import { useCallback, useState } from 'react';

/** Small JSON-backed preference stored in LocalStorage. Falls back to memory if storage is unavailable. */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      return raw === null || raw === undefined ? initialValue : (JSON.parse(raw) as T);
    } catch {
      return initialValue;
    }
  });

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        globalThis.localStorage?.setItem(key, JSON.stringify(next));
      } catch {
        // Preference stays in memory for this session.
      }
    },
    [key],
  );

  return [value, update];
}
