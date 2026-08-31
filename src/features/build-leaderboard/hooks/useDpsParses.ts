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

interface QueryState {
  key: string | null;
  parses: DpsParse[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useDpsParses(
  options: ListParsesOptions | null,
  limit = DEFAULT_LIMIT,
): UseDpsParsesResult {
  // Serialized so the effect depends on the VALUE, not on a fresh object identity
  // every render.
  const key = options ? JSON.stringify({ ...options, limit }) : null;
  const [state, setState] = useState<QueryState>(() => ({
    key,
    parses: [],
    total: 0,
    loading: key !== null,
    error: null,
  }));
  const [reloadToken, setReloadToken] = useState(0);

  // Derive the request from the key. A ref can be rewritten with newer options
  // before the effect serving the old key runs, causing query/state divergence.
  const request = useMemo<(ListParsesOptions & { limit: number }) | null>(
    () => (key ? (JSON.parse(key) as ListParsesOptions & { limit: number }) : null),
    [key],
  );

  useEffect(() => {
    if (!request) {
      setState({ key: null, parses: [], total: 0, loading: false, error: null });
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    setState((current) => ({
      key,
      // A manual reload may continue showing the current query's result, but a
      // different query never inherits rows from the previous route.
      parses: current.key === key ? current.parses : [],
      total: current.key === key ? current.total : 0,
      loading: true,
      error: null,
    }));

    dpsParsesApi
      .listParses(request, controller.signal)
      .then((response) => {
        if (cancelled) return;
        setState({
          key,
          parses: response.parses,
          total: response.total,
          loading: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        // An abort is us superseding the request, not a failure to surface.
        if (cancelled || controller.signal.aborted) return;
        setState({
          key,
          parses: [],
          total: 0,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load parses',
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [key, request, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  // Effects run after render. Key-gating here guarantees that an A -> B route
  // transition cannot expose A's rows under B's heading for even one frame.
  const visibleState: QueryState =
    state.key === key ? state : { key, parses: [], total: 0, loading: key !== null, error: null };

  return {
    parses: visibleState.parses,
    total: visibleState.total,
    loading: visibleState.loading,
    error: visibleState.error,
    reload,
  };
}
