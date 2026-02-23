import { Typography } from '@mui/material';
import React from 'react';
import { useParams } from 'react-router-dom';

import { fetchReportMasterData, forceMasterDataRefresh } from '@/store/master_data/masterDataSlice';
import {
  setActiveReportContext,
  setReportCacheMetadata,
  setReportData,
} from '@/store/report/reportSlice';
import { setSelectedTargetIds } from '@/store/ui/uiSlice';
import { useAppDispatch } from '@/store/useAppDispatch';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { GetReportByCodeDocument } from '../../graphql/gql/graphql';
import { ReportFightContext } from '../../ReportFightContext';
import { TabId } from '../../utils/getSkeletonForTab';

const REFETCH_INTERVAL = 30 * 1000; // 30 seconds

export const LiveLog: React.FC<React.PropsWithChildren> = (props) => {
  const { reportId, fightId } = useParams();
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();

  // Initialize to the fight id from the url
  const [latestFightId, setFightId] = React.useState<string | null | undefined>(fightId);

  // Local state for tab selection and experimental flag (not URL-driven for live log)
  const [selectedTabId, setSelectedTabId] = React.useState<TabId>(TabId.INSIGHTS);
  const [showExperimentalTabs, setShowExperimentalTabs] = React.useState<boolean>(false);

  // Error state: a non-null message stops the polling interval and shows a message to the user
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    dispatch(
      setActiveReportContext({
        reportCode: reportId ?? null,
        fightId: latestFightId ?? null,
      }),
    );
  }, [dispatch, reportId, latestFightId]);

  const fetchLatestFightId = React.useCallback(async (): Promise<void> => {
    if (!reportId) {
      return;
    }

    let response;
    try {
      response = await client.query({
        query: GetReportByCodeDocument,
        variables: {
          code: reportId,
        },
        fetchPolicy: 'no-cache',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch report data';
      setFetchError(message);
      return;
    }
    const lastFight =
      response.reportData?.report?.fights &&
      response.reportData?.report?.fights[response.reportData.report.fights.length - 1];

    if (lastFight && lastFight.id.toString() !== latestFightId) {
      setFightId(lastFight.id.toString());

      // Clear selected targets when a new fight is detected
      dispatch(setSelectedTargetIds([]));

      // Force master data refresh when a new fight is detected
      // This ensures new actors and abilities from the new fight are loaded
      dispatch(forceMasterDataRefresh());
      dispatch(fetchReportMasterData({ reportCode: reportId, client }));
    }

    // Always update report data and cache metadata for live logging
    // Set the report ID first to ensure proper cache metadata association

    // Then set the report data, which will automatically update cache metadata
    dispatch(setReportData(response.reportData?.report || null));
    dispatch(setReportCacheMetadata({ lastFetchedReportId: reportId }));
  }, [reportId, client, latestFightId, dispatch]);

  React.useEffect(() => {
    // Don't start/continue polling if we already have a permanent error
    if (fetchError) {
      return;
    }

    void fetchLatestFightId();

    const interval = setInterval(() => {
      void fetchLatestFightId();
    }, REFETCH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchLatestFightId, fetchError]);

  const reportFightCtxValue = React.useMemo(
    () => ({
      reportId: reportId,
      fightId: latestFightId,
      tabId: null, // Live log doesn't use URL tab params
      selectedTabId,
      showExperimentalTabs,
      setSelectedTab: setSelectedTabId,
      setShowExperimentalTabs,
    }),
    [reportId, latestFightId, selectedTabId, showExperimentalTabs],
  );

  if (fetchError) {
    return <Typography color="error">{fetchError}</Typography>;
  }

  if (!latestFightId) {
    return <Typography>Waiting for fights to be uploaded...</Typography>;
  }

  return (
    <ReportFightContext.Provider value={reportFightCtxValue}>
      {props.children}
    </ReportFightContext.Provider>
  );
};
