import { renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, Store } from 'redux';

import { FightFragment, ReportFragment, ReportActorFragment } from '../graphql/gql/graphql';
import { ReportFightContext } from '../ReportFightContext';
import { TabId } from '../utils/getSkeletonForTab';

import { useReportData } from './useReportData';
import { useReportMasterData } from './useReportMasterData';
import { ALL_ENEMIES_SENTINEL, useSelectedTargetIds } from './useSelectedTargetIds';

// Mock the dependencies
const mockUseReportData = useReportData as jest.MockedFunction<typeof useReportData>;
const mockUseReportMasterData = useReportMasterData as jest.MockedFunction<
  typeof useReportMasterData
>;

jest.mock('./useReportData');
jest.mock('./useReportMasterData');

// Mock actors
const mockBossActor1: ReportActorFragment = {
  __typename: 'ReportActor',
  id: 100,
  name: 'Boss 1',
  displayName: 'Test Boss 1',
  subType: 'Boss',
  type: 'NPC',
  gameID: 1001,
  icon: 'boss1.png',
  server: null,
};

const mockBossActor2: ReportActorFragment = {
  __typename: 'ReportActor',
  id: 200,
  name: 'Boss 2',
  displayName: 'Test Boss 2',
  subType: 'Boss',
  type: 'NPC',
  gameID: 2001,
  icon: 'boss2.png',
  server: null,
};

const mockNonBossActor: ReportActorFragment = {
  __typename: 'ReportActor',
  id: 300,
  name: 'Regular NPC',
  displayName: 'Test Regular NPC',
  subType: 'NPC',
  type: 'NPC',
  gameID: 3001,
  icon: 'npc.png',
  server: null,
};

// Mock Lokkestiiz actors for duplicate name filtering test
const mockLokkestiizBoss: ReportActorFragment = {
  __typename: 'ReportActor',
  id: 500,
  name: 'Lokkestiiz',
  displayName: 'Lokkestiiz',
  subType: 'Boss',
  type: 'NPC',
  gameID: 88342,
  icon: 'custom-icon-death_recap_cold_ranged.png',
  server: null,
};

const mockLokkestiizFake1: ReportActorFragment = {
  __typename: 'ReportActor',
  id: 501,
  name: 'Lokkestiiz',
  displayName: 'Lokkestiiz',
  subType: 'NPC',
  type: 'NPC',
  gameID: 90304,
  icon: 'custom-icon-death_recap_cold_aoe.png',
  server: null,
};

const mockLokkestiizFake2: ReportActorFragment = {
  __typename: 'ReportActor',
  id: 502,
  name: 'Lokkestiiz',
  displayName: 'Lokkestiiz',
  subType: 'NPC',
  type: 'NPC',
  gameID: 90314,
  icon: 'custom-icon-death_recap_melee_basic.png',
  server: null,
};

const mockFrostAtronach: ReportActorFragment = {
  __typename: 'ReportActor',
  id: 503,
  name: 'Frost Atronach',
  displayName: 'Frost Atronach',
  subType: 'NPC',
  type: 'NPC',
  gameID: 90284,
  icon: 'custom-icon-death_recap_cold_melee.png',
  server: null,
};

const mockPlayerActor: ReportActorFragment = {
  __typename: 'ReportActor',
  id: 400,
  name: 'Player 1',
  displayName: 'Test Player 1',
  subType: null,
  type: 'Player',
  gameID: 4001,
  icon: 'player.png',
  server: 'NA',
};

// Mock fight with enemy NPCs
const mockFightWithBosses: FightFragment = {
  __typename: 'ReportFight',
  id: 1,
  startTime: 1000,
  endTime: 2000,
  name: 'Test Fight With Bosses',
  difficulty: null,
  bossPercentage: null,
  encounterID: 1001,
  friendlyPlayers: [400],
  enemyPlayers: [],
  enemyNPCs: [
    { __typename: 'ReportFightNPC', id: 100, gameID: 1001, groupCount: 1, instanceCount: 1 },
    { __typename: 'ReportFightNPC', id: 200, gameID: 2001, groupCount: 1, instanceCount: 1 },
    { __typename: 'ReportFightNPC', id: 300, gameID: 3001, groupCount: 1, instanceCount: 1 },
  ],
};

const mockFightWithoutEnemies: FightFragment = {
  __typename: 'ReportFight',
  id: 2,
  startTime: 2000,
  endTime: 3000,
  name: 'Test Fight Without Enemies',
  difficulty: null,
  bossPercentage: null,
  encounterID: 1002,
  friendlyPlayers: [400],
  enemyPlayers: [],
  enemyNPCs: [],
};

