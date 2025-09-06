import { configureStore, combineReducers } from '@reduxjs/toolkit';
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
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import { eventsReducer } from './events_data';
import masterDataReducer from './master_data/masterDataSlice';
import playerDataReducer from './player_data/playerDataSlice';
import reportReducer from './report/reportSlice';
import uiReducer from './ui/uiSlice';
import { workerResultsReducer } from './worker_results';

import type { EsoLogsClient } from '@/esologsClient';

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
  events: eventsReducer,
  workerResults: workerResultsReducer,
});

// Persist config
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['ui'], // Persist essential data, but not events (too large)
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Define thunk extra argument interface
export interface ThunkExtraArgument {
  esoLogsClient: EsoLogsClient;
}

// Configure store with thunk extra argument
const createStoreWithClient = (esoLogsClient: EsoLogsClient): ReturnType<typeof configureStore> => {
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
      name: 'ESO Log Aggregator',
      trace: false,
      maxAge: 25,
    },
  });
};

// Create a default store instance (will be replaced when client is available)
let store = createStoreWithClient({} as EsoLogsClient);

// Function to initialize store with actual client
export const initializeStoreWithClient = (
  esoLogsClient: EsoLogsClient,
): ReturnType<typeof configureStore> => {
  store = createStoreWithClient(esoLogsClient);
  return store;
};

// Export store getter to always return current store instance
export const getStore = (): ReturnType<typeof configureStore> => store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const persistor = persistStore(store);

// Create the redux history instance
export const reduxHistory = createReduxHistory(store);

export default store;
