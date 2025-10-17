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

  // Strategy 3: Fallback to even distribution
  return createTimelineFromEvenDistribution(fight, availableMaps);
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
    return createTimelineFromEvenDistribution(fight, availableMaps);
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
 * Creates timeline using even distribution (fallback method)
 */
function createTimelineFromEvenDistribution(
  fight: FightFragment,
  availableMaps: NonNullable<FightFragment['maps']>[number][],
): MapTimeline {
  const fightDuration = fight.endTime - fight.startTime;
  const phaseLength = fightDuration / availableMaps.length;

  const entries: MapTimelineEntry[] = availableMaps.map((map, index) => {
    if (!map) {
      throw new Error(`No map available for index ${index}`);
    }

    return {
      startTime: fight.startTime + index * phaseLength,
      endTime: fight.startTime + (index + 1) * phaseLength,
      mapId: map.id,
      mapFile: map.file,
      mapName: map.name,
      phaseIndex: index,
    };
  });

  // Debug logging for timeline creation
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Even distribution timeline entries created', {
      fightStartTime: fight.startTime,
      fightEndTime: fight.endTime,
      fightDuration,
      phaseLength,
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

  // Ensure the last phase ends exactly at fight end
  if (entries.length > 0) {
    entries[entries.length - 1].endTime = fight.endTime;
  }

  return { entries, totalMaps: availableMaps.length };
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
