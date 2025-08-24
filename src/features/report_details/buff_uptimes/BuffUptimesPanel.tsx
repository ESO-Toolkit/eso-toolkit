import { Box, CircularProgress, Typography } from '@mui/material';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { useBuffEvents, useReportMasterData } from '../../../hooks';
import { selectPlayersById } from '../../../store/player_data';

import BuffUptimesPanelView from './BuffUptimesPanelView';

interface BuffUptimesPanelProps {
  fight: FightFragment;
  reportCode?: string;
}

/**
 * Smart component that handles data processing and state management for buff uptimes panel
 */
const BuffUptimesPanel: React.FC<BuffUptimesPanelProps> = ({ fight, reportCode }) => {
  // Use the new hooks for data fetching
  const { buffEvents, isBuffEventsLoading } = useBuffEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const playersById = useSelector(selectPlayersById);

  // Compute combined loading state
  const isLoading = isBuffEventsLoading || isMasterDataLoading;

  // IMPORTANT: All hooks must be called before any early returns

  const [expandedBuff, setExpandedBuff] = React.useState<string | null>(null);

  const handleToggleExpand = React.useCallback((abilityId: string) => {
    setExpandedBuff((prev) => (prev === abilityId ? null : abilityId));
  }, []);

  // Memoized calculation of buff uptimes and details
  const { buffUptimes, buffDetails } = useMemo(() => {
    const buffUptimes: Record<string, number> = {};
    const buffDetails: Record<string, Record<string, Array<{ start: number; end: number }>>> = {};

    if (
      buffEvents &&
      buffEvents.length > 0 &&
      fight &&
      fight.startTime != null &&
      fight.endTime != null
    ) {
      const fightStart = Number(fight.startTime);
      const fightEnd = Number(fight.endTime);
      const fightDuration = fightEnd - fightStart;
      const activeBuffs: Record<string, Record<string, number>> = {};

      buffEvents.forEach((event) => {
        // OPTIMIZED: No need to filter for buff types since buffEvents is already filtered
        // Cast to BuffEvent for property access
        const buffEvent = event as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        const abilityGameID = buffEvent.abilityGameID || buffEvent.abilityId || 'unknown';
        const ability = reportMasterData.abilitiesById[buffEvent.abilityGameID || ''];
        // Not a buff
        if (ability.type !== '2') {
          return;
        }
        const targetId = String(buffEvent.targetID ?? buffEvent.target ?? 'unknown');
        if (!activeBuffs[abilityGameID]) activeBuffs[abilityGameID] = {};
        if (!buffDetails[abilityGameID]) buffDetails[abilityGameID] = {};
        if (!buffDetails[abilityGameID][targetId]) buffDetails[abilityGameID][targetId] = [];
        if (event.type === 'applybuff') {
          activeBuffs[abilityGameID][targetId] = Number(event.timestamp);
        } else if (event.type === 'removebuff' && activeBuffs[abilityGameID][targetId] != null) {
          const start = activeBuffs[abilityGameID][targetId];
          const end = Number(event.timestamp);
          buffDetails[abilityGameID][targetId].push({ start, end });
          delete activeBuffs[abilityGameID][targetId];
        }
      });
      // If any buffs are still active at fight end, close them
      Object.keys(activeBuffs).forEach((abilityGameID) => {
        Object.keys(activeBuffs[abilityGameID]).forEach((targetId) => {
          const start = activeBuffs[abilityGameID][targetId];
          const end = fightEnd;
          buffDetails[abilityGameID][targetId].push({ start, end });
        });
      });
      // Calculate uptime percentages using only Player actors
      Object.keys(buffDetails).forEach((abilityGameID) => {
        let totalBuffTime = 0;
        Object.entries(buffDetails[abilityGameID]).forEach(([targetId, intervals]) => {
          if (fight.friendlyPlayers?.includes(Number(targetId))) {
            totalBuffTime += intervals.reduce(
              (sum, interval) => sum + (interval.end - interval.start),
              0
            );
          }
        });
        // Each player should have fightDuration worth of buff for 100%
        const denominator = (fight.friendlyPlayers?.length || 0) * fightDuration;
        const uptimePercent = denominator > 0 ? (totalBuffTime / denominator) * 100 : 0;
        buffUptimes[abilityGameID] = uptimePercent;
      });
    }
    return { buffUptimes, buffDetails };
  }, [buffEvents, fight, reportMasterData.abilitiesById]);

  // Process data for the view component
  const buffs = React.useMemo(() => {
    return Object.keys(buffUptimes)
      .sort((a, b) => buffUptimes[b] - buffUptimes[a])
      .map((abilityGameID) => {
        const ability = reportMasterData.abilitiesById[abilityGameID];
        // Calculate total time when ANY target had the buff
        const intervalsByTarget = buffDetails[abilityGameID] || {};
        const allIntervals: Array<{ start: number; end: number }> = [];
        Object.values(intervalsByTarget).forEach((intervals) => {
          allIntervals.push(...intervals);
        });
        // Merge overlapping intervals
        allIntervals.sort((a, b) => a.start - b.start);
        const merged: Array<{ start: number; end: number }> = [];
        for (const interval of allIntervals) {
          if (!merged.length || merged[merged.length - 1].end < interval.start) {
            merged.push({ ...interval });
          } else {
            merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, interval.end);
          }
        }
        const fightStart = Number(fight?.startTime ?? 0);
        const fightEnd = Number(fight?.endTime ?? 1);
        const totalBuffTime = merged.reduce(
          (sum, interval) => sum + (interval.end - interval.start),
          0
        );
        const totalUptimePercent =
          fightEnd - fightStart > 0 ? (totalBuffTime / (fightEnd - fightStart)) * 100 : 0;

        // Calculate average uptime per target
        const targetUptimes: number[] = Object.values(intervalsByTarget).map((intervals) => {
          const targetBuffTime = intervals.reduce(
            (sum, interval) => sum + (interval.end - interval.start),
            0
          );
          return fightEnd - fightStart > 0 ? (targetBuffTime / (fightEnd - fightStart)) * 100 : 0;
        });
        const avgTargetUptime =
          targetUptimes.length > 0
            ? targetUptimes.reduce((a, b) => a + b, 0) / targetUptimes.length
            : 0;

        // Process target details
        const targets = Object.entries(buffDetails[abilityGameID] || {})
          .filter(([targetId]) => fight.friendlyPlayers?.includes(Number(targetId)))
          .map(([targetId, intervals]) => {
            const totalBuffTime = intervals.reduce(
              (sum, interval) => sum + (interval.end - interval.start),
              0
            );
            const uptimePercent =
              fightEnd - fightStart > 0 ? (totalBuffTime / (fightEnd - fightStart)) * 100 : 0;
            let targetName = `Target: ${targetId}`;
            // Try to resolve player name/displayName from Redux state
            if (playersById[targetId]) {
              const playerName = playersById[targetId].name;
              const displayName = playersById[targetId].displayName;
              targetName = displayName ? `${playerName} (${displayName})` : `${playerName}`;
            }
            return {
              targetId,
              targetName,
              uptimePercent,
            };
          });

        return {
          abilityGameID,
          name: ability?.name || `Buff ${abilityGameID}`,
          icon: ability?.icon ? String(ability.icon) : undefined,
          totalUptimePercent,
          avgTargetUptime,
          targets,
        };
      });
  }, [buffUptimes, buffDetails, reportMasterData.abilitiesById, fight, playersById]);

  // Show loading spinner while data is being fetched
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
        }}
      >
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h6">Loading buff data...</Typography>
      </Box>
    );
  }

  return (
    <BuffUptimesPanelView
      buffs={buffs}
      expandedBuff={expandedBuff}
      onToggleExpand={handleToggleExpand}
    />
  );
};

export default BuffUptimesPanel;
