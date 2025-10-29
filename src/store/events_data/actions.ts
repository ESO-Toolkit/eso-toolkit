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
  clearFriendlyBuffEventsForContext,
  trimFriendlyBuffEventsCache,
  resetFriendlyBuffEventsLoading,
  type FriendlyBuffEventsState,
  type FriendlyBuffEventsEntry,
} from './friendlyBuffEventsSlice';

export {
  fetchHostileBuffEvents,
  clearHostileBuffEvents,
  clearHostileBuffEventsForContext,
  trimHostileBuffEventsCache,
  resetHostileBuffEventsLoading,
  type HostileBuffEventsState,
  type HostileBuffEventsEntry,
} from './hostileBuffEventsSlice';

export {
  fetchDeathEvents,
  clearDeathEvents,
  clearDeathEventsForContext,
  trimDeathEventsCache,
  resetDeathEventsLoading,
  type DeathEventsState,
  type DeathEventsEntry,
} from './deathEventsSlice';

export {
  fetchCombatantInfoEvents,
  clearCombatantInfoEvents,
  resetCombatantInfoEventsLoading,
  clearCombatantInfoEventsForContext,
  trimCombatantInfoEventsCache,
  type CombatantInfoEventsState,
  type CombatantInfoEventsEntry,
} from './combatantInfoEventsSlice';

export {
  fetchDebuffEvents,
  clearDebuffEvents,
  clearDebuffEventsForContext,
  trimDebuffEventsCache,
  resetDebuffEventsLoading,
  type DebuffEventsState,
  type DebuffEventsEntry,
} from './debuffEventsSlice';

export {
  fetchCastEvents,
  clearCastEvents,
  clearCastEventsForContext,
  trimCastEventsCache,
  resetCastEventsLoading,
  type CastEventsState,
  type CastEventsEntry,
} from './castEventsSlice';

export {
  fetchResourceEvents,
  clearResourceEvents,
  clearResourceEventsForContext,
  trimResourceEventsCache,
  resetResourceEventsLoading,
  type ResourceEventsState,
  type ResourceEventsEntry,
} from './resourceEventsSlice';

// Re-export clear action from separate module to avoid circular dependency
export { clearAllEvents } from './clearAction';

// Main events reducer
export { eventsReducer } from './index';

// Export selectors
export * from '../selectors/eventsSelectors';
