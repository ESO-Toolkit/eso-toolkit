import { FightFragment, ReportFragment } from '../graphql/gql/graphql';
import { BuffEvent } from '../types/combatlogEvents';

import { Logger, LogLevel } from './logger';
import { createEnhancedPhaseTransitions } from './phaseDetectionUtils';

// Create logger instance for map timeline utilities
const logger = new Logger({
  level: LogLevel.DEBUG,
  contextPrefix: 'MapTimeline',
});

export interface MapTimelineEntry {
  startTime: number;
  endTime: number;
  mapId: number;
  mapFile?: string | null;
  mapName?: string | null;
  phaseIndex: number;
}

export interface MapTimeline {
  entries: MapTimelineEntry[];
  totalMaps: number;
}

/**
 * Pre-computes a timeline of map changes for a fight
 * This allows for O(log n) lookup during playback instead of recalculating on every render
 */
export function createMapTimeline(
  fight: FightFragment | null,
  report?: ReportFragment | null,
  buffEvents?: BuffEvent[] | null,
): MapTimeline {
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Input data', {
      hasFight: !!fight,
      hasReport: !!report,
      fightId: fight?.id,
      fightName: fight?.name,
      rawMaps: fight?.maps,
      mapsLength: fight?.maps?.length,
      phaseTransitions: fight?.phaseTransitions,
      phaseTransitionsLength: fight?.phaseTransitions?.length,
      reportPhases: report?.phases,
      reportPhasesLength: report?.phases?.length,
      lastPhase: fight?.lastPhase,
      lastPhaseAsAbsoluteIndex: fight?.lastPhaseAsAbsoluteIndex,
    });
  }

  if (!fight?.maps || fight.maps.length === 0) {
    logger.debug('No maps available');
    return { entries: [], totalMaps: 0 };
  }

  const availableMaps = fight.maps.filter((map): map is NonNullable<typeof map> => map !== null);

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Filtered maps', {
      filteredMaps: availableMaps,
      filteredCount: availableMaps.length,
    });
  }

  if (availableMaps.length === 1) {
    // Single map for entire fight
    return {
      entries: [
        {
          startTime: fight.startTime,
          endTime: fight.endTime,
          mapId: availableMaps[0].id,
          mapFile: availableMaps[0].file,
          mapName: availableMaps[0].name,
          phaseIndex: 0,
        },
      ],
      totalMaps: 1,
    };
  }

  // Try multiple strategies to get phase timing information

  // Strategy 1: Use fight's phase transitions (if available)
  if (fight.phaseTransitions && fight.phaseTransitions.length > 0) {
    logger.info('🎯 Using Strategy 1: Explicit phase transitions');
    return createTimelineFromPhaseTransitions(fight, availableMaps);
  }

  // Strategy 2: Use custom phase detection based on buff events
  if (buffEvents && buffEvents.length > 0) {
    const detectedPhases = createEnhancedPhaseTransitions(
      buffEvents,
      fight.startTime,
      fight.endTime,
      fight.encounterID, // Use encounterID for phase detection
    );

    if (detectedPhases && detectedPhases.length > 1) {
      logger.info('✅ Using enhanced phase detection for accurate map timing');
      // Create a temporary fight object with the detected phase transitions
      const enhancedFight = {
        ...fight,
        phaseTransitions: detectedPhases,
      };
      return createTimelineFromPhaseTransitions(enhancedFight, availableMaps);
    }
  }

  // Strategy 3: No reliable phase signal. Do NOT fabricate map switches by splitting the fight
  // evenly across the available maps — `fight.maps` is the set of maps the pull *touched*, NOT a
  // time-ordered traversal, so even-distribution invents an area change that never happened (e.g.
  // Lylanar, a single-arena boss with no phases but two zone maps, would flip to the beach map at
  // the exact midpoint). Without phase timing or per-map spatial bounds (the report's map ids don't
  // resolve to zoneScaleData), there's no honest way to time multiple maps, so fall back to the
  // single PRIMARY map for the whole fight. ESO Logs lists the primary fight map first.
  return createTimelineFromPrimaryMap(fight, availableMaps);
}

/**
 * Creates timeline using actual phase transition data
 */
