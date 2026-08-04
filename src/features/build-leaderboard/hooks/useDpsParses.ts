/**
 * Loads parses for the current selection.
 *
 * Local state rather than Redux, matching LeaderboardLogsPage and useBuildHub:
 * this data is page-scoped, and the worker_results store is built around a
 * report-keyed cache that does not fit a leaderboard query.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { dpsParsesApi, type ListParsesOptions } from '../api/dpsParsesApi';
import type { DpsParse } from '../types/dpsParses.types';

export interface UseDpsParsesResult {
  parses: DpsParse[];
  total: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Enough to characterise the archetypes without an oversized payload. */
const DEFAULT_LIMIT = 200;

export function useDpsParses(
  options: ListParsesOptions | null,
  limit = DEFAULT_LIMIT,
): UseDpsParsesResult {
  const [parses, setParses] = useState<DpsParse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Serialized here so the effect depends on the VALUE, not on a fresh object
  // identity every render.
  const key = options ? JSON.stringify({ ...options, limit }) : null;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!key) {
      setParses([]);
      setTotal(0);
      setError(null);
      // Must clear explicitly: if a request was in flight, the previous cleanup
      // set `cancelled`, so its `finally` skipped setLoading(false) and the flag
      // would otherwise stay true forever with no query to resolve it.
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    dpsParsesApi
      .listParses({ ...(optionsRef.current as ListParsesOptions), limit }, controller.signal)
      .then((response) => {
        if (cancelled) return;
        setParses(response.parses);
        setTotal(response.total);
      })
      .catch((err: unknown) => {
        // An abort is us superseding the request, not a failure to surface.
        if (cancelled || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load parses');
        setParses([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [key, limit, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { parses, total, loading, error, reload };
}
