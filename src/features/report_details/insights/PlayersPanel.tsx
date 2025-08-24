import React from 'react';

import { useReportFightParams } from '../../../hooks/useReportFightParams';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/storeWithHistory';
import { MundusStones } from '../../../types/abilities';
import { CombatantInfoEvent, CombatantAura, LogEvent } from '../../../types/combatlogEvents';
import { PlayerInfo } from '../../../store/events_data/actions';
import { selectAllEvents, selectEventPlayers } from '../../../store/events_data/selectors';
import { ReportActorFragment } from '../../../graphql/generated';

import PlayersPanelView from './PlayersPanelView';

// This panel now uses report actors from masterData

const PlayersPanel: React.FC = () => {
  // Get report/fight context for CPM and deeplink
  const { reportId, fightId } = useReportFightParams();

  // Get report actors and abilities from masterData
  const abilitiesById = useSelector<
    RootState,
    Record<string | number, import('../../../graphql/generated').ReportAbilityFragment>
  >((state) => state.masterData.abilitiesById || {});
  // Upstream selectors: combined events and player actors for the selected report/fight
  const events = useSelector<RootState, LogEvent[]>(selectAllEvents);
  const playerActors = useSelector<RootState, ReportActorFragment[]>(selectEventPlayers);

  // Derive combatantinfo events from the main events stream
  const combatantInfoEvents = React.useMemo(
    () =>
      (events || []).filter(
        (e: any): e is CombatantInfoEvent => e && e.type === 'combatantinfo'
      ),
    [events]
  );

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
          .filter((event: CombatantInfoEvent): event is CombatantInfoEvent => {
            return (
              event.type === 'combatantinfo' &&
              'sourceID' in event &&
              String(event.sourceID) === playerId
            );
          })
          .sort((a: CombatantInfoEvent, b: CombatantInfoEvent) => {
            return (b.timestamp || 0) - (a.timestamp || 0);
          }); // Most recent first

        const latestCombatantInfo = combatantInfoEventsForPlayer[0];
        if (latestCombatantInfo && latestCombatantInfo.auras) {
          // Check each aura to see if it's a mundus stone
          latestCombatantInfo.auras.forEach((aura: CombatantAura) => {
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

  // Convert event players array into a record keyed by player ID with combatantInfo populated from latest combatantinfo event
  const eventPlayers: Record<string, PlayerInfo> = React.useMemo(() => {
    const record: Record<string, PlayerInfo> = {};
    if (!playerActors || playerActors.length === 0) return record;

    // Pre-index latest combatantinfo per sourceID
    const latestByPlayer = new Map<string, CombatantInfoEvent>();
    for (const ev of combatantInfoEvents) {
      const key = String((ev as any).sourceID);
      const existing = latestByPlayer.get(key);
      if (!existing || (ev.timestamp || 0) > (existing.timestamp || 0)) {
        latestByPlayer.set(key, ev);
      }
    }

    for (const actor of playerActors) {
      if (actor?.id == null) continue;
      const key = String(actor.id);
      const latest = latestByPlayer.get(key);
      const gear = (latest?.gear || []).map((g) => ({
        id: g.id,
        slot: 0, // slot is not available in combatantinfo; default to 0
        quality: g.quality,
        icon: g.icon,
        name: g.name,
        championPoints: g.championPoints,
        trait: g.trait,
        enchantType: g.enchantType,
        enchantQuality: g.enchantQuality,
        setID: g.setID,
        type: g.type,
        setName: undefined,
        flags: undefined,
      }));

      record[key] = {
        id: actor.id,
        name: actor.name ?? String(actor.id),
        displayName: actor.name ?? String(actor.id),
        combatantInfo: {
          talents: [], // Not present in combatantinfo events
          gear,
        },
      } as PlayerInfo;
    }

    return record;
  }, [playerActors, combatantInfoEvents]);

  // Compute CPM (casts per minute) per player for the current fight, excluding specific abilities per provided filter
  const cpmByPlayer = React.useMemo(() => {
    const result: Record<string, number> = {};
    if (!events) return result;

    const fightNum = fightId ? Number(fightId) : undefined;

    // Exclusion list extracted from the provided pins filter
    const excluded = new Set<number>([
      16499, 28541, 16165, 16145, 18350, 28549, 45223, 18396, 16277, 115548, 85572,
      23196, 95040, 39301, 63507, 22269, 95042, 191078, 32910, 41963, 16261, 45221,
      48076, 32974, 21970, 41838, 16565, 45227, 118604, 26832, 15383, 45382, 16420,
      68401, 47193, 190583, 16212, 228524, 186981, 16037, 15435, 15279, 72931, 45228,
      16688, 61875, 61874,
    ]);

    const playerIds = new Set(
      (playerActors || [])
        .filter((a) => a.id != null)
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
        if (src && playerIds.has(src) && typeof abilityId === 'number' && !excluded.has(abilityId)) {
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
  }, [events, playerActors, fightId]);

  // Compute death counts per player for the current fight
  const deathsByPlayer = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (!events) return counts;

    const fightNum = fightId ? Number(fightId) : undefined;

    for (const ev of events as any[]) {
      if (ev.type === 'death' && (fightNum == null || (typeof ev.fight === 'number' && ev.fight === fightNum))) {
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

    const playerIdSet = new Set(
      playerActors.filter((a) => a.id != null).map((a) => String(a.id))
    );

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

    playerActors.forEach((actor) => {
      if (!actor?.id) return;
      const playerId = String(actor.id);
      result[playerId] = [];

      // Latest combatantinfo event for this player
      const combatantInfoEventsForPlayer = combatantInfoEvents
        .filter((event): event is CombatantInfoEvent => {
          return (
            event.type === 'combatantinfo' &&
            'sourceID' in event &&
            String(event.sourceID) === playerId
          );
        })
        .sort((a: CombatantInfoEvent, b: CombatantInfoEvent) => (b.timestamp || 0) - (a.timestamp || 0));

      const latestCombatantInfo = combatantInfoEventsForPlayer[0];
      if (latestCombatantInfo?.auras) {
        latestCombatantInfo.auras.forEach((aura: CombatantAura) => {
          const ability = abilitiesById[aura.ability];
          const auraName = ability?.name || aura.name || `Unknown Aura (${aura.ability})`;
          result[playerId].push({
            name: auraName,
            id: aura.ability,
            stacks: aura.stacks,
          });
        });
        result[playerId].sort((a, b) => a.name.localeCompare(b.name));
      }
    });

    return result;
  }, [combatantInfoEvents, abilitiesById, playerActors]);

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

export default PlayersPanel;
