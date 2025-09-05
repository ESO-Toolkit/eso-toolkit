import React from 'react';

import { GenericTabSkeleton } from '../components/GenericTabSkeleton';
import { InsightsSkeletonLayout } from '../components/InsightsSkeletonLayout';

// Tab identifiers as strings (matching FightDetailsView)
export const TAB_IDS = {
  INSIGHTS: 'insights',
  PLAYERS: 'players',
  DAMAGE_DONE: 'damage-done',
  HEALING_DONE: 'healing-done',
  DEATHS: 'deaths',
  CRITICAL_DAMAGE: 'critical-damage',
  PENETRATION: 'penetration',
  DAMAGE_REDUCTION: 'damage-reduction',
  LOCATION_HEATMAP: 'location-heatmap',
  RAW_EVENTS: 'raw-events',
  TARGET_EVENTS: 'target-events',
  DIAGNOSTICS: 'diagnostics',
  ACTORS: 'actors',
  TALENTS: 'talents',
  ROTATION_ANALYSIS: 'rotation-analysis',
  AURAS_OVERVIEW: 'auras-overview',
  BUFFS_OVERVIEW: 'buffs-overview',
  DEBUFFS_OVERVIEW: 'debuffs-overview',
} as const;

export type TabId = (typeof TAB_IDS)[keyof typeof TAB_IDS];

export const getSkeletonForTab = (
  tabId: TabId | undefined,
  includeHeaderAndTabs = false,
): React.ReactElement => {
  const getContentSkeleton = (): React.ReactElement => {
    switch (tabId) {
      case TAB_IDS.INSIGHTS:
        return (
          <InsightsSkeletonLayout
            showHeader={includeHeaderAndTabs}
            showTabs={includeHeaderAndTabs}
          />
        );
      case TAB_IDS.PLAYERS:
        return <GenericTabSkeleton title="Players" showTable={true} tableRows={6} />;
      case TAB_IDS.DAMAGE_DONE:
        return (
          <GenericTabSkeleton
            title="Damage Done"
            showChart={true}
            chartHeight={400}
            showTable={true}
            tableRows={10}
          />
        );
      case TAB_IDS.HEALING_DONE:
        return (
          <GenericTabSkeleton
            title="Healing Done"
            showChart={true}
            chartHeight={400}
            showTable={true}
            tableRows={8}
          />
        );
      case TAB_IDS.DEATHS:
        return <GenericTabSkeleton title="Death Events" showTable={true} tableRows={5} />;
      case TAB_IDS.CRITICAL_DAMAGE:
        return <GenericTabSkeleton title="Critical Damage" showTable={true} tableRows={12} />;
      case TAB_IDS.PENETRATION:
        return <GenericTabSkeleton title="Penetration" showTable={true} tableRows={6} />;
      case TAB_IDS.DAMAGE_REDUCTION:
        return (
          <GenericTabSkeleton
            title="Damage Reduction"
            showChart={true}
            showTable={true}
            tableRows={8}
          />
        );
      case TAB_IDS.LOCATION_HEATMAP:
        return (
          <GenericTabSkeleton
            title="Location Heatmap"
            showChart={true}
            chartHeight={600}
            showTable={false}
          />
        );
      case TAB_IDS.RAW_EVENTS:
        return <GenericTabSkeleton title="Events" showTable={true} tableRows={20} />;
      case TAB_IDS.TARGET_EVENTS:
        return <GenericTabSkeleton title="Target Events" showTable={true} tableRows={15} />;
      case TAB_IDS.DIAGNOSTICS:
        return <GenericTabSkeleton title="Diagnostics" showTable={false} />;
      case TAB_IDS.ACTORS:
        return <GenericTabSkeleton title="Actors" showTable={true} tableRows={8} />;
      case TAB_IDS.TALENTS:
        return <GenericTabSkeleton title="Talents Grid" showTable={false} />;
      case TAB_IDS.ROTATION_ANALYSIS:
        return (
          <GenericTabSkeleton
            title="Rotation Analysis"
            showChart={true}
            chartHeight={500}
            showTable={false}
          />
        );
      case TAB_IDS.AURAS_OVERVIEW:
        return <GenericTabSkeleton title="Auras" showTable={true} tableRows={15} />;
      case TAB_IDS.BUFFS_OVERVIEW:
        return <GenericTabSkeleton title="Buffs Overview" showChart={true} showTable={true} />;
      case TAB_IDS.DEBUFFS_OVERVIEW:
        return <GenericTabSkeleton title="Debuffs Overview" showTable={true} tableRows={15} />;
      default:
        return <GenericTabSkeleton title="Loading..." />;
    }
  };

  return getContentSkeleton();
};
