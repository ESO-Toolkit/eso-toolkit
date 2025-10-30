import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { useSelectedReportAndFight } from '../ReportFightContext';
import {
  selectIsPlayerDataLoadingForContext,
  selectPlayerDataEntryForContext,
} from '../store/player_data/playerDataSelectors';
import { fetchPlayerData, PlayerDataEntry } from '../store/player_data/playerDataSlice';
import type { RootState } from '../store/storeWithHistory';
import { useAppDispatch } from '../store/useAppDispatch';

export function usePlayerData(): {
  playerData: PlayerDataEntry | null;
  isPlayerDataLoading: boolean;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const { reportId, fightId } = useSelectedReportAndFight();

  const selectorContext = React.useMemo(
    () => ({ reportCode: reportId ?? null, fightId: fightId ?? null }),
    [reportId, fightId],
  );

  const playerData = useSelector((state: RootState) =>
    selectPlayerDataEntryForContext(state, selectorContext),
  );
  const isPlayerDataLoading = useSelector((state: RootState) =>
    selectIsPlayerDataLoadingForContext(state, selectorContext),
  );

  React.useEffect(() => {
    if (reportId && fightId) {
      const fightIdNumber = parseInt(fightId, 10);
      if (!isNaN(fightIdNumber)) {
        dispatch(fetchPlayerData({ reportCode: reportId, fightId: fightIdNumber, client }));
      }
    }
  }, [dispatch, reportId, fightId, client]);

  return React.useMemo(
    () => ({ playerData: playerData ?? null, isPlayerDataLoading }),
    [playerData, isPlayerDataLoading],
  );
}
