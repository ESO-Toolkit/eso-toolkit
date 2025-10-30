import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '@/EsoLogsClientContext';
import { FightFragment } from '@/graphql/gql/graphql';
import type { ReportFightContextInput } from '@/store/contextTypes';
import {
  selectHealingEventsEntryForContext,
  selectHealingEventsForContext,
} from '@/store/events_data/healingEventsSelectors';
import { fetchHealingEvents } from '@/store/events_data/healingEventsSlice';
import type { RootState } from '@/store/storeWithHistory';
import { useAppDispatch } from '@/store/useAppDispatch';
import { HealEvent } from '@/types/combatlogEvents';

import { useFightForContext } from '../useFightForContext';
import { useResolvedReportFightContext } from '../useResolvedReportFightContext';

interface UseHealingEventsOptions {
  context?: ReportFightContextInput;
}

export function useHealingEvents(options?: UseHealingEventsOptions): {
  healingEvents: HealEvent[];
  isHealingEventsLoading: boolean;
  selectedFight: FightFragment | null;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const context = useResolvedReportFightContext(options?.context);
  const selectedFight = useFightForContext(context);
  const healingEvents = useSelector((state: RootState) =>
    selectHealingEventsForContext(state, context),
  );
  const healingEntry = useSelector((state: RootState) =>
    selectHealingEventsEntryForContext(state, context),
  );
  const isHealingEventsLoading = healingEntry?.status === 'loading';

  React.useEffect(() => {
    if (context.reportCode && selectedFight) {
      dispatch(
        fetchHealingEvents({
          reportCode: context.reportCode,
          fight: selectedFight,
          client,
        }),
      );
    }
  }, [dispatch, context.reportCode, context.fightId, selectedFight, client]);

  return React.useMemo(
    () => ({ healingEvents, isHealingEventsLoading, selectedFight }),
    [healingEvents, isHealingEventsLoading, selectedFight],
  );
}
