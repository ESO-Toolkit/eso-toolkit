import { createHash } from 'crypto';
import memoizeOne from 'memoize-one';

import type { ScribingDetectionsTaskInput } from '@/workers/calculations/CalculateScribingDetections';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computeScribingDetectionsHash = memoizeOne(
  (fightId: number, playerAbilities: unknown, castsCount: number, buffsCount: number) => {
    const hashInput = JSON.stringify({
      fightId,
      playerAbilities,
      castsCount,
      buffsCount,
    });
    return createHash('sha256').update(hashInput).digest('hex');
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
