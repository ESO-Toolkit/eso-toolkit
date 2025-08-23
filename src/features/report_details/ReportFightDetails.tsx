import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../../AuthContext';
import { useReportFightParams } from '../../hooks/useReportFightParams';
import { selectReportFightDetailsData } from '../../store/crossSliceSelectors';
import { fetchEventsForFight, clearEvents } from '../../store/events/eventsSlice';
import { fetchReportMasterData, clearMasterData } from '../../store/master_data/masterDataSlice';
import { fetchReportData } from '../../store/report/reportSlice';
import { useAppDispatch } from '../../store/useAppDispatch';

import ReportFightDetailsView from './ReportFightDetailsView';

const ReportFightDetails: React.FC = () => {
  const { reportId, fightId } = useReportFightParams();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();

  const { accessToken } = useAuth();

  // OPTIMIZED: Single selector instead of multiple useSelector calls
  const {
    fights,
    fightsLoading,
    fightsError,
    currentReportId,
    masterDataLoaded,
    masterDataLoading,
    masterDataError,
    eventsLoading,
    currentFetchFightId,
  } = useSelector(selectReportFightDetailsData);

  const fight = fights.find((f) => f.id === Number(fightId));

  // Fetch master data if not loaded
  React.useEffect(() => {
    if (reportId && accessToken && !masterDataLoaded && !masterDataLoading && !masterDataError) {
      dispatch(fetchReportMasterData({ reportCode: reportId, accessToken }));
    }
  }, [reportId, accessToken, masterDataLoaded, masterDataLoading, masterDataError, dispatch]);

  // Always fetch report data if fights are missing
  React.useEffect(() => {
    if (reportId && accessToken && fights.length === 0 && !fightsLoading && !fightsError) {
      // Clear existing data when fetching a new report (different from current one)
      if (currentReportId !== reportId) {
        dispatch(clearEvents());
        dispatch(clearMasterData());
      }
      dispatch(fetchReportData({ reportId, accessToken }));
    }
  }, [reportId, accessToken, fights.length, fightsLoading, fightsError, currentReportId, dispatch]);

  React.useEffect(() => {
    if (fight && reportId && accessToken) {
      void dispatch(fetchEventsForFight({ reportCode: reportId, fight, accessToken }));
    }
  }, [fight, reportId, accessToken, dispatch]);

  // Get selectedTabId from query param if present
  const selectedTabId = searchParams.has('selectedTabId')
    ? Number(searchParams.get('selectedTabId'))
    : undefined;

  return (
    <ReportFightDetailsView
      fight={fight}
      fightsLoading={fightsLoading || fights.length === 0}
      fightsError={fightsError}
      masterDataLoading={masterDataLoading}
      masterDataLoaded={masterDataLoaded}
      eventsLoading={eventsLoading}
      currentFetchFightId={currentFetchFightId ?? null}
      selectedTabId={selectedTabId}
      reportId={reportId}
      fightId={fightId}
    />
  );
};

export default ReportFightDetails;
