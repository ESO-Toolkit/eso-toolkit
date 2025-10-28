import { KnownAbilities } from '../../types/abilities';
import { DamageEvent } from '../../types/combatlogEvents';
import { BuffLookupData } from '../../utils/BuffLookupUtils';
import { OnProgressCallback } from '../Utils';

export interface TouchOfZenStacksCalculationTask {
  debuffsLookup: BuffLookupData;
  damageEvents: DamageEvent[];
  fightStartTime?: number;
  fightEndTime?: number;
}

export interface TouchOfZenStackResult {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
  isDebuff: boolean;
  hostilityType: 0 | 1;
  stackLevel: number; // 1-5 to indicate which stack level this represents
}

export interface TouchOfZenStacksResult {
  stackResults: TouchOfZenStackResult[];
  allDotAbilityIds: number[]; // All unique DOT ability IDs used in the calculation
}

/**
 * Calculate Touch of Z'en stacks debuff uptimes
 * For each enemy with Touch of Z'en debuff, count DOT effects from the same source
 * and create synthetic stack debuffs (1-5 stacks) for the debuff uptimes panel
 */
export function calculateTouchOfZenStacks(
  data: TouchOfZenStacksCalculationTask,
  onProgress?: OnProgressCallback,
): TouchOfZenStacksResult {
  const { debuffsLookup, damageEvents, fightStartTime, fightEndTime } = data;

  if (!fightStartTime || !fightEndTime) {
    return {
      stackResults: [],
      allDotAbilityIds: [],
    };
  }

  const fightDuration = fightEndTime - fightStartTime;

  onProgress?.(0.1);

  // Step 1: Identify all DOT abilities by finding damage events with tick: true
  const dotAbilities = new Set<number>();
  damageEvents
    .filter((event) => event.tick === true)
    .forEach((event) => {
      dotAbilities.add(event.abilityGameID);
    });

  onProgress?.(0.3);

  // Step 2: Get Touch of Z'en debuff intervals
  const touchOfZenIntervals = debuffsLookup.buffIntervals[KnownAbilities.TOUCH_OF_ZEN.toString()];

  if (!touchOfZenIntervals || touchOfZenIntervals.length === 0) {
    return {
      stackResults: [],
      allDotAbilityIds: [],
    };
  }

  onProgress?.(0.4);

  // Step 3: For each Touch of Z'en interval, calculate stacks over time
  const stackTimelines = new Map<
    number,
    Array<{ timestamp: number; stacks: number; sourceId: number }>
  >();

  touchOfZenIntervals.forEach((interval) => {
    const targetId = interval.targetID;

    // Find the source ID from buff application events (this should be in the interval data)
    // For now, we'll determine it from nearby damage events
    const sourceId = findTouchOfZenSource(interval, damageEvents);

    if (sourceId === null) return;

    // Calculate stacks at regular intervals (every 1 second)
    const timeline: Array<{ timestamp: number; stacks: number; sourceId: number }> = [];

    for (let timestamp = interval.start; timestamp <= interval.end; timestamp += 1000) {
      // Count active DOT abilities from this source at this timestamp
      const stacks = countActiveDotAbilities(
        timestamp,
        sourceId,
        targetId,
        dotAbilities,
        damageEvents,
      );

      timeline.push({
        timestamp,
        stacks: Math.min(stacks, 5), // Cap at 5 stacks
        sourceId,
      });
    }

    if (!stackTimelines.has(targetId)) {
      stackTimelines.set(targetId, []);
    }

    const existingTimeline = stackTimelines.get(targetId);
    if (existingTimeline) {
      existingTimeline.push(...timeline);
    }
  });

  onProgress?.(0.7);

  // Step 4: Convert stack timelines into uptime results for each stack level (1-5)
  const results: TouchOfZenStackResult[] = [];

  for (let stackLevel = 1; stackLevel <= 5; stackLevel++) {
    const targetUptimes = new Map<number, { totalDuration: number; applications: number }>();

    // Calculate uptime for this specific stack level across all targets
    stackTimelines.forEach((timeline, targetId) => {
      const stackIntervals = calculateStackIntervals(timeline, stackLevel);

      stackIntervals.forEach((stackInterval) => {
        // Clip interval to fight bounds
        const clippedStart = Math.max(stackInterval.start, fightStartTime);
        const clippedEnd = Math.min(stackInterval.end, fightEndTime);

        if (clippedEnd > clippedStart) {
          const existing = targetUptimes.get(targetId) ?? { totalDuration: 0, applications: 0 };
          targetUptimes.set(targetId, {
            totalDuration: existing.totalDuration + (clippedEnd - clippedStart),
            applications: existing.applications + 1,
          });
        }
      });
    });

    if (targetUptimes.size > 0) {
      let cumulativeDuration = 0;
      let cumulativeApplications = 0;

      targetUptimes.forEach(({ totalDuration, applications }) => {
        cumulativeDuration += totalDuration;
        cumulativeApplications += applications;
      });

      const averageDuration = cumulativeDuration / targetUptimes.size;

      if (averageDuration > 0) {
        const uptimePercentage = (averageDuration / fightDuration) * 100;
        results.push({
          abilityGameID: KnownAbilities.TOUCH_OF_ZEN.toString(), // Use the actual Touch of Z'en ability ID for icon
          abilityName: `Touch of Z'en (${stackLevel} Stack${stackLevel > 1 ? 's' : ''})`,
          totalDuration: averageDuration,
          uptime: averageDuration / 1000, // Convert to seconds
          uptimePercentage: Math.min(uptimePercentage, 100),
          applications: cumulativeApplications,
          isDebuff: true,
          hostilityType: 1,
          stackLevel,
        });
      }
    }
  }

  onProgress?.(1);

  return {
    stackResults: results,
    allDotAbilityIds: Array.from(dotAbilities).sort(),
  };
}

