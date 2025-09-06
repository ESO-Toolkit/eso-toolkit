import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import {
  useDamageEvents,
  usePlayerData,
  useCombatantInfoEvents,
  useReportMasterData,
  useStatusEffectUptimesTask,
} from '../../../hooks';
import { KnownAbilities } from '../../../types/abilities';
import { PlayerTalent } from '../../../types/playerDetails';

import { InsightsPanelView } from './InsightsPanelView';

interface InsightsPanelProps {
  fight: FightFragment;
}

const ULTIMATE_ABILITY_MAPPINGS: Record<number, KnownAbilities> = {
  [KnownAbilities.GLACIAL_COLOSSUS]: KnownAbilities.GLACIAL_COLOSSUS,
  [KnownAbilities.SUMMON_CHARGED_ATRONACH]: KnownAbilities.SUMMON_CHARGED_ATRONACH,
  [KnownAbilities.AGGRESSIVE_HORN]: KnownAbilities.AGGRESSIVE_HORN,
  [KnownAbilities.REPLENISHING_BARRIER]: KnownAbilities.REPLENISHING_BARRIER,
  [KnownAbilities.REVIVING_BARRIER]: KnownAbilities.REVIVING_BARRIER,
  [KnownAbilities.CONCENTRATED_BARRIER]: KnownAbilities.CONCENTRATED_BARRIER,
};

// Mapping of champion point ability IDs to their known abilities
const CHAMPION_POINT_MAPPINGS: Record<number, KnownAbilities> = {
  [KnownAbilities.ENLIVENING_OVERFLOW]: KnownAbilities.ENLIVENING_OVERFLOW,
  [KnownAbilities.FROM_THE_BRINK]: KnownAbilities.FROM_THE_BRINK,
};

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ fight }) => {
  const durationSeconds = (fight.endTime - fight.startTime) / 1000;

  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();

  // Add hooks for all data that child components depend on
  useReportMasterData();
  useStatusEffectUptimesTask();

  const abilityEquipped = React.useMemo(() => {
    const result: Partial<Record<KnownAbilities, string[]>> = {};

    if (!fight.friendlyPlayers) {
      return {};
    }

    fight.friendlyPlayers.forEach((playerId) => {
      if (playerId === null) {
        return;
      }

      const player = playerData?.playersById[playerId];

      if (!player) {
        return;
      }

      const thisPlayerData = player.id ? playerData.playersById[player.id] : undefined;

      const talents = thisPlayerData?.combatantInfo?.talents || [];

      // Check for ultimate abilities using the KnownAbilities mappings
      Object.entries(ULTIMATE_ABILITY_MAPPINGS).forEach(([abilityId, knownAbility]) => {
        const talentFound = talents.some(
          (talent: PlayerTalent) => talent.guid === Number(abilityId),
        );
        if (talentFound) {
          if (!result[knownAbility]) result[knownAbility] = [];
          const playerArray = result[knownAbility];
          if (playerArray) {
            playerArray.push(String(player.displayName || player.name || player.id));
          }
        }
      });
    });
    return result;
  }, [playerData, fight.friendlyPlayers]);

  const buffActors = React.useMemo(() => {
    const result: Partial<Record<KnownAbilities, Set<string>>> = {};

    // Initialize with empty sets for champion point abilities
    Object.values(CHAMPION_POINT_MAPPINGS).forEach((ability) => {
      result[ability] = new Set();
    });

    // Process combatant info events to find champion point auras
    combatantInfoEvents.forEach((event) => {
      if (!event.auras || event.auras.length === 0) return;

      event.auras.forEach((aura) => {
        // Check if this aura matches any of our known champion point abilities
        const knownAbility = CHAMPION_POINT_MAPPINGS[aura.ability];
        if (knownAbility) {
          const sourceId = String(event.sourceID);

          if (event.sourceID != null && playerData?.playersById[sourceId]) {
            const player = playerData.playersById[sourceId];
            const playerName = String(player.displayName || player.name || sourceId);
            const playerSet = result[knownAbility];
            if (playerSet) {
              playerSet.add(playerName);
            }
          }
        }
      });
    });

    return result;
  }, [combatantInfoEvents, playerData?.playersById]);

  // Find the first damage dealer
  const firstDamageDealer = React.useMemo(() => {
    if (!damageEvents || damageEvents.length === 0 || !playerData?.playersById) {
      return null;
    }

    // Sort damage events by timestamp to find the earliest one
    const sortedDamageEvents = [...damageEvents].sort((a, b) => a.timestamp - b.timestamp);

    // Find the first damage event from a friendly player
    const firstDamageEvent = sortedDamageEvents.find(
      (event) => event.sourceIsFriendly && fight.friendlyPlayers?.includes(event.sourceID),
    );

    if (!firstDamageEvent) {
      return null;
    }

    const sourcePlayer = playerData.playersById[firstDamageEvent.sourceID];
    if (!sourcePlayer) {
      return null;
    }

    return sourcePlayer.displayName || sourcePlayer.name || `Player ${firstDamageEvent.sourceID}`;
  }, [damageEvents, playerData?.playersById, fight.friendlyPlayers]);

  return (
    <InsightsPanelView
      fight={fight}
      durationSeconds={durationSeconds}
      abilityEquipped={abilityEquipped}
      buffActors={buffActors}
      firstDamageDealer={firstDamageDealer}
      isLoading={isCombatantInfoEventsLoading || isDamageEventsLoading || isPlayerDataLoading}
    />
  );
};
