import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
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
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const { reportId } = useReportFightParams();

  React.useEffect(() => {
    if (reportId !== undefined) {
      dispatch(fetchReportData({ reportId, client }));
    }
  }, [dispatch, reportId, client]);

  const reportData = useSelector((state: RootState) => state.report.data);
  const isReportLoading = useSelector(selectReportLoadingState);

  return React.useMemo(() => ({ reportData, isReportLoading }), [reportData, isReportLoading]);
}
