import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../../AuthContext';
import { FightFragment } from '../../graphql/generated';
import { useReportFightParams } from '../../hooks/useReportFightParams';
import { fetchReportMasterData } from '../../store/master_data/masterDataSlice';
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

  // Master data loading/loaded
  const masterDataLoading = useSelector((state: RootState) => state.masterData.loading);
  const masterDataLoaded = useSelector((state: RootState) => state.masterData.loaded);

  // Aggregate events loading across slices
  const eventsLoading = useSelector(
    (state: RootState) =>
      state.events.damage.loading ||
      state.events.healing.loading ||
      state.events.buffs.loading ||
      state.events.deaths.loading ||
      state.events.combatantInfo.loading ||
      state.events.debuffs.loading ||
      state.events.casts.loading ||
      state.events.resources.loading
  );

  // Derive current fetching fight id from any loading event slice
  const currentFetchFightId = useSelector((state: RootState) => {
    const fid = fightId ? Number(fightId) : null;
    const { events } = state;
    if (events.damage.loading) return events.damage.cacheMetadata.lastFetchedFightId ?? fid;
    if (events.healing.loading) return events.healing.cacheMetadata.lastFetchedFightId ?? fid;
    if (events.buffs.loading) return events.buffs.cacheMetadata.lastFetchedFightId ?? fid;
    if (events.deaths.loading) return events.deaths.cacheMetadata.lastFetchedFightId ?? fid;
    if (events.combatantInfo.loading)
      return events.combatantInfo.cacheMetadata.lastFetchedFightId ?? fid;
    if (events.debuffs.loading) return events.debuffs.cacheMetadata.lastFetchedFightId ?? fid;
    if (events.casts.loading) return events.casts.cacheMetadata.lastFetchedFightId ?? fid;
    if (events.resources.loading) return events.resources.cacheMetadata.lastFetchedFightId ?? fid;
    return null;
  });

  // FIXED: Memoize fight lookup to prevent infinite renders in child components
  const fight = React.useMemo(() => {
    return fights.find((f: FightFragment) => f.id === Number(fightId));
  }, [fights, fightId]);

  // Only fetch report fights data - individual panels will fetch their own data
  React.useEffect(() => {
    if (reportId && accessToken) {
      // The thunk now handles checking if data needs to be fetched internally
      dispatch(fetchReportData({ reportId, accessToken }));
      // Ensure master data is available before rendering child details
      dispatch(fetchReportMasterData({ reportCode: reportId, accessToken }));
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
      masterDataLoading={masterDataLoading}
      masterDataLoaded={masterDataLoaded}
      eventsLoading={eventsLoading}
      currentFetchFightId={currentFetchFightId}
      selectedTabId={selectedTabId}
      reportId={reportId}
      fightId={fightId}
    />
  );
};

export default ReportFightDetails;
