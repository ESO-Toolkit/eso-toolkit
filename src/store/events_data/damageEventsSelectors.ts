import { createSelector } from '@reduxjs/toolkit';

import { DamageEvent } from '../../types/combatlogEvents';
import { getDamageEventsByPlayer } from '../../utils/damageEventUtils';
import type { ReportFightContextInput } from '../contextTypes';
import { selectActorsByIdForContext } from '../master_data/masterDataSelectors';
import { selectActiveReportContext } from '../report/reportSelectors';
import type { RootState } from '../storeWithHistory';
import { createReportFightContextSelector } from '../utils/contextSelectors';
import { resolveCacheKey } from '../utils/keyedCacheState';

import { DamageEventsEntry, DamageEventsState } from './damageEventsSlice';

// Basic damage events selectors
export const selectDamageEventsState = (state: RootState): DamageEventsState => state.events.damage;

export const selectDamageEventsEntryForContext = createReportFightContextSelector<
  RootState,
  [typeof selectDamageEventsState],
  DamageEventsEntry | null
>([selectDamageEventsState], (damageState, context) => {
  if (!context.reportCode) {
    return null;
  }
  const { key } = resolveCacheKey(context);
  return damageState.entries[key] ?? null;
});

export const selectDamageEventsForContext = createReportFightContextSelector<
  RootState,
  [typeof selectDamageEventsState],
  DamageEvent[]
>([selectDamageEventsState], (damageState, context) => {
  if (!context.reportCode) {
    return [];
  }
  const { key } = resolveCacheKey(context);
  return damageState.entries[key]?.events ?? [];
});

const createActiveContextInput = (
  state: RootState,
  fightId: number | string | null,
): ReportFightContextInput => ({
  reportCode: state.report.activeContext.reportId ?? state.report.reportId,
  fightId,
});

export const selectDamageEvents = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) =>
    selectDamageEventsForContext(state, createActiveContextInput(state, activeContext.fightId)),
);

export const selectDamageEventsLoading = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectDamageEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.status === 'loading';
  },
);

export const selectDamageEventsError = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectDamageEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.error ?? null;
  },
);

/**
 * Selector for damage events grouped by player ID.
 * Returns a record mapping player IDs to their associated damage events.
 * Uses the currently selected damage events from Redux state.
 *
 * @example
 * ```typescript
 * const damageByPlayer = useSelector(selectDamageEventsByPlayer);
 * // Result: { "123": [damageEvent1, damageEvent2], "456": [damageEvent3] }
 * ```
 */
export const selectDamageEventsByPlayerForContext = createReportFightContextSelector<
  RootState,
  [typeof selectDamageEventsForContext, typeof selectActorsByIdForContext],
  Record<string, DamageEvent[]>
>(
  [selectDamageEventsForContext, selectActorsByIdForContext],
  (damageEvents, actorsById) => getDamageEventsByPlayer(damageEvents, actorsById),
);

export const selectDamageEventsByPlayer = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) =>
    selectDamageEventsByPlayerForContext(state, {
      reportCode: activeContext.reportId ?? state.report.reportId ?? null,
      fightId: activeContext.fightId,
    }),
);

/**
 * Selector to get damage events for a specific player ID.
 *
 * @param playerId - The player ID to filter by
 * @example
 * ```typescript
 * const playerDamage = useSelector(state => selectDamageEventsForPlayer(state, '123'));
 * ```
 */
export const selectDamageEventsForPlayer = createSelector(
  [selectDamageEventsByPlayer, (_state: RootState, playerId: string) => playerId],
  (damageEventsByPlayer, playerId): DamageEvent[] => {
    return damageEventsByPlayer[playerId] || [];
  },
);

/**
 * Selector to get total damage dealt by each player.
 * Returns a record mapping player IDs to their total damage.
 *
 * @example
 * ```typescript
 * const totalDamage = useSelector(selectTotalDamageByPlayer);
 * // Result: { "123": 15000, "456": 8500 }
 * ```
 */
export const selectTotalDamageByPlayer = createSelector(
  [selectDamageEventsByPlayer],
  (damageEventsByPlayer): Record<string, number> => {
    const totalDamage: Record<string, number> = {};

    Object.entries(damageEventsByPlayer).forEach(([playerId, events]) => {
      totalDamage[playerId] = events.reduce((sum, event) => sum + (event.amount || 0), 0);
    });

    return totalDamage;
  },
);

/**
 * Selector to get damage event statistics for each player.
 * Returns comprehensive stats including total damage, event count, average damage, etc.
 *
 * @example
 * ```typescript
 * const damageStats = useSelector(selectDamageStatsByPlayer);
 * // Result: {
 * //   "123": {
 * //     totalDamage: 15000,
 * //     eventCount: 25,
 * //     averageDamage: 600,
 * //     maxDamage: 1200,
 * //     minDamage: 100
 * //   }
 * // }
 * ```
 */
export const selectDamageStatsByPlayer = createSelector(
  [selectDamageEventsByPlayer],
  (
    damageEventsByPlayer,
  ): Record<
    string,
    {
      totalDamage: number;
      eventCount: number;
      averageDamage: number;
      maxDamage: number;
      minDamage: number;
    }
  > => {
    const stats: Record<
      string,
      {
        totalDamage: number;
        eventCount: number;
        averageDamage: number;
        maxDamage: number;
        minDamage: number;
      }
    > = {};

    Object.entries(damageEventsByPlayer).forEach(([playerId, events]) => {
      if (events.length === 0) {
        stats[playerId] = {
          totalDamage: 0,
          eventCount: 0,
          averageDamage: 0,
          maxDamage: 0,
          minDamage: 0,
        };
        return;
      }

      const damages = events.map((event) => event.amount || 0);
      const totalDamage = damages.reduce((sum, damage) => sum + damage, 0);
      const maxDamage = Math.max(...damages);
      const minDamage = Math.min(...damages);
      const averageDamage = totalDamage / events.length;

      stats[playerId] = {
        totalDamage,
        eventCount: events.length,
        averageDamage,
        maxDamage,
        minDamage,
      };
    });

    return stats;
  },
);
