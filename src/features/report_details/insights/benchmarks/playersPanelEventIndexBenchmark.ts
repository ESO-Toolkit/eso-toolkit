import type {
  ApplyBuffEvent,
  BuffEvent,
  CombatantInfoEvent,
} from '../../../../types/combatlogEvents';
import { createPlayersPanelEventIndex } from '../playerEventIndex';

export interface PlayerEventBenchmarkFixture {
  eventCount: number;
  playerCount: number;
  players: ReadonlyArray<{ id: number }>;
  combatantInfoEvents: readonly CombatantInfoEvent[];
  friendlyBuffEvents: readonly BuffEvent[];
}

export interface PlayerEventIndexComparableOutput {
  playerIdsInOrder: readonly number[];
  combatantInfoEventsByPlayerId: ReadonlyMap<number, readonly CombatantInfoEvent[]>;
  latestCombatantInfoEventByPlayerId: ReadonlyMap<number, CombatantInfoEvent>;
  applyBuffEventsByPlayerId: ReadonlyMap<number, readonly ApplyBuffEvent[]>;
  inspectedEvents: number;
}

export const PLAYER_EVENT_BENCHMARK_SCALES = [
  { eventCount: 10_000, playerCount: 4 },
  { eventCount: 100_000, playerCount: 12 },
  { eventCount: 500_000, playerCount: 12 },
] as const;

const playerIdFor = (index: number, playerCount: number): number => (index % playerCount) + 1;

const createCombatantInfoEvent = (index: number, playerCount: number): CombatantInfoEvent => ({
  timestamp: index % 97,
  type: 'combatantinfo',
  fight: 1,
  sourceID: index % 5 === 0 ? 900_000 + (index % 31) : playerIdFor(index, playerCount),
  gear: [],
  auras: [
    {
      ability: 1_000 + (index % 127),
      icon: '',
      name: `Aura ${index % 127}`,
      source: playerIdFor(index, playerCount),
      stacks: 1,
    },
  ],
});

const createFriendlyBuffEvent = (index: number, playerCount: number): BuffEvent => {
  const playerId = playerIdFor(index, playerCount);
  const sourceID = index % 4 === 0 ? 800_000 + (index % 19) : playerId;
  const targetID = index % 3 === 0 ? playerIdFor(index + 1, playerCount) : 700_000 + (index % 23);
  const baseEvent = {
    timestamp: 250_000 + index,
    sourceID,
    sourceIsFriendly: true,
    targetID,
    targetIsFriendly: true,
    abilityGameID: 2_000 + (index % 251),
    fight: 1,
    extraAbilityGameID: 0,
  } as const;

  return index % 7 === 0
    ? { ...baseEvent, type: 'removebuff' }
    : { ...baseEvent, type: 'applybuff' };
};

/** Creates repeatable source streams with both player and non-player events. */
export const createPlayerEventBenchmarkFixture = (
  eventCount: number,
  playerCount: number,
): PlayerEventBenchmarkFixture => {
  if (!Number.isSafeInteger(eventCount) || eventCount <= 0) {
    throw new Error('eventCount must be a positive safe integer.');
  }
  if (!Number.isSafeInteger(playerCount) || playerCount <= 0) {
    throw new Error('playerCount must be a positive safe integer.');
  }

  const combatantInfoCount = Math.floor(eventCount / 2);
  const friendlyBuffCount = eventCount - combatantInfoCount;

  return {
    eventCount,
    playerCount,
    players: Array.from({ length: playerCount }, (_, index) => ({ id: index + 1 })),
    combatantInfoEvents: Array.from({ length: combatantInfoCount }, (_, index) =>
      createCombatantInfoEvent(index, playerCount),
    ),
    friendlyBuffEvents: Array.from({ length: friendlyBuffCount }, (_, index) =>
      createFriendlyBuffEvent(index, playerCount),
    ),
  };
};

/**
 * The old PlayersPanel shape: its Mundus, Champion Point, and aura memos each
 * filtered the full combatant-info stream per player; the Mundus fallback also
 * filtered the friendly-buff stream. This is deliberately not optimized: it is
 * the comparison baseline for the shipped index.
 */
