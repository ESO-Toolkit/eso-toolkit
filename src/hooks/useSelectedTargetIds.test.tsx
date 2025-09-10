import { renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, Store } from 'redux';

import { FightFragment, ReportFragment, ReportActorFragment } from '../graphql/generated';
import { ReportFightContext } from '../ReportFightContext';

import { useReportData } from './useReportData';
import { useReportMasterData } from './useReportMasterData';
import { useSelectedTargetIds } from './useSelectedTargetIds';

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
  friendlyPlayers: [400],
  enemyPlayers: [],
  enemyNPCs: null,
};

const mockReportData: ReportFragment = {
  __typename: 'Report',
  code: 'test-report',
  startTime: 1000,
  endTime: 5000,
  title: 'Test Report',
  visibility: 'public',
  zone: { __typename: 'Zone', name: 'Test Zone' },
  fights: [mockFightWithBosses, mockFightWithoutEnemies, mockFightWithNullEnemies],
};

const mockMasterData = {
  abilitiesById: {},
  actorsById: {
    100: mockBossActor1,
    200: mockBossActor2,
    300: mockNonBossActor,
    400: mockPlayerActor,
  },
  loading: false,
  loaded: true,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: 'test-report',
    lastFetchedTimestamp: Date.now(),
    actorCount: 4,
    abilityCount: 0,
  },
};

// Create mock store
const createMockStore = (selectedTargetId: number | null = null): Store => {
  const initialState = {
    ui: {
      darkMode: false,
      sidebarOpen: true,
      showExperimentalTabs: false,
      selectedTargetId,
    },
    masterData: mockMasterData,
  };

  const rootReducer = combineReducers({
    ui: (state = initialState.ui) => state,
    masterData: (state = initialState.masterData) => state,
  });

  return createStore(rootReducer);
};

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  reportId?: string | null;
  fightId?: string | null;
  selectedTargetId?: number | null;
}

const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  reportId = 'test-report',
  fightId = '1',
  selectedTargetId = null,
}) => {
  const store = createMockStore(selectedTargetId);

  const contextValue = {
    reportId,
    fightId,
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
        <TestWrapper fightId="1" selectedTargetId={100}>
          {children}
        </TestWrapper>
      ),
    });

    expect(result.current).toEqual(new Set([100]));
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
        <TestWrapper fightId="1" selectedTargetId={null}>
          {children}
        </TestWrapper>
      ),
    });

    // Should return both boss NPCs (100 and 200), but not the regular NPC (300)
    expect(result.current).toEqual(new Set([100, 200]));
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
        <TestWrapper fightId="999" selectedTargetId={null}>
          {children}
        </TestWrapper>
      ),
    });

    expect(result.current).toEqual(new Set());
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
        <TestWrapper fightId="2" selectedTargetId={null}>
          {children}
        </TestWrapper>
      ),
    });

    expect(result.current).toEqual(new Set());
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
        <TestWrapper fightId="3" selectedTargetId={null}>
          {children}
        </TestWrapper>
      ),
    });

    expect(result.current).toEqual(new Set());
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
        <TestWrapper fightId="1" selectedTargetId={null}>
          {children}
        </TestWrapper>
      ),
    });

    expect(result.current).toEqual(new Set());
  });

  it('should return all enemy NPCs when no bosses are present', () => {
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
        <TestWrapper fightId="1" selectedTargetId={null}>
          {children}
        </TestWrapper>
      ),
    });

    expect(result.current).toEqual(new Set([100, 200, 300]));
  });

  it('should return all enemy NPCs when fight has only non-boss NPCs', () => {
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
        <TestWrapper fightId="4" selectedTargetId={null}>
          {children}
        </TestWrapper>
      ),
    });

    // When no bosses are present, should return all enemy NPCs
    expect(result.current).toEqual(new Set([300]));
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
        <TestWrapper fightId="5" selectedTargetId={null}>
          {children}
        </TestWrapper>
      ),
    });

    // Should only include the valid boss NPC, ignoring the null ID
    expect(result.current).toEqual(new Set([100]));
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
        <TestWrapper fightId="6" selectedTargetId={null}>
          {children}
        </TestWrapper>
      ),
    });

    // Should only include the actor that exists and is a boss
    expect(result.current).toEqual(new Set([100]));
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
        <TestWrapper fightId="1" selectedTargetId={null}>
          {children}
        </TestWrapper>
      ),
    });

    // Initial result - fight with bosses
    expect(result.current).toEqual(new Set([100, 200]));

    // Rerender with different fight ID - fight without enemies
    rerender();
    const { result: newResult } = renderHook(() => useSelectedTargetIds(), {
      wrapper: ({ children }) => (
        <TestWrapper fightId="2" selectedTargetId={null}>
          {children}
        </TestWrapper>
      ),
    });

    expect(newResult.current).toEqual(new Set());
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
        <TestWrapper fightId="1" selectedTargetId={300}>
          {children}
        </TestWrapper>
      ),
    });

    // Should return the selected target even though it's not a boss
    expect(result.current).toEqual(new Set([300]));
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
        <TestWrapper fightId="1" selectedTargetId={null}>
          {children}
        </TestWrapper>
      ),
    });

    expect(result.current).toEqual(new Set([100, 200, 300]));
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
        <TestWrapper fightId="1" selectedTargetId={null}>
          {children}
        </TestWrapper>
      ),
    });

    const firstResult = result.current;
    expect(firstResult).toEqual(new Set([100, 200]));

    // Re-render without changing any dependencies
    rerender();

    const secondResult = result.current;
    expect(secondResult).toBe(firstResult); // Should be the same reference
    expect(secondResult).toEqual(new Set([100, 200]));
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
        <TestWrapper fightId="1" selectedTargetId={100}>
          {children}
        </TestWrapper>
      ),
    });

    const firstResult = result.current;
    expect(firstResult).toEqual(new Set([100]));

    // Re-render without changing any dependencies
    rerender();

    const secondResult = result.current;
    expect(secondResult).toBe(firstResult); // Should be the same reference
    expect(secondResult).toEqual(new Set([100]));
  });
});
