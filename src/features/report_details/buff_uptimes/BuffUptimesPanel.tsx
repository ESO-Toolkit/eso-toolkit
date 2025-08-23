import React from 'react';
import { useSelector } from 'react-redux';

import { ReportActorFragment, ReportAbilityFragment } from '../../../graphql/generated';
import { selectBuffUptimesData } from '../../../store/crossSliceSelectors';
import { RootState } from '../../../store/storeWithHistory';
import { LogEvent, BuffEvent } from '../../../types/combatlogEvents';

import BuffUptimesPanelView from './BuffUptimesPanelView';

interface BuffUptimesPanelProps {
  fight: { startTime?: number; endTime?: number };
}

// Pre-calculate player IDs lookup for O(1) access
const createPlayerIdsSet = (actorsById: Record<string | number, ReportActorFragment | null>) => {
  const playerIds = new Set<string>();
  Object.values(actorsById).forEach((actor) => {
    if (actor && actor.type === 'Player') {
      playerIds.add(String(actor.id));
    }
  });
  return playerIds;
};

// Pre-filter buff events to avoid filtering during computation
const filterBuffEvents = (
  events: LogEvent[],
  abilitiesById: Record<string | number, ReportAbilityFragment | null>
) => {
  return events.filter((event): event is BuffEvent => {
    if (event.type !== 'applybuff' && event.type !== 'removebuff') {
      return false;
    }
    const buffEvent = event as BuffEvent;
    const abilityGameID = buffEvent.abilityGameID || buffEvent.abilityId || 'unknown';
    const ability = abilitiesById[abilityGameID];
    return !!(ability && ability.type === '2'); // Only buff type abilities
  });
};

/**
 * Smart component that handles data processing and state management for buff uptimes panel
 * Performance improvements:
 * - Uses single optimized selector instead of 4 separate useSelector calls
 * - Pre-filters events to buff events only
 * - Uses Set for O(1) player ID lookups
 * - Separates target name resolution from heavy computation
 * - More efficient interval merging algorithm
 * - Fallback to all events if dedicated buff events are not available
 */
