import { combineReducers } from '@reduxjs/toolkit';

import { clearAllEvents } from './actions';
import buffEventsReducer from './buffEventsSlice';
import castEventsReducer from './castEventsSlice';
import combatantInfoEventsReducer from './combatantInfoEventsSlice';
import damageEventsReducer from './damageEventsSlice';
import deathEventsReducer from './deathEventsSlice';
import debuffEventsReducer from './debuffEventsSlice';
import healingEventsReducer from './healingEventsSlice';
import resourceEventsReducer from './resourceEventsSlice';

// This acts as the layer of indirection from the root state
// Instead of having events.damageEvents, we'll have events.damage.events
const combinedEventsReducer = combineReducers({
  buffs: buffEventsReducer,
  casts: castEventsReducer,
  combatantInfo: combatantInfoEventsReducer,
  damage: damageEventsReducer,
  deaths: deathEventsReducer,
  debuffs: debuffEventsReducer,
  healing: healingEventsReducer,
  resources: resourceEventsReducer,
});

// Wrapper to handle the clearAllEvents action
const eventsReducer = (
  state: ReturnType<typeof combinedEventsReducer> | undefined,
  action: { type: string }
) => {
  // If clearAllEvents is dispatched, reset all slices to their initial state
  if (action.type === clearAllEvents.type) {
    return combinedEventsReducer(undefined, action);
  }
  return combinedEventsReducer(state, action);
};

export default eventsReducer;
