import { RootState } from '../../store/storeWithHistory';
import { BuffEvent, DebuffEvent } from '../../types/combatlogEvents';

/**
 * Factory functions for creating mock Redux state and related utilities
 */

/**
 * Creates a mock RootState for testing selectors and components
 */
export const createMockState = (overrides: Partial<RootState> = {}): RootState =>
  ({
    events: {
      combatantInfo: {
        events: [],
        loading: false,
        error: null,
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
      damage: {
        events: [],
        loading: false,
        error: null,
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
      friendlyBuffs: {
        events: [],
        loading: false,
        error: null,
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
      hostileBuffs: {
        events: [],
        loading: false,
        error: null,
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
      debuffs: {
        events: [],
        loading: false,
        error: null,
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
      casts: {
        events: [],
        loading: false,
        error: null,
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      },
    },
    ui: {
      checkedStats: new Set(),
      selectedTargetIds: new Set(),
      selectedPlayerName: null,
      selectedPlayerId: null,
      selectedPlayerGuid: null,
      filterSettings: {
        abilities: [],
        gameZones: [],
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
    playerData: {
      playersById: {},
    },
    ...overrides,
  }) as RootState;

/**
 * Helper to create a mock buff event for testing Redux selectors
 */
export const createMockSelectorBuffEvent = (
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

/**
 * Helper to create a mock debuff event for testing Redux selectors
 */
export const createMockSelectorDebuffEvent = (
  timestamp: number,
  abilityGameID: number,
  targetID: number,
  type: 'applydebuff' | 'removedebuff' = 'applydebuff'
): DebuffEvent => ({
  timestamp,
  type,
  sourceID: 1,
  sourceIsFriendly: true,
  targetID,
  targetIsFriendly: false,
  abilityGameID,
  fight: 1,
});
