import React from 'react';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { GetReportByCodeDocument } from '../../graphql/generated';
import { useReportFightParams } from '../../hooks';
import { ReportFightContext } from '../../ReportFightContext';

const REFETCH_INTERVAL = 30 * 1000; // 30 seconds

export const LiveLog: React.FC<React.PropsWithChildren> = (props) => {
  const { reportId, fightId } = useReportFightParams();
  const client = useEsoLogsClientInstance();

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
    });
    const lastFight =
      response.reportData?.report?.fights &&
      response.reportData?.report?.fights[response.reportData.report.fights.length - 1];

    if (lastFight) {
      setFightId(lastFight.id.toString());
    }
  }, [reportId, client]);

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

  return (
    <ReportFightContext.Provider value={reportFightCtxValue}>
      {props.children}
    </ReportFightContext.Provider>
  );
};
