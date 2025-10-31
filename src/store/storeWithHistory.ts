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
import reportReducer, { ReportState } from './report/reportSlice';
import uiReducer, { UIState } from './ui/uiSlice';
import userReportsReducer from './user_reports';
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
  userReports: userReportsReducer,
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

/**
 * Transform to avoid persisting heavy fight data in report entries.
 * Only persist metadata and structure, not the actual fight data.
 */
const reportTransform = createTransform<ReportState, ReportState>(
  // Transform state before persisting
  (inboundState) => {
    const transformed: ReportState = {
      ...inboundState,
      entries: Object.entries(inboundState.entries).reduce(
        (acc, [key, entry]) => {
          if (entry) {
            // Persist everything except fightsById (which can be large)
            acc[key] = {
              ...entry,
              fightsById: {}, // Clear heavy fight data
            };
          }
          return acc;
        },
        {} as ReportState['entries'],
      ),
    };
    return transformed;
  },
  // Transform state after rehydrating
  (outboundState) => {
    // No transformation needed on rehydration
    return outboundState;
  },
  { whitelist: ['report'] },
);

// Define RootState type from the root reducer (before persist config)
export type RootState = ReturnType<typeof rootReducer>;

// Persist config
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['ui', 'report'], // Persist ui and report state
  blacklist: [], // Events and large data are not persisted
  transforms: [uiTransform, reportTransform], // Apply both transforms
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const persistedReducer = persistReducer(persistConfig as any, rootReducer);

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
