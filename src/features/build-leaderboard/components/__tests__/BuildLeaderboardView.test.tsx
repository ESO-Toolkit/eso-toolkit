import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { dpsParsesApi } from '../../api/dpsParsesApi';
import {
  NECRO_ARCHETYPE,
  SORC_ARCHETYPE,
  makeParse,
  makeThreeArchetypeFixture,
  resetFixtureIds,
} from '../../clustering/__fixtures__/dpsParses.fixture';
import { clusterBuilds } from '../../clustering/clusterBuilds';
import { EMPTY_CANONICAL_MAPS, extractFeatureVectors } from '../../clustering/featureExtraction';
import { buildIndividualClusters } from '../../clustering/individualBuilds';
import { clearRepresentativeBuildCache } from '../../hooks/useRepresentativeBuild';
import type { ClusterBuildsResult } from '../../types/clustering.types';
import type { DpsParse, DpsParseBuildResponse } from '../../types/dpsParses.types';
import { BuildLeaderboardView } from '../BuildLeaderboardView';

const theme = createTheme();

const REPRESENTATIVE_BUILD: DpsParseBuildResponse = {
  parseId: 'representative-parse',
  playerName: 'Top Parser',
  combatant: {
    gear: [
      {
        slot: 0,
        itemId: 101,
        setId: 11,
        name: 'Deadly Strike Helm',
        icon: 'gear_test_head',
      },
    ],
    talents: Array.from({ length: 12 }, (_, slot) => ({
      slot,
      abilityId: 100_000 + slot,
      name: `Observed ability ${slot + 1}`,
      icon: `ability-test-${slot}`,
    })),
    sets: [{ setId: 11, name: 'Deadly Strike' }],
  },
};

beforeEach(() => {
  clearRepresentativeBuildCache();
  jest.spyOn(dpsParsesApi, 'getBuild').mockResolvedValue(REPRESENTATIVE_BUILD);
});

function renderView(props: Partial<React.ComponentProps<typeof BuildLeaderboardView>> = {}) {
  const defaults: React.ComponentProps<typeof BuildLeaderboardView> = {
    parses: [],
    result: null,
    loading: false,
    clustering: false,
    clusterProgress: 0,
    error: null,
    tooFewParses: false,
  };

  return render(
    <ThemeProvider theme={theme}>
      <BuildLeaderboardView {...defaults} {...props} />
    </ThemeProvider>,
  );
}

/** Real, deterministic clustering so the UI receives production-shaped data. */
function clusteredFixture(): { parses: DpsParse[]; result: ClusterBuildsResult } {
  resetFixtureIds();
  const parses = makeThreeArchetypeFixture();
  const result = clusterBuilds({
    vectors: extractFeatureVectors(parses, EMPTY_CANONICAL_MAPS),
  });
  return { parses, result };
}

/**
 * The thin-data path: too few parses to cluster, so the hook lists each
 * distinct build on its own. Built through the real function so these tests see
 * the same shape production renders.
 */
function individualFixture(count: number): { parses: DpsParse[]; result: ClusterBuildsResult } {
  resetFixtureIds();
  const parses = makeThreeArchetypeFixture().slice(0, count);
  const result = buildIndividualClusters(extractFeatureVectors(parses, EMPTY_CANONICAL_MAPS));
  return { parses, result };
}

/**
 * A board that has genuinely converged: one archetype with a long tail of a
 * couple of off-meta parses. Clustered for real, so the shares the view reads
 * are the ones production would compute rather than hand-written numbers.
 */
function solvedFixture(): { parses: DpsParse[]; result: ClusterBuildsResult } {
  resetFixtureIds();
  const parses = [
    ...Array.from({ length: 200 }, (_, i) => makeParse(NECRO_ARCHETYPE, i)),
    ...Array.from({ length: 3 }, (_, i) => makeParse(SORC_ARCHETYPE, i)),
  ];
  const result = clusterBuilds({
    vectors: extractFeatureVectors(parses, EMPTY_CANONICAL_MAPS),
  });
  return { parses, result };
}

function recommendedCluster(result: ClusterBuildsResult) {
  return (
    result.clusters.find((cluster) => cluster.id === result.recommendedClusterId) ??
    result.clusters[0]
  );
}

