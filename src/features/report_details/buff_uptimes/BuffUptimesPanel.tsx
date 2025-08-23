import React from 'react';
import { useSelector } from 'react-redux';

import { ReportActorFragment } from '../../../graphql/generated';
import { RootState } from '../../../store/storeWithHistory';

import BuffUptimesPanelView from './BuffUptimesPanelView';

interface BuffUptimesPanelProps {
  fight: { startTime?: number; endTime?: number };
}

/**
 * Smart component that handles data processing and state management for buff uptimes panel
 */
const BuffUptimesPanel: React.FC<BuffUptimesPanelProps> = ({ fight }) => {
  const events = useSelector((state: RootState) => state.events.events);
  const characters = useSelector((state: RootState) => state.events.characters);
  const players = useSelector((state: RootState) => state.events.players);
  const masterData = useSelector((state: RootState) => state.masterData);

  // Get all Player actors from masterData
  const playerActorIds = React.useMemo(() => {
    return Object.values(masterData.actorsById)
      .filter((actor): actor is ReportActorFragment => actor && actor.type === 'Player')
      .map((actor) => String(actor.id));
  }, [masterData.actorsById]);

  const [expandedBuff, setExpandedBuff] = React.useState<string | null>(null);

  const handleToggleExpand = React.useCallback((abilityId: string) => {
    setExpandedBuff((prev) => (prev === abilityId ? null : abilityId));
  }, []);

  // Memoized calculation of buff uptimes and details
  const { buffUptimes, buffDetails } = React.useMemo(() => {
    const buffUptimes: Record<string, number> = {};
    const buffDetails: Record<string, Record<string, Array<{ start: number; end: number }>>> = {};
    if (events && events.length > 0 && fight && fight.startTime != null && fight.endTime != null) {
      const fightStart = Number(fight.startTime);
      const fightEnd = Number(fight.endTime);
      const fightDuration = fightEnd - fightStart;
      const activeBuffs: Record<string, Record<string, number>> = {};

      events.forEach((event) => {
        if (event.type !== 'applybuff' && event.type !== 'removebuff') {
          return;
        }

        const abilityGameID = event.abilityGameID || event.abilityId || 'unknown';
        const ability = masterData.abilitiesById[event.abilityGameID || ''];
        // Not a buff
        if (ability.type !== '2') {
          return;
        }
        const targetId = String(event.targetID ?? event.target ?? 'unknown');
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
          if (playerActorIds.includes(targetId)) {
            totalBuffTime += intervals.reduce(
              (sum, interval) => sum + (interval.end - interval.start),
              0
            );
          }
        });
        // Each player should have fightDuration worth of buff for 100%
        const denominator = playerActorIds.length * fightDuration;
        const uptimePercent = denominator > 0 ? (totalBuffTime / denominator) * 100 : 0;
        buffUptimes[abilityGameID] = uptimePercent;
      });
    }
    return { buffUptimes, buffDetails };
  }, [events, fight, masterData.abilitiesById, playerActorIds]);

  // Process data for the view component
  const buffs = React.useMemo(() => {
    return Object.keys(buffUptimes)
      .sort((a, b) => buffUptimes[b] - buffUptimes[a])
      .map((abilityGameID) => {
        const ability = masterData.abilitiesById[abilityGameID];
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
          .filter(([targetId]) => playerActorIds.includes(targetId))
          .map(([targetId, intervals]) => {
            const totalBuffTime = intervals.reduce(
              (sum, interval) => sum + (interval.end - interval.start),
              0
            );
            const uptimePercent =
              fightEnd - fightStart > 0 ? (totalBuffTime / (fightEnd - fightStart)) * 100 : 0;
            let targetName = `Target: ${targetId}`;
            // Try to resolve player name/displayName from Redux state
            if (players[targetId]) {
              const playerName = players[targetId].name;
              const displayName = players[targetId].displayName;
              targetName = displayName ? `${playerName} (${displayName})` : `${playerName}`;
            } else {
              // fallback to character lookup if available
              const charId = Number(targetId);
              if (characters[charId]) {
                const charName = characters[charId].name;
                const displayName = characters[charId].displayName;
                targetName = displayName ? `${charName} (${displayName})` : `${charName}`;
              }
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
  }, [
    buffUptimes,
    buffDetails,
    masterData.abilitiesById,
    playerActorIds,
    fight,
    players,
    characters,
  ]);

  return (
    <BuffUptimesPanelView
      buffs={buffs}
      expandedBuff={expandedBuff}
      onToggleExpand={handleToggleExpand}
    />
  );
};

export default BuffUptimesPanel;
