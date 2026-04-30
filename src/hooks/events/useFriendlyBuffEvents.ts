import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { FightFragment } from '../../graphql/gql/graphql';
import type { ReportFightContextInput } from '../../store/contextTypes';
import {
  selectFriendlyBuffEventsEntryForContext,
  selectFriendlyBuffEventsForContext,
} from '../../store/events_data/friendlyBuffEventsSelectors';
import { fetchFriendlyBuffEvents } from '../../store/events_data/friendlyBuffEventsSlice';
import type { RootState } from '../../store/storeWithHistory';
import { useAppDispatch } from '../../store/useAppDispatch';
import { BuffEvent } from '../../types/combatlogEvents';
import { useFightForContext } from '../useFightForContext';
import { useResolvedReportFightContext } from '../useResolvedReportFightContext';

interface UseFriendlyBuffEventsOptions {
  restrictToFightWindow?: boolean;
  intervalSize?: number;
  context?: ReportFightContextInput;
}

export function useFriendlyBuffEvents(options?: UseFriendlyBuffEventsOptions): {
  friendlyBuffEvents: BuffEvent[];
  isFriendlyBuffEventsLoading: boolean;
  selectedFight: FightFragment | null;
} {
  const dispatch = useAppDispatch();
  const client = useEsoLogsClientInstance();
  const context = useResolvedReportFightContext(options?.context);
  const selectedFight = useFightForContext(context);

  const restrictToFightWindow = options?.restrictToFightWindow ?? true;
  const intervalSize = options?.intervalSize;
  const friendlyBuffEvents = useSelector((state: RootState) =>
    selectFriendlyBuffEventsForContext(state, context),
  );
  const friendlyBuffEntry = useSelector((state: RootState) =>
    selectFriendlyBuffEventsEntryForContext(state, context),
  );
  const isFriendlyBuffEventsLoading = friendlyBuffEntry?.status === 'loading';

  React.useEffect(() => {
    if (context.reportCode && selectedFight && client) {
      dispatch(
        fetchFriendlyBuffEvents({
          reportCode: context.reportCode,
          fight: selectedFight,
          client,
          intervalSize,
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
    intervalSize,
    restrictToFightWindow,
  ]);

  return React.useMemo(
    () => ({ friendlyBuffEvents, isFriendlyBuffEventsLoading, selectedFight }),
    [friendlyBuffEvents, isFriendlyBuffEventsLoading, selectedFight],
  );
}
