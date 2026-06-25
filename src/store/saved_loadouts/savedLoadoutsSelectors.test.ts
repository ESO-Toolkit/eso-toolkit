import type { RootState } from '../storeWithHistory';

import { selectVisibleLoadouts } from './savedLoadoutsSelectors';
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
});
