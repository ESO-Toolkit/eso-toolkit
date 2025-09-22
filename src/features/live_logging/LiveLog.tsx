import { Typography } from '@mui/material';
import React from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { setReportCacheMetadata, setReportData, setReportId } from '@/store/report/reportSlice';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { GetReportByCodeDocument } from '../../graphql/generated';
import { ReportFightContext } from '../../ReportFightContext';
import { TabId } from '../../utils/getSkeletonForTab';

const REFETCH_INTERVAL = 30 * 1000; // 30 seconds

export const LiveLog: React.FC<React.PropsWithChildren> = (props) => {
  const { reportId, fightId } = useParams();
  const client = useEsoLogsClientInstance();
  const dispatch = useDispatch();

  // Initialize to the fight id from the url
  const [latestFightId, setFightId] = React.useState<string | null | undefined>(fightId);

  // Local state for tab selection and experimental flag (not URL-driven for live log)
  const [selectedTabId, setSelectedTabId] = React.useState<TabId>(TabId.INSIGHTS);
  const [showExperimentalTabs, setShowExperimentalTabs] = React.useState<boolean>(false);

  const fetchLatestFightId = React.useCallback(async (): Promise<void> => {
    if (!reportId) {
      return;
    }

    dispatch(setReportId(reportId));

    const response = await client.query({
      query: GetReportByCodeDocument,
      variables: {
        code: reportId,
      },
      fetchPolicy: 'no-cache',
    });
    const lastFight =
      response.reportData?.report?.fights &&
      response.reportData?.report?.fights[response.reportData.report.fights.length - 1];

    if (lastFight && lastFight.id.toString() !== latestFightId) {
      setFightId(lastFight.id.toString());
    }

    // Always update report data and cache metadata for live logging
    // Set the report ID first to ensure proper cache metadata association

    // Then set the report data, which will automatically update cache metadata
    dispatch(setReportData(response.reportData?.report || null));
    dispatch(setReportCacheMetadata({ lastFetchedReportId: reportId }));
  }, [reportId, client, latestFightId, dispatch]);

  React.useEffect(() => {
    fetchLatestFightId();

    const interval = setInterval(() => {
      fetchLatestFightId();
    }, REFETCH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchLatestFightId]);

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

  if (!latestFightId) {
    return <Typography>Waiting for fights to be uploaded...</Typography>;
  }

  return (
    <ReportFightContext.Provider value={reportFightCtxValue}>
      {props.children}
    </ReportFightContext.Provider>
  );
};
