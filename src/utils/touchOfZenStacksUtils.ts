import { KnownAbilities } from '../types/abilities';
import { DamageEvent } from '../types/combatlogEvents';

import { BuffLookupData } from './BuffLookupUtils';

export interface TouchOfZenStackInfo {
  targetId: number;
  timestamp: number;
  stacks: number;
}

/**
 * Enhance debuff uptimes with Touch of Z'en stack information
 * This function calculates stack levels for Touch of Z'en debuffs
 * and provides enhanced information for display
 */
export function calculateTouchOfZenStackEnhancement(
  debuffsLookup: BuffLookupData,
  damageEvents: DamageEvent[],
  fightStartTime: number,
  fightEndTime: number,
): {
  stackInfoByTarget: Map<number, TouchOfZenStackInfo[]>;
  averageStacks: number;
  maxStacks: number;
  totalStackTime: number; // Total time with any stacks
} {
  // Get Touch of Z'en debuff intervals
  const touchOfZenIntervals = debuffsLookup.buffIntervals[KnownAbilities.TOUCH_OF_ZEN.toString()];

  if (!touchOfZenIntervals || touchOfZenIntervals.length === 0) {
    return {
      stackInfoByTarget: new Map(),
      averageStacks: 0,
      maxStacks: 0,
      totalStackTime: 0,
    };
  }

  // Filter to only DOT damage events (tick = true)
  const dotDamageEvents = damageEvents.filter(
    (event) =>
      event.tick === true && event.timestamp >= fightStartTime && event.timestamp <= fightEndTime,
  );

  const stackInfoByTarget = new Map<number, TouchOfZenStackInfo[]>();
  let totalStackSeconds = 0;
  let maxStacksObserved = 0;
  let totalStackSum = 0;
  let totalDataPoints = 0;

  // Process each Touch of Z'en interval
  touchOfZenIntervals.forEach((interval) => {
    const targetId = interval.targetID;

    // Find potential sources that could have applied Touch of Z'en
    const potentialSources = findPotentialSources(dotDamageEvents, targetId, interval);

    if (potentialSources.length === 0) return;

    const stackTimeline: TouchOfZenStackInfo[] = [];

    // Sample every 2 seconds during the interval
    for (let timestamp = interval.start; timestamp <= interval.end; timestamp += 2000) {
      let maxStacksForTimestamp = 0;

      // For each potential source, calculate stacks at this timestamp
      potentialSources.forEach((sourceId) => {
        const stacks = countActiveDotStacks(timestamp, dotDamageEvents, sourceId, targetId);
        maxStacksForTimestamp = Math.max(maxStacksForTimestamp, stacks);
      });

      // Cap at 5 stacks maximum
      const finalStacks = Math.min(maxStacksForTimestamp, 5);

      stackTimeline.push({
        targetId,
        timestamp,
        stacks: finalStacks,
      });

      // Update statistics
      if (finalStacks > 0) {
        totalStackSeconds += 2; // Each sample represents 2 seconds
        maxStacksObserved = Math.max(maxStacksObserved, finalStacks);
        totalStackSum += finalStacks;
        totalDataPoints++;
      }
    }

    if (!stackInfoByTarget.has(targetId)) {
      stackInfoByTarget.set(targetId, []);
    }
    const existingData = stackInfoByTarget.get(targetId);
    if (existingData) {
      existingData.push(...stackTimeline);
    }
  });

  const averageStacks = totalDataPoints > 0 ? totalStackSum / totalDataPoints : 0;

  return {
    stackInfoByTarget,
    averageStacks,
    maxStacks: maxStacksObserved,
    totalStackTime: totalStackSeconds,
  };
}

/**
 * Find potential sources that could have applied Touch of Z'en
 */
function findPotentialSources(
  dotDamageEvents: DamageEvent[],
  targetId: number,
  interval: { start: number; end: number; targetID: number },
): number[] {
  const sources = new Set<number>();

  dotDamageEvents.forEach((event) => {
    if (
      event.targetID === targetId &&
      event.timestamp >= interval.start &&
      event.timestamp <= interval.end &&
      event.sourceID !== null &&
      event.sourceID !== undefined
    ) {
      sources.add(event.sourceID);
    }
  });

  return Array.from(sources);
}

/**
 * Count how many different DOT effects are active from a specific source to a target at a timestamp
 */
function countActiveDotStacks(
  timestamp: number,
  dotEvents: DamageEvent[],
  sourceId: number,
  targetId: number,
): number {
  // Look for unique DOT abilities that have ticked recently (within 3 seconds)
  const recentWindow = 3000; // 3 seconds
  const windowStart = timestamp - recentWindow;
  const windowEnd = timestamp + 1000; // Allow for 1 second in the future for timing tolerance

  const activeDotAbilities = new Set<number>();

  dotEvents.forEach((event) => {
    if (
      event.sourceID === sourceId &&
      event.targetID === targetId &&
      event.timestamp >= windowStart &&
      event.timestamp <= windowEnd
    ) {
      activeDotAbilities.add(event.abilityGameID);
    }
  });

  return activeDotAbilities.size;
}

/**
 * Format Touch of Z'en stack information for display
 */
export function formatTouchOfZenStackInfo(
  stackInfo: ReturnType<typeof calculateTouchOfZenStackEnhancement>,
): string {
  if (stackInfo.maxStacks === 0) {
    return '';
  }

  const avgStacks = stackInfo.averageStacks.toFixed(1);
  const maxStacks = stackInfo.maxStacks;

  return ` (Avg: ${avgStacks} stacks, Max: ${maxStacks} stacks)`;
}
