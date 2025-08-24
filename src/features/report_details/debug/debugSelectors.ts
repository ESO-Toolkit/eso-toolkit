import { createSelector } from '@reduxjs/toolkit';

import {
  selectEventPlayers,
  selectResourceEvents,
  selectDamageEvents,
  selectHealingEvents,
  selectBuffEvents,
  selectDebuffEvents,
  selectCastEvents,
  selectDeathEvents,
  selectCombatantInfoEvents,
} from '../../../store/events_data/actions';
import { selectActorsById } from '../../../store/master_data/masterDataSelectors';

// Location heatmap optimized data
export const selectLocationHeatmapData = createSelector(
  [
    selectActorsById,
    selectEventPlayers,
    selectResourceEvents,
    selectDamageEvents,
    selectHealingEvents,
    selectBuffEvents,
    selectDebuffEvents,
    selectCastEvents,
    selectDeathEvents,
    selectCombatantInfoEvents,
  ],
  (
    actorsById,
    eventPlayers,
    resourceEvents,
    damageEvents,
    healingEvents,
    buffEvents,
    debuffEvents,
    castEvents,
    deathEvents,
    combatantInfoEvents
  ) => {
    // Combine all events into a single array for the heatmap analysis
    const events = [
      ...resourceEvents,
      ...damageEvents,
      ...healingEvents,
      ...buffEvents,
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
  }
);

