import React from 'react';

import { FightFragment } from '../../graphql/generated';
import { useReportData } from '../../hooks';
import { useSelectedReportAndFight } from '../../ReportFightContext';

import { ReportFightsView } from './ReportFightsView';

export const ReportFights: React.FC = () => {
  // Get current selected report and fight from context
  const { reportId, fightId } = useSelectedReportAndFight();
<<<<<<< HEAD
  const dispatch = useAppDispatch();
  const client = useEsoLogsClientInstance();

  const fights = useSelector((state: RootState) => state.report.data?.fights);
  const loading = useSelector((state: RootState) => state.report.loading);
  const error = useSelector((state: RootState) => state.report.error);
  const currentReportId = useSelector((state: RootState) => state.report.reportId);
  const reportStartTime = useSelector((state: RootState) => state.report.data?.startTime ?? null);

  React.useEffect(() => {
    if (reportId && client) {
      // Clear existing data when fetching a new report
      if (currentReportId !== reportId) {
        dispatch(clearAllEvents());
        dispatch(clearMasterData());
      }
      // The thunk now handles checking if data needs to be fetched internally
      dispatch(fetchReportData({ reportId, client }));
    }
  }, [reportId, client, currentReportId, dispatch]);
=======
  const { reportData, isReportLoading } = useReportData();
>>>>>>> f658e58 (Fixed reports not loading correctly (#34))

  return (
    <ReportFightsView
      fights={reportData?.fights?.filter(Boolean) as FightFragment[]}
      loading={isReportLoading}
      fightId={fightId || undefined}
      reportId={reportId || undefined}
      reportStartTime={reportStartTime}
    />
  );
};
