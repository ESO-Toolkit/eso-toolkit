import { useRef, useCallback } from 'react';

import {
  ActorPosition,
  TimestampPositionLookup,
  getAllActorPositionsAtTimestamp,
} from '../../workers/calculations/CalculateActorPositions';

interface UseHighFrequencyActorPositionsParams {
  lookup: TimestampPositionLookup | null;
}

interface UseHighFrequencyActorPositionsResult {
  getActorsAtTime: (currentTime: number) => ActorPosition[];
}

/**
 * Hook to get actor positions for high-frequency rendering
 * Returns a function that can be called with a timeRef value without causing React re-renders
 *
 * This bypasses React's render cycle to enable smooth 120fps+ position updates
 * while the main timeline UI updates at the normal React frequency.
 */
export function useHighFrequencyActorPositions({
  lookup,
}: UseHighFrequencyActorPositionsParams): UseHighFrequencyActorPositionsResult {
  // Cache the last result to avoid unnecessary recalculations
  const lastTimeRef = useRef<number>(-1);
  const lastResultRef = useRef<ActorPosition[]>([]);

  const getActorsAtTime = useCallback(
    (currentTime: number): ActorPosition[] => {
      // Early return if no data
      if (!lookup || !lookup.sortedTimestamps || lookup.sortedTimestamps.length === 0) {
        return [];
      }

      // Check if we can reuse the last result (optimization for consecutive calls with same time)
      if (lastTimeRef.current === currentTime && lastResultRef.current.length > 0) {
        return lastResultRef.current;
      }

      // Use the optimized getAllActorPositionsAtTimestamp function
      // which provides O(1) mathematical calculation for regular intervals
      // and O(log n) binary search fallback for irregular intervals
      const actors = getAllActorPositionsAtTimestamp(lookup, currentTime);

      // Cache the result
      lastTimeRef.current = currentTime;
      lastResultRef.current = actors;

      return actors;
    },
    [lookup],
  );

  return {
    getActorsAtTime,
  };
}
