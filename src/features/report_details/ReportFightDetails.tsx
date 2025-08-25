import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { FightFragment } from '../../graphql/generated';
import { useReportFightParams } from '../../hooks/useReportFightParams';
import { RootState } from '../../store/storeWithHistory';

import { ReportFightDetailsView } from './ReportFightDetailsView';

export const ReportFightDetails: React.FC = () => {
  const { reportId, fightId } = useReportFightParams();
  const [searchParams] = useSearchParams();

  // OPTIMIZED: Single selector instead of multiple useSelector calls
  const fights = useSelector((state: RootState) => state.report.fights);
  const fightsLoading = useSelector((state: RootState) => state.report.loading);
  const fightsError = useSelector((state: RootState) => state.report.error);

  // FIXED: Memoize fight lookup to prevent infinite renders in child components
  const fight = React.useMemo(() => {
    return fights.find((f: FightFragment) => f.id === Number(fightId));
  }, [fights, fightId]);

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
