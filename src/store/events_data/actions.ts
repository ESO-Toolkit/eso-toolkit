import { PlayerGear, PlayerTalent } from '../../types/playerDetails';

// Shared types from the old events slice
export interface PlayerInfo {
  id: string | number;
  name: string;
  combatantInfo: {
    talents?: PlayerTalent[];
    gear?: PlayerGear[];
  };
  displayName: string;
  [key: string]: string | number | boolean | null | undefined | object;
}

// Re-export all actions and types from individual event slices
export { fetchDamageEvents, clearDamageEvents, type DamageEventsState } from './damageEventsSlice';

export {
  fetchHealingEvents,
  clearHealingEvents,
  type HealingEventsState,
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
