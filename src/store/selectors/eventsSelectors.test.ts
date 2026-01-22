import { BuffEvent, DebuffEvent } from '../../types/combatlogEvents';
import { resolveCacheKey } from '../utils/keyedCacheState';
import type { HostileBuffEventsEntry } from '../events_data/hostileBuffEventsSlice';
import type { DebuffEventsEntry } from '../events_data/debuffEventsSlice';
import { RootState } from '../storeWithHistory';

import {
  selectHostileBuffLookup,
  selectDebuffLookup,
  selectSelectedFightId,
  selectCurrentFight,
} from './eventsSelectors';

// Mock state structure
const createMockState = (overrides: Partial<RootState> = {}): RootState => {
  const reportKey = resolveCacheKey({ reportCode: 'test-report' }).key;
  const fight = {
    id: 1,
    startTime: 1000,
    endTime: 2000,
    name: 'Test Fight',
    friendlyPlayers: [1, 2],
    enemyNPCs: [3, 4],
    enemyPlayers: [],
    maps: [{ id: 1 }],
  };

  return {
    events: {
      friendlyBuffs: { entries: {}, accessOrder: [] },
      hostileBuffs: { entries: {}, accessOrder: [] },
      debuffs: { entries: {}, accessOrder: [] },
      damage: { entries: {}, accessOrder: [] },
      healing: { entries: {}, accessOrder: [] },
      deaths: { entries: {}, accessOrder: [] },
      combatantInfo: { entries: {}, accessOrder: [] },
      casts: { entries: {}, accessOrder: [] },
      resources: {
        entries: {},
        accessOrder: [],
      },
    },
    report: {
      entries: {
        [reportKey]: {
          data: null,
          status: 'succeeded',
          error: null,
          fightsById: {
            1: fight,
          },
          fightIds: [1],
          cacheMetadata: {
            lastFetchedTimestamp: null,
          },
          currentRequest: null,
        },
      },
      accessOrder: [reportKey],
      reportId: 'test-report',
      data: {
        fights: [fight],
        masterData: {
          actors: [],
          abilities: [],
          gameZones: [],
        },
      },
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: null,
        lastFetchedTimestamp: null,
      },
      activeContext: {
        reportId: 'test-report',
        fightId: 1,
      },
      fightIndexByReport: {
        'test-report': [1],
      },
    },
    masterData: {
      entries: {},
      accessOrder: [],
    },
    playerData: {
      entries: {},
      accessOrder: [],
    },
    router: {
      location: {
        pathname: '/report/test-report/fight/1',
        search: '',
        hash: '',
        state: {},
        key: 'test-key',
      },
      action: null,
    },
    ...overrides,
  } as RootState;
};

// Helper to create a mock buff event
const createMockBuffEvent = (
  timestamp: number,
  abilityGameID: number,
  targetID: number,
  type: 'applybuff' | 'removebuff' = 'applybuff',
): BuffEvent => ({
  timestamp,
  type,
  sourceID: 1,
  sourceIsFriendly: true,
  targetID,
  targetIsFriendly: true,
  abilityGameID,
  fight: 1,
  extraAbilityGameID: 0,
});

// Helper to create a mock debuff event
const createMockDebuffEvent = (
  timestamp: number,
  abilityGameID: number,
  targetID: number,
  type: 'applydebuff' | 'removedebuff' = 'applydebuff',
): DebuffEvent => ({
  timestamp,
  type,
  sourceID: 1,
  sourceIsFriendly: false,
  targetID,
  targetIsFriendly: true,
  abilityGameID,
  fight: 1,
  extraAbilityGameID: 0,
});

