import { Typography } from '@mui/material';
import React from 'react';
import { useDispatch } from 'react-redux';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { GetReportByCodeDocument } from '../../graphql/generated';
import { useReportFightParams } from '../../hooks';
import { ReportFightContext } from '../../ReportFightContext';

import { setReportData } from '@/store/report/reportSlice';

const REFETCH_INTERVAL = 30 * 1000; // 30 seconds

export const LiveLog: React.FC<React.PropsWithChildren> = (props) => {
  const { reportId, fightId } = useReportFightParams();
  const client = useEsoLogsClientInstance();
  const dispatch = useDispatch();

  // Initialize to the fight id from the url
  const [latestFightId, setFightId] = React.useState<string | null | undefined>(fightId);

  const fetchLatestFightId = React.useCallback(async (): Promise<void> => {
    if (!reportId) {
      return;
    }

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
      dispatch(setReportData(response.reportData?.report || null));
    }
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
    }),
    [reportId, latestFightId]
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
