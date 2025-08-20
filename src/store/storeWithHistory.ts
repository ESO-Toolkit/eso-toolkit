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

import abilitiesReducer from './abilitiesSlice';
import eventsReducer from './eventsSlice';
import masterDataReducer from './masterDataSlice';
import navigationReducer from './navigationSlice';
import reportReducer from './reportSlice';
import uiReducer from './uiSlice';

const uiPersistConfig = {
  key: 'ui',
  storage,
};

const { createReduxHistory, routerMiddleware, routerReducer } = createReduxHistoryContext({
  history: createHashHistory(),
  reduxTravelling: true,
});

const store = configureStore({
  reducer: {
    abilities: abilitiesReducer,
    events: eventsReducer,
    ui: persistReducer<ReturnType<typeof uiReducer>>(uiPersistConfig, uiReducer),
    navigation: navigationReducer,
    router: routerReducer,
    masterData: masterDataReducer,
    report: reportReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE],
      },
    }).concat(routerMiddleware),
});

export const persistor = persistStore(store);
export const reduxHistory = createReduxHistory(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
