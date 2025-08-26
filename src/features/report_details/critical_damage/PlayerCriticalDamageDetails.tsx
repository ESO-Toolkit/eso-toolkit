import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import {
  useCombatantInfoEvents,
  useDebuffEvents,
  useFriendlyBuffEvents,
  usePlayerData,
} from '../../../hooks';

import {
  getCritDamageFromComputedSource,
  getEnabledCriticalDamageSources,
} from './CritDamageUtils';
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
  const { friendlyBuffEvents, isFriendlyBuffEventsLoading } = useFriendlyBuffEvents();
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents();

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

  const enabledSources = React.useMemo(() => {
    return getEnabledCriticalDamageSources(friendlyBuffEvents, debuffEvents, combatantInfo).map(
      (s) => ({
        ...s,
        wasActive: true,
      })
    );
  }, [combatantInfo, debuffEvents, friendlyBuffEvents]);

  // Calculate critical damage data
  const criticalDamageData = React.useMemo((): PlayerCriticalDamageData | null => {
    if (!player) return null;

    const baseCriticalDamage = 50; // Base critical damage percentage

    let gearCriticalDamage = 0;
    let auraCriticalDamage = 0;
    let computedCriticalDamage = 0;
    let buffCriticalDamage = 0;
    let debuffCriticalDamage = 0;

    for (const source of enabledSources) {
      switch (source.source) {
        case 'aura':
          auraCriticalDamage += source.value;
          break;
        case 'gear':
          gearCriticalDamage += source.value;
          break;
        case 'computed':
          computedCriticalDamage += getCritDamageFromComputedSource(
            source,
            playerData?.playersById[player.id],
            combatantInfo
          );
          break;
        case 'buff':
          buffCriticalDamage += source.value;
          break;
        case 'debuff':
          debuffCriticalDamage += source.value;
          break;
      }
    }

    const permCriticalDamage =
      baseCriticalDamage + gearCriticalDamage + auraCriticalDamage + computedCriticalDamage;

    const uptimeCriticalDamage = buffCriticalDamage + debuffCriticalDamage;

    // Create a simple data point for the fight
    const dataPoints = [
      {
        timestamp: fight.startTime,
        criticalDamage: permCriticalDamage + uptimeCriticalDamage,
        relativeTime: 0,
      },
      {
        timestamp: fight.endTime,
        criticalDamage: permCriticalDamage + uptimeCriticalDamage,
        relativeTime: (fight.endTime - fight.startTime) / 1000,
      },
    ];

    return {
      playerId: player.id,
      playerName: player.name,
      dataPoints,
    };
  }, [enabledSources, player, fight, playerData?.playersById, combatantInfo]);

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
      criticalDamageSources={enabledSources}
      criticalMultiplier={null}
      fightDurationSeconds={fightDurationSeconds}
      onExpandChange={onExpandChange}
    />
  );
};