const BuffUptimesPanel: React.FC<BuffUptimesPanelProps> = ({ fight }) => {
  // OPTIMIZED: Single selector instead of multiple useSelector calls
  const { buffEvents, players, characters, masterData } = useSelector(selectBuffUptimesData);

  // Fallback: Use all events if buffEvents is empty (for compatibility)
  const allEvents = useSelector((state: RootState) => state.events.events);
  const eventsToProcess = buffEvents.length > 0 ? buffEvents : allEvents;

  const [expandedBuff, setExpandedBuff] = React.useState<string | null>(null);

  const handleToggleExpand = React.useCallback((abilityId: string) => {
    setExpandedBuff((prev) => (prev === abilityId ? null : abilityId));
  }, []);

  // OPTIMIZED: Pre-calculate player IDs as a Set for O(1) lookup
  const playerIdsSet = React.useMemo(() => {
    return createPlayerIdsSet(masterData.actorsById);
  }, [masterData.actorsById]);

  // OPTIMIZED: Pre-filter buff events to avoid filtering during computation
  const relevantBuffEvents = React.useMemo(() => {
    return filterBuffEvents(eventsToProcess, masterData.abilitiesById);
  }, [eventsToProcess, masterData.abilitiesById]);

  // OPTIMIZED: Memoized calculation of buff uptimes and details
  const { buffUptimes, buffDetails } = React.useMemo(() => {
    const buffUptimes: Record<string, number> = {};
    const buffDetails: Record<string, Record<string, Array<{ start: number; end: number }>>> = {};

    if (relevantBuffEvents.length === 0 || !fight?.startTime || !fight?.endTime) {
      return { buffUptimes, buffDetails };
    }

    const fightStart = Number(fight.startTime);
    const fightEnd = Number(fight.endTime);
    const fightDuration = fightEnd - fightStart;
    const activeBuffs: Record<string, Record<string, number>> = {};

    // OPTIMIZED: Process only pre-filtered buff events
    relevantBuffEvents.forEach((event) => {
      const abilityGameID = event.abilityGameID || event.abilityId || 'unknown';
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

    // Close any buffs still active at fight end
    Object.keys(activeBuffs).forEach((abilityGameID) => {
      Object.keys(activeBuffs[abilityGameID]).forEach((targetId) => {
        const start = activeBuffs[abilityGameID][targetId];
        buffDetails[abilityGameID][targetId].push({ start, end: fightEnd });
      });
    });

    // OPTIMIZED: Calculate uptime percentages using Set for O(1) player lookups
    Object.keys(buffDetails).forEach((abilityGameID) => {
      let totalBuffTime = 0;
      Object.entries(buffDetails[abilityGameID]).forEach(([targetId, intervals]) => {
        if (playerIdsSet.has(targetId)) {
          totalBuffTime += intervals.reduce(
            (sum, interval) => sum + (interval.end - interval.start),
            0
          );
        }
      });

      const denominator = playerIdsSet.size * fightDuration;
      const uptimePercent = denominator > 0 ? (totalBuffTime / denominator) * 100 : 0;
      buffUptimes[abilityGameID] = uptimePercent;
    });

    return { buffUptimes, buffDetails };
  }, [relevantBuffEvents, fight, playerIdsSet]);

  // OPTIMIZED: Create a lookup for target names to avoid repeated lookups
  const targetNamesCache = React.useMemo(() => {
    const cache: Record<string, string> = {};

    // Pre-populate with players
    Object.values(players).forEach((player) => {
      const targetId = String(player.id);
      const playerName = player.name;
      const displayName = player.displayName;
      cache[targetId] = displayName ? `${playerName} (${displayName})` : playerName;
    });

    // Add characters as fallback
    Object.values(characters).forEach((character) => {
      const targetId = String(character.id);
      if (!cache[targetId]) {
        const charName = character.name;
        const displayName = character.displayName;
        cache[targetId] = displayName ? `${charName} (${displayName})` : charName;
      }
    });

    return cache;
  }, [players, characters]);

  // OPTIMIZED: Process data for the view component with cached name lookups
  const buffs = React.useMemo(() => {
    return Object.keys(buffUptimes)
      .sort((a, b) => buffUptimes[b] - buffUptimes[a])
      .map((abilityGameID) => {
        const ability = masterData.abilitiesById[abilityGameID];
        const intervalsByTarget = buffDetails[abilityGameID] || {};

        // OPTIMIZED: More efficient interval merging using sorted approach
        const allIntervals: Array<{ start: number; end: number }> = [];
        Object.values(intervalsByTarget).forEach((intervals) => {
          allIntervals.push(...intervals);
        });

        if (allIntervals.length === 0) {
          return {
            abilityGameID,
            name: ability?.name || `Buff ${abilityGameID}`,
            icon: ability?.icon ? String(ability.icon) : undefined,
            totalUptimePercent: 0,
            avgTargetUptime: 0,
            targets: [],
          };
        }

        // Sort once and merge efficiently
        allIntervals.sort((a, b) => a.start - b.start);
        const merged: Array<{ start: number; end: number }> = [allIntervals[0]];

        for (let i = 1; i < allIntervals.length; i++) {
          const current = allIntervals[i];
          const lastMerged = merged[merged.length - 1];

          if (lastMerged.end >= current.start) {
            lastMerged.end = Math.max(lastMerged.end, current.end);
          } else {
            merged.push(current);
          }
        }

        const fightStart = Number(fight?.startTime ?? 0);
        const fightEnd = Number(fight?.endTime ?? 1);
        const fightDuration = fightEnd - fightStart;

        const totalBuffTime = merged.reduce(
          (sum, interval) => sum + (interval.end - interval.start),
          0
        );
        const totalUptimePercent = fightDuration > 0 ? (totalBuffTime / fightDuration) * 100 : 0;

        // Calculate average uptime per target
        const targetUptimes: number[] = Object.values(intervalsByTarget).map((intervals) => {
          const targetBuffTime = intervals.reduce(
            (sum, interval) => sum + (interval.end - interval.start),
            0
          );
          return fightDuration > 0 ? (targetBuffTime / fightDuration) * 100 : 0;
        });

        const avgTargetUptime =
          targetUptimes.length > 0
            ? targetUptimes.reduce((a, b) => a + b, 0) / targetUptimes.length
            : 0;

        // OPTIMIZED: Process target details with cached name lookups
        const targets = Object.entries(intervalsByTarget)
          .filter(([targetId]) => playerIdsSet.has(targetId))
          .map(([targetId, intervals]) => {
            const totalBuffTime = intervals.reduce(
              (sum, interval) => sum + (interval.end - interval.start),
              0
            );
            const uptimePercent = fightDuration > 0 ? (totalBuffTime / fightDuration) * 100 : 0;

            // Use cached target name or fallback
            const targetName = targetNamesCache[targetId] || `Target: ${targetId}`;

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
  }, [buffUptimes, buffDetails, masterData.abilitiesById, playerIdsSet, fight, targetNamesCache]);

  return (
    <BuffUptimesPanelView
      buffs={buffs}
      expandedBuff={expandedBuff}
      onToggleExpand={handleToggleExpand}
    />
  );
};

export default BuffUptimesPanel;
