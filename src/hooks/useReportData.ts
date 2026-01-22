import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientContext } from '../EsoLogsClientContext';
import { ReportFragment } from '../graphql/gql/graphql';
import { useSelectedReportAndFight } from '../ReportFightContext';
import {
  selectCombinedReportData,
  selectReportLoadingState,
} from '../store/report/reportSelectors';
import { fetchReportData } from '../store/report/reportSlice';
import { useAppDispatch } from '../store/useAppDispatch';

export function useReportData(): {
  reportData: ReportFragment | null;
  isReportLoading: boolean;
} {
  const { client, isReady, isLoggedIn } = useEsoLogsClientContext();
  const dispatch = useAppDispatch();
  const { reportId } = useSelectedReportAndFight();

  React.useEffect(() => {
    // Only fetch if client is ready, user is logged in, and we have a reportId
    if (reportId && isReady && isLoggedIn && client) {
      dispatch(fetchReportData({ reportId, client }));
    }
  }, [dispatch, reportId, client, isReady, isLoggedIn]);

  const combinedReportData = useSelector(selectCombinedReportData);
  const isReportLoading = useSelector(selectReportLoadingState);

  return React.useMemo(
    () => ({ reportData: combinedReportData.data, isReportLoading }),
    [combinedReportData.data, isReportLoading],
  );
}
