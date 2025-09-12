import React from 'react';

import {
  ActorPosition,
  TimestampPositionLookup,
  getAllActorPositionsAtTimestamp,
} from '../../workers/calculations/CalculateActorPositions';

interface UseActorPositionsAtTimeParams {
  lookup: TimestampPositionLookup | null;
  currentTime: number;
}

interface UseActorPositionsAtTimeResult {
  actors: ActorPosition[];
}

// Hook to extract actor positions at a specific time using optimized lookup
export function useActorPositionsAtTime({
  lookup,
  currentTime,
}: UseActorPositionsAtTimeParams): UseActorPositionsAtTimeResult {
  const actors = React.useMemo(() => {
    if (!lookup || !lookup.sortedTimestamps || lookup.sortedTimestamps.length === 0) {
      return [];
    }

    // Use the optimized getAllActorPositionsAtTimestamp function
    // which provides O(1) mathematical calculation for regular intervals
    // and O(log n) binary search fallback for irregular intervals
    return getAllActorPositionsAtTimestamp(lookup, currentTime);
  }, [lookup, currentTime]);

  return React.useMemo(
    () => ({
      actors,
    }),
    [actors],
  );
}
