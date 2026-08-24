import { ThemeProvider, createTheme } from '@mui/material';
import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import savedBuildsReducer from '../../../store/saved_builds/savedBuildsSlice';
import { dpsParsesApi } from '../api/dpsParsesApi';
import { BuildLeaderboardPage } from '../BuildLeaderboardPage';
import {
  makeThreeArchetypeFixture,
  resetFixtureIds,
} from '../clustering/__fixtures__/dpsParses.fixture';
import { runBuildClustering } from '../clustering/runBuildClustering';
import type { DpsEncounterSummary } from '../types/dpsParses.types';

jest.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: jest.fn() }) }));

/**
 * Wrapped, not replaced: the default delegates to the real clustering so these
 * page tests keep exercising production output, and only the failure test
 * overrides it. `resetMocks: true` wipes any implementation set inside the
 * factory, so the delegation is re-established in beforeEach.
 */
jest.mock('../clustering/runBuildClustering', () => ({
  __esModule: true,
  runBuildClustering: jest.fn(),
}));

const actualClustering = jest.requireActual<typeof import('../clustering/runBuildClustering')>(
  '../clustering/runBuildClustering',
);

const theme = createTheme();

/**
 * The same boss at two difficulties. `listDpsEncounters` groups by
 * (encounter_id, difficulty), so this is a shape the API genuinely returns —
 * keying the picker on encounter_id alone collides React keys and makes the
 * second entry unselectable.
 */
const ENCOUNTERS: DpsEncounterSummary[] = [
  {
    encounter_id: 60,
    difficulty: 122,
    encounter_name: 'Xoryn',
    zone_id: 38,
    trial_id: 'LC',
    parse_count: 180,
    top_amount: 200_000,
    class_count: 7,
    updated_at: '2026-08-04 04:00:00',
  },
  {
    encounter_id: 60,
    difficulty: 121,
    encounter_name: 'Xoryn',
    zone_id: 38,
    trial_id: 'LC',
    parse_count: 40,
    top_amount: 120_000,
    class_count: 5,
    updated_at: '2026-08-04 04:00:00',
  },
];

