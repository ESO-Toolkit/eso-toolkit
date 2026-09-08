import { BuffEvent, DebuffEvent } from '../types/combatlogEvents';

// Efficient buff lookup data structure
export interface BuffTimeInterval {
  start: number;
  end: number;
  targetID: number; // Track which target this interval applies to
  sourceID: number; // Track who applied the buff/debuff
}

// POJO data structure for buff lookup - serializable for worker communication
export interface BuffLookupData {
  buffIntervals: { [key: string]: BuffTimeInterval[] };
}

interface LifecycleEvent {
  abilityGameID: number;
  sourceID: number;
  targetID: number;
  timestamp: number;
  type: string;
}

interface ActiveEffect {
  abilityGameID: number;
  sourceID: number;
  targetID: number;
  startTime: number;
}

/**
 * Creates an efficient buff lookup data structure from a list of buff events.
 * Uses a Map with sorted time intervals for O(log n) lookup time per buff.
 *
 * Time Complexity:
 * - Creation: O(n log n) where n is the number of events
 * - Lookup: O(log m) where m is the number of intervals for a specific buff
 *
 * Space Complexity: O(n) where n is the number of buff intervals
 *
 * @param buffEvents - Array of buff events to process
 * @param fightEndTime - Optional fight end time to handle buffs that remain active
 * @returns BuffLookupData object containing the processed buff intervals
 */
export function createBuffLookup(buffEvents: BuffEvent[], fightEndTime?: number): BuffLookupData {
  return createLookupFromLifecycleEvents(
    buffEvents,
    fightEndTime,
    ['applybuff', 'applybuffstack'],
    'removebuff',
  );
}

/**
 * Checks if a buff is active at a specific timestamp for any target.
 *
 * @param buffLookup - The buff lookup data structure
 * @param abilityGameID - The ability ID to check
 * @param timestamp - The timestamp to check
 * @returns True if the buff is active at the timestamp
 */
export function isBuffActive(
  buffLookup: BuffLookupData,
  abilityGameID: number,
  timestamp?: number,
): boolean {
  const intervals = buffLookup.buffIntervals[abilityGameID.toString()];
  if (!intervals || intervals.length === 0) {
    return false;
  }

  // If timestamp is undefined, return true if the buff was active during any interval
  if (timestamp === undefined) {
    return intervals.length > 0;
  }

  // Check if any interval contains the timestamp (regardless of target)
  return intervals.some(
    (interval: BuffTimeInterval) => timestamp >= interval.start && timestamp < interval.end,
  );
}

/**
 * Checks if a buff is active at a specific timestamp for a specific target,
 * or if a buff was ever active on a target (when timestamp is not provided).
 * If no target is specified, checks if the buff is active on any target.
 *
 * @param buffLookup - The buff lookup data structure
 * @param abilityGameID - The ability ID to check
 * @param timestamp - Optional timestamp to check. If not provided, checks if buff was ever active on target
 * @param targetID - Optional target ID to check. If not provided, checks any target
 * @returns True if the buff is active on the target (or any target if targetID not specified) at the timestamp,
 *          or ever active if timestamp not provided
 */
export function isBuffActiveOnTarget(
  buffLookup: BuffLookupData,
  abilityGameID: number,
  timestamp?: number,
  targetID?: number,
): boolean {
  const intervals = buffLookup.buffIntervals[abilityGameID.toString()];

  if (!intervals || intervals.length === 0) {
    return false;
  }

  // If timestamp is undefined, check if buff was ever active on target
  if (timestamp === undefined) {
    if (targetID === undefined) {
      return intervals.length > 0;
    } else {
      // Return true if any interval exists for this target
      return intervals.some((interval: BuffTimeInterval) => interval.targetID === targetID);
    }
  }

  // If no target specified, check if buff is active on any target at the timestamp
  if (targetID === undefined) {
    return intervals.some(
      (interval: BuffTimeInterval) => timestamp >= interval.start && timestamp < interval.end,
    );
  }

  // Intervals are sorted by start time ONLY, so a binary search that also
  // requires interval.targetID === targetID can't validly narrow the range —
  // different targets' intervals are interleaved by start time. The previous
  // code recognized this and fell back to a full linear scan anyway, so the
  // "binary search" was dead complexity. Use the linear scan directly (O(n)
  // over this ability id's intervals); behavior is identical.
  return intervals.some(
    (interval: BuffTimeInterval) =>
      interval.targetID === targetID && timestamp >= interval.start && timestamp < interval.end,
  );
}

