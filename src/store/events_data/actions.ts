import { ExtendedPlayerInfo } from '../../types/playerTypes';

// Re-export the consolidated type for backward compatibility
export type PlayerInfo = ExtendedPlayerInfo;

// Re-export all actions and types from individual event slices
export {
  fetchDamageEvents,
  clearDamageEvents,
  clearDamageEventsForContext,
  trimDamageEventsCache,
  resetDamageEventsLoading,
  type DamageEventsState,
  type DamageEventsEntry,
} from './damageEventsSlice';

export {
  fetchHealingEvents,
  clearHealingEvents,
  clearHealingEventsForContext,
  trimHealingEventsCache,
  resetHealingEventsLoading,
  type HealingEventsState,
  type HealingEventsEntry,
} from './healingEventsSlice';

export {
  fetchFriendlyBuffEvents,
  clearFriendlyBuffEvents,
  type FriendlyBuffEventsState,
} from './friendlyBuffEventsSlice';

export {
  fetchHostileBuffEvents,
  clearHostileBuffEvents,
  type HostileBuffEventsState,
} from './hostileBuffEventsSlice';

export { fetchDeathEvents, clearDeathEvents, type DeathEventsState } from './deathEventsSlice';

export {
  fetchCombatantInfoEvents,
  clearCombatantInfoEvents,
  type CombatantInfoEventsState,
} from './combatantInfoEventsSlice';

export { fetchDebuffEvents, clearDebuffEvents, type DebuffEventsState } from './debuffEventsSlice';

export { fetchCastEvents, clearCastEvents, type CastEventsState } from './castEventsSlice';

export {
  fetchResourceEvents,
  clearResourceEvents,
  type ResourceEventsState,
} from './resourceEventsSlice';

// Re-export clear action from separate module to avoid circular dependency
export { clearAllEvents } from './clearAction';

// Main events reducer
export { eventsReducer } from './index';

// Export selectors
export * from '../selectors/eventsSelectors';
