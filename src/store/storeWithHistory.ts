import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { createBrowserHistory } from 'history';
import { createReduxHistoryContext } from 'redux-first-history';

import uiReducer from './ui/uiSlice';
import reportReducer from './report/reportSlice';
import masterDataReducer from './master_data/masterDataSlice';
import playerDataReducer from './player_data/playerDataSlice';
import { eventsReducer } from './events_data';

// Create history
export const history = createBrowserHistory();
const { createReduxHistory, routerMiddleware, routerReducer } = createReduxHistoryContext({ history });

// Root reducer - adding essential slices
const rootReducer = combineReducers({
  router: routerReducer,
  ui: uiReducer,
  report: reportReducer,
  masterData: masterDataReducer,
  playerData: playerDataReducer,
  events: eventsReducer,
});

// Persist config
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['ui', 'report', 'masterData', 'playerData'], // Persist essential data, but not events (too large)
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
          '@@router/LOCATION_CHANGE' // Ignore router actions for serialization
        ],
      },
    }).concat(routerMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const persistor = persistStore(store);

// Create the redux history instance
export const reduxHistory = createReduxHistory(store);

export default store;