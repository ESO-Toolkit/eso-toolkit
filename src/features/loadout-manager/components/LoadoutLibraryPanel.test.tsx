import { ThemeProvider, createTheme } from '@mui/material';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';

import savedLoadoutsReducer from '@/store/saved_loadouts/savedLoadoutsSlice';
import type { SavedLoadout } from '@/store/saved_loadouts/savedLoadoutsSlice';

import type { LoadoutSetup } from '../types/loadout.types';

import { LoadoutLibraryPanel } from './LoadoutLibraryPanel';

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
