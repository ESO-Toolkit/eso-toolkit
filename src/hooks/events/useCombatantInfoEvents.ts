import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { FightFragment } from '../../graphql/gql/graphql';
import type { ReportFightContextInput } from '../../store/contextTypes';
import {
  selectCombatantInfoEventsEntryForContext,
  selectCombatantInfoEventsForContext,
} from '../../store/events_data/combatantInfoEventsSelectors';
import { fetchCombatantInfoEvents } from '../../store/events_data/combatantInfoEventsSlice';
import type { RootState } from '../../store/storeWithHistory';
import { useAppDispatch } from '../../store/useAppDispatch';
import { CombatantInfoEvent } from '../../types/combatlogEvents';
import { useFightForContext } from '../useFightForContext';
import { useResolvedReportFightContext } from '../useResolvedReportFightContext';

interface UseCombatantInfoEventsOptions {
  restrictToFightWindow?: boolean;
  context?: ReportFightContextInput;
}

export function useCombatantInfoEvents(options?: UseCombatantInfoEventsOptions): {
  combatantInfoEvents: CombatantInfoEvent[];
  isCombatantInfoEventsLoading: boolean;
  combatantInfoEventsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  combatantInfoEventsError: string | null;
  selectedFight: FightFragment | null;
} {
  const dispatch = useAppDispatch();
  const client = useEsoLogsClientInstance();
  const context = useResolvedReportFightContext(options?.context);
  const selectedFight = useFightForContext(context);

  const combatantInfoEvents = useSelector((state: RootState) =>
    selectCombatantInfoEventsForContext(state, context),
  );
  const combatantInfoEntry = useSelector((state: RootState) =>
    selectCombatantInfoEventsEntryForContext(state, context),
  );
  const isCombatantInfoEventsLoading = combatantInfoEntry?.status === 'loading';
  const combatantInfoEventsStatus = combatantInfoEntry?.status ?? 'idle';
  const combatantInfoEventsError = combatantInfoEntry?.error ?? null;

  const restrictToFightWindow = options?.restrictToFightWindow ?? true;

  React.useEffect(() => {
    if (context.reportCode && selectedFight) {
      dispatch(
        fetchCombatantInfoEvents({
          reportCode: context.reportCode,
          fight: selectedFight,
          client,
          restrictToFightWindow,
        }),
      );
    }
  }, [dispatch, context.reportCode, context.fightId, selectedFight, client, restrictToFightWindow]);

  return React.useMemo(
    () => ({
      combatantInfoEvents,
      isCombatantInfoEventsLoading,
      combatantInfoEventsStatus,
      combatantInfoEventsError,
      selectedFight,
    }),
    [
      combatantInfoEvents,
      isCombatantInfoEventsLoading,
      combatantInfoEventsStatus,
      combatantInfoEventsError,
      selectedFight,
    ],
  );
}
