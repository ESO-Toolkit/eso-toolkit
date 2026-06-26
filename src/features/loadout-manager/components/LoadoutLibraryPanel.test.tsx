import { ThemeProvider, createTheme } from '@mui/material';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import { Provider } from 'react-redux';

import { AuthContext } from '@/features/auth/AuthContext';
import savedLoadoutsReducer from '@/store/saved_loadouts/savedLoadoutsSlice';
import type { SavedLoadout } from '@/store/saved_loadouts/savedLoadoutsSlice';

import type { LoadoutSetup } from '../types/loadout.types';

import { LoadoutLibraryPanel } from './LoadoutLibraryPanel';

type AuthValue = ComponentProps<typeof AuthContext.Provider>['value'];

// Minimal AuthContext value. The panel only reads isLoggedIn/accessToken/currentUser.id/
// userLoading (via useLoadoutSync's defensive useContext), so the rest are inert stubs.
const makeAuth = (userId: number | null): AuthValue =>
  ({
    accessToken: userId !== null ? 'test-token' : '',
    isLoggedIn: userId !== null,
    isBanned: false,
    banReason: null,
    currentUser: userId !== null ? { id: userId } : null,
    userLoading: false,
    userError: null,
    setAccessToken: () => {},
    rebindAccessToken: () => {},
    refetchUser: async () => {},
  }) as unknown as AuthValue;

const makeSetup = (name = 'My Setup'): LoadoutSetup => ({
  name,
  disabled: false,
  condition: { boss: 'Lokkestiiz' },
  skills: { 0: { 3: 12345 }, 1: {} },
  cp: { 1: 67890 },
  food: { id: 111 },
  gear: { 0: { id: '222', trait: 'divines' } },
  code: '',
});

const makeEntry = (overrides: Partial<SavedLoadout> = {}): SavedLoadout => ({
  id: 'entry-1',
  name: 'Trial Tank',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  setup: makeSetup(),
  meta: { trialId: 'SS' },
  ...overrides,
});

const renderPanel = (loadouts: SavedLoadout[] = [], onLoad?: jest.Mock) => {
  const store = configureStore({
    reducer: { savedLoadouts: savedLoadoutsReducer },
    preloadedState: loadouts.length ? { savedLoadouts: { loadouts } } : undefined,
  });
  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <LoadoutLibraryPanel onLoad={onLoad} />
      </ThemeProvider>
    </Provider>,
  );
  return { store, ...utils };
};

describe('LoadoutLibraryPanel', () => {
  it('shows an empty state when there are no saved loadouts', () => {
    renderPanel();
    expect(screen.getByText('Your library is empty')).toBeInTheDocument();
    expect(screen.getByText(/No saved loadouts yet/i)).toBeInTheDocument();
  });

  it('renders a card per saved loadout with name and count', () => {
    renderPanel([makeEntry(), makeEntry({ id: 'entry-2', name: 'Healer' })]);
    expect(screen.getByText('Trial Tank')).toBeInTheDocument();
    expect(screen.getByText('Healer')).toBeInTheDocument();
    expect(screen.getByText('2 saved loadouts')).toBeInTheDocument();
  });

  it('invokes onLoad with the entry setup and the full entry when Load is clicked', () => {
    const onLoad = jest.fn();
    renderPanel([makeEntry({ name: 'Renamed Tank' })], onLoad);
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    expect(onLoad).toHaveBeenCalledTimes(1);
    // 1st arg: the embedded setup (name may be the original, pre-rename value).
    expect(onLoad.mock.calls[0][0]).toMatchObject({ name: 'My Setup' });
    // 2nd arg: the saved entry, carrying the canonical (possibly renamed) name
    // the loader adopts so the inserted setup matches the clicked card.
    expect(onLoad.mock.calls[0][1]).toMatchObject({ name: 'Renamed Tank' });
  });

  it('duplicates a loadout into the library', () => {
    const { store } = renderPanel([makeEntry()]);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    const { loadouts } = store.getState().savedLoadouts;
    expect(loadouts).toHaveLength(2);
    expect(loadouts.some((l) => l.name === 'Trial Tank (copy)')).toBe(true);
  });

  it('deletes a loadout after confirming', () => {
    const { store } = renderPanel([makeEntry()]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Delete Loadout?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(store.getState().savedLoadouts.loadouts).toHaveLength(0);
  });

  it('renames a loadout', () => {
    const { store } = renderPanel([makeEntry()]);
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));

    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Renamed Tank' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(store.getState().savedLoadouts.loadouts[0].name).toBe('Renamed Tank');
  });
});

// Pins the call-site wiring (the panel must feed selectVisibleLoadouts the IMMUTABLE
// `unownedOwnerUserId`, not the mutable `syncedUserId`). The store-level selector test
// can't catch a wrong field choice here, and the other panel tests render signed-out
// (currentUserId undefined), where the selector short-circuits and ignores the binding.
describe('LoadoutLibraryPanel — unowned visibility wiring (signed-in second account)', () => {
  const renderAs = (
    savedLoadouts: {
      loadouts: SavedLoadout[];
      syncedUserId?: string;
      unownedOwnerUserId?: string;
    },
    userId: number,
  ) => {
    const store = configureStore({
      reducer: { savedLoadouts: savedLoadoutsReducer },
      preloadedState: { savedLoadouts: savedLoadouts },
    });
    return render(
      <Provider store={store}>
        <AuthContext.Provider value={makeAuth(userId)}>
          <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
            <LoadoutLibraryPanel />
          </ThemeProvider>
        </AuthContext.Provider>
      </Provider>,
    );
  };

  it('hides the first account’s unowned rows from a different signed-in account', () => {
    // Browser first bound to account 1 (unownedOwnerUserId), then account 2 synced
    // (syncedUserId moved to 2). Account 2 is viewing. The immutable binding (1) must
    // win: account 2 sees its own row but NOT account 1's legacy guest loadout. If the
    // call site fed the mutable syncedUserId (2) instead, the secret row would appear.
    renderAs(
      {
        loadouts: [
          makeEntry({ id: 'legacy', name: 'Account 1 Secret', ownerUserId: undefined }),
          makeEntry({ id: 'mine', name: 'Account 2 Own', ownerUserId: '2' }),
        ],
        unownedOwnerUserId: '1',
        syncedUserId: '2',
      },
      2,
    );

    expect(screen.getByText('Account 2 Own')).toBeInTheDocument();
    expect(screen.queryByText('Account 1 Secret')).not.toBeInTheDocument();
  });
});
