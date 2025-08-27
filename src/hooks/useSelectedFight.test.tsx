import { renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, Store } from 'redux';

import { FightFragment, ReportFragment } from '../graphql/generated';
import { ReportFightContext } from '../ReportFightContext';

import { useReportData } from './useReportData';
import { useSelectedFight } from './useSelectedFight';

// Mock the useReportData hook
const mockUseReportData = useReportData as jest.MockedFunction<typeof useReportData>;
jest.mock('./useReportData');

// Mock fight data
const mockFight1: FightFragment = {
  __typename: 'ReportFight',
  id: 1,
  startTime: 1000,
  endTime: 2000,
  name: 'Test Fight 1',
  friendlyPlayers: [1, 2],
  enemyNPCs: [
    { __typename: 'ReportFightNPC', id: 3 },
    { __typename: 'ReportFightNPC', id: 4 },
  ],
  enemyPlayers: [],
  difficulty: null,
  bossPercentage: null,
};

const mockFight2: FightFragment = {
  __typename: 'ReportFight',
  id: 2,
  startTime: 2000,
  endTime: 3000,
  name: 'Test Fight 2',
  friendlyPlayers: [1, 2],
  enemyNPCs: [
    { __typename: 'ReportFightNPC', id: 5 },
    { __typename: 'ReportFightNPC', id: 6 },
  ],
  enemyPlayers: [],
  difficulty: null,
  bossPercentage: null,
};

const mockReportData: ReportFragment = {
  __typename: 'Report',
  code: 'test-report',
  startTime: 1000,
  endTime: 5000,
  title: 'Test Report',
  visibility: 'public',
  zone: { __typename: 'Zone', name: 'Test Zone' },
  fights: [mockFight1, mockFight2],
};

// Create a simple mock store
const createMockStore = (): Store => {
  const rootReducer = combineReducers({
    // Add minimal store structure for testing
    test: (state = {}) => state,
  });

  return createStore(rootReducer);
};

// Wrapper component for tests
interface TestWrapperProps {
  children: React.ReactNode;
  reportId?: string | null;
  fightId?: string | null;
}

const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  reportId = 'test-report',
  fightId = '1',
}) => {
  const store = createMockStore();

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

describe('useSelectedFight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when no fightId is provided', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    const { result } = renderHook(() => useSelectedFight(), {
      wrapper: ({ children }) => <TestWrapper fightId={null}>{children}</TestWrapper>,
    });

    expect(result.current).toBe(null);
  });

  it('should return null when report is loading', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: true,
    });

    const { result } = renderHook(() => useSelectedFight(), {
      wrapper: ({ children }) => <TestWrapper fightId="1">{children}</TestWrapper>,
    });

    expect(result.current).toBe(null);
  });

  it('should return null when no reportData is available', () => {
    mockUseReportData.mockReturnValue({
      reportData: null,
      isReportLoading: false,
    });

    const { result } = renderHook(() => useSelectedFight(), {
      wrapper: ({ children }) => <TestWrapper fightId="1">{children}</TestWrapper>,
    });

    expect(result.current).toBe(null);
  });

  it('should return null when fights array is empty', () => {
    const emptyReportData: ReportFragment = {
      ...mockReportData,
      fights: [],
    };

    mockUseReportData.mockReturnValue({
      reportData: emptyReportData,
      isReportLoading: false,
    });

    const { result } = renderHook(() => useSelectedFight(), {
      wrapper: ({ children }) => <TestWrapper fightId="1">{children}</TestWrapper>,
    });

    expect(result.current).toBe(null);
  });

  it('should return the correct fight when valid fightId is provided', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    const { result } = renderHook(() => useSelectedFight(), {
      wrapper: ({ children }) => <TestWrapper fightId="1">{children}</TestWrapper>,
    });

    expect(result.current).toEqual(mockFight1);
  });

  it('should return the correct fight when different fightId is provided', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    const { result } = renderHook(() => useSelectedFight(), {
      wrapper: ({ children }) => <TestWrapper fightId="2">{children}</TestWrapper>,
    });

    expect(result.current).toEqual(mockFight2);
  });

  it('should return null when fightId does not match any fights', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    const { result } = renderHook(() => useSelectedFight(), {
      wrapper: ({ children }) => <TestWrapper fightId="999">{children}</TestWrapper>,
    });

    expect(result.current).toBe(null);
  });

  it('should handle string fightId matching numeric fight id', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    const { result } = renderHook(() => useSelectedFight(), {
      wrapper: ({ children }) => <TestWrapper fightId="2">{children}</TestWrapper>,
    });

    expect(result.current).toEqual(mockFight2);
  });

  it('should update when fightId changes', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    const { result, rerender } = renderHook(() => useSelectedFight(), {
      wrapper: ({ children }) => <TestWrapper fightId="1">{children}</TestWrapper>,
    });

    expect(result.current).toEqual(mockFight1);

    // Re-render with different fightId
    rerender();
    const { result: newResult } = renderHook(() => useSelectedFight(), {
      wrapper: ({ children }) => <TestWrapper fightId="2">{children}</TestWrapper>,
    });

    expect(newResult.current).toEqual(mockFight2);
  });

  it('should handle empty string fightId as null', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    const { result } = renderHook(() => useSelectedFight(), {
      wrapper: ({ children }) => <TestWrapper fightId="">{children}</TestWrapper>,
    });

    expect(result.current).toBe(null);
  });

  it('should handle undefined reportData.fights gracefully', () => {
    const reportDataWithUndefinedFights: ReportFragment = {
      ...mockReportData,
      fights: undefined,
    };

    mockUseReportData.mockReturnValue({
      reportData: reportDataWithUndefinedFights,
      isReportLoading: false,
    });

    const { result } = renderHook(() => useSelectedFight(), {
      wrapper: ({ children }) => <TestWrapper fightId="1">{children}</TestWrapper>,
    });

    expect(result.current).toBe(null);
  });

  it('should return stable reference when params do not change', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
    });

    const { result, rerender } = renderHook(() => useSelectedFight(), {
      wrapper: ({ children }) => <TestWrapper fightId="1">{children}</TestWrapper>,
    });

    const firstResult = result.current;
    expect(firstResult).toEqual(mockFight1);

    // Re-render without changing any dependencies
    rerender();

    const secondResult = result.current;
    expect(secondResult).toBe(firstResult); // Should be the same reference
    expect(secondResult).toEqual(mockFight1);
  });
});
