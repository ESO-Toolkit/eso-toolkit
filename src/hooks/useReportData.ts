import React from 'react';
import { useSelector } from 'react-redux';

import { useAuth } from '../AuthContext';
import { GetReportByCodeQuery } from '../graphql/generated';
import { selectReportLoadingState } from '../store/report/reportSelectors';
import { fetchReportData } from '../store/report/reportSlice';
import { RootState } from '../store/storeWithHistory';
import { useAppDispatch } from '../store/useAppDispatch';

import { useReportFightParams } from './useReportFightParams';

export function useReportData(): {
  reportData: GetReportByCodeQuery | null;
  isReportLoading: boolean;
} {
  const { accessToken } = useAuth();
  const dispatch = useAppDispatch();
  const { reportId } = useReportFightParams();

  React.useEffect(() => {
    if (reportId !== undefined && accessToken !== undefined) {
      dispatch(fetchReportData({ reportId, accessToken }));
    }
  }, [dispatch, reportId, accessToken]);

  const reportData = useSelector((state: RootState) => state.report.data);
  const isReportLoading = useSelector(selectReportLoadingState);

  return React.useMemo(() => ({ reportData, isReportLoading }), [reportData, isReportLoading]);
}
