import React from 'react';

import { GenericTabSkeleton } from '../components/GenericTabSkeleton';
import { InsightsSkeletonLayout } from '../components/InsightsSkeletonLayout';
import { PlayersSkeleton } from '../components/PlayersSkeleton';

// Tab identifiers as strings (matching FightDetailsView)
export enum TabId {
  INSIGHTS = 'insights',
  PLAYERS = 'players',
  DAMAGE_DONE = 'damage-done',
  HEALING_DONE = 'healing-done',
  DEATHS = 'deaths',
  CRITICAL_DAMAGE = 'critical-damage',
  PENETRATION = 'penetration',
  DAMAGE_REDUCTION = 'damage-reduction',
  LOCATION_HEATMAP = 'location-heatmap',
  RAW_EVENTS = 'raw-events',
  TARGET_EVENTS = 'target-events',
  DIAGNOSTICS = 'diagnostics',
  ACTORS = 'actors',
  TALENTS = 'talents',
  ROTATION_ANALYSIS = 'rotation-analysis',
  AURAS_OVERVIEW = 'auras-overview',
  BUFFS_OVERVIEW = 'buffs-overview',
  DEBUFFS_OVERVIEW = 'debuffs-overview',
}

export const getSkeletonForTab = (
  tabId: TabId | undefined,
  includeHeaderAndTabs = false,
): React.ReactElement => {
  const getContentSkeleton = (): React.ReactElement => {
    switch (tabId) {
      case TabId.INSIGHTS:
        return (
          <InsightsSkeletonLayout
            showHeader={includeHeaderAndTabs}
            showTabs={includeHeaderAndTabs}
          />
        );
      case TabId.PLAYERS:
        return <PlayersSkeleton showHeader={includeHeaderAndTabs} />;
      case TabId.DAMAGE_DONE:
        return (
          <GenericTabSkeleton
            title="Damage Done"
            showChart={true}
            chartHeight={400}
            showTable={true}
            tableRows={10}
          />
        );
      case TabId.HEALING_DONE:
        return (
          <GenericTabSkeleton
            title="Healing Done"
            showChart={true}
            chartHeight={400}
            showTable={true}
            tableRows={8}
          />
        );
      case TabId.DEATHS:
        return <GenericTabSkeleton title="Death Events" showTable={true} tableRows={5} />;
      case TabId.CRITICAL_DAMAGE:
        return <GenericTabSkeleton title="Critical Damage" showTable={true} tableRows={12} />;
      case TabId.PENETRATION:
        return <GenericTabSkeleton title="Penetration" showTable={true} tableRows={6} />;
      case TabId.DAMAGE_REDUCTION:
        return (
          <GenericTabSkeleton
            title="Damage Reduction"
            showChart={true}
            showTable={true}
            tableRows={8}
          />
        );
      case TabId.LOCATION_HEATMAP:
        return (
          <GenericTabSkeleton
            title="Location Heatmap"
            showChart={true}
            chartHeight={600}
            showTable={false}
          />
        );
      case TabId.RAW_EVENTS:
        return <GenericTabSkeleton title="Events" showTable={true} tableRows={20} />;
      case TabId.TARGET_EVENTS:
        return <GenericTabSkeleton title="Target Events" showTable={true} tableRows={15} />;
      case TabId.DIAGNOSTICS:
        return <GenericTabSkeleton title="Diagnostics" showTable={false} />;
      case TabId.ACTORS:
        return <GenericTabSkeleton title="Actors" showTable={true} tableRows={8} />;
      case TabId.TALENTS:
        return <GenericTabSkeleton title="Talents Grid" showTable={false} />;
      case TabId.ROTATION_ANALYSIS:
        return (
          <GenericTabSkeleton
            title="Rotation Analysis"
            showChart={true}
            chartHeight={500}
            showTable={false}
          />
        );
      case TabId.AURAS_OVERVIEW:
        return <GenericTabSkeleton title="Auras" showTable={true} tableRows={15} />;
      case TabId.BUFFS_OVERVIEW:
        return <GenericTabSkeleton title="Buffs Overview" showChart={true} showTable={true} />;
      case TabId.DEBUFFS_OVERVIEW:
        return <GenericTabSkeleton title="Debuffs Overview" showTable={true} tableRows={15} />;
      default:
        return <GenericTabSkeleton title="Loading..." />;
    }
  };

  return getContentSkeleton();
};