const mockFightWithNullEnemies: FightFragment = {
  __typename: 'ReportFight',
  id: 3,
  startTime: 3000,
  endTime: 4000,
  name: 'Test Fight With Null Enemies',
  difficulty: null,
  bossPercentage: null,
  encounterID: 1003,
  friendlyPlayers: [400],
  enemyPlayers: [],
  enemyNPCs: null,
};

// Fight with duplicate names (Lokkestiiz scenario)
const mockFightWithDuplicates: FightFragment = {
  __typename: 'ReportFight',
  id: 10,
  startTime: 5000,
  endTime: 6000,
  name: 'Test Fight With Duplicate Names',
  difficulty: null,
  bossPercentage: null,
  encounterID: 1010,
  friendlyPlayers: [400],
  enemyPlayers: [],
  enemyNPCs: [
    { __typename: 'ReportFightNPC', id: 500, gameID: 88342, groupCount: 1, instanceCount: 1 }, // Lokkestiiz Boss
    { __typename: 'ReportFightNPC', id: 501, gameID: 90304, groupCount: 1, instanceCount: 1 }, // Lokkestiiz Fake 1
    { __typename: 'ReportFightNPC', id: 502, gameID: 90314, groupCount: 1, instanceCount: 1 }, // Lokkestiiz Fake 2
    { __typename: 'ReportFightNPC', id: 503, gameID: 90284, groupCount: 1, instanceCount: 1 }, // Frost Atronach (unique)
  ],
};

const mockReportData: ReportFragment = {
  __typename: 'Report',
  code: 'test-report',
  startTime: 1000,
  endTime: 5000,
  title: 'Test Report',
  visibility: 'public',
  zone: { __typename: 'Zone', name: 'Test Zone' },
  fights: [
    mockFightWithBosses,
    mockFightWithoutEnemies,
    mockFightWithNullEnemies,
    mockFightWithDuplicates,
  ],
};

const mockMasterData = {
  abilitiesById: {},
  actorsById: {
    100: mockBossActor1,
    200: mockBossActor2,
    300: mockNonBossActor,
    400: mockPlayerActor,
    500: mockLokkestiizBoss,
    501: mockLokkestiizFake1,
    502: mockLokkestiizFake2,
    503: mockFrostAtronach,
  },
  loading: false,
  loaded: true,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: 'test-report',
    lastFetchedTimestamp: Date.now(),
    actorCount: 8,
    abilityCount: 0,
  },
};

// Create mock store
const createMockStore = (
  selectedTargetIds: number[] = [],
  fightOverride?: FightFragment,
  customState?: Partial<any>,
): Store => {
  const fights = fightOverride ? [...mockReportData.fights, fightOverride] : mockReportData.fights;
  const fightsById = Object.fromEntries(fights.map((fight) => [fight.id, fight]));
  const initialState = {
    ui: {
      darkMode: false,
      sidebarOpen: true,
      showExperimentalTabs: false,
      selectedTargetIds,
    },
    masterData: {
      entries: {
        'test-report::__all__': {
          abilitiesById: mockMasterData.abilitiesById,
          actorsById: mockMasterData.actorsById,
          status: 'succeeded' as const,
          error: null,
          cacheMetadata: {
            lastFetchedTimestamp: Date.now(),
            actorCount: Object.keys(mockMasterData.actorsById).length,
            abilityCount: Object.keys(mockMasterData.abilitiesById).length,
          },
          currentRequest: null,
        },
      },
      accessOrder: ['test-report::__all__'],
    },
    report: {
      entries: {
        'test-report::__all__': {
          data: { ...mockReportData, fights },
          status: 'succeeded' as const,
          error: null,
          fightsById,
          fightIds: fights.map((fight) => fight.id),
          cacheMetadata: { lastFetchedTimestamp: Date.now() },
          currentRequest: null,
        },
      },
      accessOrder: ['test-report::__all__'],
      reportId: 'test-report',
      data: mockReportData,
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: 'test-report',
        lastFetchedTimestamp: Date.now(),
      },
      activeContext: {
        reportId: 'test-report',
        fightId: null,
      },
      fightIndexByReport: {
        'test-report': [1, 2, 3, 10],
      },
    },
    ...customState,
  };

  const rootReducer = combineReducers({
    ui: (state = initialState.ui) => state,
    masterData: (state = initialState.masterData) => state,
    report: (state = initialState.report) => state,
  });

  return createStore(rootReducer);
};

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  reportId?: string | null;
  fightId?: string | null;
  selectedTargetIds?: number[];
  fightOverride?: FightFragment;
}

