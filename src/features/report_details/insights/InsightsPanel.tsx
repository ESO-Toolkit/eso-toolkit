import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/gql/graphql';
import {
  useCombatantInfoEvents,
  useDamageEvents,
  usePlayerData,
  useResolvedReportFightContext,
} from '../../../hooks';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { selectSelectedFriendlyPlayerId } from '../../../store/ui/uiSelectors';
import { KnownAbilities } from '../../../types/abilities';
import { PlayerTalent } from '../../../types/playerDetails';

import { InsightsPanelView, type InsightsWorkflowState } from './InsightsPanelView';

interface InsightsPanelProps {
  fight: FightFragment;
  context?: ReportFightContextInput;
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

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ fight, context }) => {
  const durationMs = fight.endTime - fight.startTime;
  const selectedFriendlyPlayerId = useSelector(selectSelectedFriendlyPlayerId);

  const resolvedContext = useResolvedReportFightContext(context);
  const { damageEvents, isDamageEventsLoading, damageEventsStatus, damageEventsError } =
    useDamageEvents({ context: resolvedContext });
  const { playerData, isPlayerDataLoading } = usePlayerData({ context: resolvedContext });
  const {
    combatantInfoEvents,
    isCombatantInfoEventsLoading,
    combatantInfoEventsStatus,
    combatantInfoEventsError,
  } = useCombatantInfoEvents({ context: resolvedContext });

  const productWorkflowState = React.useMemo<InsightsWorkflowState>(() => {
    const sourceStatuses = [
      damageEventsStatus,
      combatantInfoEventsStatus,
      playerData?.status ?? 'idle',
    ];

    if (
      damageEventsError !== null ||
      combatantInfoEventsError !== null ||
      playerData?.error != null ||
      sourceStatuses.includes('failed')
    ) {
      return 'failed';
    }

    if (sourceStatuses.includes('loading')) {
      return 'loading';
    }

    if (sourceStatuses.includes('succeeded') && sourceStatuses.includes('idle')) {
      return 'partial';
    }

    // The existing raw streams are not an encounter rule, a baseline, or a
    // persisted finding. Do not promote them into a recommendation or score.
    return 'unavailable';
  }, [
    combatantInfoEventsError,
    combatantInfoEventsStatus,
    damageEventsError,
    damageEventsStatus,
    playerData?.error,
    playerData?.status,
  ]);

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

      const talents = player.combatantInfo?.talents || [];

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

  // Find the fight initiator (the first friendly player to deal damage)
  const fightInitiator = React.useMemo(() => {
    if (!damageEvents || damageEvents.length === 0 || !playerData?.playersById) {
      return null;
    }

    // Find the earliest-timestamp damage event from a friendly player in a single O(n) scan
    let firstDamageEvent = null;
    for (const event of damageEvents) {
      if (
        event.sourceIsFriendly &&
        fight.friendlyPlayers?.includes(event.sourceID) &&
        (firstDamageEvent === null || event.timestamp < firstDamageEvent.timestamp)
      ) {
        firstDamageEvent = event;
      }
    }

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
      durationMs={durationMs}
      abilityEquipped={abilityEquipped}
      buffActors={buffActors}
      fightInitiator={fightInitiator}
      selectedPlayerId={selectedFriendlyPlayerId ?? null}
      isLoading={isCombatantInfoEventsLoading || isDamageEventsLoading || isPlayerDataLoading}
      productWorkflowState={productWorkflowState}
    />
  );
};
