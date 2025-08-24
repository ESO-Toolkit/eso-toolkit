import React from 'react';
import { useSelector } from 'react-redux';

import { useAuth } from '../../AuthContext';
import { useReportFightParams } from '../../hooks/useReportFightParams';
import { clearEvents } from '../../store/events/eventsSlice';
import { clearMasterData } from '../../store/master_data/masterDataSlice';
import { fetchReportData } from '../../store/report/reportSlice';
import { RootState } from '../../store/storeWithHistory';
import { useAppDispatch } from '../../store/useAppDispatch';

import ReportFightsView from './ReportFightsView';

const ReportFights: React.FC = () => {
  const { reportId, fightId } = useReportFightParams();
  const dispatch = useAppDispatch();
  const { accessToken } = useAuth();

  const fights = useSelector((state: RootState) => state.report.fights);
  const loading = useSelector((state: RootState) => state.report.loading);
  const error = useSelector((state: RootState) => state.report.error);
  const currentReportId = useSelector((state: RootState) => state.report.reportId);
  const reportStartTime = useSelector(
    (state: RootState) => state.report.data?.reportData?.report?.startTime
  );

  React.useEffect(() => {
    const canFetch = reportId && fights.length === 0 && !loading;
    const isNewReport = currentReportId !== reportId;
    if (canFetch && (!error || isNewReport)) {
      // Clear existing data when fetching a new report (different from current one)
      if (isNewReport) {
        dispatch(clearEvents());
        dispatch(clearMasterData());
      }
      dispatch(fetchReportData({ reportId, accessToken }));
    }
  }, [reportId, accessToken, fights.length, loading, error, currentReportId, dispatch]);

  return (
    <ReportFightsView
      fights={fights}
      loading={loading}
      error={error}
      fightId={fightId}
      reportId={reportId}
      reportStartTime={reportStartTime}
    />
  );
};

export default ReportFights;
