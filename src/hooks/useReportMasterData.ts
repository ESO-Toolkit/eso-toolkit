import React from 'react';
import { useSelector } from 'react-redux';

import { useAuth } from '../AuthContext';
import {
  selectMasterData,
  selectMasterDataLoadingState,
} from '../store/master_data/masterDataSelectors';
import { fetchReportMasterData } from '../store/master_data/masterDataSlice';
import { useAppDispatch } from '../store/useAppDispatch';

import { useReportFightParams } from './useReportFightParams';

export function useReportMasterData() {
  const { accessToken } = useAuth();
  const dispatch = useAppDispatch();
  const { reportId } = useReportFightParams();

  React.useEffect(() => {
    if (reportId !== undefined && accessToken !== undefined) {
      dispatch(fetchReportMasterData({ reportCode: reportId, accessToken }));
    }
  }, [dispatch, reportId, accessToken]);

  const reportMasterData = useSelector(selectMasterData);
  const isMasterDataLoading = useSelector(selectMasterDataLoadingState);

  return React.useMemo(
    () => ({ reportMasterData, isMasterDataLoading }),
    [reportMasterData, isMasterDataLoading]
  );
}