/**
 * Find the source ID that applied Touch of Z'en for a given interval
 * This looks at damage events near the start of the interval to identify the source
 */
function findTouchOfZenSource(
  interval: { start: number; end: number; targetID: number },
  damageEvents: DamageEvent[],
): number | null {
  // Look for damage events shortly before or after the interval start
  const searchWindow = 5000; // 5 seconds
  const searchStart = interval.start - searchWindow;
  const searchEnd = interval.start + searchWindow;

  // Find unique source IDs that damaged this target during the search window
  const potentialSources = new Set<number>();

  damageEvents.forEach((event) => {
    if (
      event.targetID === interval.targetID &&
      event.timestamp >= searchStart &&
      event.timestamp <= searchEnd &&
      event.sourceID !== null &&
      event.sourceID !== undefined
    ) {
      potentialSources.add(event.sourceID);
    }
  });

  // For now, just return the first source found
  // In a more sophisticated implementation, we could try to determine
  // which source actually applied the Touch of Z'en debuff
  return potentialSources.size > 0 ? Array.from(potentialSources)[0] : null;
}

/**
 * Count how many DOT abilities from a specific source are active on a target at a given timestamp
 */
function countActiveDotAbilities(
  timestamp: number,
  sourceId: number,
  targetId: number,
  dotAbilities: Set<number>,
  damageEvents: DamageEvent[],
): number {
  // Look for DOT ticks within a recent window (3 seconds)
  const recentWindow = 3000; // 3 seconds
  const windowStart = timestamp - recentWindow;
  const windowEnd = timestamp;

  const activeDotAbilities = new Set<number>();

  damageEvents.forEach((event) => {
    if (
      event.sourceID === sourceId &&
      event.targetID === targetId &&
      event.tick === true &&
      event.timestamp >= windowStart &&
      event.timestamp <= windowEnd &&
      dotAbilities.has(event.abilityGameID)
    ) {
      activeDotAbilities.add(event.abilityGameID);
    }
  });

  return activeDotAbilities.size;
}

/**
 * Convert a timeline of stack counts into intervals where a specific stack level was active
 */
function calculateStackIntervals(
  timeline: Array<{ timestamp: number; stacks: number }>,
  targetStackLevel: number,
): Array<{ start: number; end: number }> {
  const intervals: Array<{ start: number; end: number }> = [];
  let currentIntervalStart: number | null = null;

  timeline.forEach((point, index) => {
    const hasTargetStacks = point.stacks >= targetStackLevel;
    const nextPoint = timeline[index + 1];

    if (hasTargetStacks && currentIntervalStart === null) {
      // Start of a new interval
      currentIntervalStart = point.timestamp;
    } else if (!hasTargetStacks && currentIntervalStart !== null) {
      // End of current interval
      intervals.push({
        start: currentIntervalStart,
        end: point.timestamp,
      });
      currentIntervalStart = null;
    } else if (hasTargetStacks && !nextPoint && currentIntervalStart !== null) {
      // End of timeline, close the current interval
      intervals.push({
        start: currentIntervalStart,
        end: point.timestamp,
      });
    }
  });

  return intervals;
}
