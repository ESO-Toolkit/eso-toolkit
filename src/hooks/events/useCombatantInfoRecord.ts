import React from 'react';

import type { ReportFightContextInput } from '../../store/contextTypes';
import { CombatantInfoEvent } from '../../types/combatlogEvents';

import { useCombatantInfoEvents } from './useCombatantInfoEvents';

interface UseCombatantInfoRecordOptions {
  context?: ReportFightContextInput;
}

export function useCombatantInfoRecord(options?: UseCombatantInfoRecordOptions): {
  combatantInfoRecord: Record<number, CombatantInfoEvent>;
  isCombatantInfoEventsLoading: boolean;
} {
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents(options);

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
    [combatantInfoRecord, isCombatantInfoEventsLoading],
  );
}
