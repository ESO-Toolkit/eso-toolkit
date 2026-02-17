import { createWorkerTaskSlice } from './workerTaskSliceFactory';

// Create damage reduction slice
export const damageReductionSlice = createWorkerTaskSlice(
  'calculateDamageReductionData',
  (input) => {
    const fightStart = input.fight?.startTime ?? 0;
    const fightEnd = input.fight?.endTime ?? 0;
    const playersCount = input.players ? Object.keys(input.players).length : 0;
    const combatantInfoCount = input.combatantInfoRecord
      ? Object.keys(input.combatantInfoRecord).length
      : 0;
    const buffIntervalsCount = input.friendlyBuffsLookup?.buffIntervals
      ? Object.keys(input.friendlyBuffsLookup.buffIntervals).length
      : 0;
    const debuffIntervalsCount = input.debuffsLookup?.buffIntervals
      ? Object.keys(input.debuffsLookup.buffIntervals).length
      : 0;
    return `dmg-reduction-${fightStart}-${fightEnd}-${playersCount}-${combatantInfoCount}-${buffIntervalsCount}-${debuffIntervalsCount}`;
  },
);

// Export actions, thunk, and reducer
export const damageReductionActions = damageReductionSlice.actions;
export const executeDamageReductionTask = damageReductionSlice.executeTask;
export const damageReductionReducer = damageReductionSlice.reducer;
