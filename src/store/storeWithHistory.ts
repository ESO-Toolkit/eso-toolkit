import {
  configureStore,
  combineReducers,
  ThunkAction,
  Action,
  ThunkDispatch,
  type Reducer,
} from '@reduxjs/toolkit';
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

// Type-only import — erased at build time, so the build-editor slice's data
// graph (class-mastery tables, gear oracle, ESO static data) stays out of the
// entry bundle. The reducer itself arrives at runtime via injectReducer(),
// called from the /build-editor route's React.lazy factory in App.tsx.
import type { BuildEditorState } from '../features/build-editor/store/buildEditorSlice';
import loadoutReducer from '../features/loadout-manager/store/loadoutSlice';

import { companionReducer } from './companion';
import dashboardReducer from './dashboard/dashboardSlice';
import { eventsReducer } from './events_data';
import masterDataReducer from './master_data/masterDataSlice';
import parseAnalysisReducer from './parse_analysis/parseAnalysisSlice';
import playerDataReducer from './player_data/playerDataSlice';
import reportReducer from './report/reportSlice';
import { savedBuildsReducer } from './saved_builds';
import type { SavedBuildsState } from './saved_builds/savedBuildsSlice';
import { hasCompletedSavedBuildMigration } from './saved_builds/savedBuildStorage';
import { savedRostersReducer } from './saved_rosters';
import uiReducer, { UIState } from './ui/uiSlice';
import userReportsReducer from './user_reports';
import { workerResultsReducer } from './worker_results';

/**
 * Reducers present in the store from the very first dispatch.
 *
 * Every key the persist whitelist covers MUST live here. A lazily injected
 * slice is absent while REHYDRATE runs, so redux-persist would drop its
 * restored value on the floor.
 */
const staticReducers = {
  companion: companionReducer,
  dashboard: dashboardReducer,
  events: eventsReducer,
  loadout: loadoutReducer,
  masterData: masterDataReducer,
  parseAnalysis: parseAnalysisReducer,
  playerData: playerDataReducer,
  report: reportReducer,
  savedBuilds: savedBuildsReducer,
  savedRosters: savedRostersReducer,
  ui: uiReducer,
  userReports: userReportsReducer,
  workerResults: workerResultsReducer,
};

/**
 * Slices added to the store at runtime by `injectReducer()`.
 *
 * NOTE — these keys are declared NON-OPTIONAL on RootState even though they are
 * genuinely absent until their route injects them. The type deliberately lies
 * about runtime, in exchange for a contained diff: the ~89 files that consume
 * RootState keep compiling unchanged. The cost is that TypeScript will NOT flag
 * a read of a not-yet-injected slice, so any imperative
 * `store.getState().buildEditor` from OUTSIDE the /build-editor route tree has
 * to guard for undefined itself.
 */
interface InjectedState {
  buildEditor: BuildEditorState;
}

const staticRootReducer = combineReducers(staticReducers);

