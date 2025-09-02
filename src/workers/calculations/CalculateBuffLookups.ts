import { OnProgressCallback } from '../Utils';

import { BuffEvent, DebuffEvent } from '@/types/combatlogEvents';
import { BuffLookupData, BuffTimeInterval } from '@/utils/BuffLookupUtils';

export interface BuffCalculationTask {
  buffEvents: (BuffEvent | DebuffEvent)[];
  fightEndTime?: number;
}

// Supported event types for starting and ending intervals
const START_TYPES = new Set(['applybuff', 'applybuffstack', 'applydebuff', 'applydebuffstack']);
const END_TYPES = new Set(['removebuff', 'removedebuff']);

export function calculateBuffLookup(
  data: BuffCalculationTask,
  onProgress?: OnProgressCallback
): BuffLookupData {
  const { buffEvents, fightEndTime } = data;

  // Report initial progress
  onProgress?.(0);

  // Map from abilityGameID to sorted array of active time intervals with target info
  const buffIntervals = new Map<number, BuffTimeInterval[]>();

  // Track active buffs/debuffs and their start times per target
  const activeIntervals = new Map<string, number>(); // key: `${abilityGameID}_${targetID}`, value: startTime

  // Sort events in chronological order
  onProgress?.(0);
  const sortedEvents = [...buffEvents].sort((a, b) => a.timestamp - b.timestamp);

  // Process events
  onProgress?.(0);

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const intervalKey = `${event.abilityGameID}_${event.targetID}`;

    if (START_TYPES.has(event.type)) {
      // Start tracking this interval instance if not already active
      if (!activeIntervals.has(intervalKey)) {
        activeIntervals.set(intervalKey, event.timestamp);
      }
    } else if (END_TYPES.has(event.type)) {
      // End tracking this interval instance
      const startTime = activeIntervals.get(intervalKey);
      if (startTime !== undefined) {
        addBuffInterval(
          buffIntervals,
          event.abilityGameID,
          startTime,
          event.timestamp,
          event.targetID
        );
        activeIntervals.delete(intervalKey);
      }
    }

    // Report progress every 1000 events
    if (i % 1000 === 0 || i === sortedEvents.length - 1) {
      onProgress?.(i / sortedEvents.length);
    }
  }

  // Handle intervals that are still active at fight end
  if (fightEndTime) {
    for (const [intervalKey, startTime] of activeIntervals.entries()) {
      const [abilityGameID, targetID] = intervalKey.split('_').map(Number);
      addBuffInterval(buffIntervals, abilityGameID, startTime, fightEndTime, targetID);
    }
  }

  // Sort all intervals by start time for efficient lookup
  for (const intervals of buffIntervals.values()) {
    intervals.sort((a, b) => a.start - b.start);
  }

  onProgress?.(1);

  // Convert Map to plain object for serialization across worker boundary
  const buffIntervalsObject: { [key: string]: BuffTimeInterval[] } = {};
  for (const [abilityGameID, intervals] of buffIntervals.entries()) {
    buffIntervalsObject[abilityGameID.toString()] = intervals;
  }

  return { buffIntervals: buffIntervalsObject };
}

function addBuffInterval(
  buffIntervals: Map<number, BuffTimeInterval[]>,
  abilityGameID: number,
  start: number,
  end: number,
  targetID: number
): void {
  if (!buffIntervals.has(abilityGameID)) {
    buffIntervals.set(abilityGameID, []);
  }

  const intervals = buffIntervals.get(abilityGameID);
  if (intervals) {
    intervals.push({ start, end, targetID });
  }
}
