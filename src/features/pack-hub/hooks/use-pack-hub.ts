import React from 'react';

import { packHubApi } from '../api/pack-hub-api';
import type { HubPack, PackHubFilters } from '../types/pack-hub.types';

interface UsePackHubReturn {
  packs: HubPack[];
  filteredPacks: HubPack[];
  loading: boolean;
  error: string | null;
  filters: PackHubFilters;
  hasMore: boolean;
  setFilter: <K extends keyof PackHubFilters>(key: K, value: PackHubFilters[K]) => void;
  loadMore: () => void;
  refresh: () => void;
  vote: (packId: string, token: string) => Promise<void>;
}

export function usePackHub(token: string | undefined): UsePackHubReturn {
  const [packs, setPacks] = React.useState<HubPack[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(true);
  const [filters, setFilters] = React.useState<PackHubFilters>({
    packType: '',
    tag: '',
    sort: 'votes',
    page: 1,
    search: '',
  });
  const fetchKeyRef = React.useRef(0);
  const abortRef = React.useRef<AbortController | null>(null);

  const fetchPage = React.useCallback(
    async (currentFilters: PackHubFilters, append: boolean) => {
      const fetchKey = ++fetchKeyRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const res = await packHubApi.list({
          packType: currentFilters.packType || undefined,
          tag: currentFilters.tag || undefined,
          sort: currentFilters.sort,
          page: currentFilters.page,
          token,
          signal: controller.signal,
        });

        if (fetchKey !== fetchKeyRef.current) return; // stale

        setPacks((prev) => (append ? [...prev, ...res.packs] : res.packs));
        setHasMore(res.packs.length === 20);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (fetchKey !== fetchKeyRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load packs');
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
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.packType, filters.tag, filters.sort, fetchPage]);

  const setFilter = React.useCallback(
    <K extends keyof PackHubFilters>(key: K, value: PackHubFilters[K]) => {
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

  const vote = React.useCallback(async (packId: string, voteToken: string) => {
    // Optimistic update
    setPacks((prev) =>
      prev.map((p) => {
        if (p.id !== packId) return p;
        const wasVoted = p.user_voted ?? false;
        return {
          ...p,
          user_voted: !wasVoted,
          vote_count: wasVoted ? p.vote_count - 1 : p.vote_count + 1,
        };
      }),
    );

    try {
      const res = await packHubApi.vote(packId, voteToken);
      setPacks((prev) =>
        prev.map((p) =>
          p.id === packId ? { ...p, user_voted: res.voted, vote_count: res.voteCount } : p,
        ),
      );
    } catch {
      // Revert optimistic update
      setPacks((prev) =>
        prev.map((p) => {
          if (p.id !== packId) return p;
          const wasVoted = p.user_voted ?? false;
          return {
            ...p,
            user_voted: !wasVoted,
            vote_count: wasVoted ? p.vote_count - 1 : p.vote_count + 1,
          };
        }),
      );
    }
  }, []);

  // Client-side text search
  const filteredPacks = React.useMemo(() => {
    if (!filters.search.trim()) return packs;
    const q = filters.search.toLowerCase();
    return packs.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.author_name.toLowerCase().includes(q),
    );
  }, [packs, filters.search]);

  return {
    packs,
    filteredPacks,
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
