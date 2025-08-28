import { configureStore } from '@reduxjs/toolkit';
import { createHashHistory } from 'history';
import { createReduxHistoryContext } from 'redux-first-history';
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

// Create redux-first-history context with hash history
const { createReduxHistory, routerMiddleware, routerReducer } = createReduxHistoryContext({
  history: createHashHistory(),
  // Batch updates for better performance - this prevents multiple re-renders
  batch: (callback: () => void) => {
    // Use React's automatic batching in React 18+
    callback();
  },
  // Enable redux devtools time travel for history actions (useful for development)
  reduxTravelling: process.env.NODE_ENV === 'development',
});

const uiPersistConfig = {
  key: 'root',
  whitelist: ['ui'],
  storage,
  transforms: [],
};

const store = configureStore({
  reducer: {
    router: routerReducer, // Add router reducer for redux-first-history
    events: eventsReducer,
    ui: persistReducer<ReturnType<typeof uiReducer>>(uiPersistConfig, uiReducer),
    masterData: masterDataReducer,
    playerData: playerDataReducer,
    report: reportReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE],
      },
    }).concat(routerMiddleware), // Add router middleware
});

export const persistor = persistStore(store);

// Create the history object that's synced with Redux
export const history = createReduxHistory(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
