import React, { useEffect, useRef } from 'react';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, Store } from 'redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { setSelectedTargetIds } from './store/ui/uiSlice';
import { useAppDispatch } from './store/useAppDispatch';

jest.mock('./contexts/AbilityIdMapperContext', () => ({
  AbilityIdMapperProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./utils/analytics', () => ({
  trackEvent: jest.fn(),
}));

import { ReportFightProvider, useReportFightDetailsNavigation } from './ReportFightContext';
import { TabId } from './utils/getSkeletonForTab';
import { trackEvent } from './utils/analytics';

// Create a test hook that mimics the ReportFightProvider's target clearing behavior
function useTestFightTargetClearer(fightId: string | null | undefined) {
  const dispatch = useAppDispatch();
  const previousFightId = useRef<string | null | undefined>(fightId);

  // Clear selected targets when fight changes (same logic as in ReportFightProvider)
  useEffect(() => {
    if (fightId !== previousFightId.current && fightId) {
      dispatch(setSelectedTargetIds([]));
    }
    previousFightId.current = fightId;
  }, [dispatch, fightId]);
}

// Create a mock store with UI slice
const createMockStore = (initialSelectedTargetIds: number[] = []): Store => {
  const rootReducder = combineReducers({
    ui: (state = { selectedTargetIds: initialSelectedTargetIds }, action: any) => {
      switch (action.type) {
        case 'ui/setSelectedTargetIds':
          return { ...state, selectedTargetIds: action.payload };
        default:
          return state;
      }
    },
  });

  return createStore(rootReducder);
};

// Test wrapper that provides Redux store
interface TestWrapperProps {
  children: React.ReactNode;
  store: Store;
}

const TestWrapper: React.FC<TestWrapperProps> = ({ children, store }) => {
  return <Provider store={store}>{children}</Provider>;
};

describe('ReportFightContext target clearing logic', () => {
  it('should clear selected targets when fight ID changes', () => {
    const store = createMockStore([100, 200, 300]);

    let currentFightId = '1';

    const { rerender } = renderHook(() => useTestFightTargetClearer(currentFightId), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    // Verify initial state has targets
    expect((store.getState() as any).ui.selectedTargetIds).toEqual([100, 200, 300]);

    // Change fight ID
    currentFightId = '2';
    rerender();

    // Verify targets are cleared after fight change
    expect((store.getState() as any).ui.selectedTargetIds).toEqual([]);
  });

  it('should not clear targets when fight ID remains the same', () => {
    const store = createMockStore([100, 200]);

    const { rerender } = renderHook(() => useTestFightTargetClearer('1'), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    // Verify initial state has targets
    expect((store.getState() as any).ui.selectedTargetIds).toEqual([100, 200]);

    // Re-render with same fight ID
    rerender();

    // Targets should still be there since fight ID didn't change
    expect((store.getState() as any).ui.selectedTargetIds).toEqual([100, 200]);
  });

  it('should not clear targets on initial render', () => {
    const store = createMockStore([100, 200]);

    renderHook(() => useTestFightTargetClearer('1'), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    // Targets should remain on initial render (no previous fight to compare against)
    expect((store.getState() as any).ui.selectedTargetIds).toEqual([100, 200]);
  });
});

describe('ReportFightContext analytics tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderNavigationHook = (initialEntry = '/report/abc/fight/1/insights') => {
    const store = createMockStore();

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <Provider store={store}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              path="/report/:reportId/fight/:fightId/:tabId"
              element={<ReportFightProvider>{children}</ReportFightProvider>}
            />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    return renderHook(() => useReportFightDetailsNavigation(), { wrapper });
  };

  it('tracks tab selection events', () => {
    const { result } = renderNavigationHook();

    act(() => {
      result.current.setSelectedTab(TabId.DAMAGE_DONE);
    });

    expect(trackEvent).toHaveBeenCalledWith(
      'Report Detail',
      'Select Tab',
      TabId.DAMAGE_DONE,
      undefined,
      expect.objectContaining({
        report_id: 'abc',
        fight_id: '1',
        target_tab: TabId.DAMAGE_DONE,
        previous_tab: TabId.INSIGHTS,
      }),
    );
  });

  it('tracks experimental tab enablement when selecting experimental tab', () => {
    const { result } = renderNavigationHook();

    act(() => {
      result.current.setSelectedTab(TabId.RAW_EVENTS);
    });

    expect(trackEvent).toHaveBeenNthCalledWith(
      1,
      'Report Detail',
      'Select Tab',
      TabId.RAW_EVENTS,
      undefined,
      expect.objectContaining({
        report_id: 'abc',
        fight_id: '1',
        target_tab: TabId.RAW_EVENTS,
        is_experimental_tab: true,
      }),
    );
    expect(trackEvent).toHaveBeenNthCalledWith(
      2,
      'Report Detail',
      'Enable Experimental Tabs',
      TabId.RAW_EVENTS,
      undefined,
      expect.objectContaining({
        report_id: 'abc',
        fight_id: '1',
        target_tab: TabId.RAW_EVENTS,
        triggered_by_tab_selection: true,
      }),
    );
  });

  it('tracks experimental tab toggles', () => {
    const { result } = renderNavigationHook();

    act(() => {
      result.current.setShowExperimentalTabs(true);
    });

    expect(trackEvent).toHaveBeenCalledWith(
      'Report Detail',
      'Toggle Experimental Tabs',
      'enable',
      undefined,
      expect.objectContaining({
        report_id: 'abc',
        fight_id: '1',
        target_tab: TabId.INSIGHTS,
        enabled: true,
      }),
    );
  });
});
