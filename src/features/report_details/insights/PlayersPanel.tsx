import React from 'react';

import {
  useCastEvents,
  useCombatantInfoEvents,
  useCurrentFight,
  useDeathEvents,
  usePlayerData,
  useReportMasterData,
} from '../../../hooks';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { KnownAbilities, MundusStones } from '../../../types/abilities';
import { CombatantInfoEvent } from '../../../types/combatlogEvents';

import { PlayersPanelView } from './PlayersPanelView';

// Exclusion list extracted from the provided pins filter
const CPM_EXCLUSION_LIST = Object.freeze(
  new Set<number>([
    16499, 28541, 16165, 16145, 18350, 28549, 45223, 18396, 16277, 115548, 85572, 23196, 95040,
    39301, 63507, 22269, 95042, 191078, 32910, 41963, 16261, 45221, 48076, 32974, 21970, 41838,
    16565, 45227, 118604, 26832, 15383, 45382, 16420, 68401, 47193, 190583, 16212, 228524, 186981,
    16037, 15435, 15279, 72931, 45228, 16688, 61875, 61874,
  ])
);

// This panel now uses report actors from masterData

export const PlayersPanel: React.FC = () => {
  // Get report/fight context for CPM and deeplink
  const { reportId, fightId } = useSelectedReportAndFight();

  // Use hooks to get data
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();
  const { castEvents, isCastEventsLoading } = useCastEvents();
  const { deathEvents, isDeathEventsLoading } = useDeathEvents();
  const fight = useCurrentFight();

  const { abilitiesById } = reportMasterData;

  // Calculate loading state
  const isLoading =
    isMasterDataLoading ||
    isPlayerDataLoading ||
    isCombatantInfoEventsLoading ||
    isCastEventsLoading ||
    isDeathEventsLoading;

  // Calculate unique mundus buffs per player using MundusStones enum from combatantinfo auras
  const mundusBuffsByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number }>> = {};

    // Get all mundus stone ability IDs from the enum
    const mundusStoneIds = Object.values(MundusStones) as number[];

    // Initialize arrays for each player
    if (playerData) {
      Object.values(playerData?.playersById).forEach((actor) => {
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
                const ability = reportMasterData.abilitiesById[aura.ability];
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
    }

    return result;
  }, [combatantInfoEvents, reportMasterData.abilitiesById, playerData]);

  // Compute CPM (casts per minute) per player for the current fight, excluding specific abilities per provided filter
  const cpmByPlayer = React.useMemo(() => {
    const result: Record<string, number> = {};
    if (!fight) return result;

    for (const ev of castEvents) {
      if (ev.type === 'cast' && !ev.fake) {
        const src = ev.sourceID;
        const abilityId: number | undefined = ev.abilityGameID;
        if (!CPM_EXCLUSION_LIST.has(abilityId)) {
          result[src] = (result[src] || 0) + 1;
        }
      }
    }

    const durationMs = fight?.endTime - fight?.startTime;
    const minutes = durationMs > 0 ? durationMs / 60000 : 0;
    if (minutes > 0) {
      for (const k of Object.keys(result)) {
        result[k] = Number((result[k] / minutes).toFixed(1));
      }
    } else {
      // No duration; set CPM to 0
      for (const k of Object.keys(result)) {
        result[k] = 0;
      }
    }

    return result;
  }, [castEvents, fight]);

  // Compute death counts per player for the current fight
  const deathsByPlayer = React.useMemo(() => {
    const counts: Record<string, number> = {};

    const fightNum = fightId ? Number(fightId) : undefined;

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
  }, [deathEvents, fightId]);

  // Compute total successful resurrects per player using the "Recently Revived" buff applications.
  // This focuses on successful revives and avoids double-counting cast attempts.
  const resurrectsByPlayer = React.useMemo(() => {
    const counts: Record<string, number> = {};

    for (const ev of castEvents) {
      // Buff applications carry sourceID (the resurrector) when available
      if (ev.type === 'cast' && ev.abilityGameID === KnownAbilities.RESURRECT) {
        counts[ev.sourceID] = (counts[ev.sourceID] || 0) + 1;
      }
    }

    return counts;
  }, [castEvents]);

  // Calculate all auras per player from combatantinfo events
  const aurasByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number; stacks?: number }>> = {};

    // Initialize arrays for each player
    if (playerData) {
      Object.values(playerData.playersById).forEach((actor) => {
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
    }

    return result;
  }, [combatantInfoEvents, abilitiesById, playerData]);

  // Show loading if any data is still loading
  if (isLoading) {
    return (
      <PlayersPanelView
        playerActors={{}}
        deathsByPlayer={{}}
        resurrectsByPlayer={{}}
        cpmByPlayer={{}}
        mundusBuffsByPlayer={{}}
        aurasByPlayer={{}}
        isLoading={true}
        reportId={reportId}
        fightId={fightId}
      />
    );
  }

  return (
    <PlayersPanelView
      playerActors={playerData?.playersById}
      mundusBuffsByPlayer={mundusBuffsByPlayer}
      aurasByPlayer={aurasByPlayer}
      deathsByPlayer={deathsByPlayer}
      resurrectsByPlayer={resurrectsByPlayer}
      cpmByPlayer={cpmByPlayer}
      reportId={reportId}
      fightId={fightId}
      isLoading={false}
    />
  );
};
