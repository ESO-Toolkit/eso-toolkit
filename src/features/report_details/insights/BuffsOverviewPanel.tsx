import React from 'react';

import { useReportMasterData } from '../../../hooks';
import { useFriendlyBuffLookup } from '../../../hooks/useFriendlyBuffEvents';
import { useSelectedReportAndFight } from '../../../ReportFightContext';

import { BuffsOverviewPanelView } from './BuffsOverviewPanelView';

export interface BuffOverviewData extends Record<string, unknown> {
  buffName: string;
  buffId: number;
  icon?: string;
  gameId: string;
  activeTargetsCount: number;
  totalApplications: number;
}

/**
 * Panel that shows all buffs applied to friendly targets during the fight
 */
export const BuffsOverviewPanel: React.FC = () => {
  // Get report/fight context
  const { reportId, fightId } = useSelectedReportAndFight();

  // Get data hooks
  const { friendlyBuffsLookup, isFriendlyBuffEventsLoading } = useFriendlyBuffLookup();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Process buffs data
  const buffsData = React.useMemo(() => {
    if (!friendlyBuffsLookup?.buffIntervals || !reportMasterData?.abilitiesById) {
      return [];
    }

    const buffDataMap = new Map<number, BuffOverviewData>();

    // Iterate through all buff intervals to collect unique buffs
    for (const [abilityGameID, intervals] of friendlyBuffsLookup.buffIntervals) {
      // Get ability info from master data
      const ability = reportMasterData.abilitiesById[abilityGameID];

      // Count unique targets that had this buff
      const uniqueTargets = new Set(intervals.map((interval) => interval.targetID));

      // Count total applications (number of intervals)
      const totalApplications = intervals.length;

      const buffData: BuffOverviewData = {
        buffName: ability?.name || `Unknown Buff ${abilityGameID}`,
        buffId: abilityGameID,
        icon: ability?.icon || undefined,
        gameId: String(abilityGameID),
        activeTargetsCount: uniqueTargets.size,
        totalApplications,
      };

      buffDataMap.set(abilityGameID, buffData);
    }

    // Convert to array and sort by number of targets (most popular first)
    return Array.from(buffDataMap.values()).sort(
      (a, b) =>
        b.activeTargetsCount - a.activeTargetsCount || b.totalApplications - a.totalApplications
    );
  }, [friendlyBuffsLookup, reportMasterData]);

  const isLoading = isFriendlyBuffEventsLoading || isMasterDataLoading;

  return (
    <BuffsOverviewPanelView
      buffsData={buffsData}
      isLoading={isLoading}
      reportId={reportId}
      fightId={fightId}
    />
  );
};
