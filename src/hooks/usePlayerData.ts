import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { useSelectedReportAndFight } from '../ReportFightContext';
import {
  selectPlayerData,
  selectPlayerDataLoadingState,
} from '../store/player_data/playerDataSelectors';
import { fetchPlayerData, PlayerDataState } from '../store/player_data/playerDataSlice';
import { useAppDispatch } from '../store/useAppDispatch';

export function usePlayerData(): {
  playerData: PlayerDataState | null;
  isPlayerDataLoading: boolean;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const { reportId, fightId } = useSelectedReportAndFight();

  React.useEffect(() => {
    if (reportId && fightId) {
      const fightIdNumber = parseInt(fightId, 10);
      if (!isNaN(fightIdNumber)) {
        dispatch(fetchPlayerData({ reportCode: reportId, fightId: fightIdNumber, client }));
      }
    }
  }, [dispatch, reportId, fightId, client]);

  const playerData = useSelector(selectPlayerData);
  const isPlayerDataLoading = useSelector(selectPlayerDataLoadingState);

  return React.useMemo(
    () => ({ playerData, isPlayerDataLoading }),
    [playerData, isPlayerDataLoading]
  );
}