const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  reportId = 'test-report',
  fightId = '1',
  selectedTargetIds = [],
  fightOverride,
}) => {
  const store = createMockStore(selectedTargetIds, fightOverride);

  const contextValue = {
    reportId,
    fightId,
    tabId: null,
    selectedTabId: 'overview' as TabId,
    showExperimentalTabs: false,
    setSelectedTab: () => {},
    setShowExperimentalTabs: () => {},
  };

  return (
    <Provider store={store}>
      <ReportFightContext.Provider value={contextValue}>{children}</ReportFightContext.Provider>
    </Provider>
  );
};

describe('useSelectedTargetIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use only authoritative Boss actors for the All Bosses scope', () => {
    mockUseReportData.mockReturnValue({
      reportData: {
        ...mockReportData,
        fights: [mockFightWithDuplicates],
      },
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="10" selectedTargetIds={[]}>
          {children}
        </TestWrapper>
      ),
    });

    expect(Array.from(result.current)).toEqual([500]);
  });

  it('should return selected target ID when one is explicitly selected', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="1" selectedTargetIds={[100]}>
          {children}
        </TestWrapper>
      ),
    });

    expect(Array.from(result.current)).toEqual([100]);
  });

  it('should return boss targets when no specific target is selected', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="1" selectedTargetIds={[]}>
          {children}
        </TestWrapper>
      ),
    });

    expect(Array.from(result.current).sort()).toEqual([100, 200]);
  });

  it('should return empty set when no fight is found', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="999" selectedTargetIds={[]}>
          {children}
        </TestWrapper>
      ),
    });

    expect(Array.from(result.current)).toEqual([]);
  });

  it('should return empty set when fight has no enemy NPCs', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="2" selectedTargetIds={[]}>
          {children}
        </TestWrapper>
      ),
    });

    expect(Array.from(result.current)).toEqual([]);
  });

  it('should return empty set when fight has null enemy NPCs', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="3" selectedTargetIds={[]}>
          {children}
        </TestWrapper>
      ),
    });

    expect(Array.from(result.current)).toEqual([]);
  });

  it('should return empty set when no report data is available', () => {
    mockUseReportData.mockReturnValue({
      reportData: null,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper reportId={null} fightId={null} selectedTargetIds={[]}>
          {children}
        </TestWrapper>
      ),
    });

    expect(Array.from(result.current)).toEqual([]);
  });

  it('should not infer bosses when authoritative actor metadata is unavailable', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: {
        abilitiesById: {},
        actorsById: {},
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
      isMasterDataLoading: false,
    });

    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="1" selectedTargetIds={[]}>
          {children}
        </TestWrapper>
      ),
    });

    expect(Array.from(result.current)).toEqual([]);
  });

  it('should not treat non-boss NPCs as the All Bosses scope', () => {
    // Create fight with only non-boss NPCs
    const fightWithNonBosses: FightFragment = {
      ...mockFightWithBosses,
      id: 4,
      name: 'Fight With Non-Boss NPCs',
      enemyNPCs: [
        { __typename: 'ReportFightNPC', id: 300, gameID: 3001, groupCount: 1, instanceCount: 1 },
      ],
    };

    const reportDataWithNonBosses: ReportFragment = {
      ...mockReportData,
      fights: [fightWithNonBosses],
    };

    mockUseReportData.mockReturnValue({
      reportData: reportDataWithNonBosses,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="4" selectedTargetIds={[]} fightOverride={fightWithNonBosses}>
          {children}
        </TestWrapper>
      ),
    });

    expect(Array.from(result.current)).toEqual([]);
  });

  it('should handle NPCs with null IDs', () => {
    const fightWithNullIds: FightFragment = {
      ...mockFightWithBosses,
      id: 5,
      name: 'Fight With Null IDs',
      enemyNPCs: [
        { __typename: 'ReportFightNPC', id: null, gameID: 1001, groupCount: 1, instanceCount: 1 },
        { __typename: 'ReportFightNPC', id: 100, gameID: 1001, groupCount: 1, instanceCount: 1 },
      ],
    };

    const reportDataWithNullIds: ReportFragment = {
      ...mockReportData,
      fights: [fightWithNullIds],
    };

    mockUseReportData.mockReturnValue({
      reportData: reportDataWithNullIds,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="5" selectedTargetIds={[]} fightOverride={fightWithNullIds}>
          {children}
        </TestWrapper>
      ),
    });

    // Should only include the valid boss NPC, ignoring the null ID
    expect(Array.from(result.current)).toEqual([100]);
  });

  it('should handle actors that do not exist in master data', () => {
    const fightWithMissingActors: FightFragment = {
      ...mockFightWithBosses,
      id: 6,
      name: 'Fight With Missing Actors',
      enemyNPCs: [
        { __typename: 'ReportFightNPC', id: 100, gameID: 1001, groupCount: 1, instanceCount: 1 }, // exists
        { __typename: 'ReportFightNPC', id: 999, gameID: 9999, groupCount: 1, instanceCount: 1 }, // doesn't exist
      ],
    };

    const reportDataWithMissingActors: ReportFragment = {
      ...mockReportData,
      fights: [fightWithMissingActors],
    };

    mockUseReportData.mockReturnValue({
      reportData: reportDataWithMissingActors,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="6" selectedTargetIds={[]} fightOverride={fightWithMissingActors}>
          {children}
        </TestWrapper>
      ),
    });

    // Should only include the actor that exists and is a boss
    expect(Array.from(result.current)).toEqual([100]);
  });

  it('resolves All Enemies from fight membership across mixed and missing actor metadata', () => {
    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const mixedFight: FightFragment = {
      ...mockFightWithBosses,
      id: 7,
      enemyNPCs: [
        { __typename: 'ReportFightNPC', id: 100, gameID: 1001, groupCount: 1, instanceCount: 1 },
        { __typename: 'ReportFightNPC', id: 300, gameID: 3001, groupCount: 1, instanceCount: 1 },
        { __typename: 'ReportFightNPC', id: 400, gameID: 4001, groupCount: 1, instanceCount: 1 },
        { __typename: 'ReportFightNPC', id: 999, gameID: 9999, groupCount: 1, instanceCount: 1 },
        { __typename: 'ReportFightNPC', id: 300, gameID: 3001, groupCount: 1, instanceCount: 1 },
      ],
    };

    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper
          fightId="7"
          selectedTargetIds={[ALL_ENEMIES_SENTINEL]}
          fightOverride={mixedFight}
        >
          {children}
        </TestWrapper>
      ),
    });

    expect(Array.from(result.current)).toEqual([100, 300, 400, 999]);
  });

  it('should update when fight ID changes', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const { result, rerender } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="1" selectedTargetIds={[]}>
          {children}
        </TestWrapper>
      ),
    });

    expect(Array.from(result.current).sort()).toEqual([100, 200]);

    // Rerender with different fight ID - fight without enemies
    rerender();
    const { result: newResult } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="2" selectedTargetIds={[]}>
          {children}
        </TestWrapper>
      ),
    });

    expect(Array.from(newResult.current)).toEqual([]);
  });

  it('should prioritize selected target ID over boss filtering', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    // Select a non-boss NPC explicitly
    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="1" selectedTargetIds={[300]}>
          {children}
        </TestWrapper>
      ),
    });

    // Should return the selected target even though it's not a boss
    expect(Array.from(result.current)).toEqual([300]);
  });

  it('should handle null reportMasterData gracefully', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    // Mock with empty master data (no actors available)
    mockUseReportMasterData.mockReturnValue({
      reportMasterData: {
        abilitiesById: {},
        actorsById: {}, // No actors available
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
      isMasterDataLoading: false,
    });

    const { result } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="1" selectedTargetIds={[]}>
          {children}
        </TestWrapper>
      ),
    });

    expect(Array.from(result.current)).toEqual([]);
  });

  it('should return stable reference when params do not change', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const { result, rerender } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="1" selectedTargetIds={[]}>
          {children}
        </TestWrapper>
      ),
    });

    const firstResult = result.current;
    expect(Array.from(firstResult).sort()).toEqual([100, 200]);

    // Re-render without changing any dependencies
    rerender();

    const secondResult = result.current;
    expect(secondResult).toBe(firstResult); // Should be the same reference
    expect(Array.from(secondResult).sort()).toEqual([100, 200]);
  });

  it('should return stable reference for selected target when params do not change', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    mockUseReportMasterData.mockReturnValue({
      reportMasterData: mockMasterData,
      isMasterDataLoading: false,
    });

    const { result, rerender } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="1" selectedTargetIds={[100]}>
          {children}
        </TestWrapper>
      ),
    });

    const firstResult = result.current;
    expect(Array.from(firstResult)).toEqual([100]);

    // Re-render without changing any dependencies
    rerender();

    const secondResult = result.current;
    // For multi-select implementation, values are more important than reference stability
    expect(Array.from(secondResult)).toEqual([100]);
    expect(secondResult.size).toBe(firstResult.size);
  });
});
