import { combineReducers } from '@reduxjs/toolkit';

import castEventsReducer from './castEventsSlice';
import { clearAllEvents } from './clearAction';
import combatantInfoEventsReducer from './combatantInfoEventsSlice';
import damageEventsReducer from './damageEventsSlice';
import deathEventsReducer from './deathEventsSlice';
import debuffEventsReducer from './debuffEventsSlice';
import friendlyBuffEventsReducer from './friendlyBuffEventsSlice';
import healingEventsReducer from './healingEventsSlice';
import hostileBuffEventsReducer from './hostileBuffEventsSlice';
import resourceEventsReducer from './resourceEventsSlice';

// This acts as the layer of indirection from the root state
// Instead of having events.damageEvents, we'll have events.damage.events
const combinedEventsReducer = combineReducers({
  casts: castEventsReducer,
  combatantInfo: combatantInfoEventsReducer,
  damage: damageEventsReducer,
  deaths: deathEventsReducer,
  debuffs: debuffEventsReducer,
  friendlyBuffs: friendlyBuffEventsReducer,
  healing: healingEventsReducer,
  hostileBuffs: hostileBuffEventsReducer,
  resources: resourceEventsReducer,
});

// Wrapper to handle the clearAllEvents action
const eventsReducer = (
  state: ReturnType<typeof combinedEventsReducer> | undefined,
  action: { type: string }
): ReturnType<typeof combinedEventsReducer> => {
  // If clearAllEvents is dispatched, reset all slices to their initial state
  if (action.type === clearAllEvents.type) {
    return combinedEventsReducer(undefined, action);
  }
  return combinedEventsReducer(state, action);
};

export { eventsReducer };
