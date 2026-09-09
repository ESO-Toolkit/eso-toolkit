import React from 'react';
import { useSelector } from 'react-redux';

import { useReportMasterData } from '../../../hooks';
import { useFriendlyBuffEvents } from '../../../hooks/events/useFriendlyBuffEvents';
import { useBuffLookupTask } from '../../../hooks/workerTasks/useBuffLookupTask';
import { selectMasterDataErrorState } from '../../../store/master_data/masterDataSelectors';
import { AnalyzerPanelState, resolveAnalyzerPanelState } from '../AnalyzerPanelState';

import { BuffsOverviewPanelView } from './BuffsOverviewPanelView';

// Define the interface for the data expected by the view
export interface BuffOverviewData extends Record<string, unknown> {
  buffName: string;
  buffId: number;
  icon: string;
  gameId: string; // Keep for compatibility with existing view
  activeTargetsCount: number;
  totalApplications: number;
}

export const BuffsOverviewPanel: React.FC = () => {
  const { buffLookupData, isBuffLookupLoading, buffLookupError } = useBuffLookupTask();
  const { friendlyBuffEventsStatus, friendlyBuffEventsError } = useFriendlyBuffEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const masterDataError = useSelector(selectMasterDataErrorState);

  // Transform the BuffLookupData into BuffOverviewData
  const buffOverviewData: BuffOverviewData[] = React.useMemo(() => {
    if (!buffLookupData || !reportMasterData?.abilitiesById) return [];

    const overviewData: BuffOverviewData[] = [];

    // Iterate through each buff ability in the buff intervals
    for (const [abilityIdStr, intervals] of Object.entries(buffLookupData.buffIntervals)) {
      const abilityId = parseInt(abilityIdStr, 10);
      const ability = reportMasterData.abilitiesById[abilityId];

      // Get unique targets that have this buff at any point
      const uniqueTargets = new Set<number>();
      let totalApplications = 0;

      for (const interval of intervals) {
        uniqueTargets.add(interval.targetID);
        totalApplications += 1; // Each interval represents one application
      }

      overviewData.push({
        buffName: ability?.name || `Unknown Buff (${abilityId})`,
        buffId: abilityId,
        icon: ability?.icon || '',
        gameId: abilityIdStr, // Use string version for compatibility
        activeTargetsCount: uniqueTargets.size,
        totalApplications,
      });
    }

    // Sort by total applications (descending) then by name
    return overviewData.sort((a, b) => {
      if (a.totalApplications !== b.totalApplications) {
        return b.totalApplications - a.totalApplications;
      }
      return a.buffName.localeCompare(b.buffName);
    });
  }, [buffLookupData, reportMasterData?.abilitiesById]);

  const hasRetainedData = buffOverviewData.length > 0;
  const failureDetail = buffLookupError ?? friendlyBuffEventsError ?? masterDataError ?? undefined;
  const state = resolveAnalyzerPanelState({
    error: failureDetail,
    hasData: hasRetainedData,
    isComplete:
      buffLookupData !== null &&
      friendlyBuffEventsStatus === 'succeeded' &&
      reportMasterData.loaded,
    isLoading: isBuffLookupLoading || isMasterDataLoading,
  });

  return (
    <AnalyzerPanelState detail={failureDetail} state={state} title="Buffs overview">
      {hasRetainedData && <BuffsOverviewPanelView buffOverviewData={buffOverviewData} />}
    </AnalyzerPanelState>
  );
};
