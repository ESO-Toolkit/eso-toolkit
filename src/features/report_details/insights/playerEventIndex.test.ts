import type { ApplyBuffEvent, BuffEvent, CombatantInfoEvent } from '../../../types/combatlogEvents';

import { createPlayersPanelEventIndex } from './playerEventIndex';

const combatantInfo = (
  sourceID: number,
  timestamp: number,
  abilityId: number,
): CombatantInfoEvent => ({
  sourceID,
  timestamp,
  type: 'combatantinfo',
  fight: 1,
  gear: [],
  auras: [
    {
      ability: abilityId,
      icon: '',
      name: `Aura ${abilityId}`,
      source: sourceID,
      stacks: 1,
    },
  ],
});

const applyBuff = (sourceID: number, targetID: number, abilityGameID: number): ApplyBuffEvent => ({
  sourceID,
  targetID,
  abilityGameID,
  timestamp: abilityGameID,
  type: 'applybuff',
  fight: 1,
  sourceIsFriendly: true,
  targetIsFriendly: true,
  extraAbilityGameID: 0,
});

const toEntries = <T>(
  eventsByPlayerId: ReadonlyMap<number, readonly T[]>,
): Array<[number, readonly T[]]> => Array.from(eventsByPlayerId.entries());

describe('createPlayersPanelEventIndex', () => {
  it('matches the former per-player filters while preserving event order and latest-snapshot ties', () => {
    const players = [{ id: 101 }, { id: 202 }, { id: 0 }];
    const combatantInfoEvents = [
      combatantInfo(101, 10, 1),
      combatantInfo(999, 100, 2),
      combatantInfo(101, 30, 3),
      combatantInfo(101, 30, 4),
      combatantInfo(202, 20, 5),
    ];
    const firstApply = applyBuff(101, 101, 10);
    const sharedApply = applyBuff(101, 202, 11);
    const targetApply = applyBuff(999, 101, 12);
    const friendlyBuffEvents: BuffEvent[] = [
      firstApply,
      sharedApply,
      { ...applyBuff(202, 202, 13), type: 'removebuff' },
      targetApply,
    ];

    const index = createPlayersPanelEventIndex(players, combatantInfoEvents, friendlyBuffEvents);

    const expectedCombatantInfoEntries = players
      .filter((player) => Boolean(player.id))
      .map((player) => [
        player.id,
        combatantInfoEvents.filter((event) => event.sourceID === player.id),
      ]) as Array<[number, CombatantInfoEvent[]]>;
    const expectedApplyBuffEntries = players
      .filter((player) => Boolean(player.id))
      .map((player) => [
        player.id,
        friendlyBuffEvents.filter(
          (event): event is ApplyBuffEvent =>
            event.type === 'applybuff' &&
            (event.sourceID === player.id || event.targetID === player.id),
        ),
      ]) as Array<[number, ApplyBuffEvent[]]>;

    expect(Array.from(index.playerIds)).toEqual([101, 202]);
    expect(toEntries(index.combatantInfoEventsByPlayerId)).toEqual(expectedCombatantInfoEntries);
    expect(toEntries(index.applyBuffEventsByPlayerId)).toEqual(expectedApplyBuffEntries);
    expect(index.latestCombatantInfoEventByPlayerId.get(101)).toBe(combatantInfoEvents[2]);
    expect(index.latestCombatantInfoEventByPlayerId.get(202)).toBe(combatantInfoEvents[4]);
    expect(index.stats).toEqual({ combatantInfoEventsVisited: 5, friendlyBuffEventsVisited: 4 });
  });

  it.each([
    [10_000, 1],
    [100_000, 32],
    [500_000, 1_000],
  ])(
    'visits each event once for the %i-event benchmark fixture with %i players',
    (eventCount, playerCount) => {
      const players = Array.from({ length: playerCount }, (_, index) => ({ id: index + 1 }));
      const combatantInfoCount = Math.floor(eventCount / 2);
      const combatantInfoEvents = Array.from({ length: combatantInfoCount }, (_, index) =>
        combatantInfo(index % 33 === 0 ? (index % playerCount) + 1 : 999, index, index),
      );
      const friendlyBuffEvents = Array.from(
        { length: eventCount - combatantInfoCount },
        (_, index) => applyBuff(index % 33 === 0 ? (index % playerCount) + 1 : 999, 999, index),
      );

      const playerEventIndex = createPlayersPanelEventIndex(
        players,
        combatantInfoEvents,
        friendlyBuffEvents,
      );

      expect(
        playerEventIndex.stats.combatantInfoEventsVisited +
          playerEventIndex.stats.friendlyBuffEventsVisited,
      ).toBe(eventCount);
      expect(playerEventIndex.stats.combatantInfoEventsVisited).toBe(combatantInfoCount);
      expect(playerEventIndex.stats.friendlyBuffEventsVisited).toBe(
        eventCount - combatantInfoCount,
      );
      expect(playerEventIndex.playerIds.size).toBe(playerCount);
    },
  );
});
