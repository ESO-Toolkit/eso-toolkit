/**
 * Loads parses for the current selection.
 *
 * Local state rather than Redux, matching LeaderboardLogsPage and useBuildHub:
 * this data is page-scoped, and the worker_results store is built around a
 * report-keyed cache that does not fit a leaderboard query.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

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
  // Starts true when there is already a query to run. The effect only flips it
  // after the first paint, so initialising to false let the view render its
  // empty state for a frame — telling the user there is no data before the
  // request had even been issued.
  const [loading, setLoading] = useState(() => options !== null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Serialized so the effect depends on the VALUE, not on a fresh object identity
  // every render.
  const key = options ? JSON.stringify({ ...options, limit }) : null;

  // The request is derived FROM the key rather than read from a ref. A ref is
  // rewritten on every render, so it could hold newer options than the key that
  // triggered the running effect — firing a request for one query while the
  // effect believes it is serving another. Deriving both from the same string
  // makes that divergence impossible.
  const request = useMemo<(ListParsesOptions & { limit: number }) | null>(
    () => (key ? (JSON.parse(key) as ListParsesOptions & { limit: number }) : null),
    [key],
  );

  useEffect(() => {
    if (!request) {
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
      .listParses(request, controller.signal)
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
  }, [request, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { parses, total, loading, error, reload };
}
