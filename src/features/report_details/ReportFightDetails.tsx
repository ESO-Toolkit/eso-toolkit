import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../../AuthContext';
import { useReportFightParams } from '../../hooks/useReportFightParams';
import { fetchReportData } from '../../store/report/reportSlice';
import { RootState } from '../../store/storeWithHistory';
import { useAppDispatch } from '../../store/useAppDispatch';

import ReportFightDetailsView from './ReportFightDetailsView';

const ReportFightDetails: React.FC = () => {
  const { reportId, fightId } = useReportFightParams();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();

  const { accessToken } = useAuth();

  // OPTIMIZED: Single selector instead of multiple useSelector calls
  const fights = useSelector((state: RootState) => state.report.fights);
  const fightsLoading = useSelector((state: RootState) => state.report.loading);
  const fightsError = useSelector((state: RootState) => state.report.error);

  // FIXED: Memoize fight lookup to prevent infinite renders in child components
  const fight = React.useMemo(() => {
    return fights.find((f) => f.id === Number(fightId));
  }, [fights, fightId]);

  // Only fetch report fights data - individual panels will fetch their own data
  React.useEffect(() => {
    if (reportId && accessToken) {
      // The thunk now handles checking if data needs to be fetched internally
      dispatch(fetchReportData({ reportId, accessToken }));
    }
  }, [reportId, accessToken, dispatch]);

  // Get selectedTabId from query param if present
  const selectedTabId = searchParams.has('selectedTabId')
    ? Number(searchParams.get('selectedTabId'))
    : undefined;

  return (
    <ReportFightDetailsView
      fight={fight}
      fightsLoading={fightsLoading || fights.length === 0}
      fightsError={fightsError}
      selectedTabId={selectedTabId}
      reportId={reportId}
      fightId={fightId}
    />
  );
};

export default ReportFightDetails;
