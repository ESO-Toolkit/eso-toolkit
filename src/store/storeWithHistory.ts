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
  whitelist: ['ui', 'report', 'masterData', 'playerData'], // Persist essential data, but not events (too large)
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Actions that are allowed to contain non-serializable values
        // These are typically large data payloads or contain client instances
        ignoredActions: [
          // Redux persist actions (these contain non-serializable functions)
          FLUSH,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
          REHYDRATE,
          LOCATION_CHANGE,
          // Note: Other actions like healing events are now handled by the custom isSerializable function
        ],
        // Paths in actions that can contain non-serializable data (e.g., client instances)
        // Allow thunk arguments to contain non-serializable values like API clients
        ignoredActionPaths: [
          'meta.arg.client', // EsoLogsClient instances
          'meta.arg.onProgress', // Callback functions
          'payload.client', // Client instances in payloads
          'payload.onProgress', // Progress callback functions
        ],
        // State paths that contain large datasets or computed data that may not be serializable
        ignoredPaths: [
          'events.buffEvents',
          'events.damageEvents',
          'events.castEvents',
          'events.debuffEvents',
          'events.combatantInfoEvents',
          'events.healingEvents',
          'playerData.playersById',
          'workerResults.calculateBuffLookup.result',
          'workerResults.calculateDebuffLookup.result',
          'workerResults.calculatePenetrationData.result',
          'workerResults.calculateDamageReductionData.result',
          'workerResults.calculateCriticalDamageData.result',
          'workerResults.calculateStatusEffectUptimes.result',
          'workerResults.calculateHostileBuffLookup.result',
        ],
        // Custom serialization check that allows non-serializable values in thunk arguments
        // but maintains strict checks for state and stored payloads
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        isSerializable: (value: any, key?: string, stackPath?: string) => {
          // Allow basic serializable types
          if (value === null || value === undefined) return true;
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
            return true;

          // Allow common JavaScript objects that are serializable
          if (value instanceof Date) return true;
          if (value instanceof RegExp) return true;
          if (Array.isArray(value)) return true;
          if (value && typeof value === 'object' && value.constructor === Object) return true;

          // Allow non-serializable values in thunk meta arguments (like client instances)
          // These paths are for action arguments, not stored state
          const path = stackPath || '';
          if (
            path.includes('meta.arg') ||
            path.includes('payload.client') ||
            path.includes('payload.onProgress')
          ) {
            return true;
          }

          // Allow functions in specific contexts (like callbacks)
          if (typeof value === 'function') {
            if (key === 'onProgress' || key === 'client' || path.includes('callback')) {
              return true;
            }
          }

          // Allow certain known non-serializable classes that we use intentionally
          if (value && value.constructor) {
            const constructorName = value.constructor.name;
            const allowedClasses = [
              'EsoLogsClient', // Apollo client wrapper
              'ApolloClient', // Apollo GraphQL client
              'InMemoryCache', // Apollo cache
              'HttpLink', // Apollo HTTP link
              'Observable', // RxJS Observable
              'Subscription', // RxJS Subscription
            ];

            if (allowedClasses.includes(constructorName)) {
              return true;
            }
          }

          // If we reach here, it's an unexpected non-serializable value
          const pathInfo = stackPath ? ` at path: ${stackPath}` : '';
          const keyInfo = key ? ` (key: ${key})` : '';
          throw new Error(
            `Unexpected non-serializable value detected${pathInfo}${keyInfo}. ` +
              `Value type: ${typeof value}, Constructor: ${value?.constructor?.name || 'unknown'}. ` +
              `If this is intentional, add the path to ignoredPaths/ignoredActionPaths or update the serialization check.`,
          );
        },
        // Remove the warning threshold since we're throwing errors now
      },
    }).concat(routerMiddleware), // Add router middleware
  devTools: process.env.NODE_ENV !== 'production' && {
    // Sanitize sensitive data in Redux DevTools to prevent exposure of large datasets
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stateSanitizer: (state: any) => ({
      ...state,
      // Sanitize player data to prevent exposure of sensitive information
      playerData: state.playerData
        ? {
            ...state.playerData,
            playersById:
              Object.keys(state.playerData.playersById || {}).length > 0
                ? '<SANITIZED_PLAYER_DATA>'
                : state.playerData.playersById,
          }
        : state.playerData,
      // Sanitize large worker result datasets
      workerResults: state.workerResults
        ? {
            ...state.workerResults,
            buffLookup: state.workerResults.buffLookup?.result
              ? { ...state.workerResults.buffLookup, result: '<SANITIZED_BUFF_DATA>' }
              : state.workerResults.buffLookup,
            debuffLookup: state.workerResults.debuffLookup?.result
              ? { ...state.workerResults.debuffLookup, result: '<SANITIZED_DEBUFF_DATA>' }
              : state.workerResults.debuffLookup,
            penetrationData: state.workerResults.penetrationData?.result
              ? { ...state.workerResults.penetrationData, result: '<SANITIZED_PENETRATION_DATA>' }
              : state.workerResults.penetrationData,
            damageReduction: state.workerResults.damageReduction?.result
              ? {
                  ...state.workerResults.damageReduction,
                  result: '<SANITIZED_DAMAGE_REDUCTION_DATA>',
                }
              : state.workerResults.damageReduction,
            criticalDamage: state.workerResults.criticalDamage?.result
              ? {
                  ...state.workerResults.criticalDamage,
                  result: '<SANITIZED_CRITICAL_DAMAGE_DATA>',
                }
              : state.workerResults.criticalDamage,
            statusEffectUptimes: state.workerResults.statusEffectUptimes?.result
              ? {
                  ...state.workerResults.statusEffectUptimes,
                  result: '<SANITIZED_STATUS_EFFECT_DATA>',
                }
              : state.workerResults.statusEffectUptimes,
          }
        : state.workerResults,
      // Sanitize events data - keep only event counts for debugging
      events: state.events
        ? {
            ...state.events,
            buffEvents:
              state.events.buffEvents?.length > 0
                ? `<SANITIZED_${state.events.buffEvents.length}_BUFF_EVENTS>`
                : state.events.buffEvents,
            damageEvents:
              state.events.damageEvents?.length > 0
                ? `<SANITIZED_${state.events.damageEvents.length}_DAMAGE_EVENTS>`
                : state.events.damageEvents,
            castEvents:
              state.events.castEvents?.length > 0
                ? `<SANITIZED_${state.events.castEvents.length}_CAST_EVENTS>`
                : state.events.castEvents,
            combatantInfoEvents:
              state.events.combatantInfoEvents?.length > 0
                ? `<SANITIZED_${state.events.combatantInfoEvents.length}_COMBATANT_INFO_EVENTS>`
                : state.events.combatantInfoEvents,
            debuffEvents:
              state.events.debuffEvents?.length > 0
                ? `<SANITIZED_${state.events.debuffEvents.length}_DEBUFF_EVENTS>`
                : state.events.debuffEvents,
            healing:
              state.events.healing?.events?.length > 0
                ? {
                    ...state.events.healing,
                    events: `<SANITIZED_${state.events.healing.events.length}_HEALING_EVENTS>`,
                  }
                : state.events.healing,
          }
        : state.events,
    }),
    // Sanitize actions that might contain sensitive payloads
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actionSanitizer: (action: any) => {
      // List of action types that contain large payloads to sanitize
      const sensitiveActionTypes = [
        'playerData/fetchPlayerData/fulfilled',
        'events/buffEvents/fulfilled',
        'events/damageEvents/fulfilled',
        'events/castEvents/fulfilled',
        'events/combatantInfoEvents/fulfilled',
        'events/debuffEvents/fulfilled',
        'events/healingEvents/fulfilled',
        'workerResults/buffLookup/fulfilled',
        'workerResults/debuffLookup/fulfilled',
        'workerResults/penetrationData/fulfilled',
        'workerResults/damageReduction/fulfilled',
        'workerResults/criticalDamage/fulfilled',
        'workerResults/statusEffectUptimes/fulfilled',
      ];

      if (sensitiveActionTypes.includes(action.type)) {
        return {
          ...action,
          payload: action.payload ? '<SANITIZED_ACTION_PAYLOAD>' : action.payload,
        };
      }

      return action;
    },
    // Limit the number of actions stored to prevent memory issues
    maxAge: 50,
    // Enable action stack traces for better debugging (only in development)
    trace: true,
    // Name for the DevTools instance
    name: 'ESO Log Aggregator',
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const persistor = persistStore(store);

// Create the redux history instance
export const reduxHistory = createReduxHistory(store);

export default store;
