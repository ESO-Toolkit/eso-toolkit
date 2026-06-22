/**
 * Tests the "Send to Wizard's Wardrobe" wiring added in the build↔loadout
 * bridge: the header turns every build setup into a paste-in WW import code via
 * the shared loadout panel, and withholds the codes when a setup has a blocking
 * gear-slot error (mirroring the loadout Export dialog gate). The bridge/encoder
 * themselves are unit-tested elsewhere — here we assert the header wiring.
 */

import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import savedBuildsReducer from '@/store/saved_builds/savedBuildsSlice';
import savedRostersReducer from '@/store/saved_rosters/savedRostersSlice';

import buildEditorReducer, { loadBuild } from '../../store/buildEditorSlice';
import type { Build, GearConfig } from '../../types/build.types';
import { BuildCompletionHeader } from '../BuildCompletionHeader';

// Guests render the full inline action strip without the auth-gated publish
// dialog, which keeps this test focused on the transfer wiring.
jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: false, accessToken: null }),
}));

// The shared WW panel pulls a context logger; stub it so the dialog can mount
// without a LoggerProvider in this isolated render.
jest.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }),
}));

// A complete default Build straight from the reducer; we only override gear.
const baseBuild: Build = buildEditorReducer(undefined, { type: '@@INIT' } as never).build;

const renderHeader = (gear: GearConfig) => {
  const store = configureStore({
    reducer: {
      buildEditor: buildEditorReducer,
      savedBuilds: savedBuildsReducer,
      savedRosters: savedRostersReducer,
    },
  });
  store.dispatch(
    loadBuild({
      ...baseBuild,
      name: 'Test Build',
      setups: [{ ...baseBuild.setups[0], gear }],
    }),
  );
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <SnackbarProvider>
          <BuildCompletionHeader />
        </SnackbarProvider>
      </MemoryRouter>
    </Provider>,
  );
};

const openWWDialog = (): void => {
  fireEvent.click(screen.getByRole('button', { name: /send to wizard's wardrobe/i }));
};

describe('BuildCompletionHeader — Send to Wizard’s Wardrobe', () => {
  it('opens the dialog and generates a paste-in import code for the build setup', async () => {
    renderHeader({});
    openWWDialog();

    // The shared panel renders its in-game instructions and a per-setup copy button.
    await waitFor(() => expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument());
    expect(screen.getByText(/open Wizard's Wardrobe/i)).toBeInTheDocument();
  });

  it('withholds the codes when a setup has a blocking gear-slot error', async () => {
    // An armor slot pointing at an item id that is not in the database is a
    // blocking validation error, so codes must not be offered.
    renderHeader({ 0: { id: 999999999 } });
    openWWDialog();

    await waitFor(() =>
      expect(screen.getByText(/resolve the gear slot issues/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
  });
});
