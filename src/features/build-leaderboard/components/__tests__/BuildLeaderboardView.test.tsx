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

  it('treats no data as informational, not an error', () => {
    renderView({ parses: [], emptyMessage: 'Nothing here yet.' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Nothing here yet.');
    expect(alert.className).toMatch(/MuiAlert-colorInfo/);
    expect(alert.className).not.toMatch(/colorError/);
  });

  /**
   * Regression: thin data used to dead-end on an alert that showed nothing and
   * told the reader to go somewhere else. The builds that ARE recorded must
   * still render — only the GROUPING of them into archetypes is withheld.
   */
  it('still shows the recorded builds when there are too few to cluster', () => {
    const { parses, result } = individualFixture(6);
    renderView({ parses, result, tooFewParses: true });

    expect(screen.getByTestId('too-few-parses')).toHaveTextContent(
      /too few to group into reliable build patterns/i,
    );
    expect(screen.getByTestId('build-inspector')).toBeInTheDocument();
    expect(screen.getAllByTestId('archetype-row').length).toBeGreaterThan(0);
    expect(screen.getByText('Recorded builds')).toBeInTheDocument();
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
    expect(alert).toHaveTextContent(/each build is listed on its own/i);
  });

  it('describes pooled scope across bosses', () => {
    const { parses, result } = individualFixture(4);
    renderView({
      parses,
      result,
      tooFewParses: true,
      esoClass: 'Dragonknight',
      scopeDescription: 'across 14 trial bosses',
    });
    expect(screen.getByTestId('too-few-parses')).toHaveTextContent(
      /4 dragonknight parses across 14 trial bosses/i,
    );
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
    expect(screen.getByText(/one top-ranked parse/i)).toBeInTheDocument();
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

  it('announces clustering progress politely', () => {
    const { parses } = clusteredFixture();
    renderView({ parses, clustering: true, clusterProgress: 40 });
    const status = screen.getByText(/grouping 45 parses/i);
    expect(status).toHaveAttribute('aria-live', 'polite');
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
      expect(line).toHaveTextContent(/parses from [A-Z][a-z]{2} \d{1,2} · \d+d old/);
    });
  });
});

