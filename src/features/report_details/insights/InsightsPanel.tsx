import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { PlayerInfo } from '../../../store/events/eventsSlice';
import { RootState } from '../../../store/storeWithHistory';
import { PlayerEnterCombatEvent } from '../../../types/combatlogEvents';
import { PlayerTalent } from '../../../types/playerDetails';

import InsightsPanelView from './InsightsPanelView';

interface InsightsPanelProps {
  fight: FightFragment;
}

const ABILITY_NAMES = ['Glacial Colossus', 'Summon Charged Atronach', 'Aggressive Horn'];
const CHAMPION_POINT_NAMES = ['Enlivening Overflow', 'From the Brink'];

const InsightsPanel: React.FC<InsightsPanelProps> = ({ fight }) => {
  const durationSeconds = (fight.endTime - fight.startTime) / 1000;
  const players = useSelector((state: RootState) => state.events.players);
  const events = useSelector((state: RootState) => state.events.events);

  const fightStarter = React.useMemo(() => {
    if (!events || !fight?.startTime) return null;
    // Find the first playerentercombat event after fight start
    const starterEvent = events.find(
      (event): event is PlayerEnterCombatEvent =>
        event.type === 'playerentercombat' && event.timestamp >= fight.startTime
    );
    if (starterEvent) {
      const playerId = String(starterEvent.sourceID ?? '');
      const player = players[playerId];
      return player?.displayName || player?.name || playerId;
    }
    return null;
  }, [events, fight, players]);

  // Memoized calculation of equipped abilities and buff actors
  const masterData = useSelector((state: RootState) => state.masterData);
  const abilityEquipped = React.useMemo(() => {
    const result: Record<string, string[]> = {};
    Object.values(players).forEach((player: PlayerInfo) => {
      const talents = player?.combatantInfo?.talents || [];
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
  }, [players]);

  const buffActors = React.useMemo(() => {
    const result: Record<string, Set<string>> = {
      'Enlivening Overflow': new Set(),
      'From the Brink': new Set(),
    };
    const buffAbilityIds: Record<string, Array<string | number | null | undefined>> = {};
    CHAMPION_POINT_NAMES.forEach((name) => {
      buffAbilityIds[name] = Object.values(masterData.abilitiesById)
        .filter((a) => a.name?.toLowerCase() === name.toLowerCase())
        .map((a) => a.gameID)
        .filter((id) => id != null);
    });
    events.forEach((event) => {
      if (event.type === 'applybuff') {
        CHAMPION_POINT_NAMES.forEach((name) => {
          if (
            buffAbilityIds[name].includes(event.abilityGameID ?? '') ||
            buffAbilityIds[name].includes(event.abilityId ?? '')
          ) {
            const sourceId = String(event.sourceID);
            if (event.sourceID != null && players[sourceId]) {
              result[name].add(
                String(players[sourceId].displayName || players[sourceId].name || sourceId)
              );
            }
          }
        });
      }
    });
    return result;
  }, [events, masterData, players]);
  return (
    <InsightsPanelView
      fight={fight}
      durationSeconds={durationSeconds}
      fightStarter={fightStarter}
      abilityEquipped={abilityEquipped}
      buffActors={buffActors}
    />
  );
};

export default InsightsPanel;
