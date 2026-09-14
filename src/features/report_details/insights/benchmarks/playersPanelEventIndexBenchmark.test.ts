import {
  createIndexedPlayerEventOutput,
  createLegacyRepeatedFilterPlayerEventIndex,
  createPlayerEventBenchmarkFixture,
  createPlayerEventIndexDigest,
  PLAYER_EVENT_BENCHMARK_SCALES,
  toComparablePlayerEventIndex,
} from './playersPanelEventIndexBenchmark';

describe('PlayersPanel event-index benchmark fixtures', () => {
  it.each(PLAYER_EVENT_BENCHMARK_SCALES)(
    'keeps the one-pass index equivalent to the legacy repeated filters at $eventCount events',
    ({ eventCount, playerCount }) => {
      const fixture = createPlayerEventBenchmarkFixture(eventCount, playerCount);
      const legacy = createLegacyRepeatedFilterPlayerEventIndex(fixture);
      const indexed = createIndexedPlayerEventOutput(fixture);

      expect(toComparablePlayerEventIndex(indexed)).toEqual(toComparablePlayerEventIndex(legacy));
      expect(createPlayerEventIndexDigest(indexed)).toBe(createPlayerEventIndexDigest(legacy));
      expect(indexed.inspectedEvents).toBe(eventCount);
      expect(legacy.inspectedEvents).toBe(eventCount * playerCount * 2);
    },
  );
});
