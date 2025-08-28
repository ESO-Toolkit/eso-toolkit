import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useCombatantInfoEvents, usePlayerData } from '../../../hooks';
import { useDebuffLookup } from '../../../hooks/useDebuffEvents';
import { useFriendlyBuffLookup } from '../../../hooks/useFriendlyBuffEvents';
import {
  calculateDynamicCriticalDamageAtTimestamp,
  calculateStaticCriticalDamage,
  getAllCriticalDamageSourcesWithActiveState,
} from '../../../utils/CritDamageUtils';

import {
  PlayerCriticalDamageDetailsView,
  PlayerCriticalDamageData,
} from './PlayerCriticalDamageDetailsView';

interface PlayerCriticalDamageDetailsProps {
  id: number;
  name: string;
  fight: FightFragment;
  expanded?: boolean;
  onExpandChange?: (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

export const PlayerCriticalDamageDetails: React.FC<PlayerCriticalDamageDetailsProps> = ({
  id,
  name,
  fight,
  expanded = false,
  onExpandChange,
}) => {
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { friendlyBuffsLookup, isFriendlyBuffEventsLoading } = useFriendlyBuffLookup();
  const { debuffsLookup, isDebuffEventsLoading } = useDebuffLookup();

  const isLoading =
    isCombatantInfoEventsLoading ||
    isPlayerDataLoading ||
    isFriendlyBuffEventsLoading ||
    isDebuffEventsLoading;

  // Get player data
  const player = React.useMemo(() => {
    if (!playerData?.playersById) return null;
    return playerData.playersById[id] || null;
  }, [playerData, id]);

  // Get player's combatant info
  const combatantInfo = React.useMemo(() => {
    if (!player) return null;
    return combatantInfoEvents.find((info) => info.sourceID === player.id) || null;
  }, [combatantInfoEvents, player]);

  const allSources = React.useMemo(() => {
    if (!friendlyBuffsLookup || !debuffsLookup) {
      return [];
    }
    return getAllCriticalDamageSourcesWithActiveState(
      friendlyBuffsLookup,
      debuffsLookup,
      combatantInfo
    );
  }, [combatantInfo, friendlyBuffsLookup, debuffsLookup]);

  // Calculate critical damage data
  const criticalDamageData = React.useMemo((): PlayerCriticalDamageData | null => {
    if (!player || !friendlyBuffsLookup || !debuffsLookup) return null;

    const fightDurationMs = fight.endTime - fight.startTime;
    const fightDurationSeconds = Math.ceil(fightDurationMs / 1000);

    // Pre-calculate static critical damage sources (base + aura + gear + computed)
    // These don't change over time, so we only calculate them once
    const staticCriticalDamage = calculateStaticCriticalDamage(
      combatantInfo,
      playerData?.playersById[player.id],
      debuffsLookup
    );

    // Create data points and calculate statistics in a single pass
    const dataPoints = [];
    let maxCriticalDamage = 50; // Default base critical damage
    let totalCriticalDamage = 0;
    let dataPointCount = 0;
    let timeAtCapCount = 0; // Count of data points at critical damage cap (125%)

    for (let i = 0; i <= fightDurationSeconds; i++) {
      const timestamp = fight.startTime + i * 1000;
      const relativeTime = i;

      // Calculate dynamic critical damage (buffs/debuffs) for this timestamp
      const dynamicCriticalDamage = calculateDynamicCriticalDamageAtTimestamp(
        friendlyBuffsLookup,
        debuffsLookup,
        timestamp
      );

      // Total critical damage = static + dynamic
      const criticalDamage = staticCriticalDamage + dynamicCriticalDamage;

      dataPoints.push({
        timestamp,
        criticalDamage,
        relativeTime,
      });

      // Update running statistics
      maxCriticalDamage = Math.max(maxCriticalDamage, criticalDamage);
      totalCriticalDamage += criticalDamage;
      dataPointCount++;

      // Check if at critical damage cap (125%)
      if (criticalDamage >= 125) {
        timeAtCapCount++;
      }
    }

    // Calculate final statistics from running tallies
    const maximumCriticalDamage = maxCriticalDamage;
    const effectiveCriticalDamage = dataPointCount > 0 ? totalCriticalDamage / dataPointCount : 50; // Default base critical damage
    const timeAtCapPercentage = dataPointCount > 0 ? (timeAtCapCount / dataPointCount) * 100 : 0;

    return {
      playerId: player.id,
      playerName: player.name,
      dataPoints,
      effectiveCriticalDamage,
      maximumCriticalDamage,
      timeAtCapPercentage,
      criticalDamageAlerts: [], // TODO: Implement critical damage alerts if needed
    };
  }, [player, fight, friendlyBuffsLookup, debuffsLookup, combatantInfo, playerData?.playersById]);

  const fightDurationSeconds = (fight.endTime - fight.startTime) / 1000;

  if (!player) {
    return null;
  }

  return (
    <PlayerCriticalDamageDetailsView
      id={id}
      player={player}
      name={name}
      expanded={expanded}
      isLoading={isLoading}
      criticalDamageData={criticalDamageData}
      criticalDamageSources={allSources}
      criticalMultiplier={null}
      fightDurationSeconds={fightDurationSeconds}
      onExpandChange={onExpandChange}
    />
  );
};
