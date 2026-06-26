import { configureStore } from '@reduxjs/toolkit';

import type { RootState } from '../storeWithHistory';

import { selectUnownedOwnerUserId, selectVisibleLoadouts } from './savedLoadoutsSelectors';
import savedLoadoutsReducer, { bindUnownedOwnerUserId } from './savedLoadoutsSlice';
import type { SavedLoadout } from './savedLoadoutsSlice';

// The selector only reads id + ownerUserId, so a minimal cast keeps the test focused.
const loadout = (id: string, ownerUserId?: string): SavedLoadout =>
  ({ id, name: id, ownerUserId }) as unknown as SavedLoadout;

const stateWith = (loadouts: SavedLoadout[]): RootState =>
  ({ savedLoadouts: { loadouts } }) as unknown as RootState;

describe('selectVisibleLoadouts', () => {
  const owned = loadout('owned', 'A');
  const otherOwned = loadout('other', 'B');
  const guest = loadout('guest'); // unowned / legacy

  it('shows the account its own owned rows and hides another account’s owned rows', () => {
    const state = stateWith([owned, otherOwned]);
    expect(selectVisibleLoadouts('A', undefined)(state).map((l) => l.id)).toEqual(['owned']);
  });

  it('shows unowned rows on an unbound browser (no account has synced)', () => {
    const state = stateWith([guest]);
    expect(selectVisibleLoadouts('A', undefined)(state).map((l) => l.id)).toEqual(['guest']);
    // A logged-out guest sees them too.
    expect(selectVisibleLoadouts(undefined, undefined)(state).map((l) => l.id)).toEqual(['guest']);
  });

  it('shows unowned rows to the account that bound the browser', () => {
    const state = stateWith([guest]);
    expect(selectVisibleLoadouts('A', 'A')(state).map((l) => l.id)).toEqual(['guest']);
  });

  it('hides unowned (legacy) rows from a DIFFERENT account once the browser is bound', () => {
    const state = stateWith([owned, guest]);
    // B signs in on a browser bound to A: B sees neither A's owned rows nor the guest rows.
    expect(selectVisibleLoadouts('B', 'A')(state).map((l) => l.id)).toEqual([]);
  });

  it('still shows unowned rows to a signed-out guest on a bound browser', () => {
    const state = stateWith([owned, guest]);
    // Signed out (currentUserId undefined) on a browser bound to A: the guest keeps
    // their own local saves visible, but A's owned rows stay hidden.
    expect(selectVisibleLoadouts(undefined, 'A')(state).map((l) => l.id)).toEqual(['guest']);
  });
});

// End-to-end of the privacy fix: the unowned-namespace binding is WRITE-ONCE, so a
// second account syncing on the same browser can no longer re-expose the first
// account's unowned (guest/legacy) rows. Drives the real slice + selectors together to
// reproduce the originally-failing scenario.
describe('immutable unowned binding (regression)', () => {
  const guest = loadout('guest'); // unowned / legacy, built before any account synced

  const createStore = () =>
    configureStore({
      reducer: { savedLoadouts: savedLoadoutsReducer },
      preloadedState: { savedLoadouts: { loadouts: [guest] } },
    });

  it('keeps A’s unowned rows hidden from B even after B signs in AND syncs', () => {
    const store = createStore();
    // A is the first account to sync here → binds the unowned namespace to A.
    store.dispatch(bindUnownedOwnerUserId('A'));
    // B then signs in on the same browser and syncs. Pre-fix this overwrote the
    // mutable `syncedUserId`, re-exposing A's unowned rows to B; now the binding is
    // pinned to A and B's sync can't move it.
    store.dispatch(bindUnownedOwnerUserId('B'));

    const state = store.getState() as unknown as RootState;
    const binding = selectUnownedOwnerUserId(state);
    expect(binding).toBe('A');
    // The key assertion: B cannot see A's unowned rows.
    expect(selectVisibleLoadouts('B', binding)(state).map((l) => l.id)).toEqual([]);
  });

  it('still shows the unowned rows to a signed-out guest after binding', () => {
    const store = createStore();
    store.dispatch(bindUnownedOwnerUserId('A'));

    const state = store.getState() as unknown as RootState;
    const binding = selectUnownedOwnerUserId(state);
    expect(selectVisibleLoadouts(undefined, binding)(state).map((l) => l.id)).toEqual(['guest']);
  });

  it('still shows the unowned rows to the account that bound the browser', () => {
    const store = createStore();
    store.dispatch(bindUnownedOwnerUserId('A'));

    const state = store.getState() as unknown as RootState;
    const binding = selectUnownedOwnerUserId(state);
    expect(selectVisibleLoadouts('A', binding)(state).map((l) => l.id)).toEqual(['guest']);
  });
});