describe('BuildLeaderboardView workspace', () => {
  it('shows top-25 boss coverage instead of normalized percentages', async () => {
    const { parses, result } = clusteredFixture();
    const selected = recommendedCluster(result);
    const selectedIds = new Set(selected.memberParseIds);
    let selectedIndex = 0;
    const pooledParses = parses.map((parse) => ({
      ...parse,
      encounter_id: selectedIds.has(parse.parse_id) ? 100 + (selectedIndex++ % 3) : 200,
    }));

    renderView({ parses: pooledParses, result, pooled: true });

    expect(screen.getByText('Bosses')).toBeInTheDocument();
    expect(screen.getByText('3 of 4')).toBeInTheDocument();
    expect(screen.getByText(`${selected.size} sampled top parses`)).toBeInTheDocument();
    expect(screen.queryByText(/% of each boss's top DPS/i)).not.toBeInTheDocument();
    // Opened by TAP, not focus. This explanation used to be a hover-only Tooltip
    // on an icon button, unreachable on a phone; StatHint opens it on click and
    // deliberately does not open on focus, because focus arrives before click on
    // every tap and the two would cancel out.
    const explanation = screen.getByRole('button', { name: /explain top-25 boss coverage/i });
    await userEvent.click(explanation);
    expect(explanation).toHaveAttribute('aria-expanded', 'true');
    expect(
      await screen.findByText(
        /this build had a retained top-25 class parse on 3 of the 4 bosses with data/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders one stable recommendation and every alternative as a fixed row', () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });
    expect(screen.getByTestId('start-here-card')).toBeInTheDocument();
    expect(screen.getByTestId('recommended-row')).toBeInTheDocument();
    expect(screen.getAllByTestId('archetype-row')).toHaveLength(result.k - 1);
    expect(screen.getByTestId('build-inspector')).toBeInTheDocument();
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
    expect(featured).toHaveTextContent('Seen in top parses');
    expect(featured).toHaveTextContent(/sample large enough to trust/i);
  });

  it('distinguishes core from flexible build anchors', () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });
    const featured = screen.getByTestId('start-here-card');
    const core = featured.querySelectorAll('[data-trait-kind="core"]');
    const flex = featured.querySelectorAll('[data-trait-kind="flex"]');
    expect(core.length).toBeGreaterThan(0);
    core.forEach((trait) => expect(trait).toHaveAttribute('data-core', 'true'));
    flex.forEach((trait) => expect(trait).not.toHaveAttribute('data-core'));
  });

  it('updates the stable inspector when an alternative is selected', async () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });
    const alternativeRow = screen.getAllByTestId('archetype-row')[0];
    const alternative = result.clusters.find(
      (cluster) => cluster.id !== result.recommendedClusterId,
    );
    await userEvent.click(alternativeRow);
    expect(alternativeRow).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(alternative?.label ?? '');
    expect(screen.queryByTestId('start-here-card')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('archetype-row')).toHaveLength(result.k - 1);
  });

  it('keeps methodology out of the default view and explains confidence on request', async () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });
    expect(screen.queryByText(/confidence:/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /how this leaderboard works/i }));
    expect(screen.getByText(/confidence:/i)).toBeInTheDocument();
    expect(screen.queryByText(String(result.silhouette))).not.toBeInTheDocument();
  });

  it('hands the representative observed build to the editor callback', async () => {
    const onOpenInEditor = jest.fn();
    const { parses, result } = clusteredFixture();
    renderView({ parses, result, onOpenInEditor });
    await userEvent.click(screen.getByRole('button', { name: /open in build editor/i }));
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
    expect(screen.getByRole('button', { name: /opening/i })).toBeDisabled();
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
    expect(screen.getByRole('button', { name: /open in build editor/i })).toBeDisabled();
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

  it('reveals evidence only in the selected build inspector', async () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });
    expect(screen.queryByText(/^gear & special$/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /show build evidence/i }));
    const evidenceDialog = screen.getByRole('dialog', { name: /build evidence/i });
    expect(within(evidenceDialog).getByText(/^gear sets$/i)).toBeInTheDocument();
    expect(within(evidenceDialog).getByText(/^front bar$/i)).toBeInTheDocument();
    expect(
      await within(evidenceDialog).findByText(/observed representative loadout/i),
    ).toBeInTheDocument();
    expect(
      within(evidenceDialog).getByRole('button', { name: /view deadly strike set details/i }),
    ).toBeInTheDocument();
    expect(
      within(evidenceDialog).getByRole('button', { name: /observed ability 1$/i }),
    ).toBeInTheDocument();

    await userEvent.click(
      within(evidenceDialog).getByRole('button', { name: /close build evidence/i }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /build evidence/i })).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /show build evidence/i }));
    expect(await screen.findByText(/observed representative loadout/i)).toBeInTheDocument();
    expect(dpsParsesApi.getBuild).toHaveBeenCalledTimes(1);
  });

  it('resets selection and evidence when the clustered result changes', async () => {
    const { parses, result } = clusteredFixture();
    const { rerender } = renderView({ parses, result });
    await userEvent.click(screen.getAllByTestId('archetype-row')[0]);
    await userEvent.click(screen.getByRole('button', { name: /show build evidence/i }));
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
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        recommendedCluster(nextResult).label,
      );
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
    expect(panel).toHaveTextContent('One build. Nearly everyone runs it.');
    expect(panel).toHaveTextContent(/9\d% of the \d+ top parses across all bosses/);
    // Framed as a property of the data, never as a shortfall of the tool.
    expect(panel).not.toHaveTextContent(/only one|could not|unable|too few/i);
  });

  it('relabels the card list and the summary count', () => {
    const { parses, result } = solvedFixture();
    renderView({ parses, result });

    expect(screen.getByText('Consensus build')).toBeInTheDocument();
    expect(screen.queryByText('Build patterns')).not.toBeInTheDocument();
    expect(screen.getByText(/one build, 9\d% of parses/)).toBeInTheDocument();
  });

  it('replaces the separation-based confidence wording', async () => {
    const { parses, result } = solvedFixture();
    renderView({ parses, result });

    await userEvent.click(screen.getByRole('button', { name: /how this leaderboard works/i }));

    // "Limited ... many similar variations" describes a failure to separate
    // archetypes, which misreads the finding that there is only one.
    expect(screen.getByText(/Converged/)).toBeInTheDocument();
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
