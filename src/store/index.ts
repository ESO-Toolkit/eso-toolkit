import { configureStore } from '@reduxjs/toolkit';
import abilitiesReducer from './abilitiesSlice';

const store = configureStore({
  reducer: {
    abilities: abilitiesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
