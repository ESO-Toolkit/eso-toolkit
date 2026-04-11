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
  const { client, isReady } = useEsoLogsClientContext();
  const dispatch = useAppDispatch();
  const { reportId } = useSelectedReportAndFight();

  React.useEffect(() => {
    // Fetch if client is ready — the Cloudflare Worker GQL proxy handles
    // token injection for public queries so no login is required.
    if (reportId && isReady && client) {
      dispatch(fetchReportData({ reportId, client }));
    }
  }, [dispatch, reportId, client, isReady]);

  const combinedReportData = useSelector(selectCombinedReportData);
  const isReportLoading = useSelector(selectReportLoadingState);

  return React.useMemo(
    () => ({ reportData: combinedReportData.data, isReportLoading }),
    [combinedReportData.data, isReportLoading],
  );
}
