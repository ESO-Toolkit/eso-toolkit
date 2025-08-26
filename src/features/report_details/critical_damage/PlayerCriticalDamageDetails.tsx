import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useCombatantInfoEvents, usePlayerData } from '../../../hooks';
import { KnownAbilities, CriticalDamageValues } from '../../../types/abilities';
import { CombatantGear, CombatantInfoEvent, CombatantAura } from '../../../types/combatlogEvents';

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

// Helper functions
const getRelevantCombatantInfo = (
  combatantInfoEvents: CombatantInfoEvent[],
  playerId: number
): CombatantInfoEvent | null => {
  const playerEvents = combatantInfoEvents.filter((event) => event.sourceID === playerId);
  return playerEvents.length > 0 ? playerEvents[0] : null;
};

const getCriticalDamageFromGear = (gear: CombatantGear[]): number => {
  // Since CombatantGear doesn't have bonuses property in the type,
  // we'll return 0 for now and calculate from set bonuses if needed
  return 0;
};

const getCriticalDamageFromAuras = (auras: CombatantAura[]): number => {
  return auras.reduce((total, aura) => {
    const abilityId = aura.ability;

    switch (abilityId) {
      case KnownAbilities.LUCENT_ECHOES:
        return total + CriticalDamageValues.LUCENT_ECHOES;
      case KnownAbilities.FATED_FORTUNE_STAGE_ONE:
        return total + CriticalDamageValues.FATED_FORTUNE;
      case KnownAbilities.HEMORRHAGE:
        return total + CriticalDamageValues.HEMORRHAGE;
      case KnownAbilities.PIERCING_SPEAR:
        return total + CriticalDamageValues.PIERCING_SPEAR;
      case KnownAbilities.ADVANCED_SPECIES:
        return total + CriticalDamageValues.ADVANCED_SPECIES;
      default:
        return total;
    }
  }, 0);
};

export const PlayerCriticalDamageDetails: React.FC<PlayerCriticalDamageDetailsProps> = ({
  id,
  name,
  fight,
  expanded = false,
  onExpandChange,
}) => {
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();
  const { playerData, isPlayerDataLoading } = usePlayerData();

  const isLoading = isCombatantInfoEventsLoading || isPlayerDataLoading;

  // Get player data
  const player = React.useMemo(() => {
    if (!playerData?.playersById) return null;
    return playerData.playersById[id] || null;
  }, [playerData, id]);

  // Get player's combatant info
  const combatantInfo = React.useMemo(() => {
    if (!combatantInfoEvents || !player) return null;
    return getRelevantCombatantInfo(combatantInfoEvents, player.id);
  }, [combatantInfoEvents, player]);

  // Calculate critical damage data
  const criticalDamageData = React.useMemo((): PlayerCriticalDamageData | null => {
    if (!combatantInfo || !player) return null;

    const baseCriticalDamage = 150; // Base critical damage percentage

    // Get initial critical damage from gear and permanent auras
    let gearCriticalDamage = 0;
    if (combatantInfo.gear) {
      gearCriticalDamage = getCriticalDamageFromGear(combatantInfo.gear);
    }

    let auraCriticalDamage = 0;
    if (combatantInfo.auras) {
      auraCriticalDamage = getCriticalDamageFromAuras(combatantInfo.auras);
    }

    const totalCriticalDamage = baseCriticalDamage + gearCriticalDamage + auraCriticalDamage;

    // Create a simple data point for the fight
    const dataPoints = [
      {
        timestamp: fight.startTime,
        criticalDamage: totalCriticalDamage,
        relativeTime: 0,
      },
      {
        timestamp: fight.endTime,
        criticalDamage: totalCriticalDamage,
        relativeTime: (fight.endTime - fight.startTime) / 1000,
      },
    ];

    return {
      playerId: player.id,
      playerName: player.name,
      dataPoints,
    };
  }, [combatantInfo, player, fight]);

  // Calculate critical damage sources
  const criticalDamageSources = React.useMemo(() => {
    if (!combatantInfo) return [];

    const sources = [];

    // Add base critical damage
    sources.push({
      name: 'Base Critical Damage',
      value: 150,
      wasActive: true,
      description: 'Base critical damage for all players',
    });

    // Add aura-based sources
    if (combatantInfo.auras) {
      combatantInfo.auras.forEach((aura) => {
        const abilityId = aura.ability;

        switch (abilityId) {
          case KnownAbilities.LUCENT_ECHOES:
            sources.push({
              name: 'Lucent Echoes',
              value: CriticalDamageValues.LUCENT_ECHOES,
              wasActive: true,
              description: 'Critical damage from Lucent Echoes buff',
            });
            break;
          case KnownAbilities.FATED_FORTUNE_STAGE_ONE:
            sources.push({
              name: 'Fated Fortune',
              value: CriticalDamageValues.FATED_FORTUNE,
              wasActive: true,
              description: 'Critical damage from Fated Fortune passive',
            });
            break;
          // Add more cases as needed
        }
      });
    }

    return sources;
  }, [combatantInfo]);

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
      criticalDamageSources={criticalDamageSources}
      criticalMultiplier={null}
      fightDurationSeconds={fightDurationSeconds}
      onExpandChange={onExpandChange}
    />
  );
};
