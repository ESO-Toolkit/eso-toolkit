import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '@/EsoLogsClientContext';
import { FightFragment } from '@/graphql/gql/graphql';
import type { ReportFightContextInput } from '@/store/contextTypes';
import {
  selectDeathEventsEntryForContext,
  selectDeathEventsForContext,
} from '@/store/events_data/deathEventsSelectors';
import { fetchDeathEvents } from '@/store/events_data/deathEventsSlice';
import type { RootState } from '@/store/storeWithHistory';
import { useAppDispatch } from '@/store/useAppDispatch';
import { DeathEvent } from '@/types/combatlogEvents';

import { useFightForContext } from '../useFightForContext';
import { useResolvedReportFightContext } from '../useResolvedReportFightContext';

interface UseDeathEventsOptions {
  context?: ReportFightContextInput;
}

export function useDeathEvents(options?: UseDeathEventsOptions): {
  deathEvents: DeathEvent[];
  isDeathEventsLoading: boolean;
  selectedFight: FightFragment | null;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const context = useResolvedReportFightContext(options?.context);
  const selectedFight = useFightForContext(context);
  const deathEvents = useSelector((state: RootState) =>
    selectDeathEventsForContext(state, context),
  );
  const deathEntry = useSelector((state: RootState) =>
    selectDeathEventsEntryForContext(state, context),
  );
  const isDeathEventsLoading = deathEntry?.status === 'loading';

  React.useEffect(() => {
    if (context.reportCode && selectedFight && client) {
      dispatch(
        fetchDeathEvents({
          reportCode: context.reportCode,
          fight: selectedFight,
          client,
        }),
      );
    }
  }, [dispatch, context.reportCode, context.fightId, selectedFight, client]);

  return React.useMemo(
    () => ({ deathEvents, isDeathEventsLoading, selectedFight }),
    [deathEvents, isDeathEventsLoading, selectedFight],
  );
}
