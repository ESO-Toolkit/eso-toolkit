import React from 'react';

import { GenericTabSkeleton } from '../components/GenericTabSkeleton';
import { InsightsSkeletonLayout } from '../components/InsightsSkeletonLayout';

export const getSkeletonForTab = (
  tabId: number,
  includeHeaderAndTabs = false,
): React.ReactElement => {
  const getContentSkeleton = (): React.ReactElement => {
    switch (tabId) {
      case 0: // Insights
        return (
          <InsightsSkeletonLayout
            showHeader={includeHeaderAndTabs}
            showTabs={includeHeaderAndTabs}
          />
        );
      case 1: // Players
        return <GenericTabSkeleton title="Players" showTable={true} tableRows={6} />;
      case 2: // Damage Done
        return (
          <GenericTabSkeleton
            title="Damage Done"
            showChart={true}
            chartHeight={400}
            showTable={true}
            tableRows={10}
          />
        );
      case 3: // Healing Done
        return (
          <GenericTabSkeleton
            title="Healing Done"
            showChart={true}
            chartHeight={400}
            showTable={true}
            tableRows={8}
          />
        );
      case 4: // Critical Damage
        return <GenericTabSkeleton title="Critical Damage" showTable={true} tableRows={12} />;
      case 5: // Death Events
        return <GenericTabSkeleton title="Death Events" showTable={true} tableRows={5} />;
      case 6: // Damage Reduction
        return (
          <GenericTabSkeleton
            title="Damage Reduction"
            showChart={true}
            showTable={true}
            tableRows={8}
          />
        );
      case 7: // Penetration
        return <GenericTabSkeleton title="Penetration" showTable={true} tableRows={6} />;
      default:
        // Experimental tabs
        if (tabId === 8)
          return <GenericTabSkeleton title="Actors" showTable={true} tableRows={8} />;
        if (tabId === 9) return <GenericTabSkeleton title="Talents Grid" showTable={false} />;
        if (tabId === 10)
          return <GenericTabSkeleton title="Auras" showTable={true} tableRows={15} />;
        if (tabId === 11)
          return <GenericTabSkeleton title="Buffs Overview" showChart={true} showTable={true} />;
        if (tabId === 12)
          return (
            <GenericTabSkeleton
              title="Rotation Analysis"
              showChart={true}
              chartHeight={500}
              showTable={false}
            />
          );
        if (tabId === 13)
          return <GenericTabSkeleton title="Events" showTable={true} tableRows={20} />;
        if (tabId === 14) return <GenericTabSkeleton title="Diagnostics" showTable={false} />;
        if (tabId === 15)
          return <GenericTabSkeleton title="Target Events" showTable={true} tableRows={15} />;
        if (tabId === 16)
          return (
            <GenericTabSkeleton
              title="Location Heatmap"
              showChart={true}
              chartHeight={600}
              showTable={false}
            />
          );
        if (tabId === 17)
          return <GenericTabSkeleton title="Debuffs Overview" showTable={true} tableRows={15} />;
        return <GenericTabSkeleton title="Loading..." />;
    }
  };

  return getContentSkeleton();
};
