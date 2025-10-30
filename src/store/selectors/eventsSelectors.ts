import { createSelector } from '@reduxjs/toolkit';

import { FightFragment } from '../../graphql/gql/graphql';
import { DamageEvent, HealEvent, ResourceChangeEvent } from '../../types/combatlogEvents';
import { createBuffLookup, createDebuffLookup, BuffLookupData } from '../../utils/BuffLookupUtils';
import type { ReportFightContextInput } from '../contextTypes';
import { selectCastEvents as selectCastEventsFromCache } from '../events_data/castEventsSelectors';
import {
  selectCombatantInfoEvents as selectCombatantInfoEventsFromSlice,
  selectCombatantInfoEventsLoading as selectCombatantInfoEventsLoadingFromSlice,
} from '../events_data/combatantInfoEventsSelectors';
import { selectDamageEvents } from '../events_data/damageEventsSelectors';
import {
  selectDeathEvents as selectDeathEventsFromSlice,
  selectDeathEventsLoading as selectDeathEventsLoadingFromSlice,
} from '../events_data/deathEventsSelectors';
import {
  selectDebuffEvents as selectDebuffEventsFromSlice,
  selectDebuffEventsLoading as selectDebuffEventsLoadingFromSlice,
} from '../events_data/debuffEventsSelectors';
import {
  selectFriendlyBuffEvents as selectFriendlyBuffEventsFromSlice,
  selectFriendlyBuffEventsLoading as selectFriendlyBuffEventsLoadingFromSlice,
} from '../events_data/friendlyBuffEventsSelectors';
import { selectHealingEvents } from '../events_data/healingEventsSelectors';
import {
  selectHostileBuffEvents as selectHostileBuffEventsFromSlice,
  selectHostileBuffEventsLoading as selectHostileBuffEventsLoadingFromSlice,
} from '../events_data/hostileBuffEventsSelectors';
import type { ResourceEventsEntry, ResourceEventsState } from '../events_data/resourceEventsSlice';
import { selectActorsById } from '../master_data/masterDataSelectors';
import { selectActiveReportContext, selectReportFights } from '../report/reportSelectors';
import { RootState } from '../storeWithHistory';
import { createReportFightContextSelector } from '../utils/contextSelectors';
import { resolveCacheKey } from '../utils/keyedCacheState';

export {
  selectDamageEvents,
  selectDamageEventsEntryForContext,
  selectDamageEventsForContext,
  selectDamageEventsLoading,
} from '../events_data/damageEventsSelectors';
export {
  selectHealingEvents,
  selectHealingEventsEntryForContext,
  selectHealingEventsForContext,
  selectHealingEventsLoading,
} from '../events_data/healingEventsSelectors';
export {
  selectCastEventsEntryForContext,
  selectCastEventsForContext,
  selectCastEventsLoading,
} from '../events_data/castEventsSelectors';

export {
  selectFriendlyBuffEventsEntryForContext,
  selectFriendlyBuffEventsForContext,
} from '../events_data/friendlyBuffEventsSelectors';

export {
  selectHostileBuffEventsEntryForContext,
  selectHostileBuffEventsForContext,
} from '../events_data/hostileBuffEventsSelectors';

export {
  selectDebuffEventsEntryForContext,
  selectDebuffEventsForContext,
} from '../events_data/debuffEventsSelectors';

export {
  selectDeathEventsEntryForContext,
  selectDeathEventsForContext,
} from '../events_data/deathEventsSelectors';

export {
  selectCombatantInfoEventsEntryForContext,
  selectCombatantInfoEventsForContext,
} from '../events_data/combatantInfoEventsSelectors';

export const selectCastEvents = selectCastEventsFromCache;
export const selectFriendlyBuffEvents = selectFriendlyBuffEventsFromSlice;
export const selectHostileBuffEvents = selectHostileBuffEventsFromSlice;
export const selectDebuffEvents = selectDebuffEventsFromSlice;
export const selectDeathEvents = selectDeathEventsFromSlice;
export const selectCombatantInfoEvents = selectCombatantInfoEventsFromSlice;

const createActiveContextInput = (
  state: RootState,
  fightId: number | string | null,
): ReportFightContextInput => ({
  reportCode: state.report.activeContext.reportId ?? (state.report.reportId || null),
  fightId,
});

export const selectResourceEventsState = (state: RootState): ResourceEventsState =>
  state.events.resources;

export const selectResourceEventsEntryForContext = createReportFightContextSelector<
  RootState,
  [typeof selectResourceEventsState],
  ResourceEventsEntry | null
>([selectResourceEventsState], (resourceState, context) => {
  if (!context.reportCode) {
    return null;
  }
  const { key } = resolveCacheKey(context);
  return resourceState.entries[key] ?? null;
});

export const selectResourceEventsForContext = createReportFightContextSelector<
  RootState,
  [typeof selectResourceEventsState],
  ResourceChangeEvent[]
