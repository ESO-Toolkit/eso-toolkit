import memoizeOne from 'memoize-one';
import { v4 as uuidV4 } from 'uuid';

import type { ScribingDetectionsTaskInput } from '@/workers/calculations/CalculateScribingDetections';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computeScribingDetectionsHash = memoizeOne((..._args: unknown[]) => {
  return `${uuidV4()}-${Date.now().toLocaleString()}`;
});

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
