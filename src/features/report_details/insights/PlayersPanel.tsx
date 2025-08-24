import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment, ReportActorFragment } from '../../../graphql/generated';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { useReportFightParams } from '../../../hooks/useReportFightParams';
import { PlayerInfo } from '../../../store/events_data/actions';
import { selectAllEvents } from '../../../store/events_data/selectors';
import { selectActorsById } from '../../../store/master_data/masterDataSelectors';
import { selectReportFights } from '../../../store/report/reportSelectors';
import { RootState } from '../../../store/storeWithHistory';
import { MundusStones } from '../../../types/abilities';
import { CombatantInfoEvent, CombatantAura, LogEvent } from '../../../types/combatlogEvents';

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
  // Upstream selectors: combined events and master data
  const events = useSelector<RootState, LogEvent[]>(selectAllEvents);
  const actorsById = useSelector((state: RootState) => selectActorsById(state));
  const fights = useSelector((state: RootState) => selectReportFights(state)) as
    | FightFragment[]
    | null
    | undefined;

  // Derive player actors from the CURRENTLY SELECTED FIGHT (fallback to first fight)
  const playerActors = React.useMemo<ReportActorFragment[]>(() => {
    const fightIdNum = fightId ? parseInt(fightId, 10) : NaN;
    const selectedFight = fights?.find((f) => f.id === fightIdNum) ?? fights?.[0] ?? null;
    const friendlyPlayers = selectedFight?.friendlyPlayers ?? [];
    return friendlyPlayers
      .filter((id): id is number => typeof id === 'number' && id !== null)
      .map((id) => actorsById?.[id])
      .filter(Boolean) as ReportActorFragment[];
  }, [actorsById, fights, fightId]);

  // Fetch and access enriched player details (talents, gear with set names, displayName)
  const { playerData } = usePlayerData();

  // Derive combatantinfo events from the main events stream
  const combatantInfoEvents = React.useMemo(
    () =>
      (events || []).filter((e: LogEvent): e is CombatantInfoEvent => e.type === 'combatantinfo'),
    [events]
  );

  // Calculate unique mundus buffs per player using MundusStones enum from combatantinfo auras
  const mundusBuffsByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number }>> = {};

    if (!combatantInfoEvents || !abilitiesById) return result;

    // Get numeric mundus stone ability IDs from the enum (filter out string keys)
    const mundusStoneIds = Object.values(MundusStones).filter(
      (v): v is number => typeof v === 'number'
    );
    // Secondary: detect by ability name in case logs use alternate IDs (e.g., "Bonus (2): The Atronach")
    const mundusNameRegex =
      /^(?:Boon:|Bonus\s*\(2\):)?\s*The\s+(Warrior|Mage|Serpent|Thief|Lady|Steed|Lord|Apprentice|Ritual|Lover|Atronach|Shadow|Tower)\b/i;

    // Initialize arrays for each player
    playerActors.forEach((actor) => {
      if (actor?.id) {
        const playerId = String(actor.id);
        result[playerId] = [];

        // Gather ALL combatantinfo events for this player and union mundus auras across them
        const combatantInfoEventsForPlayer = combatantInfoEvents.filter(
          (event: CombatantInfoEvent): event is CombatantInfoEvent =>
            event.type === 'combatantinfo' &&
            'sourceID' in event &&
            String(event.sourceID) === playerId
        );

        if (combatantInfoEventsForPlayer.length > 0) {
          const seen = new Set<number>();
          for (const cie of combatantInfoEventsForPlayer) {
            const auras = cie.auras || [];
            for (const aura of auras as CombatantAura[]) {
              const ability = abilitiesById[aura.ability];
              const name = ability?.name || aura.name || '';
              const isMundusById = mundusStoneIds.includes(aura.ability);
              const isMundusByName = mundusNameRegex.test(name);
              if (!isMundusById && !isMundusByName) continue;
              if (seen.has(aura.ability)) continue;
              seen.add(aura.ability);
              const mundusName = name || `Unknown Mundus (${aura.ability})`;
              const cleaned = mundusName.replace(/^(?:Boon:|Bonus\s*\(2\):)\s*/i, '').trim();
              result[playerId].push({ name: cleaned, id: aura.ability });
            }
          }
        }

        // Fallback: If none found via combatantinfo, scan applybuff events for mundus on this player
        if (result[playerId].length === 0) {
          for (const ev of (events || []) as LogEvent[]) {
            if (ev.type === 'applybuff') {
              const abilityId = ev.abilityGameID;
              // mundus applies to self; match either source or target to this player
              const appliesToPlayer =
                (ev.targetID != null && String(ev.targetID) === playerId) ||
                (ev.sourceID != null && String(ev.sourceID) === playerId);
              if (typeof abilityId === 'number' && appliesToPlayer) {
                const ability = abilitiesById[abilityId];
                const name = ability?.name || '';
                const isMundus = mundusStoneIds.includes(abilityId) || mundusNameRegex.test(name);
                if (isMundus) {
                  const mundusName = name || `Mundus (${abilityId})`;
                  const cleaned = mundusName.replace(/^(?:Boon:|Bonus\s*\(2\):)\s*/i, '').trim();
                  result[playerId].push({ name: cleaned, id: abilityId });
                  break; // one mundus is sufficient
                }
              }
            }
          }
        }
      }
    });

    return result;
  }, [combatantInfoEvents, abilitiesById, playerActors, events]);

  // Convert event players array into a record keyed by player ID. Prefer enriched playerData; fallback to latest combatantinfo.
  const eventPlayers: Record<string, PlayerInfo> = React.useMemo(() => {
    const record: Record<string, PlayerInfo> = {};
    if (!playerActors || playerActors.length === 0) return record;

    // Pre-index latest combatantinfo per sourceID
    const latestByPlayer = new Map<string, CombatantInfoEvent>();
    for (const ev of combatantInfoEvents) {
      const key = String(ev.sourceID);
      const existing = latestByPlayer.get(key);
      if (!existing || (ev.timestamp || 0) > (existing.timestamp || 0)) {
        latestByPlayer.set(key, ev);
      }
    }

    for (const actor of playerActors) {
      if (actor?.id == null) continue;
      const key = String(actor.id);
      const latest = latestByPlayer.get(key);
      // Prefer playerData for richer info (talents + gear with setName); fallback to combatantinfo
      const pd = playerData?.playersById?.[actor.id];
      const gear =
        pd?.combatantInfo?.gear && pd.combatantInfo.gear.length > 0
          ? pd.combatantInfo.gear
          : (latest?.gear || []).map((g) => ({
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
      const talents =
        pd?.combatantInfo?.talents && pd.combatantInfo.talents.length > 0
          ? pd.combatantInfo.talents
          : [];

      record[key] = {
        id: actor.id,
        name: pd?.displayName ?? actor.name ?? String(actor.id),
        displayName: pd?.displayName ?? actor.name ?? String(actor.id),
        combatantInfo: {
          talents,
          gear,
        },
      } as PlayerInfo;
    }

    return record;
  }, [playerActors, combatantInfoEvents, playerData]);

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
      (playerActors || []).filter((a) => a.id != null).map((a) => String(a.id))
    );

    // Limit to events in this fight (if present) and gather timestamps for duration
    let minTs = Number.POSITIVE_INFINITY;
    let maxTs = Number.NEGATIVE_INFINITY;

    const eventsInScope = events.filter((ev: LogEvent) =>
      fightNum == null ? true : typeof ev.fight === 'number' && ev.fight === fightNum
    );

    for (const ev of eventsInScope as LogEvent[]) {
      if (typeof ev.timestamp === 'number') {
        if (ev.timestamp < minTs) minTs = ev.timestamp;
        if (ev.timestamp > maxTs) maxTs = ev.timestamp;
      }
      if (ev.type === 'cast') {
        const src = ev.sourceID != null ? String(ev.sourceID) : undefined;
        const abilityId = ev.abilityGameID;
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
  }, [events, playerActors, fightId]);

  // Compute death counts per player for the current fight
  const deathsByPlayer = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (!events) return counts;

    const fightNum = fightId ? Number(fightId) : undefined;

    for (const ev of events as LogEvent[]) {
      if (
        ev.type === 'death' &&
        (fightNum == null || (typeof ev.fight === 'number' && ev.fight === fightNum))
      ) {
        const target = ev.targetID; // DeathEvent always includes targetID
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

    for (const ev of events as LogEvent[]) {
      // Buff applications carry sourceID (the resurrector) when available
      if (ev.type === 'applybuff') {
        const abilityId = ev.abilityGameID;
        if (typeof abilityId === 'number' && rvSet.has(abilityId)) {
          const src = ev.sourceID;
          if (src != null && playerIdSet.has(String(src))) {
            const key = String(src);
            counts[key] = (counts[key] || 0) + 1;
          }
        }
      }
    }

    return counts;
  }, [events, abilitiesById, playerActors]);

  // Calculate all auras per player from combatantinfo events (union across all events for robustness)
  const aurasByPlayer = React.useMemo(() => {
    const result: Record<string, Array<{ name: string; id: number; stacks?: number }>> = {};

    if (!combatantInfoEvents || !abilitiesById) return result;

    playerActors.forEach((actor) => {
      if (!actor?.id) return;
      const playerId = String(actor.id);
      result[playerId] = [];

      // Gather ALL combatantinfo events for this player and union their auras
      const combatantInfoEventsForPlayer = combatantInfoEvents.filter(
        (event): event is CombatantInfoEvent =>
          event.type === 'combatantinfo' &&
          'sourceID' in event &&
          String(event.sourceID) === playerId
      );

      if (combatantInfoEventsForPlayer.length > 0) {
        const byId = new Map<number, { name: string; id: number; stacks?: number }>();
        for (const cie of combatantInfoEventsForPlayer) {
          const auras = cie.auras || [];
          for (const aura of auras as CombatantAura[]) {
            const ability = abilitiesById[aura.ability];
            const auraName = ability?.name || aura.name || `Unknown Aura (${aura.ability})`;
            const existing = byId.get(aura.ability);
            // Prefer the latest stacks if available
            if (!existing || (aura.stacks ?? 0) > (existing.stacks ?? 0)) {
              byId.set(aura.ability, { name: auraName, id: aura.ability, stacks: aura.stacks });
            }
          }
        }
        result[playerId] = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
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
