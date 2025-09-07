import memoizeOne from 'memoize-one';

import { FightEvents } from '../../workers/calculations/CalculateActorPositions';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computeActorPositionsHash = memoizeOne(
  (fight, events, playersById, actorsById, debuffLookupData) => {
    // Create a hash based on the input parameters that affect the calculation
    const fightId = fight?.id || 'no-fight';
    const eventsLength = events
      ? Object.values(events as FightEvents).reduce((sum, arr) => sum + arr.length, 0)
      : 0;
    const playersCount = playersById ? Object.keys(playersById).length : 0;
    const actorsCount = actorsById ? Object.keys(actorsById).length : 0;
    const debuffDataHash = debuffLookupData
      ? JSON.stringify(Object.keys(debuffLookupData.buffIntervals || {}))
      : 'no-debuff';

    return `actor-positions-${fightId}-${eventsLength}-${playersCount}-${actorsCount}-${debuffDataHash}`;
  },
);

// Create actor positions slice
export const actorPositionsSlice = createWorkerTaskSlice('calculateActorPositions', (input) =>
  computeActorPositionsHash(
    input.fight,
    input.events,
    input.playersById,
    input.actorsById,
    input.debuffLookupData,
  ),
);

// Export actions, thunk, and reducer
export const actorPositionsActions = actorPositionsSlice.actions;
export const executeActorPositionsTask = actorPositionsSlice.executeTask;
export const actorPositionsReducer = actorPositionsSlice.reducer;
