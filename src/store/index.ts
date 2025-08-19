import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import abilitiesReducer from './abilitiesSlice';
import eventsReducer from './eventsSlice';
import navigationReducer from './navigationSlice';
import uiReducer from './uiSlice';

const uiPersistConfig = {
  key: 'ui',
  storage,
};

const store = configureStore({
  reducer: {
    abilities: abilitiesReducer,
    events: eventsReducer,
    ui: persistReducer(uiPersistConfig, uiReducer),
    navigation: navigationReducer,
  },
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
