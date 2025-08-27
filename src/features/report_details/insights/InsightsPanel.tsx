import React, { Profiler } from 'react';

import { FightFragment } from '../../../graphql/generated';
import {
  useFriendlyBuffEvents,
  useDamageEvents,
  usePlayerData,
  useReportMasterData,
} from '../../../hooks';
import { PlayerTalent } from '../../../types/playerDetails';

import { InsightsPanelView } from './InsightsPanelView';

interface InsightsPanelProps {
  fight: FightFragment;
}

const ABILITY_NAMES = ['Glacial Colossus', 'Summon Charged Atronach', 'Aggressive Horn'];
const CHAMPION_POINT_NAMES = ['Enlivening Overflow', 'From the Brink'];

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ fight }) => {
  const durationSeconds = (fight.endTime - fight.startTime) / 1000;

  const { friendlyBuffEvents, isFriendlyBuffEventsLoading } = useFriendlyBuffEvents();
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  const abilityEquipped = React.useMemo(() => {
    const result: Record<string, string[]> = {};

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
      ABILITY_NAMES.forEach((name) => {
        if (
          talents.some((talent: PlayerTalent) => talent.name?.toLowerCase() === name.toLowerCase())
        ) {
          if (!result[name]) result[name] = [];
          result[name].push(String(player.displayName || player.name || player.id));
        }
      });
    });
    return result;
  }, [playerData, fight.friendlyPlayers]);

  const buffActors = React.useMemo(() => {
    const result: Record<string, Set<string>> = {
      'Enlivening Overflow': new Set(),
      'From the Brink': new Set(),
    };
    // Build a lookup of ability names to their gameIDs for champion point buffs
    const buffAbilityIds: Record<string, Array<string | number>> = {};
    // Create a name-to-gameID map once for all abilities
    const abilityNameToGameIDs: Record<string, Array<string | number>> = {};
    Object.values(reportMasterData.abilitiesById).forEach((a) => {
      const name = a.name?.toLowerCase();
      if (name && a.gameID != null) {
        if (!abilityNameToGameIDs[name]) abilityNameToGameIDs[name] = [];
        abilityNameToGameIDs[name].push(a.gameID);
      }
    });
    CHAMPION_POINT_NAMES.forEach((name) => {
      buffAbilityIds[name] = abilityNameToGameIDs[name.toLowerCase()] || [];
    });

    // Build a set of relevant abilityGameIDs for quick lookup
    const relevantAbilityGameIDs = new Set(
      CHAMPION_POINT_NAMES.flatMap((name) => buffAbilityIds[name])
    );

    // Map abilityGameID to champion point name for reverse lookup
    const abilityGameIDToName: Record<string | number, string> = {};
    CHAMPION_POINT_NAMES.forEach((name) => {
      buffAbilityIds[name].forEach((id) => {
        abilityGameIDToName[id] = name;
      });
    });

    friendlyBuffEvents.forEach((event) => {
      if (event.type === 'applybuff' && relevantAbilityGameIDs.has(event.abilityGameID ?? '')) {
        const name = abilityGameIDToName[event.abilityGameID ?? ''];
        const sourceId = String(event.sourceID);

        if (event.sourceID != null && playerData?.playersById[sourceId]) {
          const player = playerData.playersById[sourceId];
          result[name].add(String(player.displayName || player.name || sourceId));
        }
      }
    });
    return result;
  }, [friendlyBuffEvents, reportMasterData.abilitiesById, playerData?.playersById]);

  // Find the first damage dealer
  const firstDamageDealer = React.useMemo(() => {
    if (!damageEvents || damageEvents.length === 0 || !playerData?.playersById) {
      return null;
    }

    // Sort damage events by timestamp to find the earliest one
    const sortedDamageEvents = [...damageEvents].sort((a, b) => a.timestamp - b.timestamp);

    // Find the first damage event from a friendly player
    const firstDamageEvent = sortedDamageEvents.find(
      (event) => event.sourceIsFriendly && fight.friendlyPlayers?.includes(event.sourceID)
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
    <Profiler
      id="InsightsPanel"
      onRender={(id, phase, actualDuration) => {
        console.log({ id, phase, actualDuration });
      }}
    >
      <InsightsPanelView
        fight={fight}
        durationSeconds={durationSeconds}
        abilityEquipped={abilityEquipped}
        buffActors={buffActors}
        firstDamageDealer={firstDamageDealer}
        isLoading={
          isFriendlyBuffEventsLoading ||
          isDamageEventsLoading ||
          isPlayerDataLoading ||
          isMasterDataLoading
        }
      />
    </Profiler>
  );
};
