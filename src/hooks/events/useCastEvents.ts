import React from 'react';
import { useSelector } from 'react-redux';

import {
  selectCastEventsEntryForContext,
  selectCastEventsForContext,
} from '@/store/events_data/castEventsSelectors';

import { useEsoLogsClientContext } from '../../EsoLogsClientContext';
import { FightFragment } from '../../graphql/gql/graphql';
import type { ReportFightContextInput } from '../../store/contextTypes';
import { fetchCastEvents } from '../../store/events_data/castEventsSlice';
import type { RootState } from '../../store/storeWithHistory';
import { useAppDispatch } from '../../store/useAppDispatch';
import type { UnifiedCastEvent } from '../../types/combatlogEvents';
import { useFightForContext } from '../useFightForContext';
import { useResolvedReportFightContext } from '../useResolvedReportFightContext';

interface UseCastEventsOptions {
  restrictToFightWindow?: boolean;
  context?: ReportFightContextInput;
}

export function useCastEvents(options?: UseCastEventsOptions): {
  castEvents: UnifiedCastEvent[];
  isCastEventsLoading: boolean;
  isCastEventsLoaded: boolean;
  selectedFight: FightFragment | null;
} {
  const dispatch = useAppDispatch();

  const { client, isReady, isLoggedIn } = useEsoLogsClientContext();
  const context = useResolvedReportFightContext(options?.context);
  const selectedFight = useFightForContext(context);

  const castEvents = useSelector((state: RootState) => selectCastEventsForContext(state, context));
  const castEntry = useSelector((state: RootState) =>
    selectCastEventsEntryForContext(state, context),
  );
  const isCastEventsLoading = castEntry?.status === 'loading';
  const isCastEventsLoaded = castEntry?.status === 'succeeded' || castEntry?.status === 'failed';

  const restrictToFightWindow = options?.restrictToFightWindow ?? true;

  React.useEffect(() => {
    // Only fetch if client is ready, user is logged in, and we have required data
    if (context.reportCode && selectedFight && isReady && isLoggedIn && client) {
      dispatch(
        fetchCastEvents({
          reportCode: context.reportCode,
          fight: selectedFight,
          client,
          restrictToFightWindow,
        }),
      );
    }
  }, [
    dispatch,
    context.reportCode,
    context.fightId,
    selectedFight,
    client,
    isReady,
    isLoggedIn,
    restrictToFightWindow,
  ]);

  return React.useMemo(
    () => ({ castEvents, isCastEventsLoading, isCastEventsLoaded, selectedFight }),
    [castEvents, isCastEventsLoading, isCastEventsLoaded, selectedFight],
  );
}
