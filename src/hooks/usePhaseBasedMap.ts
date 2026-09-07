import { useMemo } from 'react';

import { FightFragment } from '../graphql/gql/graphql';
import { BuffEvent } from '../types/combatlogEvents';
import { withInheritedFightMaps } from '../utils/inheritedFightMap';
import { createMapTimeline, MapTimeline } from '../utils/mapTimelineUtils';

interface UsePhaseBasedMapProps {
  fight: FightFragment | null;
  buffEvents?: BuffEvent[] | null;
  /**
   * Every fight in the report, so a fight ESO Logs ships no `maps` for (any trash pull —
   * `encounterID === 0`) can borrow the floor map from a sibling fight in the same zone instead of
   * rendering a blank plane. Omit to disable the fallback. See `resolveInheritedFightMaps`.
   */
  reportFights?: ReadonlyArray<FightFragment | null> | null;
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
  reportFights,
}: UsePhaseBasedMapProps): UsePhaseBasedMapResult => {
  // Identity-stable when the fight already has maps, so nothing downstream churns.
  const effectiveFight = useMemo(
    () => withInheritedFightMaps(fight, reportFights),
    [fight, reportFights],
  );

  const mapTimeline = useMemo(() => {
    return createMapTimeline(effectiveFight, undefined, buffEvents);
  }, [effectiveFight, buffEvents]);

  const availableMaps = useMemo(() => {
    if (!effectiveFight?.maps) return [];

    return effectiveFight.maps
      .filter((map): map is NonNullable<typeof map> => map !== null)
      .map((map) => ({
        id: map.id,
        file: map.file,
        name: map.name,
      }));
  }, [effectiveFight?.maps]);

  return {
    mapTimeline,
    availableMaps,
  };
};
