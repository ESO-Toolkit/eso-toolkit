import React from 'react';

import { useCombatantInfoEvents, usePlayerData, useReportMasterData } from '../../../hooks';
import { PlayerInfo } from '../../../store/events_data/actions';
import { MundusStones } from '../../../types/abilities';
import { CombatantInfoEvent } from '../../../types/combatlogEvents';

import PlayersPanelView from './PlayersPanelView';

// This panel now uses report actors from masterData

const PlayersPanel: React.FC = () => {
  // Use hooks to get data
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();

  // Extract actors and abilities from masterData with memoization
  const actorsById = React.useMemo(
    () => reportMasterData.actorsById || {},
    [reportMasterData.actorsById]
  );
  const abilitiesById = React.useMemo(
    () => reportMasterData.abilitiesById || {},
    [reportMasterData.abilitiesById]
  );

  // Filter for Player actors only
  const playerActors = React.useMemo(
    () => Object.values(actorsById).filter((actor) => actor?.type === 'Player'),
    [actorsById]
  );

  // Convert playerData to the expected format
  const eventPlayers = React.useMemo(() => {
    const result: Record<string, PlayerInfo> = {};
    if (playerData.playersById) {
      Object.entries(playerData.playersById).forEach(([id, player]) => {
        // Convert PlayerDetailsEntry to PlayerInfo format by adding required index signature
        const playerInfo: PlayerInfo = {
          id: player.id,
          name: player.name,
          displayName: player.displayName,
          combatantInfo: {
            talents: player.combatantInfo?.talents,
            gear: player.combatantInfo?.gear,
          },
          // Include all other properties from the original player
          ...Object.fromEntries(
            Object.entries(player).filter(
              ([key]) => !['id', 'name', 'displayName', 'combatantInfo'].includes(key)
            )
          ),
        };
        result[id] = playerInfo;
      });
    }
    return result;
  }, [playerData.playersById]);

  // Calculate loading state
  const isLoading = isMasterDataLoading || isPlayerDataLoading || isCombatantInfoEventsLoading;

  // Calculate unique mundus buffs per player using MundusStones enum from combatantinfo auras
  const mundusBuffsByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number }>> = {};

    if (!combatantInfoEvents || !abilitiesById) return result;

    // Get all mundus stone ability IDs from the enum
    const mundusStoneIds = Object.values(MundusStones) as number[];

    // Initialize arrays for each player
    playerActors.forEach((actor) => {
      if (actor?.id) {
        const playerId = String(actor.id);
        result[playerId] = [];

        // Find the latest combatantinfo event for this player
        const combatantInfoEventsForPlayer = combatantInfoEvents
          .filter((event): event is CombatantInfoEvent => {
            return (
              event.type === 'combatantinfo' &&
              'sourceID' in event &&
              String(event.sourceID) === playerId
            );
          })
          .sort((a, b) => {
            return (b.timestamp || 0) - (a.timestamp || 0);
          }); // Most recent first

        const latestCombatantInfo = combatantInfoEventsForPlayer[0];
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
  }, [combatantInfoEvents, abilitiesById, playerActors]);

  // Calculate all auras per player from combatantinfo events
  const aurasByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number; stacks?: number }>> = {};

    if (!combatantInfoEvents || !abilitiesById) return result;

    // Initialize arrays for each player
    playerActors.forEach((actor) => {
      if (actor?.id) {
        const playerId = String(actor.id);
        result[playerId] = [];

        // Find the latest combatantinfo event for this player
        const combatantInfoEventsForPlayer = combatantInfoEvents
          .filter((event): event is CombatantInfoEvent => {
            return (
              event.type === 'combatantinfo' &&
              'sourceID' in event &&
              String(event.sourceID) === playerId
            );
          })
          .sort((a, b) => {
            return (b.timestamp || 0) - (a.timestamp || 0);
          }); // Most recent first

        const latestCombatantInfo = combatantInfoEventsForPlayer[0];
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
  }, [combatantInfoEvents, abilitiesById, playerActors]);

  // Show loading if any data is still loading
  if (isLoading) {
    return (
      <PlayersPanelView
        playerActors={[]}
        eventPlayers={{}}
        mundusBuffsByPlayer={{}}
        aurasByPlayer={{}}
        isLoading={true}
      />
    );
  }

  return (
    <PlayersPanelView
      playerActors={playerActors}
      eventPlayers={eventPlayers}
      mundusBuffsByPlayer={mundusBuffsByPlayer}
      aurasByPlayer={aurasByPlayer}
      isLoading={false}
    />
  );
};

export default PlayersPanel;
