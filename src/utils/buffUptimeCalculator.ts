import { BuffLookupData } from './BuffLookupUtils';

export interface BuffInterval {
  start: number;
  end: number;
  targetID: number;
  sourceID: number;
}

export interface BuffUptimeResult {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
  isDebuff: boolean;
  hostilityType: 0 | 1;
  uniqueKey: string;
  groupAverageUptimePercentage?: number;
}

// Alias for backwards compatibility
export type BuffUptime = BuffUptimeResult;

export interface BuffUptimeCalculatorOptions {
  /** Set of ability IDs to include in calculations */
  abilityIds: Set<number>;
  /** Optional set of source IDs to filter by */
  sourceIds?: Set<number>;
  /** Optional set of target IDs to filter by */
  targetIds?: Set<number>;
  /** Fight start time for clipping intervals */
  fightStartTime: number;
  /** Fight end time for clipping intervals */
  fightEndTime: number;
  /** Total fight duration in milliseconds */
  fightDuration: number;
  /** Abilities lookup for name/icon resolution */
  abilitiesById: Record<string | number, { name?: string | null; icon?: string | number | null }>;
  /** Whether these are debuffs (true) or buffs (false) */
  isDebuff: boolean;
  /** Hostility type for the results */
  hostilityType: 0 | 1;
  /**
   * For inverted debuffs (where sourceID is the player who applied it),
   * set this to true to filter by sourceID instead of targetID when a single player is selected
   */
  filterBySourceId?: boolean;
}

/**
 * Utility function to compute buff uptimes from a buff lookup with flexible filtering
 */
export function computeBuffUptimes(
  buffLookup: BuffLookupData | null | undefined,
  options: BuffUptimeCalculatorOptions,
): BuffUptimeResult[] {
  if (!buffLookup || !options.fightDuration) {
    return [];
  }

  const {
    abilityIds,
    sourceIds,
    targetIds,
    fightStartTime,
    fightEndTime,
    fightDuration,
    abilitiesById,
    isDebuff,
    hostilityType,
  } = options;

  const uptimes: BuffUptimeResult[] = [];

  Object.entries(buffLookup.buffIntervals).forEach(([abilityGameIDStr, intervals]) => {
    const abilityGameID = parseInt(abilityGameIDStr, 10);
    // Filter to only include specified ability IDs
    if (!abilityIds.has(abilityGameID)) {
      return;
    }

    const ability = abilitiesById[abilityGameID];

    // Apply filtering based on source and target IDs
    const filteredIntervals = intervals.filter((interval: BuffInterval) => {
      // Filter by target IDs if specified
      if (targetIds && !targetIds.has(interval.targetID)) {
        return false;
      }

      // Filter by source IDs if specified
      if (sourceIds && interval.sourceID && !sourceIds.has(interval.sourceID)) {
        return false;
      }

      return true;
    });

    if (filteredIntervals.length === 0) {
      return;
    }

    // Calculate cumulative uptime across filtered intervals
    const targetUptimes = new Map<string, { totalDuration: number; applications: number }>();

    filteredIntervals.forEach((interval: BuffInterval) => {
      const targetId = String(interval.targetID);
      const start = Math.max(interval.start, fightStartTime);
      const end = Math.min(interval.end, fightEndTime);
      const duration = end > start ? end - start : 0;

      if (duration > 0) {
        const existing = targetUptimes.get(targetId) || { totalDuration: 0, applications: 0 };
        targetUptimes.set(targetId, {
          totalDuration: existing.totalDuration + duration,
          applications: existing.applications + 1,
        });
      }
    });

    if (targetUptimes.size > 0) {
      // Calculate averages across all targets
      let totalUptimeSum = 0;
      let totalApplicationsSum = 0;

      targetUptimes.forEach(({ totalDuration, applications }) => {
        totalUptimeSum += (totalDuration / fightDuration) * 100; // Convert to percentage
        totalApplicationsSum += applications;
      });

      // Determine the denominator for averaging
      const targetCount = targetIds ? targetIds.size : targetUptimes.size;
      const averageUptimePercentage = totalUptimeSum / Math.max(targetCount, 1);
      const summedApplications = totalApplicationsSum; // Sum applications across targets
      const averageTotalDuration = (averageUptimePercentage / 100) * fightDuration;

      if (averageUptimePercentage > 0) {
        const abilityName = ability?.name || `Unknown (${abilityGameID})`;

        uptimes.push({
          abilityGameID: String(abilityGameID),
          abilityName,
          icon: ability?.icon ? String(ability.icon) : undefined,
          totalDuration: averageTotalDuration,
          uptime: averageTotalDuration / 1000, // Convert to seconds
          uptimePercentage: averageUptimePercentage,
          applications: summedApplications,
          isDebuff,
          hostilityType,
          uniqueKey: `${abilityGameID}-${hostilityType}`,
        });
      }
    }
  });

  // Sort by uptime percentage descending
  return uptimes.sort((a, b) => b.uptimePercentage - a.uptimePercentage);
}

