import { Box } from '@mui/material';
import React from 'react';

import { CriticalDamageSkeleton } from '../components/CriticalDamageSkeleton';
import { DamageDoneTableSkeleton } from '../components/DamageDoneTableSkeleton';
import { DamageReductionSkeleton } from '../components/DamageReductionSkeleton';
import { GenericTabSkeleton } from '../components/GenericTabSkeleton';
import { HealingDoneTableSkeleton } from '../components/HealingDoneTableSkeleton';
import { InsightsSkeletonLayout } from '../components/InsightsSkeletonLayout';
import { PenetrationSkeleton } from '../components/PenetrationSkeleton';
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
  DASHBOARD = 'dashboard',
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
        return (
          <Box mt={2}>
            {/* Header with summary skeleton */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 140,
                  height: 28,
                  backgroundColor: 'rgba(0, 0, 0, 0.11)',
                  borderRadius: 1,
                }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Box
                  sx={{
                    width: 120,
                    height: 24,
                    backgroundColor: 'rgba(0, 0, 0, 0.11)',
                    borderRadius: '12px',
                  }}
                />
                <Box
                  sx={{
                    width: 100,
                    height: 24,
                    backgroundColor: 'rgba(0, 0, 0, 0.11)',
                    borderRadius: '12px',
                  }}
                />
              </Box>
            </Box>

            {/* Death summary skeleton */}
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  width: 120,
                  height: 20,
                  backgroundColor: 'rgba(0, 0, 0, 0.11)',
                  borderRadius: 1,
                  mb: 1,
                }}
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 80 + i * 10,
                      height: 24,
                      backgroundColor: 'rgba(0, 0, 0, 0.11)',
                      borderRadius: '12px',
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Skills summary skeleton */}
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  width: 180,
                  height: 20,
                  backgroundColor: 'rgba(0, 0, 0, 0.11)',
                  borderRadius: 1,
                  mb: 1,
                }}
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 90 + i * 15,
                      height: 24,
                      backgroundColor: 'rgba(0, 0, 0, 0.11)',
                      borderRadius: '12px',
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Death events grid skeleton */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(1, 1fr)',
                  md: 'repeat(2, 1fr)',
                  lg: 'repeat(3, 1fr)',
                },
                gap: 2,
              }}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    borderRadius: '16px',
                    background: 'rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    p: 2,
                    minHeight: 200,
                  }}
                >
                  {/* Player header skeleton */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: 'rgba(0, 0, 0, 0.11)',
                        borderRadius: '50%',
                      }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Box
                        sx={{
                          width: '70%',
                          height: 20,
                          backgroundColor: 'rgba(0, 0, 0, 0.11)',
                          borderRadius: 1,
                          mb: 0.5,
                        }}
                      />
                      <Box
                        sx={{
                          width: '50%',
                          height: 16,
                          backgroundColor: 'rgba(0, 0, 0, 0.11)',
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Status sections skeleton */}
                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: '40%',
                        height: 16,
                        backgroundColor: 'rgba(0, 0, 0, 0.11)',
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    />
                    <Box
                      sx={{
                        width: '80%',
                        height: 32,
                        backgroundColor: 'rgba(0, 0, 0, 0.11)',
                        borderRadius: '16px',
                        mb: 1,
                      }}
                    />
                    <Box
                      sx={{
                        width: '50%',
                        height: 16,
                        backgroundColor: 'rgba(0, 0, 0, 0.11)',
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    />
                    <Box
                      sx={{
                        width: '60%',
                        height: 32,
                        backgroundColor: 'rgba(0, 0, 0, 0.11)',
                        borderRadius: '16px',
                      }}
                    />
                  </Box>

                  {/* Killing blow skeleton */}
                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: '40%',
                        height: 16,
                        backgroundColor: 'rgba(0, 0, 0, 0.11)',
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    />
                    <Box
                      sx={{
                        width: '90%',
                        height: 48,
                        backgroundColor: 'rgba(0, 0, 0, 0.11)',
                        borderRadius: '16px',
                      }}
                    />
                  </Box>

                  {/* Recent attacks skeleton */}
                  <Box>
                    <Box
                      sx={{
                        width: '45%',
                        height: 16,
                        backgroundColor: 'rgba(0, 0, 0, 0.11)',
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    />
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Box
                        key={j}
                        sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}
                      >
                        <Box
                          sx={{
                            width: '70%',
                            height: 14,
                            backgroundColor: 'rgba(0, 0, 0, 0.11)',
                            borderRadius: 1,
                          }}
                        />
                        <Box
                          sx={{
                            width: '20%',
                            height: 14,
                            backgroundColor: 'rgba(0, 0, 0, 0.11)',
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        );
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
