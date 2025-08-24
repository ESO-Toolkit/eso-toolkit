import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import {
  selectMasterData,
  selectMasterDataLoadingState,
} from '../store/master_data/masterDataSelectors';
import { fetchReportMasterData } from '../store/master_data/masterDataSlice';
import { RootState } from '../store/storeWithHistory';
import { useAppDispatch } from '../store/useAppDispatch';

import { useReportFightParams } from './useReportFightParams';

export function useReportMasterData(): {
  reportMasterData: RootState['masterData'];
  isMasterDataLoading: boolean;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const { reportId } = useReportFightParams();

  React.useEffect(() => {
    if (reportId !== undefined && client !== undefined) {
      dispatch(fetchReportMasterData({ reportCode: reportId, client }));
    }
  }, [dispatch, reportId, client]);

  const reportMasterData = useSelector(selectMasterData);
  const isMasterDataLoading = useSelector(selectMasterDataLoadingState);

  return React.useMemo(
    () => ({ reportMasterData, isMasterDataLoading }),
    [reportMasterData, isMasterDataLoading]
  );
}
