import { BuffLookupData } from './BuffLookupUtils';

export interface BuffInterval {
  start: number;
  end: number;
  targetID: number;
  sourceID?: number;
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
}

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
      const averageApplications = Math.round(totalApplicationsSum / Math.max(targetCount, 1));
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
          applications: averageApplications,
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
