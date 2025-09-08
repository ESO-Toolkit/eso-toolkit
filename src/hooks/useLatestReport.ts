import { useCallback, useEffect, useState } from 'react';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { useAuth } from '../features/auth/AuthContext';
import { UserReportSummaryFragment, GetUserReportsQuery } from '../graphql/generated';
import { GetUserReportsDocument } from '../graphql/reports.generated';

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

  const fetchLatestReport = useCallback(async (): Promise<void> => {
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
          limit: 1, // Only fetch the latest report
          page: 1,
          userID,
        },
      });

      const reportPagination = reportsResult.reportData?.reports;
      const latestReport = reportPagination?.data?.[0] || null;

      setState({
        report: latestReport,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState({
        report: null,
        loading: false,
        error: 'Failed to fetch latest report',
      });
    }
  }, [client, currentUser?.id, isLoggedIn]);

  useEffect(() => {
    fetchLatestReport();
  }, [fetchLatestReport]);

  return {
    ...state,
    refetch: fetchLatestReport,
  };
};
