import { Box, Typography } from '@mui/material';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { useSelectedFight } from '@/hooks/useSelectedFight';

import { DamageDoneTableSkeleton } from '../../../components/DamageDoneTableSkeleton';
import {
  useDamageEventsLookup,
  useReportMasterData,
  usePlayerData,
  useSelectedTargetIds,
  useDeathEvents,
  useCastEvents,
  useDamageOverTimeTask,
} from '../../../hooks';
import { selectActorsById } from '../../../store/master_data/masterDataSelectors';
import { KnownAbilities } from '../../../types/abilities';
import { calculateActivePercentages } from '../../../utils/activePercentageUtils';
import { resolveActorName } from '../../../utils/resolveActorName';
import type { DamageOverTimeResult } from '../../../workers/calculations/CalculateDamageOverTime';

import { DamageDonePanelView } from './DamageDonePanelView';

/**
 * Smart component that handles data processing and state management for damage done panel
 */
export const DamageDonePanel: React.FC = () => {
  // Use hooks to get data
  const { damageEventsByPlayer, isDamageEventsLookupLoading } = useDamageEventsLookup();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { deathEvents, isDeathEventsLoading } = useDeathEvents();
  const { castEvents, isCastEventsLoading } = useCastEvents();
  const fight = useSelectedFight();
  const selectedTargetIds = useSelectedTargetIds();
  const actorsById = useSelector(selectActorsById);

  // Get damage over time data
  const { damageOverTimeData, isDamageOverTimeLoading } = useDamageOverTimeTask();

  // Resolve selected target names for display
  const selectedTargetNames = useMemo(() => {
    if (selectedTargetIds.size === 0) return null;

    const names = Array.from(selectedTargetIds).map((targetId) => {
      const actor = actorsById[targetId];
      return resolveActorName(actor, targetId);
    });

    return names;
  }, [selectedTargetIds, actorsById]);

  // Prepare available targets for the chart
  const availableTargets = useMemo(() => {
    if (!fight || !actorsById) return [];

    const targets: Array<{ id: number; name: string }> = [];

    // Add enemy players
    if (fight.enemyPlayers) {
      fight.enemyPlayers.forEach((playerId) => {
        if (typeof playerId === 'number') {
          const actor = actorsById[playerId];
          targets.push({
            id: playerId,
            name: resolveActorName(actor, playerId),
          });
        }
      });
    }

    // Add NPCs
    if (fight.enemyNPCs) {
      fight.enemyNPCs.forEach((npcId) => {
        if (typeof npcId === 'number') {
          const actor = actorsById[npcId];
          targets.push({
            id: npcId,
            name: resolveActorName(actor, npcId),
          });
        }
      });
    }

    return targets;
  }, [fight, actorsById]);

  // Extract data from hooks with memoization
  const masterData = useMemo(
    () => reportMasterData || { actorsById: {}, abilitiesById: {} },
    [reportMasterData],
  );

  // Compute loading and error states
  const isLoading = useMemo(() => {
    return (
      isDamageEventsLookupLoading ||
      isMasterDataLoading ||
      isPlayerDataLoading ||
      isDeathEventsLoading ||
      isCastEventsLoading
    );
  }, [
    isDamageEventsLookupLoading,
    isMasterDataLoading,
    isPlayerDataLoading,
    isDeathEventsLoading,
    isCastEventsLoading,
  ]);

  const isDataReady = useMemo(() => {
    return !isLoading;
  }, [isLoading]);

  // Memoize damage calculations to prevent unnecessary recalculations
  const damageStatistics = useMemo(() => {
    const damageByPlayer: Record<number, number> = {};
    const criticalDamageByPlayer: Record<number, number> = {};
    const damageEventsBySource: Record<number, number> = {};

    // Convert string keys to numbers and calculate totals
    Object.entries(damageEventsByPlayer).forEach(([playerIdStr, events]) => {
      const playerId = Number(playerIdStr);
      let totalDamage = 0;
      let totalCriticalDamage = 0;
      let eventCount = 0;

      events.forEach((event) => {
        // Skip events that damage friendly targets
        if (!event.targetIsFriendly) {
          // Apply target filter if specific targets are selected
          if (selectedTargetIds.size > 0 && !selectedTargetIds.has(event.targetID)) {
            return; // Skip this event
          }

          const amount = 'amount' in event ? Number(event.amount) || 0 : 0;
          totalDamage += amount;

          // Check if this is a critical hit (hitType === 2)
          if (event.hitType === 2) {
            totalCriticalDamage += amount;
          }

          eventCount++;
        }
      });

      if (totalDamage > 0) {
        damageByPlayer[playerId] = totalDamage;
        criticalDamageByPlayer[playerId] = totalCriticalDamage;
        damageEventsBySource[playerId] = eventCount;
      }
    });

    return { damageByPlayer, criticalDamageByPlayer, damageEventsBySource };
  }, [damageEventsByPlayer, selectedTargetIds]);

  // Calculate active percentages using ESO logs methodology with target filtering
  const activePercentages = useMemo(() => {
    if (!fight || !damageEventsByPlayer) {
      return {};
    }

    // Filter damage events by selected target before calculating active percentages
    const filteredDamageEventsByPlayer: Record<string, (typeof damageEventsByPlayer)[string]> = {};

    Object.entries(damageEventsByPlayer).forEach(([playerIdStr, events]) => {
      const filteredEvents = events.filter((event) => {
        // Skip events that damage friendly targets
        if (event.targetIsFriendly) {
          return false;
        }

        // Apply target filter if specific targets are selected
        if (selectedTargetIds.size > 0 && !selectedTargetIds.has(event.targetID)) {
          return false;
        }

        return true;
      });

      if (filteredEvents.length > 0) {
        filteredDamageEventsByPlayer[playerIdStr] = filteredEvents;
      }
    });

    return calculateActivePercentages(fight, filteredDamageEventsByPlayer);
  }, [fight, damageEventsByPlayer, selectedTargetIds]);

  const fightDuration = useMemo(() => {
    if (fight && fight.startTime != null && fight.endTime != null) {
      return (Number(fight.endTime) - Number(fight.startTime)) / 1000;
    }
    return 1;
  }, [fight]);

  const deathsByPlayer = useMemo(() => {
    const counts: Record<string, number> = {};
    const fightNum = fight?.id ? Number(fight.id) : undefined;

    for (const ev of deathEvents) {
      if (
        ev.type === 'death' &&
        (fightNum == null || (typeof ev.fight === 'number' && ev.fight === fightNum))
      ) {
        const target = ev.targetID;
        if (target != null) {
          const key = String(target);
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }
    return counts;
  }, [deathEvents, fight]);

  const resByPlayer = useMemo(() => {
    const result: Record<string, number> = {};

    for (const event of castEvents) {
      if (event.type !== 'cast') continue;

      if (event.abilityGameID === KnownAbilities.RESURRECT) {
        result[event.sourceID] = (result[event.sourceID] || 0) + 1;
      }
    }

    return result;
  }, [castEvents]);

  // Calculate CPM (casts per minute) per player
  const cpmByPlayer = useMemo(() => {
    const result: Record<string, number> = {};
    if (!fight) return result;

    // Count cast events per player (excluding fake casts)
    for (const event of castEvents) {
      if (event.type === 'cast' && !event.fake) {
        const sourceId = event.sourceID;
        result[sourceId] = (result[sourceId] || 0) + 1;
      }
    }

    // Calculate fight duration in minutes
    const durationMs = fight.endTime - fight.startTime;
    const minutes = durationMs > 0 ? durationMs / 60000 : 0;

    if (minutes > 0) {
      for (const playerId of Object.keys(result)) {
        result[playerId] = Number((result[playerId] / minutes).toFixed(1));
      }
    } else {
      // No duration; set CPM to 0
      for (const playerId of Object.keys(result)) {
        result[playerId] = 0;
      }
    }

    return result;
  }, [castEvents, fight]);

  const isPlayerActor = useMemo(() => {
    return (id: string) => {
      const actor = masterData.actorsById[id];
      if (!actor) {
        return false;
      }

      if (fight?.friendlyPlayers?.some((friendlyId) => friendlyId?.toString() === id)) {
        return true;
      }

      return fight?.friendlyNPCs?.some((npc) => npc?.id?.toString() === id);
    };
  }, [masterData.actorsById, fight]);

  // Helper function to determine player role
  const getPlayerRole = useMemo(() => {
    return (playerId: string): 'dps' | 'tank' | 'healer' => {
      if (!playerData?.playersById) return 'dps';

      // Try both string and numeric keys since playerData might use either
      const player = playerData.playersById[playerId] || playerData.playersById[Number(playerId)];
      const role = player?.role;

      // The role should already be normalized in the store
      if (role === 'tank') return 'tank';
      if (role === 'healer') return 'healer';
      if (role === 'dps') return 'dps';

      return 'dps'; // default fallback
    };
  }, [playerData]);

  const damageRows = useMemo(() => {
    return Object.entries(damageStatistics.damageByPlayer)
      .filter(([id]) => isPlayerActor(id))
      .map(([id, total]) => {
        const totalDamage = Number(total);
        const playerId = Number(id);

        // Prefer masterData actor name if available
        const actor = masterData.actorsById[id];
        const name = resolveActorName(actor, id, null);

        const iconUrl = actor?.icon
          ? `https://assets.rpglogs.com/img/eso/icons/${actor.icon}.png`
          : undefined;

        const role = getPlayerRole(id);
        const deaths = deathsByPlayer[id] || 0;
        const resurrects = resByPlayer[id] || 0;
        const cpm = cpmByPlayer[id] || 0;

        // Get active percentage for this player
        const activeData = activePercentages[playerId];
        const activePercentage = activeData?.activePercentage ?? 0;

        // Get critical damage metrics for this player
        const criticalDamageTotal = damageStatistics.criticalDamageByPlayer[playerId] || 0;
        const criticalDamagePercent =
          totalDamage > 0 ? (criticalDamageTotal / totalDamage) * 100 : 0;

        return {
          id,
          name,
          total: totalDamage,
          dps: fightDuration > 0 ? totalDamage / fightDuration : 0,
          activePercentage,
          criticalDamagePercent,
          criticalDamageTotal,
          iconUrl,
          role,
          deaths,
          resurrects,
          cpm,
        };
      })
      .sort((a, b) => b.dps - a.dps);
  }, [
    damageStatistics.damageByPlayer,
    damageStatistics.criticalDamageByPlayer,
    isPlayerActor,
    masterData.actorsById,
    fightDuration,
    getPlayerRole,
    activePercentages,
    deathsByPlayer,
    resByPlayer,
    cpmByPlayer,
  ]);

  // Show table skeleton while data is being fetched
  if (isLoading) {
    return <DamageDoneTableSkeleton rowCount={10} />;
  }

  // Don't render until we have data
  if (!isDataReady) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No damage data available for this fight
        </Typography>
      </Box>
    );
  }

  return (
    <Box data-testid="damage-done-panel">
      <DamageDonePanelView
        damageRows={damageRows}
        selectedTargetNames={selectedTargetNames}
        damageOverTimeData={damageOverTimeData as DamageOverTimeResult | null}
        isDamageOverTimeLoading={isDamageOverTimeLoading}
        selectedTargetIds={selectedTargetIds}
        availableTargets={availableTargets}
      />
    </Box>
  );
};
