import { BuffEvent, DebuffEvent } from '@/types/combatlogEvents';
import { BuffLookupData, createBuffLookup, createDebuffLookup } from '@/utils/BuffLookupUtils';

import { OnProgressCallback } from '../Utils';

export interface BuffCalculationTask {
  buffEvents: (BuffEvent | DebuffEvent)[];
  fightEndTime?: number;
}

export function calculateBuffLookup(
  data: BuffCalculationTask,
  onProgress?: OnProgressCallback,
): BuffLookupData {
  const { buffEvents, fightEndTime } = data;

  // Report initial progress
  onProgress?.(0);

  // Detect if these are buff or debuff events based on the first event type
  const isDebuffEvents =
    buffEvents.length > 0 &&
    (buffEvents[0].type.includes('debuff') || buffEvents[0].type.includes('Debuff'));

  let result: BuffLookupData;
  if (isDebuffEvents) {
    // Cast to DebuffEvent[] since we detected debuff events
    result = createDebuffLookup(buffEvents as DebuffEvent[], fightEndTime);
  } else {
    // Cast to BuffEvent[] since we detected buff events
    result = createBuffLookup(buffEvents as BuffEvent[], fightEndTime);
  }

  // Report completion
  onProgress?.(1);

  return result;
}
