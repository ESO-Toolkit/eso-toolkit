import memoizeOne from 'memoize-one';

import type { ScribingDetectionsTaskInput } from '@/workers/calculations/CalculateScribingDetections';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

/**
 * Simple string hash function for browser compatibility
 * Uses a variant of the djb2 hash algorithm
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

const computeScribingDetectionsHash = memoizeOne(
  (fightId: number, playerAbilities: unknown, castsCount: number, buffsCount: number) => {
    const hashInput = JSON.stringify({
      fightId,
      playerAbilities,
      castsCount,
      buffsCount,
    });
    return simpleHash(hashInput);
  },
);

export const scribingDetectionsSlice = createWorkerTaskSlice(
  'calculateScribingDetections',
  (input: ScribingDetectionsTaskInput) =>
    computeScribingDetectionsHash(
      input.fightId,
      input.playerAbilities,
      input.combatEvents.casts.length,
      input.combatEvents.buffs.length,
    ),
);

export const scribingDetectionsActions = scribingDetectionsSlice.actions;
export const executeScribingDetectionsTask = scribingDetectionsSlice.executeTask;
export const scribingDetectionsReducer = scribingDetectionsSlice.reducer;
