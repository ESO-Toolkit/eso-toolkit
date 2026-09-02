/**
 * Regression tests for lazy reducer injection.
 *
 * The headline risk of `replaceReducer` + redux-persist is a SILENT persistence
 * break: persistReducer holds `_persistoid` / `_paused` in a closure that only
 * the one-time boot PERSIST action arms. Wrapping the root reducer in a fresh
 * persistReducer on every injection produces an instance that never writes to
 * storage again, while in-memory state and `_persist.rehydrated` still look
 * perfectly correct. `writes to storage AFTER an injection` below is the test
 * that actually catches that — the in-memory assertions alone would not.
 */
import { setBuildName } from '../features/build-editor/store/buildEditorSlice';

import type { RootState } from './storeWithHistory';
import { setMyReportsPage } from './ui/uiSlice';

// Let redux-persist's async storage round-trips settle.
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const readPersisted = (): Record<string, string> =>
  JSON.parse(window.localStorage.getItem('persist:root') ?? '{}') as Record<string, string>;

type StoreModule = typeof import('./storeWithHistory');

/**
 * Boot a fresh copy of the real store module with `persist:root` pre-seeded, so
 * the module-scope `persistStore()` performs a genuine rehydrate.
 */
const bootStore = async (persisted?: Record<string, unknown>): Promise<StoreModule> => {
  window.localStorage.clear();
  if (persisted) {
    const encoded: Record<string, string> = {};
    for (const [key, value] of Object.entries(persisted)) {
      encoded[key] = JSON.stringify(value);
    }
    window.localStorage.setItem('persist:root', JSON.stringify(encoded));
  }

  let mod!: StoreModule;
  jest.isolateModules(() => {
    mod = require('./storeWithHistory') as StoreModule;
  });
  await flush();
  return mod;
};

describe('injectReducer', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('adds the slice to the store and lets it handle dispatches', async () => {
    const { default: store, injectReducer } = await bootStore();
    const buildEditorReducer = (await import('../features/build-editor/store/buildEditorSlice'))
      .default;

    // Not present before injection — the type says otherwise on purpose.
    expect(store.getState()).not.toHaveProperty('buildEditor');

    injectReducer('buildEditor', buildEditorReducer);

    const injected = (store.getState() as RootState).buildEditor;
    expect(injected).toBeDefined();
    expect(injected.activeSidebarTab).toBe('general');

    store.dispatch(setBuildName('Injected OK'));
    expect((store.getState() as RootState).buildEditor.build.name).toBe('Injected OK');
  });

  it('leaves the eager slices untouched when a reducer is injected', async () => {
    const { default: store, injectReducer } = await bootStore();
    const buildEditorReducer = (await import('../features/build-editor/store/buildEditorSlice'))
      .default;

    const before = store.getState() as RootState;
    injectReducer('buildEditor', buildEditorReducer);
    const after = store.getState() as RootState;

    expect(Object.keys(before).every((key) => key in (after as object))).toBe(true);
    expect(after.ui).toEqual(before.ui);
    expect(after.report).toEqual(before.report);
  });

  it('is idempotent — re-injecting the same key+reducer does not churn the store', async () => {
    const { default: store, injectReducer } = await bootStore();
    const buildEditorReducer = (await import('../features/build-editor/store/buildEditorSlice'))
      .default;

    const replaceSpy = jest.spyOn(store, 'replaceReducer');

    injectReducer('buildEditor', buildEditorReducer);
    expect(replaceSpy).toHaveBeenCalledTimes(1);

    store.dispatch(setBuildName('Kept'));

    injectReducer('buildEditor', buildEditorReducer);
    injectReducer('buildEditor', buildEditorReducer);

    // No further replaceReducer calls, and existing slice state is preserved.
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect((store.getState() as RootState).buildEditor.build.name).toBe('Kept');

    replaceSpy.mockRestore();
  });

  // ─── Persistence ──────────────────────────────────────────────────────────

  it('preserves rehydrated persisted state across an injection', async () => {
    const { default: store, injectReducer } = await bootStore({
      ui: { darkMode: false, myReportsPage: 7, perfLowNoticeSeen: true, perfTier: 'low' },
      _persist: { version: -1, rehydrated: true },
    });
    const buildEditorReducer = (await import('../features/build-editor/store/buildEditorSlice'))
      .default;

    // Sanity: the seeded values actually rehydrated.
    const beforeState = store.getState() as unknown as {
      ui: { darkMode: boolean; myReportsPage: number };
      _persist: { rehydrated: boolean };
    };
    expect(beforeState.ui.darkMode).toBe(false);
    expect(beforeState.ui.myReportsPage).toBe(7);
    expect(beforeState._persist.rehydrated).toBe(true);

    injectReducer('buildEditor', buildEditorReducer);
    await flush();

    const afterState = store.getState() as unknown as {
      ui: { darkMode: boolean; myReportsPage: number; perfLowNoticeSeen: boolean };
      _persist: { rehydrated: boolean };
    };
    // Persisted values SURVIVE the replaceReducer.
    expect(afterState.ui.darkMode).toBe(false);
    expect(afterState.ui.myReportsPage).toBe(7);
    expect(afterState.ui.perfLowNoticeSeen).toBe(true);
    // ...and redux-persist still considers the store rehydrated.
    expect(afterState._persist.rehydrated).toBe(true);
  });

  it('writes to storage AFTER an injection (guards the silent persist break)', async () => {
    const { default: store, injectReducer } = await bootStore({
      ui: { darkMode: false, myReportsPage: 1 },
      _persist: { version: -1, rehydrated: true },
    });
    const buildEditorReducer = (await import('../features/build-editor/store/buildEditorSlice'))
      .default;

    store.dispatch(setMyReportsPage(2));
    await flush();
    expect(JSON.parse(readPersisted().ui).myReportsPage).toBe(2);

    injectReducer('buildEditor', buildEditorReducer);
    await flush();

    // The critical assertion: a post-injection change must still reach storage.
    store.dispatch(setMyReportsPage(9));
    await flush();
    expect(JSON.parse(readPersisted().ui).myReportsPage).toBe(9);

    // The injected slice must NOT leak into persisted storage (not whitelisted).
    expect(readPersisted()).not.toHaveProperty('buildEditor');
  });
});
