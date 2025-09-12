import { useMemo } from 'react';

import { FightFragment } from '../graphql/generated';
import { BuffEvent } from '../types/combatlogEvents';
import { createMapTimeline, MapTimeline } from '../utils/mapTimelineUtils';

interface UsePhaseBasedMapProps {
  fight: FightFragment | null;
  buffEvents?: BuffEvent[] | null;
}

interface UsePhaseBasedMapResult {
  mapTimeline: MapTimeline;
  availableMaps: Array<{
    id: number;
    file?: string | null;
    name?: string | null;
  }>;
}

/**
 * Hook to create a pre-computed map timeline for efficient lookups during playback
 * This replaces the previous reactive approach with a timeline-based approach
 * that can be used with useFrame for high-performance updates
 *
 * Now includes enhanced phase detection using buff events for accurate timing
 */
export const usePhaseBasedMap = ({
  fight,
  buffEvents,
}: UsePhaseBasedMapProps): UsePhaseBasedMapResult => {
  const mapTimeline = useMemo(() => {
    return createMapTimeline(fight, undefined, buffEvents);
  }, [fight, buffEvents]);

  const availableMaps = useMemo(() => {
    if (!fight?.maps) return [];

    return fight.maps
      .filter((map): map is NonNullable<typeof map> => map !== null)
      .map((map) => ({
        id: map.id,
        file: map.file,
        name: map.name,
      }));
  }, [fight?.maps]);

  return {
    mapTimeline,
    availableMaps,
  };
};
