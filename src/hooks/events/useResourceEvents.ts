import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '@/EsoLogsClientContext';
import { FightFragment } from '@/graphql/gql/graphql';
import type { ReportFightContextInput } from '@/store/contextTypes';
import { fetchResourceEvents } from '@/store/events_data/resourceEventsSlice';
import {
  selectResourceEventsEntryForContext,
  selectResourceEventsForContext,
} from '@/store/selectors/eventsSelectors';
import type { RootState } from '@/store/storeWithHistory';
import { useAppDispatch } from '@/store/useAppDispatch';
import { ResourceChangeEvent } from '@/types/combatlogEvents';

import { useFightForContext } from '../useFightForContext';
import { useResolvedReportFightContext } from '../useResolvedReportFightContext';

interface UseResourceEventsOptions {
  context?: ReportFightContextInput;
}

export function useResourceEvents(options?: UseResourceEventsOptions): {
  resourceEvents: ResourceChangeEvent[];
  isResourceEventsLoading: boolean;
  selectedFight: FightFragment | null;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const context = useResolvedReportFightContext(options?.context);
  const selectedFight = useFightForContext(context);
  const resourceEvents = useSelector((state: RootState) =>
    selectResourceEventsForContext(state, context),
  );
  const resourceEntry = useSelector((state: RootState) =>
    selectResourceEventsEntryForContext(state, context),
  );
  const isResourceEventsLoading = resourceEntry?.status === 'loading';

  React.useEffect(() => {
    if (context.reportCode && selectedFight) {
      dispatch(
        fetchResourceEvents({
          reportCode: context.reportCode,
          fight: selectedFight,
          client,
        }),
      );
    }
  }, [dispatch, context.reportCode, context.fightId, selectedFight, client]);

  return React.useMemo(
    () => ({ resourceEvents, isResourceEventsLoading, selectedFight }),
    [resourceEvents, isResourceEventsLoading, selectedFight],
  );
}
