import React from 'react';

import { useReportMasterData } from '../../../hooks';
import { useBuffLookupTask } from '../../../hooks/workerTasks/useBuffLookupTask';

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
  const { reportMasterData } = useReportMasterData();

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

  return (
    <BuffsOverviewPanelView
      buffOverviewData={buffOverviewData}
      isLoading={isBuffLookupLoading}
      error={buffLookupError}
    />
  );
};
