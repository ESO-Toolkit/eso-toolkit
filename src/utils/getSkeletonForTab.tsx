import { Box } from '@mui/material';
import React from 'react';

import { DeathEventPanelSkeleton } from '../components/DeathEventPanelSkeleton';
import { CriticalDamageSkeleton } from '../components/CriticalDamageSkeleton';
import { DamageDoneTableSkeleton } from '../components/DamageDoneTableSkeleton';
import { DamageReductionSkeleton } from '../components/DamageReductionSkeleton';
import { DataGridPanelSkeleton } from '../components/DataGridPanelSkeleton';
import { GenericTabSkeleton } from '../components/GenericTabSkeleton';
import { HealingDoneTableSkeleton } from '../components/HealingDoneTableSkeleton';
import { InsightsSkeletonLayout } from '../components/InsightsSkeletonLayout';
import { PenetrationSkeleton } from '../components/PenetrationSkeleton';
import { PlayersSkeleton } from '../components/PlayersSkeleton';
import { RotationAnalysisSkeleton } from '../components/RotationAnalysisSkeleton';
import { SynergyPanelSkeleton } from '../components/SynergyPanelSkeleton';

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
  SYNERGIES = 'synergies',
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
  MAPS = 'maps',
}

// Shared header skeleton for FightDetailsView
const HeaderSkeleton: React.FC = () => (
  <>
    {/* Target Selection and Navigation Row Skeleton - from FightDetailsView */}
    <Box
      sx={{
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        gap: { xs: 2, md: 0 },
      }}
    >
      {/* Target Selector */}
      <Box
        sx={{ minWidth: { xs: '100%', sm: 180, md: 200 }, maxWidth: { xs: '100%', md: 'none' } }}
      >
        <Box
          sx={{
            width: '100%',
            height: 56,
            maxWidth: { xs: '100%', sm: 180, md: 200 },
            minWidth: { xs: '100%', sm: 180, md: 200 },
            backgroundColor: 'rgba(0, 0, 0, 0.11)',
            borderRadius: 1,
          }}
        />
      </Box>

      {/* Fight Navigation */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          borderRadius: { xs: '10px', md: '12px' },
          border: '1px solid rgba(0, 0, 0, 0.08)',
          p: { xs: 0.5, md: 0.75 },
          gap: { xs: 0.25, md: 0.5 },
          width: { xs: '100%', md: 'auto' },
          justifyContent: { xs: 'center', md: 'flex-start' },
        }}
      >
        {/* Previous Button */}
        <Box
          sx={{ width: 28, height: 28, backgroundColor: 'rgba(0, 0, 0, 0.11)', borderRadius: 1 }}
        />

        {/* Mode Toggle */}
        <Box
          sx={{ width: 120, height: 28, backgroundColor: 'rgba(0, 0, 0, 0.11)', borderRadius: 1 }}
        />

        {/* Counter */}
        <Box
          sx={{ width: 48, height: 28, backgroundColor: 'rgba(0, 0, 0, 0.11)', borderRadius: 1 }}
        />

        {/* Next Button */}
        <Box
          sx={{ width: 28, height: 28, backgroundColor: 'rgba(0, 0, 0, 0.11)', borderRadius: 1 }}
        />
      </Box>
    </Box>
  </>
);

// Shared tabs skeleton
const TabsSkeleton: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      mb: 1,
      width: '100%',
      gap: 1,
      overflowX: 'auto',
    }}
  >
    <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            flexShrink: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.11)',
          }}
        />
      ))}
    </Box>
    <Box sx={{ width: 80, height: 32, backgroundColor: 'rgba(0, 0, 0, 0.11)', borderRadius: 1 }} />
  </Box>
);

export const getSkeletonForTab = (
  tabId: TabId | undefined,
  includeHeaderAndTabs = false,
  showMinimalSkeleton = false,
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
        return <PlayersSkeleton />;
      case TabId.DAMAGE_DONE:
        return <DamageDoneTableSkeleton rowCount={10} />;
      case TabId.HEALING_DONE:
        return <HealingDoneTableSkeleton rowCount={8} />;
      case TabId.DEATHS:
        return <DeathEventPanelSkeleton />;
      case TabId.CRITICAL_DAMAGE:
        return showMinimalSkeleton ? (
          <CriticalDamageSkeleton playerCount={3} />
        ) : (
          <CriticalDamageSkeleton />
        );
      case TabId.PENETRATION:
        return showMinimalSkeleton ? (
          <PenetrationSkeleton playerCount={3} />
        ) : (
          <PenetrationSkeleton />
        );
      case TabId.DAMAGE_REDUCTION:
        return showMinimalSkeleton ? (
          <DamageReductionSkeleton playerCount={3} />
        ) : (
          <DamageReductionSkeleton />
        );
      case TabId.SYNERGIES:
        return <SynergyPanelSkeleton />;
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
        return (
          <DataGridPanelSkeleton
            columns={6}
            rows={10}
            showDescription={true}
            data-testid="talents-skeleton"
          />
        );
      case TabId.ROTATION_ANALYSIS:
        return <RotationAnalysisSkeleton />;
      case TabId.AURAS_OVERVIEW:
        return (
          <DataGridPanelSkeleton
            columns={6}
            rows={10}
            showBetaChip={true}
            showDescription={true}
            data-testid="auras-skeleton"
          />
        );
      case TabId.BUFFS_OVERVIEW:
        return (
          <DataGridPanelSkeleton
            columns={4}
            rows={10}
            showDescription={true}
            data-testid="buffs-skeleton"
          />
        );
      case TabId.DEBUFFS_OVERVIEW:
        return (
          <DataGridPanelSkeleton
            columns={5}
            rows={10}
            showFilter={true}
            showDescription={true}
            data-testid="debuffs-skeleton"
          />
        );
      case TabId.MAPS:
        return <GenericTabSkeleton title="Maps" showTable={false} />;
      default:
        return <GenericTabSkeleton title="Loading..." />;
    }
  };

  const contentSkeleton = getContentSkeleton();

  // Wrap with header and tabs skeleton for all tabs except Insights
  // (which handles its own header/tabs)
  if (includeHeaderAndTabs && tabId !== TabId.INSIGHTS) {
    return (
      <Box sx={{ minHeight: '400px' }}>
        <HeaderSkeleton />
        <TabsSkeleton />
        {contentSkeleton}
      </Box>
    );
  }

  return contentSkeleton;
};
