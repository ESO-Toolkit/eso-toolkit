import React from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { buildHubApi } from '../api/build-hub-api';
import type { BuildHubFilters, HubBuild } from '../types/build-hub.types';

const PAGE_SIZE = 20;

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
  const queryClient = useQueryClient();
  const [filters, setFiltersState] = React.useState<BuildHubFilters>({
    esoClass: '',
    role: '',
    tag: '',
    sort: 'votes',
    page: 1,
    search: '',
  });

  const serverFilters = React.useMemo(
    () => ({
      esoClass: filters.esoClass,
      role: filters.role,
      tag: filters.tag,
      sort: filters.sort,
    }),
    [filters.esoClass, filters.role, filters.tag, filters.sort],
  );

  const queryKey = ['builds', serverFilters, token] as const;

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
      const res = await buildHubApi.list(
        {
          esoClass: serverFilters.esoClass || undefined,
          role: serverFilters.role || undefined,
          tag: serverFilters.tag || undefined,
          sort: serverFilters.sort,
          page: pageParam,
        },
        token,
      );
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.builds.length === PAGE_SIZE ? allPages.length + 1 : undefined,
  });

  const builds = React.useMemo(
    () => data?.pages.flatMap((p) => p.builds) ?? [],
    [data],
  );

  const voteMutation = useMutation({
    mutationFn: ({ buildId, voteToken }: { buildId: string; voteToken: string }) =>
      buildHubApi.vote(buildId, voteToken),
    onMutate: async ({ buildId }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            builds: page.builds.map((b) => {
              if (b.id !== buildId) return b;
              const wasVoted = b.user_voted ?? false;
              return {
                ...b,
                user_voted: !wasVoted,
                vote_count: wasVoted ? b.vote_count - 1 : b.vote_count + 1,
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
    onSettled: (_data, _error, { buildId }) => {
      if (_data) {
        queryClient.setQueryData(queryKey, (old: typeof data) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              builds: page.builds.map((b) =>
                b.id === buildId
                  ? { ...b, user_voted: _data.voted, vote_count: _data.voteCount }
                  : b,
              ),
            })),
          };
        });
      }
    },
  });

  const setFilter = React.useCallback(
    <K extends keyof BuildHubFilters>(key: K, value: BuildHubFilters[K]) => {
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
    async (buildId: string, voteToken: string) => {
      try {
        await voteMutation.mutateAsync({ buildId, voteToken });
      } catch {
        // Optimistic revert already handled by onError
      }
    },
    [voteMutation],
  );

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
    loading: isLoading || isFetchingNextPage,
    error: queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load builds') : null,
    filters,
    hasMore: hasNextPage ?? false,
    setFilter,
    loadMore,
    refresh,
    vote,
  };
}
