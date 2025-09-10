import { KnownAbilities } from '../../types/abilities';
import { BuffLookupData } from '../../utils/BuffLookupUtils';
import { OnProgressCallback } from '../Utils';

export interface ElementalWeaknessStacksCalculationTask {
  debuffsLookup: BuffLookupData;
  fightStartTime?: number;
  fightEndTime?: number;
}

export interface ElementalWeaknessStackResult {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
  isDebuff: boolean;
  hostilityType: 0 | 1;
  stackLevel: number; // 1-3 to indicate which stack level this represents
}

export interface ElementalWeaknessStacksResult {
  stackResults: ElementalWeaknessStackResult[];
}

// Elemental weakness ability IDs
const FLAME_WEAKNESS_ID = KnownAbilities.FLAME_WEAKNESS;
const FROST_WEAKNESS_ID = KnownAbilities.FROST_WEAKNESS;
const SHOCK_WEAKNESS_ID = KnownAbilities.SHOCK_WEAKNESS;

/**
 * Calculate Elemental Weakness stacks debuff uptimes
 * Counts how many of the three elemental weakness debuffs are active at any time:
 * - Flame Weakness (142610)
 * - Frost Weakness (142652)
 * - Shock Weakness (142653)
 *
 * Stacks represent the number of different elemental weaknesses active:
 * - 1 stack: 1 weakness active
 * - 2 stacks: 2 weaknesses active
 * - 3 stacks: all 3 weaknesses active
 */