// Transform to exclude report/fight-specific UI state from persistence
// Only persist user preferences, not report-specific selections
// (exported for tests — new persisted fields must appear in BOTH the inbound
// allowlist and the rehydrate defaults, or they silently don't persist)
export const uiTransform = createTransform<UIState, Partial<UIState>>(
  // Transform state on its way to being serialized and persisted
  (inboundState) => {
    const {
      darkMode,
      showExperimentalTabs,
      sidebarOpen,
      myReportsPage,
      perfTier,
      perfTierOverride,
      perfLowNoticeSeen,
      chartIntensity,
    } = inboundState;
    return {
      darkMode,
      showExperimentalTabs,
      sidebarOpen,
      myReportsPage,
      perfTier,
      perfTierOverride,
      // Must appear BOTH here and in the rehydrate defaults below, or the
      // one-time low-tier notice re-fires on every reload.
      perfLowNoticeSeen,
      // chartIntensity is a user preference, not report-specific state — without
      // this it was reset to 'subtle' on every reload.
      chartIntensity,
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
      perfTier: 'medium',
      perfTierOverride: 'auto',
      perfLowNoticeSeen: false,
      chartIntensity: 'subtle',
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
 * Keep the old redux-persist copy as a crash/error fallback until IndexedDB
 * migration commits. Afterwards persist only an empty shell so screenshot data
 * is never duplicated into localStorage.
 */
export const savedBuildsTransform = createTransform<SavedBuildsState, SavedBuildsState>(
  (inboundState) => ({
    builds: hasCompletedSavedBuildMigration() ? [] : inboundState.builds,
    // Hydration is a per-session lifecycle flag, never durable state.
    hydrated: false,
  }),
  (outboundState) => ({ ...outboundState, hydrated: false }),
  { whitelist: ['savedBuilds'] },
);

// Define RootState type from the root reducer (before persist config).
// Injected slices are folded in structurally — see InjectedState above.
export type RootState = ReturnType<typeof staticRootReducer> & InjectedState;

// Persist config
const persistConfig = {
  key: 'root',
  storage,
  transforms: [uiTransform, savedBuildsTransform],
  // Saved builds remain here only as a migration/failure fallback. The
  // transform empties this slice after SavedBuildsGate commits to IndexedDB.
  whitelist: ['ui', 'loadout', 'dashboard', 'savedBuilds', 'savedRosters'],
};

const injectedReducers: Partial<Record<keyof InjectedState, Reducer>> = {};

// The reducer the store actually runs. `injectReducer()` swaps this in place.
let combinedReducer = staticRootReducer as unknown as Reducer<RootState>;

/**
 * A stable indirection between persistReducer and combineReducers.
 *
 * persistReducer keeps `_persistoid` and `_paused` in a CLOSURE that is only
 * armed by the one-time PERSIST action dispatched at boot by persistStore().
 * Re-wrapping the root reducer in a FRESH persistReducer on each injection
 * therefore yields an instance with `_persistoid === null` and `_paused === true`,
 * which silently stops every subsequent write to storage. In-memory state and
 * `_persist.rehydrated` still look completely correct, so the breakage is
 * invisible to any test that only inspects the store.
 *
 * Holding ONE persistReducer instance over this indirection means an injection
 * swaps only the inner combineReducers, and persistence keeps working.
 * Regression-tested in storeWithHistory.injectReducer.test.ts.
 */
const dynamicRootReducer: Reducer<RootState> = (state, action) => combinedReducer(state, action);

const persistedReducer = persistReducer<RootState>(persistConfig, dynamicRootReducer);

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
          ignoredActions: [FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE],
          // State paths that contain large datasets or computed data
          // playerData is a keyed cache (playerData.entries[key].playersById);
          // the old 'playerData.playersById' path matched nothing, so the dev
          // serializability check still deep-traversed every cached fight.
          ignoredPaths: ['events', 'playerData.entries', 'savedBuilds', 'workerResults'],
          // Increase warning threshold for better performance
          warnAfter: 128,
        },
      }),
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

/**
 * Add a reducer to the root store at runtime.
 *
 * Idempotent: re-injecting the same key with the same reducer is a no-op, so
 * concurrent lazy route factories (or a route the user visits twice) cannot
 * churn the store. Safe to call before React mounts.
 *
 * Injected reducers are held in a module-level registry that
 * `createStoreWithClient` reads through `combinedReducer`, so a store rebuilt
 * later by `initializeStoreWithClient()` still carries everything injected so
 * far rather than silently losing it.
 */
export const injectReducer = <K extends keyof InjectedState>(
  key: K,
  reducer: Reducer<InjectedState[K]>,
): void => {
  if (injectedReducers[key] === (reducer as Reducer)) return;
  injectedReducers[key] = reducer as Reducer;
  combinedReducer = combineReducers({
    ...staticReducers,
    ...injectedReducers,
  }) as unknown as Reducer<RootState>;
  // Deliberately the SAME persistReducer instance (see dynamicRootReducer).
  // This dispatches redux's REPLACE action, which materialises the newly
  // injected slice's initial state.
  //
  // The cast is only needed because `AppStore` is `ReturnType<typeof
  // configureStore>`, i.e. a store whose state is `unknown`; `replaceReducer`
  // therefore asks for `Reducer<unknown>`. This is the exact reducer the store
  // was built with.
  store.replaceReducer(persistedReducer as unknown as Reducer<unknown>);
};

export const persistor = persistStore(store);

export default store;
