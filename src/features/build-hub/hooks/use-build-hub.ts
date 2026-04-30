import React from 'react';

import { buildHubApi } from '../api/build-hub-api';
import type { BuildHubFilters, HubBuild } from '../types/build-hub.types';

interface UseBuildHubReturn {
  builds: HubBuild[];
  filteredBuilds: HubBuild[];
  loading: boolean;
  error: string | null;
  filters: BuildHubFilters;
  hasMore: boolean;
  setFilter: <K extends keyof BuildHubFilters>(key: K, value: BuildHubFilters[K]) => void;
  loadMore: () => void;
  refresh: () => void;
  vote: (buildId: string, token: string) => Promise<void>;
}

export function useBuildHub(token: string | undefined): UseBuildHubReturn {
  const [builds, setBuilds] = React.useState<HubBuild[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(true);
  const [filters, setFilters] = React.useState<BuildHubFilters>({
    esoClass: '',
    role: '',
    tag: '',
    sort: 'votes',
    page: 1,
    search: '',
  });
  const fetchKeyRef = React.useRef(0);

  const fetchPage = React.useCallback(
    async (currentFilters: BuildHubFilters, append: boolean) => {
      const fetchKey = ++fetchKeyRef.current;
      setLoading(true);
      setError(null);

      try {
        const res = await buildHubApi.list(
          {
            esoClass: currentFilters.esoClass || undefined,
            role: currentFilters.role || undefined,
            tag: currentFilters.tag || undefined,
            sort: currentFilters.sort,
            page: currentFilters.page,
          },
          token,
        );

        if (fetchKey !== fetchKeyRef.current) return;

        setBuilds((prev) => (append ? [...prev, ...res.builds] : res.builds));
        setHasMore(res.builds.length === 20);
      } catch (err) {
        if (fetchKey !== fetchKeyRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load builds');
      } finally {
        if (fetchKey === fetchKeyRef.current) setLoading(false);
      }
    },
    [token],
  );

  // Refetch when server-side filters change
  React.useEffect(() => {
    const resetFilters = { ...filters, page: 1 };
    setFilters(resetFilters);
    void fetchPage(resetFilters, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.esoClass, filters.role, filters.tag, filters.sort, fetchPage]);

  const setFilter = React.useCallback(
    <K extends keyof BuildHubFilters>(key: K, value: BuildHubFilters[K]) => {
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

  const vote = React.useCallback(async (buildId: string, voteToken: string) => {
    // Optimistic update
    setBuilds((prev) =>
      prev.map((b) => {
        if (b.id !== buildId) return b;
        const wasVoted = b.user_voted ?? false;
        return {
          ...b,
          user_voted: !wasVoted,
          vote_count: wasVoted ? b.vote_count - 1 : b.vote_count + 1,
        };
      }),
    );

    try {
      const res = await buildHubApi.vote(buildId, voteToken);
      setBuilds((prev) =>
        prev.map((b) =>
          b.id === buildId ? { ...b, user_voted: res.voted, vote_count: res.voteCount } : b,
        ),
      );
    } catch {
      // Revert optimistic update
      setBuilds((prev) =>
        prev.map((b) => {
          if (b.id !== buildId) return b;
          const wasVoted = b.user_voted ?? false;
          return {
            ...b,
            user_voted: !wasVoted,
            vote_count: wasVoted ? b.vote_count - 1 : b.vote_count + 1,
          };
        }),
      );
    }
  }, []);

  // Client-side text search
  const filteredBuilds = React.useMemo(() => {
    if (!filters.search.trim()) return builds;
    const q = filters.search.toLowerCase();
    return builds.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.author_name.toLowerCase().includes(q),
    );
  }, [builds, filters.search]);

  return {
    builds,
    filteredBuilds,
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
