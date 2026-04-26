import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { packHubApi } from '../api/pack-hub-api';
import type { HubPack, PackHubFilters } from '../types/pack-hub.types';

const PAGE_SIZE = 20;

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
  const queryClient = useQueryClient();
  const [filters, setFiltersState] = React.useState<PackHubFilters>({
    packType: '',
    tag: '',
    sort: 'votes',
    page: 1,
    search: '',
  });

  const serverFilters = React.useMemo(
    () => ({ packType: filters.packType, tag: filters.tag, sort: filters.sort }),
    [filters.packType, filters.tag, filters.sort],
  );

  const queryKey = ['packs', serverFilters, token] as const;

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
      const res = await packHubApi.list({
        packType: serverFilters.packType || undefined,
        tag: serverFilters.tag || undefined,
        sort: serverFilters.sort,
        page: pageParam,
        token,
      });
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.packs.length === PAGE_SIZE ? allPages.length + 1 : undefined,
  });

  const packs = React.useMemo(() => data?.pages.flatMap((p) => p.packs) ?? [], [data]);

  const voteMutation = useMutation({
    mutationFn: ({ packId, voteToken }: { packId: string; voteToken: string }) =>
      packHubApi.vote(packId, voteToken),
    onMutate: async ({ packId }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            packs: page.packs.map((p) => {
              if (p.id !== packId) return p;
              const wasVoted = p.user_voted ?? false;
              return {
                ...p,
                user_voted: !wasVoted,
                vote_count: wasVoted ? p.vote_count - 1 : p.vote_count + 1,
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
    onSettled: (_data, _error, { packId }) => {
      if (_data) {
        queryClient.setQueryData(queryKey, (old: typeof data) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              packs: page.packs.map((p) =>
                p.id === packId
                  ? { ...p, user_voted: _data.voted, vote_count: _data.voteCount }
                  : p,
              ),
            })),
          };
        });
      }
    },
  });

  const setFilter = React.useCallback(
    <K extends keyof PackHubFilters>(key: K, value: PackHubFilters[K]) => {
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
    async (packId: string, voteToken: string) => {
      try {
        await voteMutation.mutateAsync({ packId, voteToken });
      } catch {
        // Optimistic revert handled by onError
      }
    },
    [voteMutation],
  );

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
    loading: isLoading || isFetchingNextPage,
    error: queryError
      ? queryError instanceof Error
        ? queryError.message
        : 'Failed to load packs'
      : null,
    filters,
    hasMore: hasNextPage ?? false,
    setFilter,
    loadMore,
    refresh,
    vote,
  };
}
