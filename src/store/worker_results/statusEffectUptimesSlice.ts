import { createWorkerTaskSlice } from './workerTaskSliceFactory';

// Create status effect uptimes slice
export const statusEffectUptimesSlice = createWorkerTaskSlice(
  'calculateStatusEffectUptimes',
  (input) => {
    const debuffIntervalsCount = input.debuffsLookup?.buffIntervals
      ? Object.keys(input.debuffsLookup.buffIntervals).length
      : 0;
    const hostileBuffIntervalsCount = input.hostileBuffsLookup?.buffIntervals
      ? Object.keys(input.hostileBuffsLookup.buffIntervals).length
      : 0;
    const fightStart = input.fightStartTime ?? 0;
    const fightEnd = input.fightEndTime ?? 0;
    const friendlyPlayerIds =
      input.friendlyPlayerIds
        ?.slice()
        .sort((a, b) => a - b)
        .join(',') ?? '';
    return `status-uptimes-${debuffIntervalsCount}-${hostileBuffIntervalsCount}-${fightStart}-${fightEnd}-${friendlyPlayerIds}`;
  },
);

// Export actions, thunk, and reducer
export const statusEffectUptimesActions = statusEffectUptimesSlice.actions;
export const executeStatusEffectUptimesTask = statusEffectUptimesSlice.executeTask;
export const statusEffectUptimesReducer = statusEffectUptimesSlice.reducer;
