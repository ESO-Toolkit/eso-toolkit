import React from 'react';

import { CombatantInfoEvent } from '../types/combatlogEvents';

import { useCombatantInfoEvents } from './useCombatantInfoEvents';

export function useCombatantInfoRecord(): {
  combatantInfoRecord: Record<number, CombatantInfoEvent>;
  isCombatantInfoEventsLoading: boolean;
} {
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();

  const combatantInfoRecord = React.useMemo(() => {
    const record: Record<number, CombatantInfoEvent> = {};

    for (const event of combatantInfoEvents) {
      record[event.sourceID] = event;
    }

    return record;
  }, [combatantInfoEvents]);

  return React.useMemo(
    () => ({
      combatantInfoRecord,
      isCombatantInfoEventsLoading,
    }),
    [combatantInfoRecord, isCombatantInfoEventsLoading]
  );
}
