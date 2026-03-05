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
import { isSampleReport } from '../utils/sampleReports';

export function useReportData(): {
  reportData: ReportFragment | null;
  isReportLoading: boolean;
} {
  const { client, isReady, isLoggedIn } = useEsoLogsClientContext();
  const dispatch = useAppDispatch();
  const { reportId } = useSelectedReportAndFight();

  React.useEffect(() => {
    // Fetch if client is ready and user is logged in.
    // For bundled sample reports, also fetch even without login — the thunk
    // will serve data from the static JSON instead of hitting the API.
    const canFetch = isLoggedIn || isSampleReport(reportId);
    if (reportId && isReady && canFetch && client) {
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
