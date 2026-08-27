import { ThemeProvider, createTheme } from '@mui/material';
import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

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

/** Surfaces the current URL so redirect assertions can read it. */
const LocationProbe: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

/**
 * Mounts the real route table rather than the bare component. The page reads
 * `useParams`, so rendering it outside a matching `<Route>` leaves every slug
 * undefined and silently exercises only the legacy query-param path.
 */
function renderPage(initialEntry = '/build-leaderboard') {
  const store = configureStore({ reducer: { savedBuilds: savedBuildsReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ThemeProvider theme={theme}>
          <LocationProbe />
          <Routes>
            <Route path="/build-leaderboard" element={<BuildLeaderboardPage />} />
            <Route path="/build-leaderboard/boss/:bossSlug" element={<BuildLeaderboardPage />} />
            <Route path="/build-leaderboard/class/:classSlug" element={<BuildLeaderboardPage />} />
            <Route
              path="/build-leaderboard/class/:classSlug/:bossSlug"
              element={<BuildLeaderboardPage />}
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    </Provider>,
  );
}

const currentUrl = (): string => screen.getByTestId('location').textContent ?? '';

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
    await userEvent.click(screen.getByLabelText(/^encounter$/i));

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

    await userEvent.click(screen.getByLabelText(/^encounter$/i));
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
   * The class tab POOLS across bosses (per-encounter capped) — but it still
   * depends on the encounters feed for DPS-ceiling normalization, so a failure
   * there must surface with a working Retry instead of hanging.
   */
  it('surfaces an encounters-feed failure on the class tab, and Retry refetches it', async () => {
    const spy = jest
      .spyOn(dpsParsesApi, 'listEncounters')
      .mockRejectedValueOnce(new Error('encounters exploded'))
      .mockResolvedValue({ encounters: ENCOUNTERS });

    renderPage('/build-leaderboard?tab=class&class=Warden');

    await screen.findByText(/encounters exploded/);
    const callsBefore = spy.mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(callsBefore));
    // Once encounters resolve, the pooled class query proceeds.
    await waitFor(() =>
      expect(dpsParsesApi.listParses).toHaveBeenCalledWith(
        expect.objectContaining({ esoClass: 'Warden', perEncounterCap: 25, limit: 1000 }),
        expect.anything(),
      ),
    );
  });

  /**
   * Pooled class view: query by class alone with a per-boss cap so high-
   * ceiling boards don't crowd out the pool. Minority classes get real
   * archetype samples instead of 'too few parses' on most bosses.
   */
  it('pools the class-tab query across bosses with a per-encounter cap', async () => {
    renderPage('/build-leaderboard?tab=class&class=Necromancer');

    await waitFor(() =>
      expect(dpsParsesApi.listParses).toHaveBeenCalledWith(
        expect.objectContaining({
          esoClass: 'Necromancer',
          perEncounterCap: 25,
          limit: 1000,
        }),
        expect.anything(),
      ),
    );
    expect(dpsParsesApi.listParses).not.toHaveBeenCalledWith(
      expect.objectContaining({ esoClass: 'Necromancer', encounterId: expect.anything() }),
      expect.anything(),
    );
  });

  /** An explicit ?boss= still narrows the class tab to one board (#1451 behavior). */
  it('narrows the class tab to one boss when the URL carries an explicit boss param', async () => {
    renderPage('/build-leaderboard?tab=class&class=Necromancer&boss=60:122');

    await waitFor(() =>
      expect(dpsParsesApi.listParses).toHaveBeenCalledWith(
        expect.objectContaining({
          esoClass: 'Necromancer',
          encounterId: 60,
          difficulty: 122,
        }),
        expect.anything(),
      ),
    );
  });

  it('keeps the encounter picker available on the class tab and re-queries on change', async () => {
    renderPage('/build-leaderboard?tab=class&class=Warden');
    await waitFor(() => expect(dpsParsesApi.listParses).toHaveBeenCalled());

    await userEvent.click(screen.getByLabelText(/^encounter$/i));
    const listbox = within(screen.getByRole('listbox'));
    await userEvent.click(listbox.getByText(/40 parses/i));

    await waitFor(() =>
      expect(dpsParsesApi.listParses).toHaveBeenCalledWith(
        expect.objectContaining({ esoClass: 'Warden', encounterId: 60, difficulty: 121 }),
        expect.anything(),
      ),
    );
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

    // A link, not a button: the view switcher has to be traversable by a
    // crawler, which is the whole point of the slugged routes.
    const classTab = screen.getByRole('link', { name: /by class/i });
    expect(classTab).toHaveAttribute('href', '/build-leaderboard/class/arcanist');
    await userEvent.click(classTab);

    await waitFor(() => expect(currentUrl()).toBe('/build-leaderboard/class/arcanist'));
    expect(screen.getByRole('link', { name: /by class/i })).toHaveAttribute('aria-current', 'page');

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

/**
 * Every leaderboard view used to live behind ?tab=/?class=/?boss=, reachable
 * only by operating a MUI Select or ToggleButton. There was not one anchor on
 * the page, so a crawler could discover 1 of 21 boards. These cover the slugged
 * routes that replaced that, and the legacy links that must keep working.
 */
describe('BuildLeaderboardPage crawlable routes', () => {
  /** A boss the slug table DOES cover, unlike the Xoryn rows above. */
  const XALVAKKA: DpsEncounterSummary = {
    encounter_id: 51,
    difficulty: 122,
    encounter_name: 'Xalvakka',
    zone_id: 15,
    trial_id: 'RG',
    parse_count: 201,
    top_amount: 180_000,
    class_count: 7,
    updated_at: '2026-08-27 04:01:06',
  };

  it('renders a pooled class board from its slug', async () => {
    renderPage('/build-leaderboard/class/warden');

    await waitFor(() =>
      expect(dpsParsesApi.listParses).toHaveBeenCalledWith(
        expect.objectContaining({ esoClass: 'Warden', perEncounterCap: 25, limit: 1000 }),
        expect.anything(),
      ),
    );
    // The title must match the prerendered shell byte for byte, or Google
    // indexes the weaker hydrated one.
    expect(document.title).toBe('Best Warden Builds in ESO | ESO Toolkit');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Best Warden builds in ESO',
    );
  });

  it('queries the encounter a boss slug names', async () => {
    jest.spyOn(dpsParsesApi, 'listEncounters').mockResolvedValue({ encounters: [XALVAKKA] });
    renderPage('/build-leaderboard/boss/xalvakka');

    await waitFor(() =>
      expect(dpsParsesApi.listParses).toHaveBeenCalledWith(
        expect.objectContaining({ encounterId: 51, difficulty: 122 }),
        expect.anything(),
      ),
    );
    expect(document.title).toBe('Xalvakka DPS Parses and Builds | ESO Toolkit');
  });

  /**
   * The title, h1 and canonical all name the slugged boss. Falling back to
   * `encounters[0]` when the ingest stops serving it would publish a different
   * boss's parses under that boss's URL.
   */
  it('does not fall back to another board when the slugged boss is absent from the feed', async () => {
    renderPage('/build-leaderboard/boss/xalvakka');

    await waitFor(() => expect(dpsParsesApi.listEncounters).toHaveBeenCalled());
    await waitFor(() =>
      expect(document.title).toBe('Xalvakka DPS Parses and Builds | ESO Toolkit'),
    );
    expect(dpsParsesApi.listParses).not.toHaveBeenCalled();
  });

  it('redirects legacy query links to their slugged path', async () => {
    jest.spyOn(dpsParsesApi, 'listEncounters').mockResolvedValue({ encounters: [XALVAKKA] });
    renderPage('/build-leaderboard?tab=class&class=Warden&boss=51:122');

    await waitFor(() => expect(currentUrl()).toBe('/build-leaderboard/class/warden/xalvakka'));
  });

  it('preserves unrelated query params through the legacy redirect', async () => {
    renderPage('/build-leaderboard?tab=class&class=Templar&embed=1');

    await waitFor(() => expect(currentUrl()).toBe('/build-leaderboard/class/templar?embed=1'));
  });

  /**
   * The slug table is static, so an encounter the ingest starts serving before
   * anyone adds a slug has no path form. Dropping the selection would be worse
   * than an ugly URL, so the query param keeps working.
   */
  it('keeps honouring a boss query param that has no slug', async () => {
    renderPage('/build-leaderboard?tab=class&class=Necromancer&boss=60:122');

    await waitFor(() =>
      expect(dpsParsesApi.listParses).toHaveBeenCalledWith(
        expect.objectContaining({ esoClass: 'Necromancer', encounterId: 60, difficulty: 122 }),
        expect.anything(),
      ),
    );
    // Left exactly as it arrived: no redirect fires, so the URL is not rewritten.
    expect(currentUrl()).toBe('/build-leaderboard?tab=class&class=Necromancer&boss=60:122');
  });

  it('redirects an unrecognised slug to the leaderboard index', async () => {
    renderPage('/build-leaderboard/class/spellsword');

    await waitFor(() => expect(currentUrl()).toBe('/build-leaderboard'));
  });

  /**
   * 7 classes x 14 bosses is 98 near-duplicate boards. They stay linkable but
   * consolidate onto the pooled class board instead of spending crawl budget.
   */
  it('canonicalizes a class-by-boss board to the pooled class board', async () => {
    jest.spyOn(dpsParsesApi, 'listEncounters').mockResolvedValue({ encounters: [XALVAKKA] });
    renderPage('/build-leaderboard/class/arcanist/xalvakka');

    await waitFor(() =>
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
        'https://esotk.com/build-leaderboard/class/arcanist/',
      ),
    );
    expect(document.title).toBe('Best Arcanist Builds on Xalvakka | ESO Toolkit');
  });

  it('sets a self-referencing canonical on a board that is in the sitemap', async () => {
    renderPage('/build-leaderboard/class/sorcerer');

    await waitFor(() =>
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
        'https://esotk.com/build-leaderboard/class/sorcerer/',
      ),
    );
  });

  /**
   * The Select renders its options into a Menu that is unmounted while closed,
   * so the picker alone still left the boss boards undiscoverable. This nav is
   * the crawl path.
   */
  it('links every class and boss board from always-rendered anchors', async () => {
    renderPage();
    await waitFor(() => expect(dpsParsesApi.listEncounters).toHaveBeenCalled());

    const nav = within(screen.getByRole('navigation', { name: /browse all leaderboard boards/i }));
    const hrefs = nav.getAllByRole('link').map((link) => link.getAttribute('href'));

    expect(hrefs).toHaveLength(21);
    expect(hrefs).toContain('/build-leaderboard/class/arcanist');
    expect(hrefs).toContain('/build-leaderboard/boss/ansuul-the-tormentor');
    // Namespaced, so a class slug and a boss slug can never collide.
    expect(hrefs.every((href) => href?.startsWith('/build-leaderboard/'))).toBe(true);
  });

  it('publishes the archetype ranking as ItemList structured data', async () => {
    resetFixtureIds();
    const parses = makeThreeArchetypeFixture();
    jest
      .spyOn(dpsParsesApi, 'listParses')
      .mockResolvedValue({ parses, total: parses.length, limit: 100, offset: 0 });

    const { container } = renderPage();
    await waitFor(() => expect(screen.getByTestId('start-here-card')).toBeInTheDocument());

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();

    const payload = JSON.parse(script?.textContent ?? '{}') as {
      '@type': string;
      itemListElement: Array<{ position: number; name: string; description: string }>;
    };
    expect(payload['@type']).toBe('ItemList');
    expect(payload.itemListElement.length).toBeGreaterThan(0);
    expect(payload.itemListElement[0].position).toBe(1);
    // Normalized pooled amounts would render here as "1 DPS"; an encounter
    // board must quote real absolute numbers.
    expect(payload.itemListElement[0].description).toMatch(/Median parse [\d,]+ DPS/);
  });
});