function renderPage(initialEntry = '/build-leaderboard') {
  const store = configureStore({ reducer: { savedBuilds: savedBuildsReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ThemeProvider theme={theme}>
          <BuildLeaderboardPage />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>,
  );
}

beforeEach(() => {
  jest.restoreAllMocks();
  (runBuildClustering as jest.MockedFunction<typeof runBuildClustering>).mockImplementation(
    actualClustering.runBuildClustering,
  );
  jest.spyOn(dpsParsesApi, 'listEncounters').mockResolvedValue({ encounters: ENCOUNTERS });
  jest
    .spyOn(dpsParsesApi, 'listParses')
    .mockResolvedValue({ parses: [], total: 0, limit: 100, offset: 0 });
});

describe('BuildLeaderboardPage', () => {
  it('sets the document title', async () => {
    renderPage();
    await waitFor(() => expect(document.title).toMatch(/build leaderboard/i));
  });

  it('offers every (encounter, difficulty) row as a distinct option', async () => {
    renderPage();

    await waitFor(() => expect(dpsParsesApi.listEncounters).toHaveBeenCalled());
    await userEvent.click(screen.getByLabelText(/trial & boss/i));

    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);
    // Distinct values, despite sharing an encounter_id.
    const values = options.map((o) => o.getAttribute('data-value'));
    expect(new Set(values).size).toBe(2);
  });

  /**
   * Regression: with the picker keyed on encounter_id alone, selecting the
   * second difficulty resolved back to the first match, so the query never
   * changed and the option was effectively unselectable.
   */
  it('queries the difficulty that was actually selected', async () => {
    renderPage();
    await waitFor(() => expect(dpsParsesApi.listEncounters).toHaveBeenCalled());

    await userEvent.click(screen.getByLabelText(/trial & boss/i));
    const listbox = within(screen.getByRole('listbox'));
    // The lower-difficulty row, which shares encounter_id 60 with the default.
    await userEvent.click(listbox.getByText(/40 parses/i));

    await waitFor(() =>
      expect(dpsParsesApi.listParses).toHaveBeenCalledWith(
        expect.objectContaining({ encounterId: 60, difficulty: 121 }),
        expect.anything(),
      ),
    );
  });

  /**
   * The class tab never consults the encounters feed, so a failure there must not
   * block it behind an error state.
   */
  it('does not block the class tab when the encounters feed fails', async () => {
    jest.spyOn(dpsParsesApi, 'listEncounters').mockRejectedValue(new Error('encounters exploded'));

    renderPage('/build-leaderboard?tab=class&class=Warden');

    await waitFor(() => expect(dpsParsesApi.listParses).toHaveBeenCalled());
    expect(screen.queryByText(/encounters exploded/)).not.toBeInTheDocument();
  });

  it('shows the encounters failure on the encounter tab, and Retry refetches it', async () => {
    const spy = jest
      .spyOn(dpsParsesApi, 'listEncounters')
      .mockRejectedValueOnce(new Error('encounters exploded'))
      .mockResolvedValue({ encounters: ENCOUNTERS });

    renderPage();

    await screen.findByText(/encounters exploded/);
    const callsBefore = spy.mock.calls.length;

    // Retry must re-run the feed that failed, not the parses query.
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(callsBefore));
    await waitFor(() => expect(screen.queryByText(/encounters exploded/)).not.toBeInTheDocument());
  });

  /**
   * Until the picker feed resolves there is no encounter to query, so
   * useDpsParses sits idle and the view would read that as "empty" — flashing
   * "No top parses recorded…" before any data could possibly have arrived.
   */
  it('does not flash the empty state while the encounters feed is loading', async () => {
    let release: ((v: { encounters: typeof ENCOUNTERS }) => void) | undefined;
    jest.spyOn(dpsParsesApi, 'listEncounters').mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    renderPage();

    // In flight: no misleading empty-state copy.
    expect(screen.queryByText(/no top parses recorded/i)).not.toBeInTheDocument();

    await act(async () => {
      release?.({ encounters: ENCOUNTERS });
    });

    await waitFor(() => expect(dpsParsesApi.listParses).toHaveBeenCalled());
  });

  /**
   * An unrecognised ?class= would leave the toggle group with nothing selected
   * and fire a request for a class that cannot exist.
   */
  it('clamps an unknown class param instead of querying for it', async () => {
    renderPage('/build-leaderboard?tab=class&class=NotAClass');

    await waitFor(() => expect(dpsParsesApi.listParses).toHaveBeenCalled());

    const calls = (dpsParsesApi.listParses as jest.Mock).mock.calls;
    calls.forEach(([opts]) => expect(opts.esoClass).not.toBe('NotAClass'));
    // Falls back to the first known class.
    expect(calls[calls.length - 1][0].esoClass).toBe('Arcanist');
  });

  it('switches to the class tab and queries by class', async () => {
    renderPage();

    const classTab = screen.getByRole('tab', { name: /by class/i });
    await userEvent.click(classTab);
    expect(classTab).toHaveAttribute('aria-selected', 'true');

    await waitFor(() =>
      expect(dpsParsesApi.listParses).toHaveBeenCalledWith(
        expect.objectContaining({ esoClass: 'Arcanist' }),
        expect.anything(),
      ),
    );
  });
  /**
   * Retry has to re-run the step that failed. When clustering is what broke,
   * refetching the parses is not a retry: identical rows produce an identical
   * cache key, so the clustering effect never fires again and the button does
   * nothing at all until a full page reload.
   */
  it('recovers from a clustering failure without refetching the parses', async () => {
    resetFixtureIds();
    const parses = makeThreeArchetypeFixture();
    jest
      .spyOn(dpsParsesApi, 'listParses')
      .mockResolvedValue({ parses, total: parses.length, limit: 100, offset: 0 });

    const clusterSpy = runBuildClustering as jest.MockedFunction<typeof runBuildClustering>;
    clusterSpy.mockRejectedValueOnce(new Error('clustering exploded'));

    renderPage();

    await screen.findByText(/clustering exploded/);
    const fetchCalls = (dpsParsesApi.listParses as jest.Mock).mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByTestId('start-here-card')).toBeInTheDocument());
    // The parses were never in question, so they must not be requested again.
    expect((dpsParsesApi.listParses as jest.Mock).mock.calls).toHaveLength(fetchCalls);
  });
});
