import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { useSelectedReportAndFight } from '../ReportFightContext';
import {
  selectMasterData,
  selectMasterDataLoadingState,
} from '../store/master_data/masterDataSelectors';
import { fetchReportMasterData, resetLoadingState } from '../store/master_data/masterDataSlice';
import { RootState } from '../store/storeWithHistory';
import { useAppDispatch } from '../store/useAppDispatch';

export function useReportMasterData(): {
  reportMasterData: RootState['masterData'];
  isMasterDataLoading: boolean;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const { reportId } = useSelectedReportAndFight();

  // Move selectors BEFORE the effects that use them
  const reportMasterData = useSelector(selectMasterData);
  const isMasterDataLoading = useSelector(selectMasterDataLoadingState);

  React.useEffect(() => {
    if (reportId) {
      // Check if we're stuck in loading state and reset it
      if (
        reportMasterData.loading &&
        !reportMasterData.loaded &&
        reportMasterData.cacheMetadata.lastFetchedReportId !== reportId
      ) {
        dispatch(resetLoadingState());
      }

      dispatch(fetchReportMasterData({ reportCode: reportId, client }));
    }
  }, [
    dispatch,
    reportId,
    client,
    reportMasterData.loading,
    reportMasterData.loaded,
    reportMasterData.cacheMetadata.lastFetchedReportId,
  ]);

  // Add timeout to detect stuck loading state
  React.useEffect(() => {
    if (isMasterDataLoading && reportId) {
      const timeout = setTimeout(() => {
        dispatch(resetLoadingState());
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isMasterDataLoading, reportId, dispatch]);

  return React.useMemo(
    () => ({ reportMasterData, isMasterDataLoading }),
    [reportMasterData, isMasterDataLoading],
  );
}