function createTimelineFromPhaseTransitions(
  fight: FightFragment,
  availableMaps: NonNullable<FightFragment['maps']>[number][],
): MapTimeline {
  const phaseTransitions = fight.phaseTransitions;

  if (!phaseTransitions || phaseTransitions.length === 0) {
    return createTimelineFromPrimaryMap(fight, availableMaps);
  }

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Using phase transitions', {
      phaseTransitions,
      availableMaps,
    });
  }

  // Sort phase transitions by startTime to ensure correct order
  const sortedTransitions = [...phaseTransitions].sort((a, b) => a.startTime - b.startTime);

  // Map each phase to a map (assuming maps correspond to phases in order)
  const entries: MapTimelineEntry[] = sortedTransitions.map((transition, index) => {
    const mapIndex = Math.min(index, availableMaps.length - 1); // Don't exceed available maps
    const map = availableMaps[mapIndex];

    if (!map) {
      throw new Error(`No map available for phase ${index}`);
    }

    // Calculate end time (start of next phase or end of fight)
    const nextTransition = sortedTransitions[index + 1];
    const endTime = nextTransition ? nextTransition.startTime : fight.endTime;

    return {
      startTime: transition.startTime,
      endTime,
      mapId: map.id,
      mapFile: map.file,
      mapName: map.name,
      phaseIndex: index,
    };
  });

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Phase-based timeline entries created', {
      entries: entries.map((entry) => ({
        mapName: entry.mapName,
        mapFile: entry.mapFile,
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.endTime - entry.startTime,
        phaseIndex: entry.phaseIndex,
      })),
    });
  }

  return { entries, totalMaps: availableMaps.length };
}

/**
 * Fallback for when a multi-map fight has no reliable phase timing: show the single PRIMARY map
 * (the first available) for the entire fight.
 *
 * This deliberately replaces the previous "even distribution" fallback, which split the fight evenly
 * across `fight.maps` and so fabricated an area change at the midpoint for any fight that lists more
 * than one map but never actually traverses them in time (the canonical case being a single-arena
 * boss with no phase transitions — e.g. Lylanar — whose pull happens to touch a second zone map).
 * `fight.maps` is an unordered set of maps the pull touched, not a timeline; without phase timing or
 * resolvable per-map spatial bounds there is no honest way to time multiple maps, and showing the
 * primary map throughout is correct for every single-area fight and never invents a switch. A
 * genuinely multi-area fight that lacks phase data will show only its primary map — an acceptable,
 * non-misleading degradation versus a wrong mid-fight flip.
 */
function createTimelineFromPrimaryMap(
  fight: FightFragment,
  availableMaps: NonNullable<FightFragment['maps']>[number][],
): MapTimeline {
  const primary = availableMaps[0];
  if (!primary) {
    return { entries: [], totalMaps: 0 };
  }

  if (process.env.NODE_ENV === 'development') {
    logger.debug('No reliable phase timing — using primary map for the whole fight', {
      primaryMap: primary.file,
      otherMapsIgnored: availableMaps.slice(1).map((m) => m?.file),
    });
  }

  return {
    entries: [
      {
        startTime: fight.startTime,
        endTime: fight.endTime,
        mapId: primary.id,
        mapFile: primary.file,
        mapName: primary.name,
        phaseIndex: 0,
      },
    ],
    // Report the true count of maps the pull touched (UI/diagnostics may surface it); the timeline
    // itself intentionally only renders the primary one.
    totalMaps: availableMaps.length,
  };
}

/**
 * Finds the current map for a given timestamp using binary search
 * Time complexity: O(log n)
 */
export function getMapAtTimestamp(
  timeline: MapTimeline,
  timestamp: number,
): MapTimelineEntry | null {
  if (timeline.entries.length === 0) return null;

  // Binary search for the correct time range
  let left = 0;
  let right = timeline.entries.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const entry = timeline.entries[mid];

    if (timestamp >= entry.startTime && timestamp < entry.endTime) {
      return entry;
    }

    if (timestamp < entry.startTime) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  // If timestamp is beyond the last entry, return the last entry
  if (timestamp >= timeline.entries[timeline.entries.length - 1].startTime) {
    return timeline.entries[timeline.entries.length - 1];
  }

  return null;
}

/**
 * Gets the relative progress within the current phase (0-1)
 */
export function getPhaseProgress(entry: MapTimelineEntry, timestamp: number): number {
  if (!entry) return 0;

  const duration = entry.endTime - entry.startTime;
  if (duration <= 0) return 0;

  const elapsed = timestamp - entry.startTime;
  return Math.max(0, Math.min(1, elapsed / duration));
}
