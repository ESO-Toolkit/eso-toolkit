import { createWorkerTaskSlice } from './workerTaskSliceFactory';

// Create penetration data slice
export const penetrationDataSlice = createWorkerTaskSlice('calculatePenetrationData', (input) => {
  const fightStart = input.fight?.startTime ?? 0;
  const fightEnd = input.fight?.endTime ?? 0;
  const playersCount = input.players ? Object.keys(input.players).length : 0;
  const combatantInfoCount = input.combatantInfoEvents
    ? Object.keys(input.combatantInfoEvents).length
    : 0;
  const buffIntervalsCount = input.friendlyBuffsLookup?.buffIntervals
    ? Object.keys(input.friendlyBuffsLookup.buffIntervals).length
    : 0;
  const debuffIntervalsCount = input.debuffsLookup?.buffIntervals
    ? Object.keys(input.debuffsLookup.buffIntervals).length
    : 0;
  const damageEventsCount = input.damageEvents?.length ?? 0;
  const selectedTargets =
    input.selectedTargetIds
      ?.slice()
      .sort((a, b) => a - b)
      .join(',') ?? '';
  return `penetration-${fightStart}-${fightEnd}-${playersCount}-${combatantInfoCount}-${buffIntervalsCount}-${debuffIntervalsCount}-${damageEventsCount}-${selectedTargets}`;
});

// Export actions, thunk, and reducer
export const penetrationDataActions = penetrationDataSlice.actions;
export const executePenetrationDataTask = penetrationDataSlice.executeTask;
export const penetrationDataReducer = penetrationDataSlice.reducer;