describe('Buff Lookup Selectors', () => {
  // ...existing code...

  describe('selectHostileBuffLookup', () => {
    it('should return empty buffLookup when loading', () => {
      const state = createMockState();
      const { key } = resolveCacheKey({ reportCode: 'test-report', fightId: 1 });
      const loadingEntry: HostileBuffEventsEntry = {
        events: [],
        status: 'loading',
        error: null,
        cacheMetadata: {
          lastFetchedTimestamp: null,
          intervalCount: 0,
          failedIntervals: 0,
        },
        currentRequest: null,
      };
      state.events.hostileBuffs.entries[key] = loadingEntry;
      state.events.hostileBuffs.accessOrder.push(key);

      const result = selectHostileBuffLookup(state);

      expect(Object.keys(result.buffIntervals).length).toBe(0);
    });

    it('should create buffLookup when events are available', () => {
      const buffEvents = [
        createMockBuffEvent(1100, 456, 20),
        createMockBuffEvent(1500, 456, 20, 'removebuff'),
      ];

      const state = createMockState();
      const { key } = resolveCacheKey({ reportCode: 'test-report', fightId: 1 });
      const succeededEntry: HostileBuffEventsEntry = {
        events: buffEvents,
        status: 'succeeded',
        error: null,
        cacheMetadata: {
          lastFetchedTimestamp: Date.now(),
          intervalCount: 1,
          failedIntervals: 0,
        },
        currentRequest: null,
      };
      state.events.hostileBuffs.entries[key] = succeededEntry;
      state.events.hostileBuffs.accessOrder.push(key);

      const result = selectHostileBuffLookup(state);

      expect(result.buffIntervals).toBeDefined();
      expect(456 in result.buffIntervals).toBe(true);
    });
  });

  describe('selectDebuffLookup', () => {
    it('should return empty buffLookup when loading', () => {
      const state = createMockState();
      const { key } = resolveCacheKey({ reportCode: 'test-report', fightId: 1 });
      const loadingEntry: DebuffEventsEntry = {
        events: [],
        status: 'loading',
        error: null,
        cacheMetadata: {
          lastFetchedTimestamp: null,
          restrictToFightWindow: true,
        },
        currentRequest: null,
      };
      state.events.debuffs.entries[key] = loadingEntry;
      state.events.debuffs.accessOrder.push(key);

      const result = selectDebuffLookup(state);

      expect(Object.keys(result.buffIntervals).length).toBe(0);
    });

    it('should create debuffLookup when events are available', () => {
      const debuffEvents = [
        createMockDebuffEvent(1100, 789, 30),
        createMockDebuffEvent(1500, 789, 30, 'removedebuff'),
      ];

      const state = createMockState();
      const { key } = resolveCacheKey({ reportCode: 'test-report', fightId: 1 });
      const succeededEntry: DebuffEventsEntry = {
        events: debuffEvents,
        status: 'succeeded',
        error: null,
        cacheMetadata: {
          lastFetchedTimestamp: Date.now(),
          restrictToFightWindow: true,
        },
        currentRequest: null,
      };
      state.events.debuffs.entries[key] = succeededEntry;
      state.events.debuffs.accessOrder.push(key);

      const result = selectDebuffLookup(state);

      expect(result.buffIntervals).toBeDefined();
      expect(789 in result.buffIntervals).toBe(true);
    });
  });

  describe('Router-based selectors', () => {
    it('should extract fight ID from router state', () => {
      const state = createMockState({
        router: {
          location: {
            pathname: '/report/test-report/fight/123',
            search: '',
            hash: '',
            state: {},
            key: 'test-key',
          },
          action: null,
        },
      });

      const fightId = selectSelectedFightId(state);
      expect(fightId).toBe('123');
    });

    it('should return null for invalid paths', () => {
      const state = createMockState({
        router: {
          location: {
            pathname: '/report/test-report',
            search: '',
            hash: '',
            state: {},
            key: 'test-key',
          },
          action: null,
        },
      });

      const fightId = selectSelectedFightId(state);
      expect(fightId).toBeNull();
    });

    it('should select current fight using router state', () => {
      const state = createMockState({
        router: {
          location: {
            pathname: '/report/test-report/fight/1',
            search: '',
            hash: '',
            state: {},
            key: 'test-key',
          },
          action: null,
        },
      });

      const currentFight = selectCurrentFight(state);
      expect(currentFight).toEqual({
        id: 1,
        startTime: 1000,
        endTime: 2000,
        name: 'Test Fight',
        friendlyPlayers: [1, 2],
        enemyNPCs: [3, 4],
        enemyPlayers: [],
        maps: [{ id: 1 }],
      });
    });
  });
});
