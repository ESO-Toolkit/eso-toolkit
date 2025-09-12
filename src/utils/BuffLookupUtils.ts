import { BuffEvent } from '../types/combatlogEvents';
import { DebuffEvent } from '../types/combatlogEvents';

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
  // Map from abilityGameID to sorted array of active time intervals with target info
  const buffIntervals = new Map<number, BuffTimeInterval[]>();

  // Track active buffs and their start times per target
  const activeBuffs = new Map<string, { startTime: number; sourceID: number }>(); // key: `${abilityGameID}_${targetID}`, value: {startTime, sourceID}

  // Process events in chronological order
  const sortedEvents = [...buffEvents].sort((a, b) => a.timestamp - b.timestamp);

  for (const event of sortedEvents) {
    const buffKey = `${event.abilityGameID}_${event.targetID}`;

    if (event.type === 'applybuff' || event.type === 'applybuffstack') {
      // Start tracking this buff instance if not already active
      if (!activeBuffs.has(buffKey)) {
        activeBuffs.set(buffKey, { startTime: event.timestamp, sourceID: event.sourceID });
      }
    } else if (event.type === 'removebuff') {
      // End tracking this buff instance (removebuffstack does NOT end the buff)
      const buffInfo = activeBuffs.get(buffKey);
      if (buffInfo !== undefined) {
        activeBuffs.delete(buffKey);

        // Add completed interval to the map
        if (!buffIntervals.has(event.abilityGameID)) {
          buffIntervals.set(event.abilityGameID, []);
        }

        const intervals = buffIntervals.get(event.abilityGameID);
        if (intervals) {
          intervals.push({
            start: buffInfo.startTime,
            end: event.timestamp,
            targetID: event.targetID,
            sourceID: buffInfo.sourceID,
          });
        }
      }
    }
    // Note: removebuffstack events are ignored - they don't end the buff
  }

  // Handle any remaining active buffs (they last until end of fight or indefinitely)
  const endTime = fightEndTime ?? Number.MAX_SAFE_INTEGER; // Use max number if no end time
  for (const [buffKey, buffInfo] of activeBuffs) {
    const [abilityGameIDStr, targetIDStr] = buffKey.split('_');
    const abilityGameID = parseInt(abilityGameIDStr, 10);
    const targetID = parseInt(targetIDStr, 10);

    if (!buffIntervals.has(abilityGameID)) {
      buffIntervals.set(abilityGameID, []);
    }

    const intervals = buffIntervals.get(abilityGameID);
    if (intervals) {
      intervals.push({
        start: buffInfo.startTime,
        end: endTime,
        targetID: targetID,
        sourceID: buffInfo.sourceID,
      });
    }
  }

  // Sort intervals for each buff by start time for efficient binary search
  for (const intervals of buffIntervals.values()) {
    intervals.sort((a, b) => a.start - b.start);
  }

  // Convert Map to POJO for serialization
  const buffIntervalsObj: { [key: string]: BuffTimeInterval[] } = {};
  for (const [abilityGameID, intervals] of buffIntervals.entries()) {
    buffIntervalsObj[abilityGameID.toString()] = intervals;
  }

  return {
    buffIntervals: buffIntervalsObj,
  };
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
    (interval: BuffTimeInterval) => timestamp >= interval.start && timestamp <= interval.end,
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
      (interval: BuffTimeInterval) => timestamp >= interval.start && timestamp <= interval.end,
    );
  }

  // Binary search for intervals containing the timestamp on the specific target
  let left = 0;
  let right = intervals.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const interval = intervals[mid];

    if (
      timestamp >= interval.start &&
      timestamp <= interval.end &&
      interval.targetID === targetID
    ) {
      return true;
    } else if (timestamp < interval.start) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  // Also check adjacent intervals since they might overlap or be on different targets
  for (const interval of intervals) {
    if (
      timestamp >= interval.start &&
      timestamp <= interval.end &&
      interval.targetID === targetID
    ) {
      return true;
    }
  }

  return false;
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
  // Map from abilityGameID to sorted array of active time intervals with target info
  const debuffIntervals = new Map<number, BuffTimeInterval[]>();

  // Track active debuffs and their start times per target
  const activeDebuffs = new Map<string, { startTime: number; sourceID: number }>(); // key: `${abilityGameID}_${targetID}`, value: {startTime, sourceID}

  // Process events in chronological order
  const sortedEvents = [...debuffEvents].sort((a, b) => a.timestamp - b.timestamp);

  for (const event of sortedEvents) {
    const debuffKey = `${event.abilityGameID}_${event.targetID}`;

    if (event.type === 'applydebuff' || event.type === 'applydebuffstack') {
      // Start tracking this debuff instance if not already active
      if (!activeDebuffs.has(debuffKey)) {
        activeDebuffs.set(debuffKey, { startTime: event.timestamp, sourceID: event.sourceID });
      }
    } else if (event.type === 'removedebuff') {
      // End tracking this debuff instance (removedebuffstack does NOT end the debuff)
      const debuffInfo = activeDebuffs.get(debuffKey);
      if (debuffInfo !== undefined) {
        activeDebuffs.delete(debuffKey);

        // Add completed interval to the map
        if (!debuffIntervals.has(event.abilityGameID)) {
          debuffIntervals.set(event.abilityGameID, []);
        }

        const intervals = debuffIntervals.get(event.abilityGameID);
        if (intervals) {
          intervals.push({
            start: debuffInfo.startTime,
            end: event.timestamp,
            targetID: event.targetID,
            sourceID: debuffInfo.sourceID,
          });
        }
      }
    }
    // Note: removedebuffstack events are ignored - they don't end the debuff
  }

  // Handle any remaining active debuffs (they last until end of fight or indefinitely)
  const endTime = fightEndTime ?? Number.MAX_SAFE_INTEGER; // Use max number if no end time
  for (const [debuffKey, debuffInfo] of activeDebuffs) {
    const [abilityGameIDStr, targetIDStr] = debuffKey.split('_');
    const abilityGameID = parseInt(abilityGameIDStr, 10);
    const targetID = parseInt(targetIDStr, 10);

    if (!debuffIntervals.has(abilityGameID)) {
      debuffIntervals.set(abilityGameID, []);
    }

    const intervals = debuffIntervals.get(abilityGameID);
    if (intervals) {
      intervals.push({
        start: debuffInfo.startTime,
        end: endTime,
        targetID: targetID,
        sourceID: debuffInfo.sourceID,
      });
    }
  }

  // Sort intervals for each debuff by start time for efficient binary search
  for (const intervals of debuffIntervals.values()) {
    intervals.sort((a, b) => a.start - b.start);
  }

  // Convert Map to POJO for serialization
  const buffIntervalsObj: { [key: string]: BuffTimeInterval[] } = {};
  for (const [abilityGameID, intervals] of debuffIntervals.entries()) {
    buffIntervalsObj[abilityGameID.toString()] = intervals;
  }

  return {
    buffIntervals: buffIntervalsObj, // Reusing the same interface for consistency
  };
}
