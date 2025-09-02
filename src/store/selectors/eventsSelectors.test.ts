import { BuffEvent, DebuffEvent } from '../../types/combatlogEvents';
import { RootState } from '../storeWithHistory';

import {
  selectHostileBuffLookup,
  selectDebuffLookup,
  selectSelectedFightId,
  selectCurrentFight,
} from './eventsSelectors';

// Mock state structure
const createMockState = (overrides: Partial<RootState> = {}): RootState =>
  ({
    events: {
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
      damage: {
        events: [],
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
    },
    report: {
      reportId: 'test-report',
      data: {
        fights: [
          {
            id: '1',
            startTime: 1000,
            endTime: 2000,
            name: 'Test Fight',
            friendlyPlayers: [1, 2],
            enemyNPCs: [3, 4],
            enemyPlayers: [],
            maps: [{ id: 1 }],
          },
        ],
        masterData: {
          actors: [],
          abilities: [],
          gameZones: [],
        },
      },
      loading: false,
      error: null,
    },
    masterData: {
      actorsById: {},
      abilitiesById: {},
      gameZonesById: {},
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
  }) as RootState;

// Helper to create a mock buff event
const createMockBuffEvent = (
  timestamp: number,
  abilityGameID: number,
  targetID: number,
  type: 'applybuff' | 'removebuff' = 'applybuff'
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
  type: 'applydebuff' | 'removedebuff' = 'applydebuff'
): DebuffEvent => ({
  timestamp,
  type,
  sourceID: 1,
  sourceIsFriendly: false,
  targetID,
  targetIsFriendly: true,
  abilityGameID,
  fight: 1,
});

describe('Buff Lookup Selectors', () => {
  // ...existing code...

  describe('selectHostileBuffLookup', () => {
    it('should return empty buffLookup when loading', () => {
      const state = createMockState({
        events: {
          ...createMockState().events,
          hostileBuffs: {
            ...createMockState().events.hostileBuffs,
            loading: true,
          },
        },
      });

      const result = selectHostileBuffLookup(state);

      expect(result.buffIntervals.size).toBe(0);
    });

    it('should create buffLookup when events are available', () => {
      const buffEvents = [
        createMockBuffEvent(1100, 456, 20),
        createMockBuffEvent(1500, 456, 20, 'removebuff'),
      ];

      const state = createMockState({
        events: {
          ...createMockState().events,
          hostileBuffs: {
            ...createMockState().events.hostileBuffs,
            events: buffEvents,
          },
        },
      });

      const result = selectHostileBuffLookup(state);

      expect(result.buffIntervals).toBeDefined();
      expect(456 in result.buffIntervals).toBe(true);
    });
  });

  describe('selectDebuffLookup', () => {
    it('should return empty buffLookup when loading', () => {
      const state = createMockState({
        events: {
          ...createMockState().events,
          debuffs: {
            ...createMockState().events.debuffs,
            loading: true,
          },
        },
      });

      const result = selectDebuffLookup(state);

      expect(result.buffIntervals.size).toBe(0);
    });

    it('should create debuffLookup when events are available', () => {
      const debuffEvents = [
        createMockDebuffEvent(1100, 789, 30),
        createMockDebuffEvent(1500, 789, 30, 'removedebuff'),
      ];

      const state = createMockState({
        events: {
          ...createMockState().events,
          debuffs: {
            ...createMockState().events.debuffs,
            events: debuffEvents,
          },
        },
      });

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
        id: '1',
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