export const createLegacyRepeatedFilterPlayerEventIndex = (
  fixture: PlayerEventBenchmarkFixture,
): PlayerEventIndexComparableOutput => {
  const combatantInfoEventsByPlayerId = new Map<number, readonly CombatantInfoEvent[]>();
  const latestCombatantInfoEventByPlayerId = new Map<number, CombatantInfoEvent>();
  const applyBuffEventsByPlayerId = new Map<number, readonly ApplyBuffEvent[]>();

  for (const playerId of fixture.players.map((player) => player.id)) {
    const playerIdString = String(playerId);
    const mundusCombatantInfoEventsForPlayer = fixture.combatantInfoEvents.filter(
      (event) => String(event.sourceID) === playerIdString,
    );
    const championPointCombatantInfoEventsForPlayer = fixture.combatantInfoEvents.filter(
      (event) => String(event.sourceID) === playerIdString,
    );
    const auraCombatantInfoEventsForPlayer = fixture.combatantInfoEvents
      .filter((event) => String(event.sourceID) === playerIdString)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (mundusCombatantInfoEventsForPlayer.length > 0) {
      combatantInfoEventsByPlayerId.set(playerId, championPointCombatantInfoEventsForPlayer);
      const latestCombatantInfo = auraCombatantInfoEventsForPlayer[0];
      if (latestCombatantInfo) {
        latestCombatantInfoEventByPlayerId.set(playerId, latestCombatantInfo);
      }
    }

    // This fixture intentionally contains no Mundus aura, exercising the old
    // per-player fallback that searched the whole friendly-buff stream.
    const applyBuffEventsForPlayer = fixture.friendlyBuffEvents.filter(
      (event): event is ApplyBuffEvent =>
        event.type === 'applybuff' &&
        (String(event.sourceID) === playerIdString || String(event.targetID) === playerIdString),
    );
    if (applyBuffEventsForPlayer.length > 0) {
      applyBuffEventsByPlayerId.set(playerId, applyBuffEventsForPlayer);
    }
  }

  return {
    playerIdsInOrder: fixture.players.map((player) => player.id),
    combatantInfoEventsByPlayerId,
    latestCombatantInfoEventByPlayerId,
    applyBuffEventsByPlayerId,
    // Three combatant-info scans plus one friendly-buff scan. Each stream is
    // half of the fixture, so this is two total-fixture scans per player.
    inspectedEvents: fixture.eventCount * fixture.playerCount * 2,
  };
};

export const createIndexedPlayerEventOutput = (
  fixture: PlayerEventBenchmarkFixture,
): PlayerEventIndexComparableOutput => {
  const index = createPlayersPanelEventIndex(
    fixture.players,
    fixture.combatantInfoEvents,
    fixture.friendlyBuffEvents,
  );

  return {
    playerIdsInOrder: index.playerIdsInOrder,
    combatantInfoEventsByPlayerId: index.combatantInfoEventsByPlayerId,
    latestCombatantInfoEventByPlayerId: index.latestCombatantInfoEventByPlayerId,
    applyBuffEventsByPlayerId: index.applyBuffEventsByPlayerId,
    inspectedEvents: index.stats.combatantInfoEventsVisited + index.stats.friendlyBuffEventsVisited,
  };
};

const combatantInfoIdentity = (event: CombatantInfoEvent): string =>
  `${event.sourceID}:${event.timestamp}:${event.auras.map((aura) => aura.ability).join(',')}`;

const applyBuffIdentity = (event: ApplyBuffEvent): string =>
  `${event.sourceID}:${event.targetID}:${event.abilityGameID}:${event.timestamp}`;

/** Normalizes map topology so absent entries and consumer-equivalent empty arrays compare equally. */
export const toComparablePlayerEventIndex = (
  output: PlayerEventIndexComparableOutput,
): Array<{
  playerId: number;
  combatantInfo: string[];
  latestCombatantInfo: string | null;
  applyBuffs: string[];
}> =>
  output.playerIdsInOrder.map((playerId) => ({
    playerId,
    combatantInfo: (output.combatantInfoEventsByPlayerId.get(playerId) ?? []).map(
      combatantInfoIdentity,
    ),
    latestCombatantInfo: output.latestCombatantInfoEventByPlayerId.has(playerId)
      ? combatantInfoIdentity(output.latestCombatantInfoEventByPlayerId.get(playerId)!)
      : null,
    applyBuffs: (output.applyBuffEventsByPlayerId.get(playerId) ?? []).map(applyBuffIdentity),
  }));

/** A compact, deterministic checksum suitable for recording benchmark equivalence evidence. */
export const createPlayerEventIndexDigest = (output: PlayerEventIndexComparableOutput): string => {
  const serialized = JSON.stringify(toComparablePlayerEventIndex(output));
  let hash = 0x811c9dc5;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
};