describe('BuildLeaderboardView states', () => {
  it('shows an error with a working retry', async () => {
    const onRetry = jest.fn();
    renderView({ error: 'Boom', onRetry });
    expect(screen.getByText('Boom')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('returns focus to build patterns after retry replaces an error state', async () => {
    const originalScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView',
    );
    const scrollIntoView = jest.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      const { parses, result } = clusteredFixture();
      const onRetry = jest.fn();
      const rendered = renderView({ error: 'Boom', onRetry });
      await userEvent.click(screen.getByRole('button', { name: /retry/i }));

      rendered.rerender(
        <ThemeProvider theme={theme}>
          <BuildLeaderboardView
            parses={parses}
            result={result}
            loading={false}
            clustering={false}
            clusterProgress={0}
            error={null}
            tooFewParses={false}
          />
        </ThemeProvider>,
      );

      await waitFor(() =>
        expect(screen.getByRole('heading', { level: 2, name: 'Build patterns' })).toHaveFocus(),
      );
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScrollIntoView);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
      }
    }
  });

  it('does not restore stale focus after a queued retry enters another error state', async () => {
    const originalScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView',
    );
    const scrollIntoView = jest.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      const { parses, result } = clusteredFixture();
      const onRetry = jest.fn();
      const rendered = renderView({ error: 'Boom', onRetry });
      await userEvent.click(screen.getByRole('button', { name: /retry/i }));

      rendered.rerender(
        <ThemeProvider theme={theme}>
          <BuildLeaderboardView
            parses={parses}
            result={result}
            loading={false}
            clustering={false}
            clusterProgress={0}
            error="Still unavailable"
            tooFewParses={false}
            onRetry={onRetry}
          />
        </ThemeProvider>,
      );
      rendered.rerender(
        <ThemeProvider theme={theme}>
          <BuildLeaderboardView
            parses={parses}
            result={result}
            loading={false}
            clustering={false}
            clusterProgress={0}
            error={null}
            tooFewParses={false}
          />
        </ThemeProvider>,
      );

      const heading = await screen.findByRole('heading', {
        level: 2,
        name: 'Build patterns',
      });
      await waitFor(() => expect(heading).toBeInTheDocument());
      expect(heading).not.toHaveFocus();
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScrollIntoView);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
      }
    }
  });

  it('treats no data as informational, not an error', () => {
    renderView({ parses: [], emptyMessage: 'Nothing here yet.' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Nothing here yet.');
    expect(alert.className).toMatch(/MuiAlert-colorInfo/);
    expect(alert.className).not.toMatch(/colorError/);
  });

  it('announces the loading workspace with a status role', () => {
    renderView({ loading: true });

    const loadingWorkspace = screen.getByRole('status', { name: 'Loading build archetypes' });
    expect(loadingWorkspace).toHaveAttribute('aria-busy', 'true');
  });

  /**
   * Regression: thin data used to dead-end on an alert that showed nothing and
   * told the reader to go somewhere else. The builds that ARE observed must
   * still render — only the GROUPING of them into archetypes is withheld.
   */
  it('still shows the observed builds when there are too few to cluster', () => {
    const { parses, result } = individualFixture(6);
    renderView({ parses, result, tooFewParses: true });

    expect(screen.getByTestId('too-few-parses')).toHaveTextContent(
      /fewer than 10 for grouping; builds are listed individually below/i,
    );
    expect(screen.getByTestId('build-inspector')).toBeInTheDocument();
    expect(screen.getAllByTestId('archetype-row').length).toBeGreaterThan(0);
    expect(screen.getByText('Observed builds')).toBeInTheDocument();
  });

  /**
   * Regression (live data): on a boss with 201 parses, the Dragonknight slice
   * held 2. "Only 2 parses are recorded here" read as if the BOSS were empty.
   * The class view must say WHERE the thinness is.
   */
  it('names the class-and-boss scope in the too-few-parses message', () => {
    const { parses, result } = individualFixture(2);
    renderView({
      parses,
      result,
      tooFewParses: true,
      esoClass: 'Dragonknight',
      scopeDescription: 'on DSR · Tideborn Taleria',
    });
    const alert = screen.getByTestId('too-few-parses');
    expect(alert).toHaveTextContent(/only 2 dragonknight parses on DSR · Tideborn Taleria/i);
    expect(alert).toHaveTextContent(/builds are listed individually below/i);
  });

  it('describes pooled scope across boards', () => {
    const { parses, result } = individualFixture(4);
    renderView({
      parses,
      result,
      tooFewParses: true,
      esoClass: 'Dragonknight',
      scopeDescription: 'across 14 trial boards',
    });
    expect(screen.getByTestId('too-few-parses')).toHaveTextContent(
      /4 dragonknight parses across 14 trial boards/i,
    );
  });

  it('keeps pooled thin selections truthful when board members are unavailable', () => {
    const { parses, result } = individualFixture(4);
    const resultWithoutMembers: ClusterBuildsResult = {
      ...result,
      clusters: result.clusters.map((cluster, index) => ({
        ...cluster,
        memberParseIds: [`unavailable-${index}`],
        medoidParseId: `unavailable-${index}`,
      })),
    };

    renderView({
      parses,
      result: resultWithoutMembers,
      pooled: true,
      tooFewParses: true,
      esoClass: 'Dragonknight',
      scopeDescription: 'across 14 trial boards',
    });

    expect(screen.getByTestId('too-few-parses')).toHaveTextContent(
      /builds are listed individually below/i,
    );
    expect(screen.getByText('Observed builds')).toBeInTheDocument();
    expect(screen.getByTestId('build-inspector')).toBeInTheDocument();

    const rows = [
      ...screen.queryAllByTestId('recommended-row'),
      ...screen.getAllByTestId('archetype-row'),
    ];
    expect(rows).toHaveLength(resultWithoutMembers.k);
    rows.forEach((row) => {
      expect(row).toHaveAccessibleName(expect.stringContaining('DPS unavailable'));
      expect(row).not.toHaveAccessibleName(expect.stringContaining('typical damage'));
      expect(row).toHaveAccessibleName(expect.not.stringContaining('sampled top-25'));
    });
    expect(screen.queryByText(/\d+\/\d+ boards/i)).not.toBeInTheDocument();
  });

  /** A starved class-and-boss slice must offer the wider scope, not just name it. */
  it('offers a one-click widening out of a thin slice', async () => {
    const onBroadenScope = jest.fn();
    const { parses, result } = individualFixture(3);
    renderView({
      parses,
      result,
      tooFewParses: true,
      esoClass: 'Dragonknight',
      scopeDescription: 'on SE · Ansuul the Tormentor',
      onBroadenScope,
      broadenScopeLabel: 'All trial bosses',
    });

    await userEvent.click(screen.getByRole('button', { name: 'All trial bosses' }));
    expect(onBroadenScope).toHaveBeenCalledTimes(1);
  });

  /**
   * q1, median and q3 are the same number for one parse. Printing them as a
   * range would state a spread the data does not contain.
   */
  it('never fabricates a range for a build with a single parse', () => {
    const { parses, result } = individualFixture(1);
    renderView({ parses, result, tooFewParses: true });

    expect(screen.getByTestId('dps-spread-hint')).toHaveTextContent('From a single parse');
    expect(
      screen.getByRole('button', { name: /how this leaderboard works/i }).parentElement,
    ).toHaveTextContent('1 sampled top-ranked parse · 1 build pattern');
    // "1 parses" would otherwise be on screen for every thin selection.
    expect(screen.getByTestId('too-few-parses')).toHaveTextContent('Only 1 parse in');
  });

  /**
   * "Middle half" was jargon with no way to ask what it meant on a phone.
   *
   * Asserts aria-expanded, NOT text presence: MUI's Tooltip animates out, so the
   * popper lingers after closing and a findByText assertion passes against a
   * tooltip on its way OUT — which is how a tap-opens-then-closes bug survived
   * this test once already.
   */
  it('spells out the dps spread and explains it on tap', async () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });

    const spread = screen.getByTestId('dps-spread-hint');
    expect(spread).toHaveTextContent(/^Half land \d/);

    await userEvent.click(spread);
    expect(spread).toHaveAttribute('aria-expanded', 'true');
    expect(
      await screen.findByText(/half of this build's \d+ parses did better, half did worse/i),
    ).toBeInTheDocument();
  });

  it('announces clustering progress politely', async () => {
    const { parses } = clusteredFixture();
    renderView({ parses, clustering: true, clusterProgress: 40 });
    const status = screen.getByText(/grouping 45 parses/i);
    expect(status).not.toHaveAttribute('aria-live');
    const announcement = screen.getByTestId('build-grouping-announcement');
    expect(announcement).toHaveAttribute('role', 'status');
    expect(announcement).toHaveAttribute('aria-live', 'polite');
    expect(announcement).toBeEmptyDOMElement();
    await waitFor(() => expect(announcement).toHaveTextContent(/grouping 45 parses/i));
    expect(screen.getByRole('progressbar', { name: /build grouping progress/i })).toHaveAttribute(
      'aria-valuetext',
      '40% complete',
    );
  });

  /**
   * When every parse has a null build, clustering legitimately yields zero
   * clusters. The selection logic dereferences `clusters[0]`, so without this
   * guard the page throws instead of explaining itself.
   */
  it('shows an informational alert instead of crashing when clusters are empty', () => {
    const { parses } = clusteredFixture();
    renderView({
      parses,
      result: {
        clusters: [],
        k: 0,
        silhouette: 0,
        silhouetteByK: [],
        recommendedClusterId: null,
        totalParses: parses.length,
        uniqueSignatures: 0,
        droppedParses: parses.length,
      },
    });
    expect(screen.getByTestId('no-build-data')).toHaveTextContent(
      /no build data available for this selection/i,
    );
    expect(screen.queryByTestId('build-inspector')).not.toBeInTheDocument();
  });

  it('shows how stale the representative parse is on each archetype row', () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });

    // Fixture parses carry log_start_ms from Nov 2023; whatever "now" is, the
    // row must expose the medoid's date and its age in days.
    screen.getAllByTestId('archetype-freshness').forEach((line) => {
      expect(line).toHaveTextContent(/representative parse from [A-Z][a-z]{2} \d{1,2} · \d+d old/);
    });
  });
});

