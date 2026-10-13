import { AUTH_CREDENTIALS_CLEARED_EVENT } from '../features/auth/authEvents';
import { setCurrentCharacter } from '../features/loadout-manager/store/loadoutSlice';

import type { AppDispatch, AppThunk, RootState } from './storeWithHistory';
import { setMyReportsPage } from './ui/uiSlice';

type StoreModule = typeof import('./storeWithHistory');
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};
const boot = (): StoreModule => {
  let mod!: StoreModule;
  jest.isolateModules(() => {
    mod = require('./storeWithHistory') as StoreModule;
  });
  return mod;
};
const persistedCharacter = (): string | null => {
  const root = JSON.parse(localStorage.getItem('persist:root') ?? '{}') as Record<string, string>;
  return root.loadout ? (JSON.parse(root.loadout) as RootState['loadout']).currentCharacter : null;
};

describe('session erasure', () => {
  let mod: StoreModule;
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(async () => {
    mod.persistor.pause();
    await mod.persistor.flush();
    localStorage.clear();
  });

  it('resets live private data and prevents later UI updates from persisting it again', async () => {
    mod = boot();
    await settle();
    mod.default.dispatch(setCurrentCharacter('private-character'));
    await mod.persistor.flush();
    expect(persistedCharacter()).toBe('private-character');

    const clearing = mod.clearSessionState();
    expect((mod.default.getState() as RootState).loadout.currentCharacter).toBeNull();
    await clearing;
    mod.default.dispatch(setMyReportsPage(2));
    await mod.persistor.flush();
    expect(persistedCharacter()).toBeNull();
    expect((mod.default.getState() as RootState).ui.myReportsPage).toBe(2);
  });

  it('ignores old async thunk results while allowing work from the new session', async () => {
    mod = boot();
    await settle();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const oldRequest: AppThunk<Promise<void>> = async (dispatch) => {
      await pending;
      dispatch(setCurrentCharacter('old-response'));
    };
    const dispatch = mod.default.dispatch as AppDispatch;
    const work = dispatch(oldRequest);
    await mod.clearSessionState();
    release();
    await work;
    expect((mod.default.getState() as RootState).loadout.currentCharacter).toBeNull();
    dispatch((newDispatch) => {
      newDispatch(setCurrentCharacter('new-session'));
    });
    await mod.persistor.flush();
    expect(persistedCharacter()).toBe('new-session');
  });

  it('invalidates pending startup rehydration before it restores old data', async () => {
    localStorage.setItem(
      'persist:root',
      JSON.stringify({
        loadout: JSON.stringify({
          currentCharacter: 'old-character',
          characters: [],
          pages: {},
          currentTrial: 'GEN',
          currentPage: 0,
          mode: 'advanced',
        }),
        _persist: JSON.stringify({ version: -1, rehydrated: true }),
      }),
    );
    mod = boot();
    await mod.clearSessionState();
    await settle();
    expect((mod.default.getState() as RootState).loadout.currentCharacter).toBeNull();
    expect(persistedCharacter()).toBeNull();
  });

  it('handles overlapping erasures and resumes clean persistence', async () => {
    mod = boot();
    await settle();
    mod.default.dispatch(setCurrentCharacter('queued-private-write'));
    await Promise.all([mod.clearSessionState(), mod.clearSessionState()]);
    mod.default.dispatch(setCurrentCharacter('new-session'));
    await mod.persistor.flush();
    expect(persistedCharacter()).toBe('new-session');
  });

  it('clears live state synchronously when credentials are erased', async () => {
    mod = boot();
    await settle();
    mod.default.dispatch(setCurrentCharacter('private-character'));
    window.dispatchEvent(new Event(AUTH_CREDENTIALS_CLEARED_EVENT));
    expect((mod.default.getState() as RootState).loadout.currentCharacter).toBeNull();
    await settle();
    expect(persistedCharacter()).toBeNull();
  });
});
