import React from 'react';
import { useSelector } from 'react-redux';

import { useAuth } from '../AuthContext';
import {
  selectPlayerData,
  selectPlayerDataLoadingState,
} from '../store/player_data/playerDataSelectors';
import { fetchPlayerData } from '../store/player_data/playerDataSlice';
import { useAppDispatch } from '../store/useAppDispatch';

import { useReportFightParams } from './useReportFightParams';

export function usePlayerData() {
  const { accessToken } = useAuth();
  const dispatch = useAppDispatch();
  const { reportId, fightId } = useReportFightParams();

  React.useEffect(() => {
    if (reportId !== undefined && fightId !== undefined && accessToken !== undefined) {
      const fightIdNumber = parseInt(fightId, 10);
      if (!isNaN(fightIdNumber)) {
        dispatch(fetchPlayerData({ reportCode: reportId, fightId: fightIdNumber, accessToken }));
      }
    }
  }, [dispatch, reportId, fightId, accessToken]);

  const playerData = useSelector(selectPlayerData);
  const isPlayerDataLoading = useSelector(selectPlayerDataLoadingState);

  return React.useMemo(
    () => ({ playerData, isPlayerDataLoading }),
    [playerData, isPlayerDataLoading]
  );
}