/**
 * Regressions found by adversarial review of the crawlable-routes change.
 * Two independent reviewers flagged the first one, and it fires on every load
 * of a class-by-boss URL, not only in the drift case.
 */
describe('BuildLeaderboardPage review regressions', () => {
  const XALVAKKA: DpsEncounterSummary = {
    encounter_id: 51,
    difficulty: 122,
    encounter_name: 'Xalvakka',
    zone_id: 15,
    trial_id: 'RG',
    parse_count: 201,
    top_amount: 180_000,
    class_count: 7,
    updated_at: '2026-08-27 04:01:06',
  };

  /**
   * The page names one boss in its title, h1 and JSON-LD. Widening the query to
   * every boss while keeping that framing publishes cross-boss data under a
   * single boss's name, and because `encounterParam` is still truthy the
   * amounts are not even normalized first.
   */
  it('never widens a class-by-boss query to every boss', async () => {
    // Feed does not carry Xalvakka: the drift case the slug table makes possible.
    jest.spyOn(dpsParsesApi, 'listEncounters').mockResolvedValue({ encounters: [] });
    renderPage('/build-leaderboard/class/arcanist/xalvakka');

    await waitFor(() => expect(dpsParsesApi.listEncounters).toHaveBeenCalled());
    // Either a boss-scoped query or none at all, never a pooled one.
    (dpsParsesApi.listParses as jest.Mock).mock.calls.forEach(([opts]) => {
      expect(opts.encounterId).toBe(51);
    });
  });

  it('does not fire a pooled query before the encounters feed arrives', async () => {
    let release: ((v: { encounters: DpsEncounterSummary[] }) => void) | undefined;
    jest.spyOn(dpsParsesApi, 'listEncounters').mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    renderPage('/build-leaderboard/class/arcanist/xalvakka');

    // In flight: the boss is unresolved, so nothing may be requested yet.
    expect(dpsParsesApi.listParses).not.toHaveBeenCalled();

    await act(async () => {
      release?.({ encounters: [XALVAKKA] });
    });

    await waitFor(() =>
      expect(dpsParsesApi.listParses).toHaveBeenCalledWith(
        expect.objectContaining({ esoClass: 'Arcanist', encounterId: 51, difficulty: 122 }),
        expect.anything(),
      ),
    );
  });

  /**
   * Renaming one boss slug should not cost all seven of its class-narrowed
   * inbound links their class board.
   */
  it('keeps the valid half of a partially unknown slug pair', async () => {
    renderPage('/build-leaderboard/class/arcanist/renamed-boss');
    await waitFor(() => expect(currentUrl()).toBe('/build-leaderboard/class/arcanist'));
  });

  it('keeps the valid boss when only the class slug is unknown', async () => {
    renderPage('/build-leaderboard/class/spellsword/xalvakka');
    await waitFor(() => expect(currentUrl()).toBe('/build-leaderboard/boss/xalvakka'));
  });

  it('preserves unrelated query params through an unknown-slug redirect', async () => {
    renderPage('/build-leaderboard/class/arcanist/renamed-boss?embed=1');
    await waitFor(() => expect(currentUrl()).toBe('/build-leaderboard/class/arcanist?embed=1'));
  });

  /**
   * The encounter picker still mints this shape for a boss with no slug, and it
   * is deliberately not redirected. It must not fall back to the generic board's
   * title and canonical while showing one class's data.
   */
  it('gives the legacy unslugged-boss shape that class-specific metadata', async () => {
    renderPage('/build-leaderboard?tab=class&class=Necromancer&boss=60:122');

    await waitFor(() => expect(dpsParsesApi.listParses).toHaveBeenCalled());
    expect(document.title).toBe('Best Necromancer Builds in ESO | ESO Toolkit');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://esotk.com/build-leaderboard/class/necromancer/',
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Best Necromancer builds in ESO',
    );
  });
});
