import type { BuffEvent, CombatantInfoEvent } from '../../../types/combatlogEvents';

interface PlayerWithId {
  id?: number | null;
}

export interface PlayersPanelEventIndexStats {
  combatantInfoEventsVisited: number;
  friendlyBuffEventsVisited: number;
}

export interface PlayersPanelEventIndex {
  playerIds: ReadonlySet<number>;
  playerIdsInOrder: readonly number[];
  combatantInfoEventsByPlayerId: ReadonlyMap<number, readonly CombatantInfoEvent[]>;
  latestCombatantInfoEventByPlayerId: ReadonlyMap<number, CombatantInfoEvent>;
  applyBuffEventsByPlayerId: ReadonlyMap<
    number,
    readonly Extract<BuffEvent, { type: 'applybuff' }>[]
  >;
  stats: PlayersPanelEventIndexStats;
}

const appendToPlayerEvents = <T>(
  eventsByPlayerId: Map<number, T[]>,
  playerId: number,
  event: T,
): void => {
  const events = eventsByPlayerId.get(playerId);
  if (events) {
    events.push(event);
    return;
  }

  eventsByPlayerId.set(playerId, [event]);
};

/**
 * Builds the event views consumed by PlayersPanel in one pass per source stream.
 * Event arrays retain their original order; equal combatant-info timestamps retain
 * the first event, matching the stable sort formerly used for aura snapshots.
 */
export const createPlayersPanelEventIndex = (
  players: readonly PlayerWithId[] | null | undefined,
  combatantInfoEvents: readonly CombatantInfoEvent[] | null | undefined,
  friendlyBuffEvents: readonly BuffEvent[] | null | undefined,
): PlayersPanelEventIndex => {
  const playerIds = new Set<number>();
  const playerIdsInOrder: number[] = [];

  for (const player of players ?? []) {
    if (!player?.id || playerIds.has(player.id)) continue;
    playerIds.add(player.id);
    playerIdsInOrder.push(player.id);
  }

  const combatantInfoEventsByPlayerId = new Map<number, CombatantInfoEvent[]>();
  const latestCombatantInfoEventByPlayerId = new Map<number, CombatantInfoEvent>();
  let combatantInfoEventsVisited = 0;

  for (const event of combatantInfoEvents ?? []) {
    combatantInfoEventsVisited += 1;
    if (!playerIds.has(event.sourceID)) continue;

    appendToPlayerEvents(combatantInfoEventsByPlayerId, event.sourceID, event);

    const latest = latestCombatantInfoEventByPlayerId.get(event.sourceID);
    if (!latest || event.timestamp > latest.timestamp) {
      latestCombatantInfoEventByPlayerId.set(event.sourceID, event);
    }
  }

  const applyBuffEventsByPlayerId = new Map<number, Extract<BuffEvent, { type: 'applybuff' }>[]>();
  let friendlyBuffEventsVisited = 0;

  for (const event of friendlyBuffEvents ?? []) {
    friendlyBuffEventsVisited += 1;
    if (event.type !== 'applybuff') continue;

    if (playerIds.has(event.sourceID)) {
      appendToPlayerEvents(applyBuffEventsByPlayerId, event.sourceID, event);
    }
    if (event.targetID !== event.sourceID && playerIds.has(event.targetID)) {
      appendToPlayerEvents(applyBuffEventsByPlayerId, event.targetID, event);
    }
  }

  return {
    playerIds,
    playerIdsInOrder,
    combatantInfoEventsByPlayerId,
    latestCombatantInfoEventByPlayerId,
    applyBuffEventsByPlayerId,
    stats: {
      combatantInfoEventsVisited,
      friendlyBuffEventsVisited,
    },
  };
};
