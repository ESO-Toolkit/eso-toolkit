import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import type { ReportFightContextInput } from '../store/contextTypes';
import { hasPlayerEntries } from '../store/player_data/playerDataFallback';
import {
  selectIsPlayerDataLoadingForContext,
  selectPlayerDataEntryForContext,
  selectPlayersByIdForContext,
} from '../store/player_data/playerDataSelectors';
import { fetchPlayerData } from '../store/player_data/playerDataSlice';
import type { PlayerDataEntry } from '../store/player_data/playerDataSlice';
import type { RootState } from '../store/storeWithHistory';
import { useAppDispatch } from '../store/useAppDispatch';

import { useResolvedReportFightContext } from './useResolvedReportFightContext';

interface UsePlayerDataOptions {
  context?: ReportFightContextInput;
  includeFallback?: boolean;
}

export function usePlayerData(options?: UsePlayerDataOptions): {
  playerData: PlayerDataEntry | null;
  isPlayerDataLoading: boolean;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const context = useResolvedReportFightContext(options?.context);
  const includeFallback = options?.includeFallback ?? true;

  const playerData = useSelector((state: RootState) =>
    selectPlayerDataEntryForContext(state, context),
  );
  const playersById = useSelector((state: RootState) =>
    selectPlayersByIdForContext(state, context),
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

  const effectivePlayerData = React.useMemo<PlayerDataEntry | null>(() => {
    if (!includeFallback || hasPlayerEntries(playerData?.playersById)) {
      return playerData ?? null;
    }

    if (!hasPlayerEntries(playersById)) {
      return playerData ?? null;
    }

    return {
      playersById,
      status: playerData?.status ?? 'succeeded',
      error: playerData?.error ?? null,
      cacheMetadata: {
        lastFetchedTimestamp: playerData?.cacheMetadata.lastFetchedTimestamp ?? null,
        playerCount: Object.keys(playersById).length,
      },
      currentRequest: playerData?.currentRequest ?? null,
    };
  }, [includeFallback, playerData, playersById]);

  return React.useMemo(
    () => ({ playerData: effectivePlayerData, isPlayerDataLoading }),
    [effectivePlayerData, isPlayerDataLoading],
  );
}