describe('BuildLeaderboardView workspace', () => {
  it('shows top-25 board coverage instead of normalized percentages', async () => {
    const { parses, result } = clusteredFixture();
    const selected = recommendedCluster(result);
    const selectedIds = new Set(selected.memberParseIds);
    let selectedIndex = 0;
    const pooledParses = parses.map((parse) => ({
      ...parse,
      encounter_id: selectedIds.has(parse.parse_id) ? 100 + (selectedIndex++ % 3) : 200,
    }));

    renderView({ parses: pooledParses, result, pooled: true });

    expect(screen.getByText('Boards')).toBeInTheDocument();
    expect(screen.getByText('3 of 4')).toBeInTheDocument();
    expect(screen.getByText(`${selected.size} sampled top-ranked parses`)).toBeInTheDocument();
    expect(screen.queryByText(/% of each boss's top DPS/i)).not.toBeInTheDocument();
    // Opened by TAP, not focus. This explanation used to be a hover-only Tooltip
    // on an icon button, unreachable on a phone; StatHint opens it on click and
    // deliberately does not open on focus, because focus arrives before click on
    // every tap and the two would cancel out.
    const explanation = screen.getByRole('button', { name: /explain sampled board coverage/i });
    await userEvent.click(explanation);
    expect(explanation).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText(
        /this build had a retained sampled class parse on 3 of the 4 encounter-and-difficulty boards with data/i,
      ),
    ).toBeInTheDocument();
  });

  it('counts each difficulty as a separate pooled board', () => {
    const { parses, result } = clusteredFixture();
    const selected = recommendedCluster(result);
    const selectedIds = new Set(selected.memberParseIds);
    let selectedIndex = 0;
    const pooledParses = parses.map((parse) => ({
      ...parse,
      encounter_id: selectedIds.has(parse.parse_id) ? 100 : 200,
      difficulty: selectedIds.has(parse.parse_id) ? (selectedIndex++ === 1 ? 122 : 121) : 121,
    }));

    renderView({ parses: pooledParses, result, pooled: true });

    expect(screen.getAllByText('2 of 3').length).toBeGreaterThan(0);
  });

  it('renders one stable recommendation and every alternative as a fixed row', () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });
    expect(screen.getByTestId('start-here-card')).toBeInTheDocument();
    expect(screen.getByTestId('recommended-row')).toBeInTheDocument();
    expect(screen.getAllByTestId('archetype-row')).toHaveLength(result.k - 1);
    expect(screen.getByTestId('build-inspector')).toBeInTheDocument();
  });

  it('uses the theme md breakpoint for mobile inspector scrolling', async () => {
    const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    const originalRequestAnimationFrame = Object.getOwnPropertyDescriptor(
      window,
      'requestAnimationFrame',
    );
    const originalScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView',
    );
    const matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width:899.95px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    const scrollIntoView = jest.fn();

    Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      const { parses, result } = clusteredFixture();
      renderView({ parses, result });
      await waitFor(() => expect(matchMedia).toHaveBeenCalledWith('(max-width:899.95px)'));

      await userEvent.click(screen.getAllByTestId('archetype-row')[0]);

      expect(matchMedia).not.toHaveBeenCalledWith('(max-width: 899px)');
      expect(screen.getByTestId('build-selection-announcement')).toBeEmptyDOMElement();
      expect(screen.getByTestId('build-inspector-focus-target')).toHaveFocus();
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    } finally {
      if (originalMatchMedia) {
        Object.defineProperty(window, 'matchMedia', originalMatchMedia);
      } else {
        Reflect.deleteProperty(window, 'matchMedia');
      }
      if (originalRequestAnimationFrame) {
        Object.defineProperty(window, 'requestAnimationFrame', originalRequestAnimationFrame);
      } else {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      }
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScrollIntoView);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
      }
    }
  });

  it('uses an immediate mobile scroll when reduced motion is requested', async () => {
    const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    const originalRequestAnimationFrame = Object.getOwnPropertyDescriptor(
      window,
      'requestAnimationFrame',
    );
    const originalScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView',
    );
    const matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width:899.95px)' || query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    const scrollIntoView = jest.fn();
    const requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrame,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      const { parses, result } = clusteredFixture();
      renderView({ parses, result });
      await waitFor(() => expect(matchMedia).toHaveBeenCalledWith('(max-width:899.95px)'));

      await userEvent.click(screen.getAllByTestId('archetype-row')[0]);

      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('build-inspector-focus-target')).toHaveFocus();
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    } finally {
      if (originalMatchMedia) {
        Object.defineProperty(window, 'matchMedia', originalMatchMedia);
      } else {
        Reflect.deleteProperty(window, 'matchMedia');
      }
      if (originalRequestAnimationFrame) {
        Object.defineProperty(window, 'requestAnimationFrame', originalRequestAnimationFrame);
      } else {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      }
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScrollIntoView);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
      }
    }
  });

  it('does not move focus or scroll the inspector on desktop', async () => {
    const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    const originalRequestAnimationFrame = Object.getOwnPropertyDescriptor(
      window,
      'requestAnimationFrame',
    );
    const originalScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView',
    );
    const matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    const requestAnimationFrame = jest.fn();
    const scrollIntoView = jest.fn();

    Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrame,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      const { parses, result } = clusteredFixture();
      renderView({ parses, result });
      await waitFor(() => expect(matchMedia).toHaveBeenCalledWith('(max-width:899.95px)'));

      const alternativeRow = screen.getAllByTestId('archetype-row')[0];
      await userEvent.click(alternativeRow);

      expect(alternativeRow).toHaveFocus();
      expect(requestAnimationFrame).not.toHaveBeenCalled();
      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(screen.getByTestId('build-inspector-focus-target')).not.toHaveFocus();
    } finally {
      if (originalMatchMedia) {
        Object.defineProperty(window, 'matchMedia', originalMatchMedia);
      } else {
        Reflect.deleteProperty(window, 'matchMedia');
      }
      if (originalRequestAnimationFrame) {
        Object.defineProperty(window, 'requestAnimationFrame', originalRequestAnimationFrame);
      } else {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      }
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScrollIntoView);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
      }
    }
  });

  it('compares every archetype in the same scan-friendly columns', () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });
    expect(screen.getByText('Build patterns')).toBeInTheDocument();
    expect(screen.getByText('Typical')).toBeInTheDocument();
    expect(screen.getByText('Parses')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /typical damage/i })).toHaveLength(result.k);
    expect(screen.queryByText('Compare typical damage')).not.toBeInTheDocument();
  });

  it('leads with typical damage and sample size rather than a record', () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });
    const featured = screen.getByTestId('start-here-card');
    expect(featured).toHaveTextContent('Typical damage');
    expect(featured).toHaveTextContent('Observed in sample');
    expect(featured).toHaveTextContent(/20\s*of\s*45/);
    expect(featured).toHaveTextContent('44% of this selection');
  });

  it('distinguishes core from flexible build anchors', () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });
    expect(screen.getByRole('group', { name: 'Defining setup' })).toBeInTheDocument();
    const featured = screen.getByTestId('start-here-card');
    const core = featured.querySelectorAll('[data-trait-kind="core"]');
    const flex = featured.querySelectorAll('[data-trait-kind="flex"]');
    expect(core.length).toBeGreaterThan(0);
    core.forEach((trait) => {
      expect(trait).toHaveAttribute('data-core', 'true');
      expect(trait).toHaveAttribute('data-trait-kind-label', 'Core');
      expect(trait).toHaveTextContent('Core:');
      expect(trait.querySelector('[aria-hidden="true"]')).toHaveTextContent('●');
    });
    flex.forEach((trait) => {
      expect(trait).not.toHaveAttribute('data-core');
      expect(trait).toHaveAttribute('data-trait-kind-label', 'Common');
      expect(trait).toHaveTextContent('Common:');
      expect(trait.querySelector('[aria-hidden="true"]')).toHaveTextContent('◇');
    });
  });

  it('updates the stable inspector when an alternative is selected', async () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });
    const alternativeRow = screen.getAllByTestId('archetype-row')[0];
    const alternative = result.clusters.find(
      (cluster) => cluster.id !== result.recommendedClusterId,
    );
    await userEvent.click(alternativeRow);
    expect(alternativeRow).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByTestId('build-inspector')).getByRole('heading', { level: 2 }),
    ).toHaveTextContent(alternative?.label ?? '');
    expect(screen.getByTestId('build-selection-announcement')).toHaveTextContent(
      `Selected ${alternative?.label ?? ''} build pattern. Inspector updated.`,
    );
    expect(screen.queryByTestId('start-here-card')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('archetype-row')).toHaveLength(result.k - 1);
  });

  it('keeps the build list before the inspector in DOM order', () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });

    const listRow = screen.getByTestId('recommended-row');
    const inspector = screen.getByTestId('build-inspector');
    expect(listRow.compareDocumentPosition(inspector)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('keeps methodology out of the default view and explains confidence on request', async () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });
    expect(screen.queryByText(/confidence:/i)).not.toBeInTheDocument();
    const methodologyToggle = screen.getByRole('button', {
      name: /how this leaderboard works/i,
    });
    const methodologyId = methodologyToggle.getAttribute('aria-controls');
    expect(methodologyId).toBe('build-leaderboard-view-methodology');
    expect(document.getElementById(methodologyId ?? '')).toBeInTheDocument();
    expect(methodologyToggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(methodologyToggle);

    expect(methodologyToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/confidence:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this view clusters the 45 currently returned parses for this selection/i),
    ).toHaveTextContent(/not the full ESO player population/i);
    expect(screen.queryByText(String(result.silhouette))).not.toBeInTheDocument();
  });

  it('hands the representative observed build to the editor callback', async () => {
    const onOpenInEditor = jest.fn();
    const { parses, result } = clusteredFixture();
    renderView({ parses, result, onOpenInEditor });
    const editorButton = screen.getByRole('button', {
      name: 'Save copy & open editor',
    });
    expect(editorButton).toHaveTextContent('Save copy & open editor');
    await userEvent.click(editorButton);
    const cluster = onOpenInEditor.mock.calls[0][0];
    expect(cluster.memberParseIds).toContain(cluster.medoidParseId);
  });

  it('labels and disables every action while one is in flight', () => {
    const { parses, result } = clusteredFixture();
    const id = result.recommendedClusterId as string;
    const onOpenInEditor = jest.fn();
    const onSaveBuild = jest.fn();
    const { unmount } = renderView({
      parses,
      result,
      pendingAction: { clusterId: id, kind: 'open' },
      onOpenInEditor,
      onSaveBuild,
    });
    expect(screen.getByRole('button', { name: /saving & opening/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /more build actions/i })).toBeDisabled();
    unmount();

    renderView({
      parses,
      result,
      pendingAction: { clusterId: id, kind: 'save' },
      onOpenInEditor,
      onSaveBuild,
    });
    expect(screen.getByRole('button', { name: /saving build/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save copy & open editor/i })).toBeDisabled();
  });

  it('keeps secondary build actions in one overflow menu', async () => {
    const onSaveBuild = jest.fn();
    const { parses, result } = clusteredFixture();
    renderView({ parses, result, onSaveBuild });
    await userEvent.click(screen.getByRole('button', { name: /more build actions/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /save to my builds/i }));
    expect(onSaveBuild).toHaveBeenCalledWith(
      expect.objectContaining({ id: result.recommendedClusterId }),
    );
  });

  it('uses the best pooled parse for source links while loading the medoid build', async () => {
    const onViewSourceLog = jest.fn();
    const { parses, result } = clusteredFixture();
    const selectedCluster = recommendedCluster(result);
    const bestParseId = selectedCluster.memberParseIds.find(
      (parseId) => parseId !== selectedCluster.medoidParseId,
    );
    expect(bestParseId).toBeDefined();

    const medoidSourceUrl = 'https://www.esologs.com/reports/medoid#fight=1';
    const bestSourceUrl = 'https://www.esologs.com/reports/best#fight=1';
    const pooledParses = parses.map((parse) => {
      if (parse.parse_id === selectedCluster.medoidParseId) {
        return { ...parse, amount: 100, report_code: '', source_url: medoidSourceUrl };
      }
      if (parse.parse_id === bestParseId) {
        return { ...parse, amount: 999_999, report_code: 'best', source_url: bestSourceUrl };
      }
      return parse;
    });

    renderView({ parses: pooledParses, result, pooled: true, onViewSourceLog });
    const evidenceTrigger = screen.getByRole('button', { name: /view evidence/i });
    await userEvent.click(evidenceTrigger);
    const evidenceDialog = await screen.findByRole('dialog', { name: /build evidence/i });
    const sourceLink = await within(evidenceDialog).findByRole('link', {
      name: /view log \(opens new tab\)/i,
    });
    expect(sourceLink).toHaveAttribute('href', medoidSourceUrl);
    expect(dpsParsesApi.getBuild).toHaveBeenCalledWith(
      selectedCluster.medoidParseId,
      expect.anything(),
    );

    await userEvent.click(
      within(evidenceDialog).getByRole('button', { name: /close build evidence/i }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /build evidence/i })).not.toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /more build actions/i }));
    expect(
      screen.getByRole('menuitem', { name: /view highest sampled log \(new tab\)/i }),
    ).toHaveAttribute('href', bestSourceUrl);
    await userEvent.click(screen.getByRole('menuitem', { name: /open highest sampled parse/i }));
    expect(onViewSourceLog).toHaveBeenCalledWith(selectedCluster, bestParseId);
  });

  it('hides the internal parse action when the representative has no valid report code', async () => {
    const onViewSourceLog = jest.fn();
    const { parses, result } = clusteredFixture();
    const medoidParseId = recommendedCluster(result).medoidParseId;
    const parsesWithoutReportCode = parses.map((parse) =>
      parse.parse_id === medoidParseId ? { ...parse, report_code: '' } : parse,
    );

    renderView({ parses: parsesWithoutReportCode, result, onViewSourceLog });
    await userEvent.click(screen.getByRole('button', { name: /more build actions/i }));

    expect(
      screen.queryByRole('menuitem', { name: /open representative parse/i }),
    ).not.toBeInTheDocument();
    expect(onViewSourceLog).not.toHaveBeenCalled();
  });

  it('reveals evidence only in the selected build inspector', async () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });
    expect(screen.queryByText(/^gear & special$/i)).not.toBeInTheDocument();
    const evidenceTrigger = screen.getByRole('button', { name: /view evidence/i });
    expect(evidenceTrigger).not.toHaveAttribute('aria-controls');
    await userEvent.click(evidenceTrigger);
    const evidenceDialog = screen.getByRole('dialog', { name: /build evidence/i });
    expect(evidenceTrigger).toHaveAttribute('aria-controls', evidenceDialog.id);
    expect(evidenceDialog.id).toMatch(/^build-evidence-dialog-/);
    expect(within(evidenceDialog).getByText(/^gear sets$/i)).toBeInTheDocument();
    expect(within(evidenceDialog).getAllByText(/^front bar$/i).length).toBeGreaterThan(0);
    expect(
      await within(evidenceDialog).findByText(/observed representative loadout/i),
    ).toBeInTheDocument();
    const sourceLink = within(evidenceDialog).getByRole('link', {
      name: /view log \(opens new tab\)/i,
    });
    expect(sourceLink).toHaveAttribute('target', '_blank');
    expect(sourceLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(
      within(evidenceDialog).getByRole('group', { name: /deadly strike set, 1 piece/i }),
    ).toBeInTheDocument();
    expect(
      within(evidenceDialog).getByRole('img', { name: /observed ability 1$/i }),
    ).toBeInTheDocument();

    await userEvent.click(
      within(evidenceDialog).getByRole('button', { name: /close build evidence/i }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /build evidence/i })).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /view evidence/i }));
    expect(await screen.findByText(/observed representative loadout/i)).toBeInTheDocument();
    expect(dpsParsesApi.getBuild).toHaveBeenCalledTimes(1);
  }, 20_000);

  it('resets selection and evidence when the clustered result changes', async () => {
    const { parses, result } = clusteredFixture();
    const { rerender } = renderView({ parses, result });
    await userEvent.click(screen.getAllByTestId('archetype-row')[0]);
    await userEvent.click(screen.getByRole('button', { name: /view evidence/i }));
    expect(screen.getByText(/^gear sets$/i)).toBeInTheDocument();

    resetFixtureIds();
    const nextParses = makeThreeArchetypeFixture().slice(0, 35);
    const nextResult = clusterBuilds({
      vectors: extractFeatureVectors(nextParses, EMPTY_CANONICAL_MAPS),
    });
    rerender(
      <ThemeProvider theme={theme}>
        <BuildLeaderboardView
          parses={nextParses}
          result={nextResult}
          loading={false}
          clustering={false}
          clusterProgress={0}
          error={null}
          tooFewParses={false}
        />
      </ThemeProvider>,
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /build evidence/i })).not.toBeInTheDocument(),
    );
    expect(
      within(screen.getByTestId('build-inspector')).getByRole('heading', { level: 2 }),
    ).toHaveTextContent(recommendedCluster(nextResult).label);
  });

  it('resets safely under StrictMode double-rendering', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { parses, result } = clusteredFixture();
      const view = (
        nextParses: DpsParse[],
        nextResult: ClusterBuildsResult,
      ): React.ReactElement => (
        <React.StrictMode>
          <ThemeProvider theme={theme}>
            <BuildLeaderboardView
              parses={nextParses}
              result={nextResult}
              loading={false}
              clustering={false}
              clusterProgress={0}
              error={null}
              tooFewParses={false}
            />
          </ThemeProvider>
        </React.StrictMode>
      );
      const { rerender } = render(view(parses, result));
      await userEvent.click(screen.getAllByTestId('archetype-row')[0]);

      resetFixtureIds();
      const nextParses = makeThreeArchetypeFixture().slice(0, 35);
      const nextResult = clusterBuilds({
        vectors: extractFeatureVectors(nextParses, EMPTY_CANONICAL_MAPS),
      });
      rerender(view(nextParses, nextResult));
      expect(
        within(screen.getByTestId('build-inspector')).getByRole('heading', { level: 2 }),
      ).toHaveTextContent(recommendedCluster(nextResult).label);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('BuildLeaderboardView solved meta', () => {
  it('states the finding instead of claiming archetypes it cannot support', () => {
    const { parses, result } = solvedFixture();
    renderView({ parses, result, esoClass: 'Necromancer', scopeDescription: 'across all bosses' });

    const panel = screen.getByTestId('solved-meta');
    expect(panel).toHaveTextContent('One observed pattern dominates this sample.');
    expect(panel).toHaveTextContent(/9\d% of the \d+ sampled top-ranked parses across all bosses/);
    // Framed as a property of the data, never as a shortfall of the tool.
    expect(panel).not.toHaveTextContent(/only one|could not|unable|too few/i);
  });

  it('relabels the card list and the summary count', () => {
    const { parses, result } = solvedFixture();
    renderView({ parses, result });

    expect(screen.getByText('Observed build pattern')).toBeInTheDocument();
    expect(screen.queryByText('Build patterns')).not.toBeInTheDocument();
    expect(screen.getByText(/one observed pattern, 9\d% of clustered sample/)).toBeInTheDocument();
  });

  it('replaces the separation-based confidence wording', async () => {
    const { parses, result } = solvedFixture();
    renderView({ parses, result });

    await userEvent.click(screen.getByRole('button', { name: /how this leaderboard works/i }));

    // "Limited ... many similar variations" describes a failure to separate
    // archetypes, which misreads the finding that there is only one.
    expect(
      screen.getByText(/Most sampled top-ranked parses share one observed build pattern/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/many similar variations/i)).not.toBeInTheDocument();
  });

  it('leaves a healthy multi-archetype board completely alone', () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });

    expect(screen.queryByTestId('solved-meta')).not.toBeInTheDocument();
    expect(screen.getByText('Build patterns')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${result.k} build patterns`))).toBeInTheDocument();
  });
});