>([selectResourceEventsState], (resourceState, context) => {
  if (!context.reportCode) {
    return [];
  }
  const { key } = resolveCacheKey(context);
  return resourceState.entries[key]?.events ?? [];
});

export const selectResourceEvents = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) =>
    selectResourceEventsForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    ),
);

// Loading state selectors
export const selectFriendlyBuffEventsLoading = selectFriendlyBuffEventsLoadingFromSlice;
export const selectHostileBuffEventsLoading = selectHostileBuffEventsLoadingFromSlice;
export const selectDebuffEventsLoading = selectDebuffEventsLoadingFromSlice;
export const selectDeathEventsLoading = selectDeathEventsLoadingFromSlice;
export const selectCombatantInfoEventsLoading = selectCombatantInfoEventsLoadingFromSlice;

export const selectResourceEventsLoading = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectResourceEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.status === 'loading';
  },
);

export const selectResourceEventsError = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectResourceEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.error ?? null;
  },
);

// Selector to get the currently selected fight ID from router state
export const selectSelectedFightId = (state: RootState): string | null => {
  const location = state.router?.location;
  if (!location?.pathname) return null;

  // Parse the pathname to extract fightId
  // Expected format: /report/:reportId/fight/:fightId
  const pathParts = location.pathname.split('/').filter(Boolean);
  const fightIndex = pathParts.indexOf('fight');

  if (fightIndex !== -1 && fightIndex + 1 < pathParts.length) {
    return pathParts[fightIndex + 1];
  }

  return null;
};

// Helper selector to get the currently selected fight from Redux state
export const selectCurrentFight = createSelector(
  [selectReportFights, selectSelectedFightId],
  (fights, fightId): FightFragment | null => {
    if (!fightId || !fights) return null;

    return fights.find((fight) => String(fight?.id) === String(fightId)) || null;
  },
);

// Player/combatant selectors
// Updated to use the currently selected fight from Redux state
export const selectEventPlayers = createSelector(
  [selectActorsById, selectCurrentFight],
  (actorsById, fight) => {
    const friendlyPlayers = fight?.friendlyPlayers ?? [];
    return friendlyPlayers
      .filter((id): id is number => typeof id === 'number' && id !== null)
      .map((id) => actorsById[id])
      .filter(Boolean);
  },
);

// Parameterized version for backward compatibility (when you need a specific fight)

// Combined selectors
export const selectAllEvents = createSelector(
  [
    selectDamageEvents,
    selectHealingEvents,
    selectDeathEvents,
    selectCombatantInfoEvents,
    selectDebuffEvents,
    selectCastEvents,
    selectResourceEvents,
  ],
  (
    damageEvents: DamageEvent[],
    healingEvents: HealEvent[],
    deathEvents,
    combatantInfoEvents,
    debuffEvents,
    castEvents,
    resourceEvents,
  ) => [
    ...damageEvents,
    ...healingEvents,
    ...deathEvents,
    ...combatantInfoEvents,
    ...debuffEvents,
    ...castEvents,
    ...resourceEvents,
  ],
);

// Loading state selectors

/**
 * Traditional selector for friendly buff lookup data with loading state.
 * Uses the currently selected fight from Redux state.
 *
 * @deprecated Use useSelectFriendlyBuffLookup() hook for worker-based calculation
 */

/**
 * Selector for hostile buff lookup data with loading state.
 * Uses a specific fight by ID instead of defaulting to fights[0].
 */

/**
 * Selector for hostile buff lookup data with loading state.
 * Uses the currently selected fight from Redux state.
 */
export const selectHostileBuffLookup = createSelector(
  [selectHostileBuffEvents, selectHostileBuffEventsLoading, selectCurrentFight],
  (buffEvents, isLoading, fight): BuffLookupData => {
    if (isLoading || !buffEvents || buffEvents.length === 0) {
      return { buffIntervals: {} };
    }

    // Get fight end time for proper buff duration handling
    const fightEndTime = fight?.endTime;

    return createBuffLookup(buffEvents, fightEndTime);
  },
);

/**
 * Selector for debuff lookup data with loading state.
 * Uses a specific fight by ID instead of defaulting to fights[0].
 */

/**
 * Selector for debuff lookup data with loading state.
 * Uses the currently selected fight from Redux state.
 */
export const selectDebuffLookup = createSelector(
  [selectDebuffEvents, selectDebuffEventsLoading, selectCurrentFight],
  (debuffEvents, isLoading, fight): BuffLookupData => {
    if (isLoading || !debuffEvents || debuffEvents.length === 0) {
      return { buffIntervals: {} };
    }

    // Get fight end time for proper debuff duration handling
    const fightEndTime = fight?.endTime;

    return createDebuffLookup(debuffEvents, fightEndTime);
  },
);
