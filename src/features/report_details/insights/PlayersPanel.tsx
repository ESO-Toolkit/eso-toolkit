import React from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../../../store/storeWithHistory';
import { MundusStones } from '../../../types/abilities';
import { CombatantInfoEvent } from '../../../types/combatlogEvents';

import PlayersPanelView from './PlayersPanelView';

// This panel now uses report actors from masterData

const PlayersPanel: React.FC = () => {
  // Get report actors from masterData
  const actorsById = useSelector((state: RootState) => state.masterData.actorsById);
  const abilitiesById = useSelector((state: RootState) => state.masterData.abilitiesById);
  const events = useSelector((state: RootState) => state.events.events);
  // Get player details (gear/talents) from masterData
  // Player details are stored in events.players, keyed by actor id
  const eventPlayers = useSelector((state: RootState) => state.events.players);

  // Filter for Player actors only
  const playerActors = Object.values(actorsById).filter((actor) => actor.type === 'Player');

  // Calculate unique mundus buffs per player using MundusStones enum from combatantinfo auras
  const mundusBuffsByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number }>> = {};

    if (!events || !abilitiesById) return result;

    // Get all mundus stone ability IDs from the enum
    const mundusStoneIds = Object.values(MundusStones) as number[];

    // Initialize arrays for each player
    playerActors.forEach((actor) => {
      if (actor.id) {
        const playerId = String(actor.id);
        result[playerId] = [];

        // Find the latest combatantinfo event for this player
        const combatantInfoEvents = events
          .filter((event): event is CombatantInfoEvent => {
            const eventData = event;
            return (
              eventData.type === 'combatantinfo' &&
              'sourceID' in eventData &&
              String(eventData.sourceID) === playerId
            );
          })
          .sort((a, b) => {
            return (b.timestamp || 0) - (a.timestamp || 0);
          }); // Most recent first

        const latestCombatantInfo = combatantInfoEvents[0];
        if (latestCombatantInfo && latestCombatantInfo.auras) {
          // Check each aura to see if it's a mundus stone
          latestCombatantInfo.auras.forEach((aura) => {
            if (mundusStoneIds.includes(aura.ability)) {
              const ability = abilitiesById[aura.ability];
              const mundusName = ability?.name || aura.name || `Unknown Mundus (${aura.ability})`;

              // Only add if not already present
              if (!result[playerId].some((buff) => buff.id === aura.ability)) {
                result[playerId].push({
                  name: mundusName,
                  id: aura.ability,
                });
              }
            }
          });
        }
      }
    });

    return result;
  }, [events, abilitiesById, playerActors]);

  // Calculate all auras per player from combatantinfo events
  const aurasByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number; stacks?: number }>> = {};

    if (!events || !abilitiesById) return result;

    // Initialize arrays for each player
    playerActors.forEach((actor) => {
      if (actor.id) {
        const playerId = String(actor.id);
        result[playerId] = [];

        // Find the latest combatantinfo event for this player
        const combatantInfoEvents = events
          .filter((event): event is CombatantInfoEvent => {
            const eventData = event;
            return (
              eventData.type === 'combatantinfo' &&
              'sourceID' in eventData &&
              String(eventData.sourceID) === playerId
            );
          })
          .sort((a, b) => {
            return (b.timestamp || 0) - (a.timestamp || 0);
          }); // Most recent first

        const latestCombatantInfo = combatantInfoEvents[0];
        if (latestCombatantInfo && latestCombatantInfo.auras) {
          // Get all auras for this player
          latestCombatantInfo.auras.forEach((aura) => {
            const ability = abilitiesById[aura.ability];
            const auraName = ability?.name || aura.name || `Unknown Aura (${aura.ability})`;

            result[playerId].push({
              name: auraName,
              id: aura.ability,
              stacks: aura.stacks,
            });
          });

          // Sort auras by name for consistent display
          result[playerId].sort((a, b) => a.name.localeCompare(b.name));
        }
      }
    });

    return result;
  }, [events, abilitiesById, playerActors]);

  return (
    <PlayersPanelView
      playerActors={playerActors}
      eventPlayers={eventPlayers}
      mundusBuffsByPlayer={mundusBuffsByPlayer}
      aurasByPlayer={aurasByPlayer}
    />
  );
};

export default PlayersPanel;
