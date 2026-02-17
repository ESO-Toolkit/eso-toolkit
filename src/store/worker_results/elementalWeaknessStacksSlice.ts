import { createWorkerTaskSlice } from './workerTaskSliceFactory';

// Create elemental weakness stacks slice
export const elementalWeaknessStacksSlice = createWorkerTaskSlice(
  'calculateElementalWeaknessStacks',
  (input) => {
    const debuffIntervalsCount = input.debuffsLookup?.buffIntervals ? Object.keys(input.debuffsLookup.buffIntervals).length : 0;
    const fightStart = input.fightStartTime ?? 0;
    const fightEnd = input.fightEndTime ?? 0;
    return `elem-weakness-${debuffIntervalsCount}-${fightStart}-${fightEnd}`;
  },
);

// Export actions, thunk, and reducer
export const elementalWeaknessStacksActions = elementalWeaknessStacksSlice.actions;
export const executeElementalWeaknessStacksTask = elementalWeaknessStacksSlice.executeTask;
export const elementalWeaknessStacksReducer = elementalWeaknessStacksSlice.reducer;
