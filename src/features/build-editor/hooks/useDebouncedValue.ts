/**
 * useDebouncedValue
 * Returns `value` after it has been stable for `delayMs` milliseconds.
 * Used to throttle expensive derivations (e.g. filtering large item lists)
 * that would otherwise re-run on every keystroke.
 */

import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