/**
 * Utility function to compute buff uptimes for a single player/target with group average comparison
 * This calculates the individual player's buff uptime and includes the group average for delta display
 *
 * IMPORTANT: Group average is calculated as the average of individual player uptimes,
 * NOT the total uptime when all players' contributions are combined (which would be higher due to overlap)
 */
export function computeBuffUptimesWithGroupAverage(
  buffLookup: BuffLookupData | null | undefined,
  options: BuffUptimeCalculatorOptions,
  singleTargetId: number,
): BuffUptimeResult[] {
  if (!buffLookup || !options.fightDuration) {
    return [];
  }

  // Calculate group average as the AVERAGE of individual player uptimes
  // This requires calculating uptime for each player separately, then averaging
  // For inverted debuffs (filterBySourceId=true), we need to iterate over sourceIds (players)
  // For normal buffs/debuffs, we iterate over targetIds (players)
  const allTargetIds = options.filterBySourceId
    ? options.sourceIds || new Set<number>()
    : options.targetIds || new Set<number>();

  if (allTargetIds.size === 0) {
    // No targets to compare against, return empty
    return [];
  }

  // Calculate uptime for each player individually
  const playerUptimes = new Map<string, Map<number, number>>(); // abilityId -> Map<playerId -> uptimePercentage>

  allTargetIds.forEach((targetId, _index) => {
    const singlePlayerOptions = {
      ...options,
      // For inverted debuffs, set sourceIds to the single player
      // For normal buffs/debuffs, set targetIds to the single player
      ...(options.filterBySourceId
        ? { sourceIds: new Set([targetId]) }
        : { targetIds: new Set([targetId]) }),
    };
    const uptimes = computeBuffUptimes(buffLookup, singlePlayerOptions);

    uptimes.forEach((uptime) => {
      const abilityId = uptime.abilityGameID;
      if (!playerUptimes.has(abilityId)) {
        playerUptimes.set(abilityId, new Map());
      }
      playerUptimes.get(abilityId)!.set(targetId, uptime.uptimePercentage);
    });
  });

  // Calculate the average uptime across all players for each ability
  const groupAverageMap = new Map<string, number>();
  playerUptimes.forEach((playerMap, abilityId) => {
    const uptimes = Array.from(playerMap.values());
    const average = uptimes.reduce((sum, val) => sum + val, 0) / Math.max(uptimes.length, 1);
    groupAverageMap.set(abilityId, average);
  });

  // Now calculate uptimes for the single target
  const singleTargetOptions = {
    ...options,
    // For inverted debuffs, the player is the source, not the target
    ...(options.filterBySourceId
      ? { sourceIds: new Set([singleTargetId]) }
      : { targetIds: new Set([singleTargetId]) }),
  };

  const singleTargetUptimes = computeBuffUptimes(buffLookup, singleTargetOptions);

  // Add group average to each result
  const result = singleTargetUptimes.map((uptime) => ({
    ...uptime,
    groupAverageUptimePercentage: groupAverageMap.get(uptime.abilityGameID),
  }));

  return result;
}
