import { createWorkerTaskSlice } from './workerTaskSliceFactory';

// Create critical damage slice
export const criticalDamageSlice = createWorkerTaskSlice('calculateCriticalDamageData', (input) => {
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
  const selectedTargets = input.selectedTargetIds?.join(',') ?? '';
  return `crit-dmg-${fightStart}-${fightEnd}-${playersCount}-${combatantInfoCount}-${buffIntervalsCount}-${debuffIntervalsCount}-${damageEventsCount}-${selectedTargets}`;
});

// Export actions, thunk, and reducer
export const criticalDamageActions = criticalDamageSlice.actions;
export const executeCriticalDamageTask = criticalDamageSlice.executeTask;
export const criticalDamageReducer = criticalDamageSlice.reducer;
