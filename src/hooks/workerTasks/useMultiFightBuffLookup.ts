import React from 'react';

import type { FightFragment } from '@/graphql/gql/graphql';
import { BuffLookupData } from '@/utils/BuffLookupUtils';

import { useBuffLookupTask } from './useBuffLookupTask';

export type FightScope = 'most-recent' | 'last-3' | 'last-5' | 'all-fights' | 'boss-only';

interface UseMultiFightBuffLookupOptions {
  reportCode: string;
  fights: FightFragment[];
  scope: FightScope;
}

/**
 * Hook to manage buff lookup data across multiple fights.
 * 
 * Strategy: Load buff data sequentially for each fight to avoid Redux state conflicts.
 * Each fight's buff data is requested one at a time, and results are stored in local state.
 * 
 * This approach works around the limitation that buff lookup results are stored globally
 * in Redux without fight-specific keying.
 */
export function useMultiFightBuffLookup({
  reportCode,
  fights,
  scope,
}: UseMultiFightBuffLookupOptions): {
  fightBuffData: Map<number, BuffLookupData>;
  isLoading: boolean;
  hasError: boolean;
} {
  // console.log('[useMultiFightBuffLookup] Called with:', { reportCode, fightsCount: fights.length, scope });
  
  // Determine which fights to load based on scope
  const selectedFights = React.useMemo(() => {
    let filtered = fights;

    // Note: boss-only filtering not currently supported because FightFragment
    // doesn't include boss encounter metadata. All fights will be processed.

    // Limit number of fights
    if (scope === 'most-recent') {
      return filtered.slice(0, 1);
    } else if (scope === 'last-3') {
      return filtered.slice(0, 3);
    } else if (scope === 'last-5') {
      return filtered.slice(0, 5);
    }

    // 'all-fights' or 'boss-only' - return all filtered fights
    return filtered;
  }, [fights, scope]);
  
  // console.log('[useMultiFightBuffLookup] selectedFights:', selectedFights.length, selectedFights.map(f => f.id));

  // Store buff data results locally, keyed by fight ID
  const [buffDataCache, setBuffDataCache] = React.useState<Map<number, BuffLookupData>>(
    new Map(),
  );

  // Track which fight index we're currently loading (sequential loading)
  const [currentLoadIndex, setCurrentLoadIndex] = React.useState(0);

  // Track loading state
  const [loadingFightIds, setLoadingFightIds] = React.useState<Set<number>>(new Set());
  
  // Track which fight ID we last requested data for (to prevent saving wrong data from Redux)
  const [requestedFightId, setRequestedFightId] = React.useState<number | null>(null);

  // Get the current fight to load
  const currentFight = selectedFights[currentLoadIndex];
  
  // console.log('[useMultiFightBuffLookup] currentLoadIndex:', currentLoadIndex, 'currentFight:', currentFight?.id, 'buffDataCache.size:', buffDataCache.size);

  // Use buff lookup task for current fight only
  // Skip if we already have this fight's data cached
  const shouldLoadCurrentFight = currentFight && !buffDataCache.has(currentFight.id);
  
  // console.log('[useMultiFightBuffLookup] shouldLoadCurrentFight:', shouldLoadCurrentFight);

  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask({
    context: shouldLoadCurrentFight
      ? { reportCode, fightId: currentFight.id }
      : undefined,
  });
  
  // console.log('[useMultiFightBuffLookup] buffLookupData:', !!buffLookupData, 'isBuffLookupLoading:', isBuffLookupLoading);

  // When buff data loads for current fight, save it and move to next
  React.useEffect(() => {
    if (!currentFight) return;

    // Skip if we already have data for this fight
    if (buffDataCache.has(currentFight.id)) {
      // Move to next fight if there is one
      if (currentLoadIndex < selectedFights.length - 1) {
        setCurrentLoadIndex((prev) => prev + 1);
      }
      return;
    }

    // Start loading for this fight if we should and haven't requested it yet
    if (shouldLoadCurrentFight && requestedFightId !== currentFight.id) {
      // console.log('[useMultiFightBuffLookup] Starting load for fight', currentFight.id);
      setRequestedFightId(currentFight.id);
      setLoadingFightIds((prev) => {
        const updated = new Set(prev);
        updated.add(currentFight.id);
        return updated;
      });
      return;
    }

    // Save data only if we requested this fight and loading is complete
    if (!isBuffLookupLoading && buffLookupData && requestedFightId === currentFight.id) {
      // const buffIds = Object.keys(buffLookupData.buffIntervals);
      // console.log('[useMultiFightBuffLookup] Saving buff data for fight', currentFight.id, ':', {
      //   buffIdsCount: buffIds.length,
      //   sampleBuffIds: buffIds.slice(0, 5),
      //   hasData: buffIds.length > 0,
      //   requestedFightId,
      // });
      
      // Save the data for this fight
      setBuffDataCache((prev) => {
        const updated = new Map(prev);
        updated.set(currentFight.id, buffLookupData);
        return updated;
      });

      // Remove from loading set
      setLoadingFightIds((prev) => {
        const updated = new Set(prev);
        updated.delete(currentFight.id);
        return updated;
      });
      
      // Clear requested fight ID
      setRequestedFightId(null);

      // Move to next fight
      if (currentLoadIndex < selectedFights.length - 1) {
        setCurrentLoadIndex((prev) => prev + 1);
      }
    }
  }, [currentFight, buffLookupData, isBuffLookupLoading, currentLoadIndex, selectedFights.length, buffDataCache, shouldLoadCurrentFight, requestedFightId]);

  // Reset when selectedFights array identity changes (not on every render)
  const selectedFightsKey = React.useMemo(
    () => selectedFights.map(f => f.id).join(','),
    [selectedFights],
  );

  React.useEffect(() => {
    setBuffDataCache(new Map());
    setCurrentLoadIndex(0);
    setLoadingFightIds(new Set());
    setRequestedFightId(null);
  }, [selectedFightsKey]);

  // Determine overall loading state
  const isLoading = React.useMemo(() => {
    // Check if we have data for all selected fights
    const allFightsLoaded = selectedFights.every((fight) => buffDataCache.has(fight.id));
    return !allFightsLoaded || loadingFightIds.size > 0;
  }, [selectedFights, buffDataCache, loadingFightIds]);

  return React.useMemo(
    () => ({
      fightBuffData: buffDataCache,
      isLoading,
      hasError: false, // TODO: Implement error handling
    }),
    [buffDataCache, isLoading],
  );
}
