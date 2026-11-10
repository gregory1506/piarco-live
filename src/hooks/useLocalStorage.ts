import { useCallback, useState } from 'react';

/** useState persisted to localStorage as JSON; bad or missing data falls back to `initial`. */
export function useLocalStorage<T>(key: string, initial: T): [T, (update: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (update: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof update === 'function' ? (update as (p: T) => T)(prev) : update;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Storage full or disabled (private mode): keep in-memory state only.
        }
        return next;
      });
    },
    [key],
  );

  return [value, set];
}
