import React from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { GetReportByCodeDocument } from '../graphql/generated';
import { setReportCacheMetadata, setReportData, setReportId } from '../store/report/reportSlice';

const REFETCH_INTERVAL = 30 * 1000; // 30 seconds

/**
 * Hook for live logging functionality - automatically polls for latest fight data
 * Extracted from LiveLog component to enable reuse in dashboard
 * @param providedReportId - Optional reportId to use instead of URL params
 */
export const useLiveLogData = (
  providedReportId?: string,
): {
  reportId: string | null;
  latestFightId: string | null;
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
  refetch: () => Promise<void>;
} => {
  const { reportId: urlReportId } = useParams();
  const reportId = providedReportId || urlReportId;
  const client = useEsoLogsClientInstance();
  const dispatch = useDispatch();

  // Track the latest fight ID and loading state
  const [latestFightId, setLatestFightId] = React.useState<string | null>(null);
  const [isPolling, setIsPolling] = React.useState(true);

  const fetchLatestFightId = React.useCallback(async (): Promise<void> => {
    if (!reportId) {
      return;
    }

    try {
      dispatch(setReportId(reportId));

      const response = await client.query({
        query: GetReportByCodeDocument,
        variables: {
          code: reportId,
        },
        fetchPolicy: 'no-cache',
      });

      const fights = response.reportData?.report?.fights;
      const lastFight = fights && fights[fights.length - 1];

      if (lastFight && lastFight.id.toString() !== latestFightId) {
        setLatestFightId(lastFight.id.toString());
      }

      // Always update report data and cache metadata for live logging
      dispatch(setReportData(response.reportData?.report || null));
      dispatch(setReportCacheMetadata({ lastFetchedReportId: reportId }));
    } catch (error) {
      // Silently handle errors in live log polling
    }
  }, [reportId, client, latestFightId, dispatch]);

  React.useEffect(() => {
    if (!isPolling) return;

    fetchLatestFightId();

    const interval = setInterval(() => {
      fetchLatestFightId();
    }, REFETCH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchLatestFightId, isPolling]);

  const startPolling = React.useCallback(() => {
    setIsPolling(true);
  }, []);

  const stopPolling = React.useCallback(() => {
    setIsPolling(false);
  }, []);

  return {
    reportId: reportId || null,
    latestFightId,
    isPolling,
    startPolling,
    stopPolling,
    refetch: fetchLatestFightId,
  };
};
