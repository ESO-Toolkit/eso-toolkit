import React from 'react';
import { useSelector } from 'react-redux';

import {
  selectDamageEventsByPlayerForContext,
  selectDamageEventsEntryForContext,
  selectDamageEventsForContext,
} from '@/store/events_data/damageEventsSelectors';


import { useEsoLogsClientContext } from '../../EsoLogsClientContext';
import { FightFragment } from '../../graphql/gql/graphql';
import type { ReportFightContextInput } from '../../store/contextTypes';
import { fetchDamageEvents } from '../../store/events_data/damageEventsSlice';
import type { RootState } from '../../store/storeWithHistory';
import { useAppDispatch } from '../../store/useAppDispatch';
import { DamageEvent } from '../../types/combatlogEvents';
import { useFightForContext } from '../useFightForContext';
import { useReportMasterData } from '../useReportMasterData';
import { useResolvedReportFightContext } from '../useResolvedReportFightContext';

interface UseDamageEventsOptions {
  restrictToFightWindow?: boolean;
  context?: ReportFightContextInput;
}

export function useDamageEvents(options?: UseDamageEventsOptions): {
  damageEvents: DamageEvent[];
  isDamageEventsLoading: boolean;
  selectedFight: FightFragment | null;
} {
  const { client, isReady, isLoggedIn } = useEsoLogsClientContext();
  const dispatch = useAppDispatch();
  const context = useResolvedReportFightContext(options?.context);
  const selectedFight = useFightForContext(context);

  const damageEvents = useSelector((state: RootState) =>
    selectDamageEventsForContext(state, context),
  );
  const damageEntry = useSelector((state: RootState) =>
    selectDamageEventsEntryForContext(state, context),
  );
  const isDamageEventsLoading = damageEntry?.status === 'loading';

  const restrictToFightWindow = options?.restrictToFightWindow ?? true;

  React.useEffect(() => {
    // Only fetch if client is ready, user is logged in, and we have required data
    if (context.reportCode && selectedFight && isReady && isLoggedIn && client) {
      dispatch(
        fetchDamageEvents({
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
    () => ({ damageEvents, isDamageEventsLoading, selectedFight }),
    [damageEvents, isDamageEventsLoading, selectedFight],
  );
}

interface UseDamageEventsLookupOptions {
  context?: ReportFightContextInput;
}

export function useDamageEventsLookup(options?: UseDamageEventsLookupOptions): {
  damageEventsByPlayer: Record<string, DamageEvent[]>;
  isDamageEventsLookupLoading: boolean;
} {
  const { isDamageEventsLoading } = useDamageEvents(options);
  const { isMasterDataLoading } = useReportMasterData({ context: options?.context });
  const resolvedContext = useResolvedReportFightContext(options?.context);
  const damageEventsByPlayer = useSelector((state: RootState) =>
    selectDamageEventsByPlayerForContext(state, resolvedContext),
  );

  return React.useMemo(
    () => ({
      damageEventsByPlayer,
      isDamageEventsLookupLoading: isDamageEventsLoading || isMasterDataLoading,
    }),
    [damageEventsByPlayer, isDamageEventsLoading, isMasterDataLoading],
  );
}
