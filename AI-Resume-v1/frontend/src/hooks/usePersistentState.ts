import { useEffect, useState } from "react";

type Parser<T> = (value: unknown) => T;

/**
 * Lightweight localStorage-backed state with JSON serialization.
 * Falls back to the provided default on parse errors or unavailable storage.
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  parser?: Parser<T>
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined" || !window.localStorage) return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return defaultValue;
      const parsed = JSON.parse(raw);
      return parser ? parser(parsed) : (parsed as T);
    } catch (
      _err // swallow parse issues and fall back
    ) {
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (_err) {
      // ignore quota/serialization errors
    }
  }, [key, state]);

  return [state, setState];
}
