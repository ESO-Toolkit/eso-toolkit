import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import type { ReportFightContextInput } from '../store/contextTypes';
import {
  selectIsPlayerDataLoadingForContext,
  selectPlayerDataEntryForContext,
} from '../store/player_data/playerDataSelectors';
import { fetchPlayerData, PlayerDataEntry } from '../store/player_data/playerDataSlice';
import type { RootState } from '../store/storeWithHistory';
import { useAppDispatch } from '../store/useAppDispatch';

import { useResolvedReportFightContext } from './useResolvedReportFightContext';

interface UsePlayerDataOptions {
  context?: ReportFightContextInput;
}

export function usePlayerData(options?: UsePlayerDataOptions): {
  playerData: PlayerDataEntry | null;
  isPlayerDataLoading: boolean;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const context = useResolvedReportFightContext(options?.context);

  const playerData = useSelector((state: RootState) =>
    selectPlayerDataEntryForContext(state, context),
  );
  const isPlayerDataLoading = useSelector((state: RootState) =>
    selectIsPlayerDataLoadingForContext(state, context),
  );

  React.useEffect(() => {
    if (context.reportCode && context.fightId !== null && client) {
      dispatch(
        fetchPlayerData({ reportCode: context.reportCode, fightId: context.fightId, client }),
      );
    }
  }, [dispatch, context.reportCode, context.fightId, client]);

  return React.useMemo(
    () => ({ playerData: playerData ?? null, isPlayerDataLoading }),
    [playerData, isPlayerDataLoading],
  );
}
