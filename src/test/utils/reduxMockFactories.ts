import { RootState } from '../../store/storeWithHistory';
import { BuffEvent, DebuffEvent } from '../../types/combatlogEvents';

/**
 * Factory functions for creating mock Redux state and related utilities
 */

/**
 * Creates a mock RootState for testing selectors and components
 */
export const createMockState = (overrides: Partial<RootState> = {}): RootState => {
  const baseState = {
    events: {
      combatantInfo: {
        entries: {},
        accessOrder: [],
      },
      damage: {
        entries: {},
        accessOrder: [],
      },
      healing: {
        entries: {},
        accessOrder: [],
      },
      deaths: {
        entries: {},
        accessOrder: [],
      },
      friendlyBuffs: {
        entries: {},
        accessOrder: [],
      },
      hostileBuffs: {
        entries: {},
        accessOrder: [],
      },
      debuffs: {
        entries: {},
        accessOrder: [],
      },
      casts: {
        entries: {},
        accessOrder: [],
      },
      resources: {
        entries: {},
        accessOrder: [],
      },
    },
    ui: {
      darkMode: true,
      selectedPlayerId: null,
      selectedTabId: null,
      selectedTargetIds: [],
      showExperimentalTabs: false,
      sidebarOpen: false,
    },
    report: {
      reportId: 'test-report',
      data: {
        fights: [
          {
            id: 1,
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
      cacheMetadata: {
        lastFetchedReportId: null,
        lastFetchedTimestamp: null,
      },
      activeContext: {
        reportId: 'test-report',
        fightId: 1,
      },
      reportsById: {},
      fightIndexByReport: {},
    },
    masterData: {
      actorsById: {},
      abilitiesById: {},
      gameZonesById: {},
    },
    playerData: {
      playersById: {},
    },
    parseAnalysis: {} as unknown,
    workerResults: {} as unknown,
    router: undefined,
  } as unknown as RootState;

  return {
    ...baseState,
    ...overrides,
  } as RootState;
};

/**
 * Helper to create a mock buff event for testing Redux selectors
 */
export const createMockSelectorBuffEvent = (
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

/**
 * Helper to create a mock debuff event for testing Redux selectors
 */
export const createMockSelectorDebuffEvent = (
  timestamp: number,
  abilityGameID: number,
  targetID: number,
  type: 'applydebuff' | 'removedebuff' = 'applydebuff',
): DebuffEvent => ({
  timestamp,
  type,
  sourceID: 1,
  sourceIsFriendly: true,
  targetID,
  targetIsFriendly: false,
  abilityGameID,
  fight: 1,
  extraAbilityGameID: 0,
});
