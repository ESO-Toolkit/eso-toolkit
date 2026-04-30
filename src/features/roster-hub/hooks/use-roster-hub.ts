import React from 'react';

import { rosterHubApi } from '../api/roster-hub-api';
import type { HubRoster, RosterHubFilters } from '../types/roster-hub.types';

interface UseRosterHubReturn {
  rosters: HubRoster[];
  filteredRosters: HubRoster[];
  loading: boolean;
  error: string | null;
  filters: RosterHubFilters;
  hasMore: boolean;
  setFilter: <K extends keyof RosterHubFilters>(key: K, value: RosterHubFilters[K]) => void;
  loadMore: () => void;
  refresh: () => void;
  vote: (rosterId: string, token: string) => Promise<void>;
}

export function useRosterHub(token: string | undefined): UseRosterHubReturn {
  const [rosters, setRosters] = React.useState<HubRoster[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(true);
  const [filters, setFilters] = React.useState<RosterHubFilters>({
    trial: '',
    tag: '',
    sort: 'votes',
    page: 1,
    search: '',
  });
  // Track a fetch key to cancel stale requests
  const fetchKeyRef = React.useRef(0);

  const fetchPage = React.useCallback(
    async (currentFilters: RosterHubFilters, append: boolean) => {
      const fetchKey = ++fetchKeyRef.current;
      setLoading(true);
      setError(null);

      try {
        const res = await rosterHubApi.list({
          trial: currentFilters.trial || undefined,
          tag: currentFilters.tag || undefined,
          sort: currentFilters.sort,
          page: currentFilters.page,
          token,
        });

        if (fetchKey !== fetchKeyRef.current) return; // stale

        setRosters((prev) => (append ? [...prev, ...res.rosters] : res.rosters));
        setHasMore(res.rosters.length === 20); // PAGE_SIZE = 20
      } catch (err) {
        if (fetchKey !== fetchKeyRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load rosters');
      } finally {
        if (fetchKey === fetchKeyRef.current) setLoading(false);
      }
    },
    [token],
  );

  // Refetch when server-side filters change (trial, tag, sort) — not search (client-side)
  React.useEffect(() => {
    const resetFilters = { ...filters, page: 1 };
    setFilters(resetFilters);
    void fetchPage(resetFilters, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.trial, filters.tag, filters.sort, fetchPage]);

  const setFilter = React.useCallback(
    <K extends keyof RosterHubFilters>(key: K, value: RosterHubFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value, ...(key !== 'search' ? { page: 1 } : {}) }));
    },
    [],
  );

  const loadMore = React.useCallback(() => {
    if (loading || !hasMore) return;
    const next = { ...filters, page: filters.page + 1 };
    setFilters(next);
    void fetchPage(next, true);
  }, [loading, hasMore, filters, fetchPage]);

  const refresh = React.useCallback(() => {
    const reset = { ...filters, page: 1 };
    setFilters(reset);
    void fetchPage(reset, false);
  }, [filters, fetchPage]);

  const vote = React.useCallback(async (rosterId: string, voteToken: string) => {
    // Optimistic update
    setRosters((prev) =>
      prev.map((r) => {
        if (r.id !== rosterId) return r;
        const wasVoted = r.user_voted ?? false;
        return {
          ...r,
          user_voted: !wasVoted,
          vote_count: wasVoted ? r.vote_count - 1 : r.vote_count + 1,
        };
      }),
    );

    try {
      const res = await rosterHubApi.vote(rosterId, voteToken);
      // Reconcile with server truth
      setRosters((prev) =>
        prev.map((r) =>
          r.id === rosterId ? { ...r, user_voted: res.voted, vote_count: res.voteCount } : r,
        ),
      );
    } catch {
      // Revert optimistic update on failure
      setRosters((prev) =>
        prev.map((r) => {
          if (r.id !== rosterId) return r;
          const wasVoted = r.user_voted ?? false;
          return {
            ...r,
            user_voted: !wasVoted,
            vote_count: wasVoted ? r.vote_count - 1 : r.vote_count + 1,
          };
        }),
      );
    }
  }, []);

  // Client-side text search filter (no server round-trip)
  const filteredRosters = React.useMemo(() => {
    if (!filters.search.trim()) return rosters;
    const q = filters.search.toLowerCase();
    return rosters.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.author_name.toLowerCase().includes(q),
    );
  }, [rosters, filters.search]);

  return {
    rosters,
    filteredRosters,
    loading,
    error,
    filters,
    hasMore,
    setFilter,
    loadMore,
    refresh,
    vote,
  };
}
