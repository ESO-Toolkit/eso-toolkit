import {
  configureStore,
  combineReducers,
  ThunkAction,
  Action,
  ThunkDispatch,
} from '@reduxjs/toolkit';
import { createBrowserHistory } from 'history';
import { createReduxHistoryContext, LOCATION_CHANGE } from 'redux-first-history';
import {
  persistStore,
  persistReducer,
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  createTransform,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import type { EsoLogsClient } from '@/esologsClient';

import { eventsReducer } from './events_data';
import masterDataReducer from './master_data/masterDataSlice';
import parseAnalysisReducer from './parse_analysis/parseAnalysisSlice';
import playerDataReducer from './player_data/playerDataSlice';
import reportReducer from './report/reportSlice';
import uiReducer, { UIState } from './ui/uiSlice';
import { workerResultsReducer } from './worker_results';

// Create history
export const history = createBrowserHistory();
const { createReduxHistory, routerMiddleware, routerReducer } = createReduxHistoryContext({
  history,
});

// Root reducer - adding essential slices
const rootReducer = combineReducers({
  router: routerReducer,
  ui: uiReducer,
  report: reportReducer,
  masterData: masterDataReducer,
  playerData: playerDataReducer,
  parseAnalysis: parseAnalysisReducer,
  events: eventsReducer,
  workerResults: workerResultsReducer,
});

// Transform to exclude report/fight-specific UI state from persistence
// Only persist user preferences, not report-specific selections
const uiTransform = createTransform<UIState, Partial<UIState>>(
  // Transform state on its way to being serialized and persisted
  (inboundState) => {
    const { darkMode, showExperimentalTabs, sidebarOpen, myReportsPage } = inboundState;
    return {
      darkMode,
      showExperimentalTabs,
      sidebarOpen,
      myReportsPage,
    };
  },
  // Transform state being rehydrated
  (outboundState) => {
    // Get the initial state values for non-persisted fields
    const initialUIState: UIState = {
      darkMode: true,
      selectedPlayerId: null,
      selectedTabId: null,
      selectedTargetIds: [],
      selectedFriendlyPlayerId: null,
      showExperimentalTabs: false,
      sidebarOpen: false,
      myReportsPage: 1,
    };

    // Merge persisted preferences with initial report-specific state
    return {
      ...initialUIState,
      ...outboundState,
    } as UIState;
  },
  { whitelist: ['ui'] },
);

// Define RootState type from the root reducer (before persist config)
export type RootState = ReturnType<typeof rootReducer>;

// Persist config
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['ui'], // Persist essential data, but not events (too large)
  transforms: [uiTransform], // Apply transform to exclude report-specific UI state
};

const persistedReducer = persistReducer<RootState>(persistConfig, rootReducer);

// Define thunk extra argument interface
export interface ThunkExtraArgument {
  esoLogsClient: EsoLogsClient;
}

// Define store type
type AppStore = ReturnType<typeof configureStore>;
export type AppDispatch = ThunkDispatch<RootState, ThunkExtraArgument, Action<string>>;

// Define AppThunk type for typed thunk actions
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  ThunkExtraArgument,
  Action<string>
>;

// Configure store with thunk extra argument
const createStoreWithClient = (esoLogsClient: EsoLogsClient): AppStore => {
  return configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: { esoLogsClient } as ThunkExtraArgument,
        },
        serializableCheck: {
          // Only ignore Redux persist actions since thunk actions are now serializable
          ignoredActions: [FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, LOCATION_CHANGE],
          // State paths that contain large datasets or computed data
          ignoredPaths: ['events', 'playerData.playersById', 'workerResults'],
          // Increase warning threshold for better performance
          warnAfter: 128,
        },
      }).concat(routerMiddleware), // Add router middleware
    devTools: process.env.NODE_ENV !== 'production' && {
      name: 'ESO Toolkit',
      trace: false,
      maxAge: 25,
    },
  });
};

// Create a default store instance (will be replaced when client is available)
let store = createStoreWithClient({} as EsoLogsClient);

// Function to initialize store with actual client
export const initializeStoreWithClient = (esoLogsClient: EsoLogsClient): AppStore => {
  store = createStoreWithClient(esoLogsClient);
  return store;
};

// Export store getter to always return current store instance
export const getStore = (): AppStore => store;

export const persistor = persistStore(store);

// Create the redux history instance
export const reduxHistory = createReduxHistory(store);

export default store;
