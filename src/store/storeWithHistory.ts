import { configureStore } from '@reduxjs/toolkit';
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

const uiPersistConfig = {
  key: 'root',
  whitelist: ['ui'],
  storage,
  transforms: [],
};

const store = configureStore({
  reducer: {
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
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
