import React from 'react';

import { useReportFightParams } from '../../../hooks/useReportFightParams';
import { RootState } from '../../../store/storeWithHistory';
import { MundusStones } from '../../../types/abilities';
import { CombatantInfoEvent } from '../../../types/combatlogEvents';

import { PlayersPanelView } from './PlayersPanelView';

// This panel now uses report actors from masterData

const PlayersPanel: React.FC = () => {
  // Get report/fight context for CPM and deeplink
  const { reportId, fightId } = useReportFightParams();

  // Get report actors from masterData
  const actorsById = useSelector((state: RootState) => state.masterData.actorsById);
  const abilitiesById = useSelector((state: RootState) => state.masterData.abilitiesById);
  const events = useSelector((state: RootState) => state.events.events);
  // Get player details (gear/talents) from masterData
  // Player details are stored in events.players, keyed by actor id
  const eventPlayers = useSelector((state: RootState) => state.events.players);

  // Filter for Player actors only
  const playerActors = React.useMemo(
    () => Object.values(actorsById).filter((actor) => actor?.type === 'Player'),
    [actorsById]
  );

  // Convert playerData to the expected format
  const eventPlayers = React.useMemo(() => {
    const result: Record<string, PlayerInfo> = {};
    if (playerData?.playersById) {
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
  }, [playerData?.playersById]);

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

  // Compute CPM (casts per minute) per player for the current fight, excluding specific abilities per provided filter
  const cpmByPlayer = React.useMemo(() => {
    const result: Record<string, number> = {};
    if (!events) return result;

    const fightNum = fightId ? Number(fightId) : undefined;

    // Exclusion list extracted from the provided pins filter
    const excluded = new Set<number>([
      16499, 28541, 16165, 16145, 18350, 28549, 45223, 18396, 16277, 115548, 85572, 23196, 95040,
      39301, 63507, 22269, 95042, 191078, 32910, 41963, 16261, 45221, 48076, 32974, 21970, 41838,
      16565, 45227, 118604, 26832, 15383, 45382, 16420, 68401, 47193, 190583, 16212, 228524, 186981,
      16037, 15435, 15279, 72931, 45228, 16688, 61875, 61874,
    ]);

    const playerIds = new Set(
      Object.values(actorsById)
        .filter((a) => a.type === 'Player' && a.id != null)
        .map((a) => String(a.id))
    );

    // Limit to events in this fight (if present) and gather timestamps for duration
    let minTs = Number.POSITIVE_INFINITY;
    let maxTs = Number.NEGATIVE_INFINITY;

    const eventsInScope = events.filter((ev: any) =>
      fightNum == null ? true : typeof ev.fight === 'number' && ev.fight === fightNum
    );

    for (const ev of eventsInScope as any[]) {
      if (typeof ev.timestamp === 'number') {
        if (ev.timestamp < minTs) minTs = ev.timestamp;
        if (ev.timestamp > maxTs) maxTs = ev.timestamp;
      }
      if (ev.type === 'cast') {
        const src = ev.sourceID != null ? String(ev.sourceID) : undefined;
        const abilityId: number | undefined = ev.abilityGameID;
        if (
          src &&
          playerIds.has(src) &&
          typeof abilityId === 'number' &&
          !excluded.has(abilityId)
        ) {
          result[src] = (result[src] || 0) + 1;
        }
      }
    }

    const durationMs = maxTs > minTs ? maxTs - minTs : 0;
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
  }, [events, actorsById, fightId]);

  // Compute death counts per player for the current fight
  const deathsByPlayer = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (!events) return counts;

    const fightNum = fightId ? Number(fightId) : undefined;

    for (const ev of events as any[]) {
      if (
        ev.type === 'death' &&
        (fightNum == null || (typeof ev.fight === 'number' && ev.fight === fightNum))
      ) {
        const target = ev.targetID ?? ev.target;
        if (target != null) {
          const key = String(target);
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }

    return counts;
  }, [events, fightId]);

  // Compute total successful resurrects per player using the "Recently Revived" buff applications.
  // This focuses on successful revives and avoids double-counting cast attempts.
  const resurrectsByPlayer = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (!events || !abilitiesById) return counts;

    const playerIdSet = new Set(playerActors.filter((a) => a.id != null).map((a) => String(a.id)));

    // Identify ability IDs whose name matches "Recently Revived" specifically (most reliable success signal)
    const recentlyRevivedIds = Object.entries(abilitiesById)
      .filter(([, ability]) => /recently\s+revived/i.test(ability?.name ?? ''))
      .map(([id]) => Number(id));

    if (recentlyRevivedIds.length === 0) return counts;

    const rvSet = new Set<number>(recentlyRevivedIds);

    for (const ev of events) {
      // Buff applications carry sourceID (the resurrector) when available
      if (
        (ev as any).type === 'applybuff' &&
        (typeof (ev as any).abilityGameID === 'number' || typeof (ev as any).abilityId === 'number')
      ) {
        const abilityId = (ev as any).abilityGameID ?? (ev as any).abilityId;
        if (rvSet.has(abilityId)) {
          const src = (ev as any).sourceID;
          if (src != null && playerIdSet.has(String(src))) {
            const key = String(src);
            counts[key] = (counts[key] || 0) + 1;
          }
        }
      }
    }

    return counts;
  }, [events, abilitiesById, playerActors]);

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
      deathsByPlayer={deathsByPlayer}
      resurrectsByPlayer={resurrectsByPlayer}
      cpmByPlayer={cpmByPlayer}
      reportId={reportId}
      fightId={fightId}
    />
  );
};
