import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientContext } from '../EsoLogsClientContext';
import { useSelectedReportAndFight } from '../ReportFightContext';
import {
  CombinedMasterData,
  selectCombinedMasterData,
  selectMasterDataLoadingState,
} from '../store/master_data/masterDataSelectors';
import { fetchReportMasterData } from '../store/master_data/masterDataSlice';
import { useAppDispatch } from '../store/useAppDispatch';

export function useReportMasterData(): {
  reportMasterData: CombinedMasterData;
  isMasterDataLoading: boolean;
} {
  const { client, isReady, isLoggedIn } = useEsoLogsClientContext();
  const dispatch = useAppDispatch();
  const { reportId } = useSelectedReportAndFight();

  // Move selectors BEFORE the effects that use them
  const reportMasterData = useSelector(selectCombinedMasterData);
  const isMasterDataLoading = useSelector(selectMasterDataLoadingState);

  React.useEffect(() => {
    // Only fetch if client is ready, user is logged in, and we have a reportId
    if (reportId && isReady && isLoggedIn && client) {
      dispatch(fetchReportMasterData({ reportCode: reportId, client }));
    }
  }, [dispatch, reportId, client, isReady, isLoggedIn]);

  return React.useMemo(
    () => ({ reportMasterData, isMasterDataLoading }),
    [reportMasterData, isMasterDataLoading],
  );
}
