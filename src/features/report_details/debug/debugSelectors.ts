import { createSelector } from '@reduxjs/toolkit';

import type { ReportFightContext } from '../../../store/contextTypes';
import {
  selectEventPlayersForContext,
  selectResourceEventsForContext,
  selectDamageEventsForContext,
  selectHealingEventsForContext,
  selectDebuffEventsForContext,
  selectCastEventsForContext,
  selectDeathEventsForContext,
  selectCombatantInfoEventsForContext,
} from '../../../store/events_data/actions';
import { selectActorsByIdForContext } from '../../../store/master_data/masterDataSelectors';
import { selectActiveReportContext } from '../../../store/report/reportSelectors';
import type { RootState } from '../../../store/storeWithHistory';
import { createReportFightContextSelector } from '../../../store/utils/contextSelectors';
import { LogEvent } from '../../../types/combatlogEvents';

type LocationHeatmapData = {
  events: LogEvent[];
  actorsById: ReturnType<typeof selectActorsByIdForContext>;
  eventPlayers: ReturnType<typeof selectEventPlayersForContext>;
};

export const selectLocationHeatmapDataForContext = createReportFightContextSelector<
  RootState,
  [
    typeof selectActorsByIdForContext,
    typeof selectEventPlayersForContext,
    typeof selectResourceEventsForContext,
    typeof selectDamageEventsForContext,
    typeof selectHealingEventsForContext,
    typeof selectDebuffEventsForContext,
    typeof selectCastEventsForContext,
    typeof selectDeathEventsForContext,
    typeof selectCombatantInfoEventsForContext,
  ],
  LocationHeatmapData
>(
  [
    selectActorsByIdForContext,
    selectEventPlayersForContext,
    selectResourceEventsForContext,
    selectDamageEventsForContext,
    selectHealingEventsForContext,
    selectDebuffEventsForContext,
    selectCastEventsForContext,
    selectDeathEventsForContext,
    selectCombatantInfoEventsForContext,
  ],
  (
    actorsById,
    eventPlayers,
    resourceEvents,
    damageEvents,
    healingEvents,
    debuffEvents,
    castEvents,
    deathEvents,
    combatantInfoEvents,
    _context,
  ) => {
    // Combine all events into a single array for the heatmap analysis
    const events: LogEvent[] = [
      ...resourceEvents,
      ...damageEvents,
      ...healingEvents,
      ...debuffEvents,
      ...castEvents,
      ...deathEvents,
      ...combatantInfoEvents,
    ];

    return {
      events,
      actorsById,
      eventPlayers,
    };
  },
);

export const selectLocationHeatmapData = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) =>
    selectLocationHeatmapDataForContext(state, {
      reportCode: activeContext.reportId ?? state.report.reportId ?? null,
      fightId: activeContext.fightId,
    }),
);

// Location heatmap optimized data
export const selectLocationHeatmapDataSelector = (context: ReportFightContext) =>
  (state: RootState) => selectLocationHeatmapDataForContext(state, context);