export function calculateElementalWeaknessStacks(
  data: ElementalWeaknessStacksCalculationTask,
  onProgress?: OnProgressCallback,
): ElementalWeaknessStacksResult {
  const { debuffsLookup, fightStartTime, fightEndTime } = data;

  if (!fightStartTime || !fightEndTime) {
    return {
      stackResults: [],
    };
  }

  const fightDuration = fightEndTime - fightStartTime;

  onProgress?.(0.1);

  // Get debuff intervals for each elemental weakness
  const flameWeaknessIntervals = debuffsLookup.buffIntervals[FLAME_WEAKNESS_ID.toString()] || [];
  const frostWeaknessIntervals = debuffsLookup.buffIntervals[FROST_WEAKNESS_ID.toString()] || [];
  const shockWeaknessIntervals = debuffsLookup.buffIntervals[SHOCK_WEAKNESS_ID.toString()] || [];

  // If no elemental weakness debuffs are present, return empty results
  if (
    flameWeaknessIntervals.length === 0 &&
    frostWeaknessIntervals.length === 0 &&
    shockWeaknessIntervals.length === 0
  ) {
    return {
      stackResults: [],
    };
  }

  onProgress?.(0.3);

  // Create timeline events for each elemental weakness
  const timelineEvents: Array<{
    timestamp: number;
    type: 'start' | 'end';
    weakness: 'flame' | 'frost' | 'shock';
    targetId: number;
  }> = [];

  // Add events for flame weakness
  flameWeaknessIntervals.forEach((interval: { start: number; end: number; targetID: number }) => {
    timelineEvents.push({
      timestamp: interval.start,
      type: 'start',
      weakness: 'flame',
      targetId: interval.targetID,
    });
    timelineEvents.push({
      timestamp: interval.end,
      type: 'end',
      weakness: 'flame',
      targetId: interval.targetID,
    });
  });

  // Add events for frost weakness
  frostWeaknessIntervals.forEach((interval: { start: number; end: number; targetID: number }) => {
    timelineEvents.push({
      timestamp: interval.start,
      type: 'start',
      weakness: 'frost',
      targetId: interval.targetID,
    });
    timelineEvents.push({
      timestamp: interval.end,
      type: 'end',
      weakness: 'frost',
      targetId: interval.targetID,
    });
  });

  // Add events for shock weakness
  shockWeaknessIntervals.forEach((interval: { start: number; end: number; targetID: number }) => {
    timelineEvents.push({
      timestamp: interval.start,
      type: 'start',
      weakness: 'shock',
      targetId: interval.targetID,
    });
    timelineEvents.push({
      timestamp: interval.end,
      type: 'end',
      weakness: 'shock',
      targetId: interval.targetID,
    });
  });

  // Sort timeline events by timestamp
  timelineEvents.sort((a, b) => a.timestamp - b.timestamp);

  onProgress?.(0.5);

  // Track active weaknesses per target
  const activeWeaknesses = new Map<number, Map<string, number>>(); // targetId -> Map of weakness type to count

  // Calculate stack timeline by processing events chronologically
  const stackTimeline: Array<{ timestamp: number; stacks: number }> = [];
  let currentStacks = 0;

  timelineEvents.forEach((event) => {
    // Skip events outside fight bounds
    if (event.timestamp < fightStartTime || event.timestamp > fightEndTime) {
      return;
    }

    const targetWeaknesses = activeWeaknesses.get(event.targetId) || new Map<string, number>();

    if (event.type === 'start') {
      // Increment count for this weakness type
      const currentCount = targetWeaknesses.get(event.weakness) || 0;
      targetWeaknesses.set(event.weakness, currentCount + 1);
    } else {
      // Decrement count for this weakness type
      const currentCount = targetWeaknesses.get(event.weakness) || 0;
      if (currentCount > 1) {
        targetWeaknesses.set(event.weakness, currentCount - 1);
      } else {
        targetWeaknesses.delete(event.weakness);
      }
    }

    // Update or remove target's weakness map
    if (targetWeaknesses.size > 0) {
      activeWeaknesses.set(event.targetId, targetWeaknesses);
    } else {
      activeWeaknesses.delete(event.targetId);
    }

    // Calculate current total stacks across all targets
    // Each target can contribute at most 3 stacks (one per weakness type)
    // But we want the maximum stacks any single target has
    let maxTargetStacks = 0;
    activeWeaknesses.forEach((weaknesses) => {
      maxTargetStacks = Math.max(maxTargetStacks, weaknesses.size);
    });

    const newStacks = maxTargetStacks;

    // Only add to timeline if stack count changed
    if (newStacks !== currentStacks) {
      stackTimeline.push({
        timestamp: event.timestamp,
        stacks: newStacks,
      });
      currentStacks = newStacks;
    }
  });

  onProgress?.(0.7);

  // Convert stack timeline into uptime results for each stack level (1-3)
  const results: ElementalWeaknessStackResult[] = [];

  for (let stackLevel = 1; stackLevel <= 3; stackLevel++) {
    let totalUptime = 0;
    let applications = 0;

    // Calculate uptime for this stack level
    const stackIntervals = calculateStackIntervals(stackTimeline, stackLevel, fightEndTime);

    stackIntervals.forEach((interval) => {
      // Clip interval to fight bounds
      const clippedStart = Math.max(interval.start, fightStartTime);
      const clippedEnd = Math.min(interval.end, fightEndTime);

      if (clippedEnd > clippedStart) {
        totalUptime += clippedEnd - clippedStart;
        applications += 1;
      }
    });

    if (totalUptime > 0) {
      results.push({
        abilityGameID: FLAME_WEAKNESS_ID.toString(), // Use flame weakness ID for icon (could be any of the three)
        abilityName: `Elemental Weakness (${stackLevel} Stack${stackLevel > 1 ? 's' : ''})`,
        totalDuration: totalUptime,
        uptime: totalUptime / 1000, // Convert to seconds
        uptimePercentage: (totalUptime / fightDuration) * 100,
        applications,
        isDebuff: true,
        hostilityType: 1,
        stackLevel,
      });
    }
  }

  onProgress?.(1);

  return {
    stackResults: results,
  };
}

/**
 * Convert a timeline of stack counts into intervals where a specific stack level was active
 */
function calculateStackIntervals(
  timeline: Array<{ timestamp: number; stacks: number }>,
  targetStackLevel: number,
  fightEndTime: number,
): Array<{ start: number; end: number }> {
  const intervals: Array<{ start: number; end: number }> = [];
  let currentIntervalStart: number | null = null;

  for (let i = 0; i < timeline.length; i++) {
    const { timestamp, stacks } = timeline[i];
    const hasTargetStacks = stacks >= targetStackLevel;

    if (hasTargetStacks && currentIntervalStart === null) {
      // Start a new interval
      currentIntervalStart = timestamp;
    } else if (!hasTargetStacks && currentIntervalStart !== null) {
      // End the current interval
      intervals.push({
        start: currentIntervalStart,
        end: timestamp,
      });
      currentIntervalStart = null;
    }
  }

  // Handle interval that extends to the end
  if (currentIntervalStart !== null && timeline.length > 0) {
    intervals.push({
      start: currentIntervalStart,
      end: fightEndTime, // Use fight end time instead of last event timestamp
    });
  }

  return intervals;
}
