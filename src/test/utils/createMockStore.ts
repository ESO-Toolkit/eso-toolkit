import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE } from 'redux-persist';

import { eventsReducer } from '../../store/events_data';
import masterDataReducer from '../../store/master_data/masterDataSlice';
import playerDataReducer from '../../store/player_data/playerDataSlice';
import reportReducer from '../../store/report/reportSlice';
import uiReducer from '../../store/ui/uiSlice';
import type { UIState } from '../../store/ui/uiSlice';
import userReportsReducer from '../../store/user_reports';

export interface MockStoreOptions {
  /**
   * Initial state for specific slices
   */
  initialState?: {
    ui?: Partial<UIState>;
    // Add other slice initial states as needed
  };
  /**
   * Whether to disable serializable check completely
   * @default false (uses production-like configuration)
   */
  disableSerializableCheck?: boolean;
  /**
   * Whether to enable Redux DevTools time travel
   * @default true
   */
  enableReduxDevTools?: boolean;
}

/**
 * Creates a mock Redux store that mirrors the production storeWithHistory
 * but adapted for testing environments:
 * - Uses memory history instead of hash history for isolated testing
 * - Skips persistence (no redux-persist) for clean test state
 * - Includes the same reducers and middleware structure as production
 * - Maintains the same state shape as the real store
 *
 * This is used by both Storybook decorators and unit tests to ensure
 * consistent store configuration across all testing environments.
 */
export function createMockStore(options: MockStoreOptions = {}): EnhancedStore {
  const { initialState = {}, disableSerializableCheck = false } = options;

  const serializableCheckConfig = disableSerializableCheck
    ? false
    : {
        // Same ignored actions as production
        ignoredActions: [FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE],
      };

  return configureStore({
    reducer: {
      events: eventsReducer,
      ui: uiReducer, // Use plain reducer (no persistence in testing)
      masterData: masterDataReducer,
      playerData: playerDataReducer,
      report: reportReducer,
      userReports: userReportsReducer, // Add userReports reducer
    },
    middleware: (getDefaultMiddleware) => {
      const defaultMiddleware = getDefaultMiddleware({
        serializableCheck: serializableCheckConfig,
      });
      return defaultMiddleware;
    },
    preloadedState: {
      ui: {
        darkMode: true,
        sidebarOpen: false,
        showExperimentalTabs: false,
        selectedTargetIds: [],
        selectedPlayerId: null,
        selectedFriendlyPlayerId: null,
        selectedTabId: null,
        myReportsPage: 1,
        ...(initialState.ui || {}),
      },
      // Add other slice initial states here as needed
    },
  });
}

/**
 * Default UI state for testing - matches the production initial state
 */
export const defaultMockUIState: UIState = {
  darkMode: true,
  sidebarOpen: false,
  showExperimentalTabs: false,
  selectedTargetIds: [],
  selectedPlayerId: null,
  selectedFriendlyPlayerId: null,
  selectedTabId: null,
  myReportsPage: 1,
};
