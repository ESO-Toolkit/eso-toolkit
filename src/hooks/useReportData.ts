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
  /** Why the report failed to load (fetch/API error) — null when healthy. */
  reportError: string | null;
  /**
   * Re-fetches the report from the network, bypassing both the slice's
   * freshness window and Apollo's cache. Backs the detail page's "Try again" /
   * "Check again" actions and the still-processing auto-recheck.
   */
  refetchReport: () => void;
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

  const refetchReport = React.useCallback(() => {
    if (reportId && isReady && client) {
      void dispatch(fetchReportData({ reportId, client, force: true }));
    }
  }, [dispatch, reportId, client, isReady]);

  return React.useMemo(
    () => ({
      reportData: combinedReportData.data,
      isReportLoading,
      reportError: combinedReportData.error ?? null,
      refetchReport,
    }),
    [combinedReportData.data, combinedReportData.error, isReportLoading, refetchReport],
  );
}
