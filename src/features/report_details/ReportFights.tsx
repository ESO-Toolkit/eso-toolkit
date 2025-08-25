import React from 'react';
import { useSelector } from 'react-redux';

import { useAuth } from '../../AuthContext';
import { useReportFightParams } from '../../hooks/useReportFightParams';
import { clearAllEvents } from '../../store/events_data/actions';
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

  React.useEffect(() => {
    if (reportId && accessToken) {
      // Clear existing data when fetching a new report
      if (currentReportId !== reportId) {
        dispatch(clearAllEvents());
        dispatch(clearMasterData());
      }
      // The thunk now handles checking if data needs to be fetched internally
      dispatch(fetchReportData({ reportId, accessToken }));
    }
  }, [reportId, accessToken, currentReportId, dispatch]);

  return (
    <ReportFightsView
      fights={fights}
      loading={loading}
      error={error}
      fightId={fightId}
      reportId={reportId}
    />
  );
};

export default ReportFights;
