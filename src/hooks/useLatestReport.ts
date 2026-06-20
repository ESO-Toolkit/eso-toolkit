import { useCallback, useEffect, useRef, useState } from 'react';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { useAuth } from '../features/auth/AuthContext';
import { isReportEmpty } from '../features/reports/reportFormatting';
import {
  UserReportSummaryFragment,
  GetUserReportsQuery,
  GetUserReportsDocument,
} from '../graphql/gql/graphql';

// Fetch a handful of recent reports so we can skip over empty logs (failed
// uploads/parses with no combat data) when picking the "latest report" link.
const LATEST_REPORT_FETCH_LIMIT = 10;

interface LatestReportState {
  report: UserReportSummaryFragment | null;
  loading: boolean;
  error: string | null;
}

export const useLatestReport = (): LatestReportState & { refetch: () => Promise<void> } => {
  const { isLoggedIn, currentUser } = useAuth();
  const client = useEsoLogsClientInstance();

  const [state, setState] = useState<LatestReportState>({
    report: null,
    loading: true,
    error: null,
  });

  // Identifies the latest fetch so a slower, superseded request (e.g. the user
  // logged out / switched identity, or the component unmounted) can't overwrite
  // newer state with a stale report.
  const fetchIdRef = useRef(0);

  const fetchLatestReport = useCallback(async (): Promise<void> => {
    const fetchId = ++fetchIdRef.current;
    if (!isLoggedIn || !currentUser?.id) {
      setState({
        report: null,
        loading: false,
        error: null,
      });
      return;
    }

    try {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      const userID =
        typeof currentUser.id === 'string' ? parseInt(currentUser.id, 10) : currentUser.id;

      const reportsResult: GetUserReportsQuery = await client.query({
        query: GetUserReportsDocument,
        variables: {
          limit: LATEST_REPORT_FETCH_LIMIT,
          page: 1,
          userID,
        },
      });

      const reportPagination = reportsResult.reportData?.reports;
      const candidates = (reportPagination?.data ?? []).filter(
        (report): report is UserReportSummaryFragment => report !== null,
      );
      // Prefer the newest report that has combat data; if every recent report
      // is empty, fall back to the newest one so the link still exists.
      const latestReport = candidates.find((report) => !isReportEmpty(report)) ?? null;
      const fallbackReport = candidates[0] ?? null;

      if (fetchId !== fetchIdRef.current) return; // superseded / unmounted
      setState({
        report: latestReport ?? fallbackReport,
        loading: false,
        error: null,
      });
    } catch {
      if (fetchId !== fetchIdRef.current) return; // superseded / unmounted
      setState({
        report: null,
        loading: false,
        error: 'Failed to fetch latest report',
      });
    }
  }, [client, currentUser?.id, isLoggedIn]);

  useEffect(() => {
    // Each call bumps fetchIdRef, so when identity/login deps change the
    // re-created fetchLatestReport supersedes any in-flight one (its stale
    // result is dropped by the fetchId guard above). setState after unmount is
    // a no-op in React 19, so no cleanup is needed.
    fetchLatestReport();
  }, [fetchLatestReport]);

  return {
    ...state,
    refetch: fetchLatestReport,
  };
};
