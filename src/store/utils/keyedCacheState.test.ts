import type { ReportFightCacheKey } from '../contextTypes';

import { trimCache, type KeyedCacheState } from './keyedCacheState';

interface TestEvent {
  id: number;
}

interface EventEntry {
  events: TestEvent[];
  currentRequest?: { requestId: string } | null;
}

const key = (value: string): ReportFightCacheKey => value;

const eventRange = (count: number): TestEvent[] =>
  Array.from({ length: count }, (_, id) => ({ id }));

describe('trimCache event-array retention', () => {
  it('evicts the least-recent cache entry without truncating retained event arrays', () => {
    const oldestKey = key('oldest');
    const retainedKey = key('retained');
    const newestKey = key('newest');
    const state: KeyedCacheState<EventEntry> = {
      entries: {
        [oldestKey]: { events: eventRange(4) },
        [retainedKey]: { events: eventRange(4) },
        [newestKey]: { events: eventRange(4) },
      },
      accessOrder: [oldestKey, retainedKey, newestKey],
    };

    trimCache(state, 2);

    expect(state.entries[oldestKey]).toBeUndefined();
    expect(state.accessOrder).toEqual([retainedKey, newestKey]);
    // Per-stream ingestion caps reject oversized responses before they reach
    // the cache. Retained successful entries must remain complete.
    expect(state.entries[retainedKey]?.events.map(({ id }) => id)).toEqual([0, 1, 2, 3]);
    expect(state.entries[newestKey]?.events.map(({ id }) => id)).toEqual([0, 1, 2, 3]);
  });

  it('never evicts an in-flight entry while trimming completed entries', () => {
    const loadingKey = key('loading');
    const completedKey = key('completed');
    const state: KeyedCacheState<EventEntry> = {
      entries: {
        [loadingKey]: { events: [], currentRequest: { requestId: 'active' } },
        [completedKey]: { events: eventRange(2), currentRequest: null },
      },
      accessOrder: [loadingKey, completedKey],
    };

    trimCache(state, 1);

    expect(state.entries[loadingKey]?.currentRequest).toEqual({ requestId: 'active' });
    expect(state.entries[completedKey]).toBeUndefined();
    expect(state.accessOrder).toEqual([loadingKey]);
  });

  it('temporarily exceeds the limit when every cache entry is in flight', () => {
    const firstKey = key('first');
    const secondKey = key('second');
    const state: KeyedCacheState<EventEntry> = {
      entries: {
        [firstKey]: { events: [], currentRequest: { requestId: 'first' } },
        [secondKey]: { events: [], currentRequest: { requestId: 'second' } },
      },
      accessOrder: [firstKey, secondKey],
    };

    trimCache(state, 1);

    expect(Object.keys(state.entries)).toHaveLength(2);
    expect(state.accessOrder).toEqual([firstKey, secondKey]);
  });

  it('preserves in-flight entries when trimming to zero', () => {
    const loadingKey = key('loading');
    const completedKey = key('completed');
    const state: KeyedCacheState<EventEntry> = {
      entries: {
        [loadingKey]: { events: [], currentRequest: { requestId: 'active' } },
        [completedKey]: { events: eventRange(2), currentRequest: null },
      },
      accessOrder: [loadingKey, completedKey],
    };

    trimCache(state, 0);

    expect(state.entries[loadingKey]?.currentRequest).toEqual({ requestId: 'active' });
    expect(state.entries[completedKey]).toBeUndefined();
    expect(state.accessOrder).toEqual([loadingKey]);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    'fails closed for a non-finite cache limit of %s',
    (limit) => {
      const completedKey = key('completed');
      const state: KeyedCacheState<EventEntry> = {
        entries: {
          [completedKey]: { events: eventRange(2), currentRequest: null },
        },
        accessOrder: [completedKey],
      };

      trimCache(state, limit);

      expect(state.entries[completedKey]).toBeUndefined();
      expect(state.accessOrder).toEqual([]);
    },
  );
});
