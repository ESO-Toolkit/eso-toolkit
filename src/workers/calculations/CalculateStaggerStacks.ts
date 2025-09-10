import { KnownAbilities } from '../../types/abilities';
import { DamageEvent } from '../../types/combatlogEvents';
import { OnProgressCallback } from '../Utils';

export interface StaggerStacksCalculationTask {
  damageEvents: DamageEvent[];
  fightStartTime?: number;
  fightEndTime?: number;
}

export interface StaggerStackResult {
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

export interface StaggerStacksResult {
  stackResults: StaggerStackResult[];
}

// Stone Giant ability ID that applies stagger
const STONE_GIANT_ABILITY_ID = KnownAbilities.STONE_GIANT;

// Each stack lasts 6 seconds
const STACK_DURATION = 6000;

/**
 * Calculate Stagger stacks debuff uptimes
 * Each damage event from Stone Giant (134340) applies/refreshes stagger stacks:
 * - Builds up to 3 stacks (1st hit = 1 stack, 2nd = 2 stacks, 3rd = 3 stacks)
 * - Once at 3 stacks, subsequent hits refresh the 6-second duration
 * - If 6 seconds pass with no hits, all stacks drop off at once
 */
export function calculateStaggerStacks(
  data: StaggerStacksCalculationTask,
  onProgress?: OnProgressCallback,
): StaggerStacksResult {
  const { damageEvents, fightStartTime, fightEndTime } = data;

  if (!fightStartTime || !fightEndTime) {
    return {
      stackResults: [],
    };
  }

  const fightDuration = fightEndTime - fightStartTime;

  onProgress?.(0.1);

  // Step 1: Filter Stone Giant damage events within fight bounds
  const stoneGiantDamageEvents = damageEvents.filter(
    (event) =>
      event.abilityGameID === STONE_GIANT_ABILITY_ID &&
      event.timestamp >= fightStartTime &&
      event.timestamp < fightEndTime, // Don't include events exactly at fight end
  );

  if (stoneGiantDamageEvents.length === 0) {
    return {
      stackResults: [],
    };
  }

  onProgress?.(0.3);

  // Step 2: Group events by target and calculate stacks over time for each target
  const targetTimelines = new Map<number, Array<{ timestamp: number; stacks: number }>>();

  // Group Stone Giant events by target
  const eventsByTarget = new Map<number, DamageEvent[]>();
  stoneGiantDamageEvents.forEach((event) => {
    if (!eventsByTarget.has(event.targetID)) {
      eventsByTarget.set(event.targetID, []);
    }
    const targetEvents = eventsByTarget.get(event.targetID);
    if (targetEvents) {
      targetEvents.push(event);
    }
  });

  // Calculate stack timeline for each target using refreshing mechanics
  eventsByTarget.forEach((events, targetId) => {
    // Sort events by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);

    const timeline: Array<{ timestamp: number; stacks: number }> = [];
    let currentStacks = 0;
    let lastHitTime = 0;

    // Process each damage event
    events.forEach((event, index) => {
      const timestamp = event.timestamp;

      // Check if stacks should have expired since last hit
      if (currentStacks > 0 && timestamp - lastHitTime > STACK_DURATION) {
        // Add expiration event
        const expirationTime = lastHitTime + STACK_DURATION;
        if (expirationTime < timestamp && expirationTime >= fightStartTime) {
          timeline.push({
            timestamp: expirationTime,
            stacks: 0,
          });
        }
        currentStacks = 0;
      }

      // Apply new stack or refresh
      if (currentStacks < 3) {
        currentStacks++;
      }
      // If already at 3 stacks, just refresh (no stack count change)

      // Record current stack state
      timeline.push({
        timestamp,
        stacks: currentStacks,
      });

      lastHitTime = timestamp;

      // Add expiration event for the last hit (if within fight bounds)
      const isLastEvent = index === events.length - 1;
      if (isLastEvent) {
        const finalExpirationTime = timestamp + STACK_DURATION;
        if (finalExpirationTime <= fightEndTime) {
          timeline.push({
            timestamp: finalExpirationTime,
            stacks: 0,
          });
        }
      }
    });

    // Sort timeline by timestamp
    timeline.sort((a, b) => a.timestamp - b.timestamp);

    targetTimelines.set(targetId, timeline);
  });

  onProgress?.(0.7);

  // Step 3: Convert timelines into uptime results for each stack level (1-3)
  const results: StaggerStackResult[] = [];

  for (let stackLevel = 1; stackLevel <= 3; stackLevel++) {
    let totalUptime = 0;
    let applications = 0;

    // Calculate uptime for this stack level across all targets
    targetTimelines.forEach((timeline) => {
      const stackIntervals = calculateStackIntervals(timeline, stackLevel, fightEndTime);

      stackIntervals.forEach((interval) => {
        // Clip interval to fight bounds
        const clippedStart = Math.max(interval.start, fightStartTime);
        const clippedEnd = Math.min(interval.end, fightEndTime);

        if (clippedEnd > clippedStart) {
          totalUptime += clippedEnd - clippedStart;
          applications += 1;
        }
      });
    });

    if (totalUptime > 0) {
      results.push({
        abilityGameID: KnownAbilities.STAGGER.toString(),
        abilityName: `Stagger (${stackLevel} Stack${stackLevel > 1 ? 's' : ''})`,
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
