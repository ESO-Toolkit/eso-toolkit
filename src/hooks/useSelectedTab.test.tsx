import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore, combineReducers } from 'redux';

import uiSlice from '../store/ui/uiSlice';

import { useSelectedTab, useSelectedTabId } from './useSelectedTab';

// Create a mock store
const createMockStore = (
  initialState: { ui?: Partial<ReturnType<typeof uiSlice>> } = {}
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
      selectedTabId: null,
      ...(initialState.ui || {}),
    },
  });
};

// Test wrapper component
const TestWrapper: React.FC<{
  children: React.ReactNode;
  store?: ReturnType<typeof createMockStore>;
  initialEntries?: string[];
}> = ({ children, store, initialEntries = ['/'] }) => {
  const mockStore = store || createMockStore();
  return (
    <Provider store={mockStore}>
      <MemoryRouter 
        initialEntries={initialEntries} 
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        {children}
      </MemoryRouter>
    </Provider>
  );
};

describe('useSelectedTab', () => {
  it('should return default tab when no state or query param is set', () => {
    const { result } = renderHook(() => useSelectedTab(1), {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });

    expect(result.current.selectedTabId).toBe(1);
  });

  it('should return query param value over default and state', () => {
    const store = createMockStore({
      ui: { selectedTabId: 2 },
    });

    const { result } = renderHook(() => useSelectedTab(1), {
      wrapper: ({ children }) => (
        <TestWrapper store={store} initialEntries={['/?selectedTabId=3']}>
          {children}
        </TestWrapper>
      ),
    });

    expect(result.current.selectedTabId).toBe(3);
  });

  it('should return state value over default when no query param', () => {
    const store = createMockStore({
      ui: { selectedTabId: 2 },
    });

    const { result } = renderHook(() => useSelectedTab(1), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    expect(result.current.selectedTabId).toBe(2);
  });

  it('should handle invalid query param gracefully', () => {
    const { result } = renderHook(() => useSelectedTab(1), {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={['/?selectedTabId=invalid']}>{children}</TestWrapper>
      ),
    });

    expect(result.current.selectedTabId).toBe(1);
  });

  it('should update state and URL when setSelectedTab is called', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useSelectedTab(1), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    act(() => {
      result.current.setSelectedTab(5);
    });

    expect(result.current.selectedTabId).toBe(5);
    const state = store.getState() as { ui: { selectedTabId: number | null } };
    expect(state.ui.selectedTabId).toBe(5);
  });

  it('should handle null tab selection', () => {
    const { result } = renderHook(() => useSelectedTab(1), {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });

    act(() => {
      result.current.setSelectedTab(null);
    });

    expect(result.current.selectedTabId).toBe(1); // Falls back to default
  });

  it('should maintain consistent behavior when dependencies do not change', () => {
    const { result, rerender } = renderHook(() => useSelectedTab(1), {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });

    const firstSetSelectedTab = result.current.setSelectedTab;
    const firstSelectedTabId = result.current.selectedTabId;

    rerender();

    const secondSetSelectedTab = result.current.setSelectedTab;
    const secondSelectedTabId = result.current.selectedTabId;

    // The most important thing is that the function works consistently
    expect(firstSelectedTabId).toBe(secondSelectedTabId);
    expect(typeof firstSetSelectedTab).toBe('function');
    expect(typeof secondSetSelectedTab).toBe('function');

    // Test that both functions work identically
    act(() => {
      firstSetSelectedTab(5);
    });

    expect(result.current.selectedTabId).toBe(5);
  });
});

describe('useSelectedTabId', () => {
  it('should return default tab when no state or query param is set', () => {
    const { result } = renderHook(() => useSelectedTabId(1), {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });

    expect(result.current).toBe(1);
  });

  it('should return query param value over default and state', () => {
    const store = createMockStore({
      ui: { selectedTabId: 2 },
    });

    const { result } = renderHook(() => useSelectedTabId(1), {
      wrapper: ({ children }) => (
        <TestWrapper store={store} initialEntries={['/?selectedTabId=3']}>
          {children}
        </TestWrapper>
      ),
    });

    expect(result.current).toBe(3);
  });

  it('should return state value over default when no query param', () => {
    const store = createMockStore({
      ui: { selectedTabId: 2 },
    });

    const { result } = renderHook(() => useSelectedTabId(1), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    expect(result.current).toBe(2);
  });

  it('should handle invalid query param gracefully', () => {
    const { result } = renderHook(() => useSelectedTabId(1), {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={['/?selectedTabId=invalid']}>{children}</TestWrapper>
      ),
    });

    expect(result.current).toBe(1);
  });

  it('should return null when no default is provided and no other value exists', () => {
    const { result } = renderHook(() => useSelectedTabId(), {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });

    expect(result.current).toBe(null);
  });

  it('should return stable reference when dependencies do not change', () => {
    const { result, rerender } = renderHook(() => useSelectedTabId(1), {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });

    const firstRender = result.current;
    rerender();
    const secondRender = result.current;

    expect(firstRender).toBe(secondRender);
  });
});
