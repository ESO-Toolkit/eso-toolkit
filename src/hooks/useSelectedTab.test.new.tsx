import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore, combineReducers } from 'redux';

import uiSlice from '../store/ui/uiSlice';

import { useSelectedTab, useSelectedTabId } from './useSelectedTab';

// Mock the useUrlParamSync hook with a configurable mock
const mockUpdateSelectedTab = jest.fn();
let mockSelectedTabId: number | null = null;

jest.mock('./useUrlParamSync', () => ({
  useUrlParamSync: () => ({
    selectedTabId: mockSelectedTabId,
    updateSelectedTab: mockUpdateSelectedTab,
  }),
}));

// Helper to set the mock value
const setMockSelectedTabId = (value: number | null): void => {
  mockSelectedTabId = value;
};

// Create a mock store
const createMockStore = (
  initialState: { ui?: Partial<ReturnType<typeof uiSlice>> } = {},
): ReturnType<typeof createStore> => {
  const rootReducer = combineReducers({
    ui: uiSlice,
  });
  return createStore(rootReducer, {
    ui: {
      darkMode: true,
      sidebarOpen: false,
      showExperimentalTabs: false,
      selectedTargetId: null,
      selectedPlayerId: null,
      selectedTabId: null,
      ...(initialState.ui || {}),
    },
  });
};

// Test wrapper component
const TestWrapper: React.FC<{
  children: React.ReactNode;
  store?: ReturnType<typeof createMockStore>;
}> = ({ children, store }) => {
  const mockStore = store || createMockStore();
  return <Provider store={mockStore}>{children}</Provider>;
};

describe('useSelectedTab', () => {
  beforeEach(() => {
    setMockSelectedTabId(null);
    mockUpdateSelectedTab.mockClear();
  });

  it('should return default tab when no state or URL param is set', () => {
    const { result } = renderHook(() => useSelectedTab(1), {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });

    expect(result.current.selectedTabId).toBe(1);
  });

  it('should return URL param value over default and state', () => {
    setMockSelectedTabId(3);
    const store = createMockStore({
      ui: { selectedTabId: 2 },
    });

    const { result } = renderHook(() => useSelectedTab(1), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    expect(result.current.selectedTabId).toBe(3);
  });

  it('should return state value over default when no URL param', () => {
    setMockSelectedTabId(null);
    const store = createMockStore({
      ui: { selectedTabId: 2 },
    });

    const { result } = renderHook(() => useSelectedTab(1), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    expect(result.current.selectedTabId).toBe(2);
  });

  it('should call updateSelectedTab when setSelectedTab is called', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useSelectedTab(1), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    act(() => {
      result.current.setSelectedTab(5);
    });

    expect(mockUpdateSelectedTab).toHaveBeenCalledWith(5, true);
  });

  it('should handle null tab selection', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useSelectedTab(1), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    act(() => {
      result.current.setSelectedTab(null);
    });

    expect(mockUpdateSelectedTab).toHaveBeenCalledWith(null, true);
  });
});

describe('useSelectedTabId', () => {
  beforeEach(() => {
    setMockSelectedTabId(null);
    mockUpdateSelectedTab.mockClear();
  });

  it('should return default tab when no state or URL param is set', () => {
    const { result } = renderHook(() => useSelectedTabId(1), {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });

    expect(result.current).toBe(1);
  });

  it('should return URL param value over default and state', () => {
    setMockSelectedTabId(3);
    const store = createMockStore({
      ui: { selectedTabId: 2 },
    });

    const { result } = renderHook(() => useSelectedTabId(1), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    expect(result.current).toBe(3);
  });

  it('should return state value over default when no URL param', () => {
    setMockSelectedTabId(null);
    const store = createMockStore({
      ui: { selectedTabId: 2 },
    });

    const { result } = renderHook(() => useSelectedTabId(1), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    expect(result.current).toBe(2);
  });

  it('should return null when no default is provided and no other value exists', () => {
    const { result } = renderHook(() => useSelectedTabId(), {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });

    expect(result.current).toBe(null);
  });
});
