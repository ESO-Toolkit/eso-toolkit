import { DamageEvent } from '../../types/combatlogEvents';
import { selectDamageEventsByPlayer } from '../events_data/damageEventsSelectors';
import { RootState } from '../storeWithHistory';

// Mock state for testing
const createMockState = (
  damageEvents: DamageEvent[],
): Pick<RootState, 'events' | 'masterData'> => ({
  masterData: {
    actorsById: {},
    abilitiesById: {},
    loading: false,
    loaded: false,
    error: null,
    cacheMetadata: {
      lastFetchedReportId: null,
      lastFetchedTimestamp: null,
      actorCount: 0,
      abilityCount: 0,
    },
  },
  events: {
    damage: {
      events: damageEvents,
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
    },
    healing: {
      events: [],
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
    },
    deaths: {
      events: [],
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
    },
    combatantInfo: {
      events: [],
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
        eventCount: 0,
      },
    },
    debuffs: {
      events: [],
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
    },
    casts: {
      events: [],
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
    },
    resources: {
      events: [],
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
    },
    friendlyBuffs: {
      events: [],
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
    },
    hostileBuffs: {
      events: [],
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
    },
  },
});

// Helper function to create test damage events
const createDamageEvent = (sourceID: number, targetID: number, amount: number): DamageEvent => ({
  timestamp: 1000,
  type: 'damage',
  sourceID,
  sourceIsFriendly: true,
  targetID,
  targetIsFriendly: false,
  abilityGameID: 12345,
  fight: 1,
  hitType: 1,
  amount,
  castTrackID: 1,
  sourceResources: {
    hitPoints: 100,
    maxHitPoints: 100,
    stamina: 100,
    maxStamina: 100,
    magicka: 100,
    maxMagicka: 100,
    ultimate: 0,
    maxUltimate: 500,
    werewolf: 0,
    maxWerewolf: 100,
    absorb: 0,
    championPoints: 0,
    x: 0,
    y: 0,
    facing: 0,
  },
  targetResources: {
    hitPoints: 100,
    maxHitPoints: 100,
    stamina: 100,
    maxStamina: 100,
    magicka: 100,
    maxMagicka: 100,
    ultimate: 0,
    maxUltimate: 500,
    werewolf: 0,
    maxWerewolf: 100,
    absorb: 0,
    championPoints: 0,
    x: 0,
    y: 0,
    facing: 0,
  },
});

describe('selectDamageEventsByPlayer', () => {
  it('should group damage events by player ID', () => {
    const events = [
      createDamageEvent(123, 456, 1000),
      createDamageEvent(123, 789, 500),
      createDamageEvent(789, 456, 750),
    ];

    const state = createMockState(events) as RootState;
    const result = selectDamageEventsByPlayer(state);

    expect(result).toEqual({
      '123': [events[0], events[1]],
      '789': [events[2]],
    });
  });

  it('should return empty object for empty damage events', () => {
    const state = createMockState([]) as RootState;
    const result = selectDamageEventsByPlayer(state);

    expect(result).toEqual({});
  });

  it('should memoize results correctly', () => {
    const events = [createDamageEvent(123, 456, 1000), createDamageEvent(789, 456, 750)];

    const state = createMockState(events) as RootState;
    const result1 = selectDamageEventsByPlayer(state);
    const result2 = selectDamageEventsByPlayer(state);

    // Results should be the same reference due to memoization
    expect(result1).toBe(result2);
  });
});