/**
 * Gets all active targets for a buff at a specific timestamp.
 *
 * @param buffLookup - The buff lookup data structure
 * @param abilityGameID - The ability ID to check
 * @param timestamp - The timestamp to check
 * @returns Array of target IDs that have the buff active at the timestamp, sorted
 */

/**
 * Creates a buff lookup data structure for debuff events.
 * Similar functionality to createBuffLookup but for debuff events.
 *
 * @param debuffEvents - Array of debuff events to process
 * @param fightEndTime - Optional fight end time to handle debuffs that remain active
 * @returns BuffLookupData object containing the processed debuff intervals
 */
export function createDebuffLookup(
  debuffEvents: DebuffEvent[],
  fightEndTime?: number,
): BuffLookupData {
  return createLookupFromLifecycleEvents(
    debuffEvents,
    fightEndTime,
    ['applydebuff', 'applydebuffstack'],
    'removedebuff',
  );
}

function createLookupFromLifecycleEvents(
  events: readonly LifecycleEvent[],
  fightEndTime: number | undefined,
  applyTypes: readonly string[],
  removeType: string,
): BuffLookupData {
  const intervalsByAbility = new Map<number, BuffTimeInterval[]>();
  const activeEffects = new Map<string, ActiveEffect>();
  const endTime =
    typeof fightEndTime === 'number' && Number.isFinite(fightEndTime)
      ? normalizeZero(fightEndTime)
      : Number.MAX_SAFE_INTEGER;
  const sortedEvents = events
    .filter(isFiniteLifecycleEvent)
    .map(normalizeLifecycleEvent)
    .sort((first, second) => first.timestamp - second.timestamp);

  for (const event of sortedEvents) {
    const effectKey = `${event.abilityGameID}_${event.targetID}`;

    if (applyTypes.includes(event.type)) {
      if (!activeEffects.has(effectKey)) {
        activeEffects.set(effectKey, {
          abilityGameID: event.abilityGameID,
          sourceID: event.sourceID,
          targetID: event.targetID,
          startTime: event.timestamp,
        });
      }
      continue;
    }

    if (event.type !== removeType) {
      continue;
    }

    const activeEffect = activeEffects.get(effectKey);
    if (activeEffect) {
      activeEffects.delete(effectKey);
      addInterval(intervalsByAbility, activeEffect, event.timestamp);
    }
  }

  for (const activeEffect of activeEffects.values()) {
    addInterval(intervalsByAbility, activeEffect, endTime);
  }

  const buffIntervals: BuffLookupData['buffIntervals'] = {};
  for (const [abilityGameID, intervals] of intervalsByAbility) {
    intervals.sort((first, second) => first.start - second.start);
    buffIntervals[abilityGameID.toString()] = intervals;
  }

  return { buffIntervals };
}

function isFiniteLifecycleEvent(event: LifecycleEvent): boolean {
  return (
    Number.isFinite(event.abilityGameID) &&
    Number.isFinite(event.sourceID) &&
    Number.isFinite(event.targetID) &&
    Number.isFinite(event.timestamp)
  );
}

function normalizeLifecycleEvent(event: LifecycleEvent): LifecycleEvent {
  return {
    ...event,
    abilityGameID: normalizeZero(event.abilityGameID),
    sourceID: normalizeZero(event.sourceID),
    targetID: normalizeZero(event.targetID),
    timestamp: normalizeZero(event.timestamp),
  };
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function addInterval(
  intervalsByAbility: Map<number, BuffTimeInterval[]>,
  activeEffect: ActiveEffect,
  endTime: number,
): void {
  if (!Number.isFinite(endTime) || endTime <= activeEffect.startTime) {
    return;
  }

  const intervals = intervalsByAbility.get(activeEffect.abilityGameID) ?? [];
  intervals.push({
    start: activeEffect.startTime,
    end: endTime,
    targetID: activeEffect.targetID,
    sourceID: activeEffect.sourceID,
  });
  intervalsByAbility.set(activeEffect.abilityGameID, intervals);
}
