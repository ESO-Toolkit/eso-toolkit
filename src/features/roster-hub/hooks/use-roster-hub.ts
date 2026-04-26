import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { rosterHubApi } from '../api/roster-hub-api';
import type { HubRoster, RosterHubFilters } from '../types/roster-hub.types';

const PAGE_SIZE = 20;

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
  const queryClient = useQueryClient();
  const [filters, setFiltersState] = React.useState<RosterHubFilters>({
    trial: '',
    tag: '',
    sort: 'votes',
    page: 1,
    search: '',
  });

  const serverFilters = React.useMemo(
    () => ({ trial: filters.trial, tag: filters.tag, sort: filters.sort }),
    [filters.trial, filters.tag, filters.sort],
  );

  const queryKey = ['rosters', serverFilters, token] as const;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const res = await rosterHubApi.list({
        trial: serverFilters.trial || undefined,
        tag: serverFilters.tag || undefined,
        sort: serverFilters.sort,
        page: pageParam,
        token,
      });
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.rosters.length === PAGE_SIZE ? allPages.length + 1 : undefined,
  });

  const rosters = React.useMemo(() => data?.pages.flatMap((p) => p.rosters) ?? [], [data]);

  const voteMutation = useMutation({
    mutationFn: ({ rosterId, voteToken }: { rosterId: string; voteToken: string }) =>
      rosterHubApi.vote(rosterId, voteToken),
    onMutate: async ({ rosterId }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            rosters: page.rosters.map((r) => {
              if (r.id !== rosterId) return r;
              const wasVoted = r.user_voted ?? false;
              return {
                ...r,
                user_voted: !wasVoted,
                vote_count: wasVoted ? r.vote_count - 1 : r.vote_count + 1,
              };
            }),
          })),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: (_data, _error, { rosterId }) => {
      if (_data) {
        queryClient.setQueryData(queryKey, (old: typeof data) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              rosters: page.rosters.map((r) =>
                r.id === rosterId
                  ? { ...r, user_voted: _data.voted, vote_count: _data.voteCount }
                  : r,
              ),
            })),
          };
        });
      }
    },
  });

  const setFilter = React.useCallback(
    <K extends keyof RosterHubFilters>(key: K, value: RosterHubFilters[K]) => {
      setFiltersState((prev) => ({
        ...prev,
        [key]: value,
        ...(key !== 'search' ? { page: 1 } : {}),
      }));
    },
    [],
  );

  const loadMore = React.useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      void fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const refresh = React.useCallback(() => {
    void refetch();
  }, [refetch]);

  const vote = React.useCallback(
    async (rosterId: string, voteToken: string) => {
      try {
        await voteMutation.mutateAsync({ rosterId, voteToken });
      } catch {
        // Optimistic revert already handled by onError
      }
    },
    [voteMutation],
  );

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
    loading: isLoading || isFetchingNextPage,
    error: queryError
      ? queryError instanceof Error
        ? queryError.message
        : 'Failed to load rosters'
      : null,
    filters,
    hasMore: hasNextPage ?? false,
    setFilter,
    loadMore,
    refresh,
    vote,
  };
}
