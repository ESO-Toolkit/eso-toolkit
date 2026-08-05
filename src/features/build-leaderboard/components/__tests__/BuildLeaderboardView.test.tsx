import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {
  makeThreeArchetypeFixture,
  resetFixtureIds,
} from '../../clustering/__fixtures__/dpsParses.fixture';
import { clusterBuilds } from '../../clustering/clusterBuilds';
import { EMPTY_CANONICAL_MAPS, extractFeatureVectors } from '../../clustering/featureExtraction';
import type { ClusterBuildsResult } from '../../types/clustering.types';
import type { DpsParse } from '../../types/dpsParses.types';
import { BuildLeaderboardView } from '../BuildLeaderboardView';

const theme = createTheme();

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

/** Real clustering, not a stub — deterministic, so the UI sees production shapes. */
function clusteredFixture(): { parses: DpsParse[]; result: ClusterBuildsResult } {
  resetFixtureIds();
  const parses = makeThreeArchetypeFixture();
  const result = clusterBuilds({
    vectors: extractFeatureVectors(parses, EMPTY_CANONICAL_MAPS),
  });
  return { parses, result };
}

describe('BuildLeaderboardView states', () => {
  it('shows an error with a working retry', async () => {
    const onRetry = jest.fn();
    renderView({ error: 'Boom', onRetry });

    expect(screen.getByText('Boom')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // Empty is a normal state, not a failure — it must not read as an error.
  it('treats no data as informational, not an error', () => {
    renderView({ parses: [], emptyMessage: 'Nothing here yet.' });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Nothing here yet.');
    expect(alert.className).toMatch(/MuiAlert-colorInfo/);
    expect(alert.className).not.toMatch(/colorError/);
  });

  it('refuses to cluster too few parses', () => {
    const { parses } = clusteredFixture();
    renderView({ parses: parses.slice(0, 6), tooFewParses: true });

    expect(screen.getByTestId('too-few-parses')).toHaveTextContent(/not enough/i);
    expect(screen.queryByTestId('archetype-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('start-here-card')).not.toBeInTheDocument();
  });

  it('announces clustering progress politely', () => {
    const { parses } = clusteredFixture();
    renderView({ parses, clustering: true, clusterProgress: 40 });

    const status = screen.getByText(/grouping 45 parses/i);
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});

describe('BuildLeaderboardView happy path', () => {
  it('renders one recommendation plus the remaining archetypes', () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });

    expect(screen.getByTestId('start-here-card')).toBeInTheDocument();
    expect(screen.getAllByTestId('archetype-card')).toHaveLength(result.k - 1);
  });

  it('leads with the median, not the record', () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });

    const featured = screen.getByTestId('start-here-card');
    expect(within(featured).getByText(/median dps/i)).toBeInTheDocument();
    expect(within(featured).getByText(/half of them beat/i)).toBeInTheDocument();
  });

  /**
   * The core of the feature: a beginner must be able to tell mandatory pieces from
   * optional ones at a glance.
   */
  it('distinguishes core from flex gear', () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });

    const featured = screen.getByTestId('start-here-card');
    // Chips are not clickable, so they carry no button role — assert on the
    // data-* markers the component sets for exactly this purpose.
    const core = featured.querySelectorAll('[data-trait-kind="core"]');
    const flex = featured.querySelectorAll('[data-trait-kind="flex"]');

    expect(core.length).toBeGreaterThan(0);
    core.forEach((chip) => expect(chip).toHaveAttribute('data-core', 'true'));
    // Flex chips must NOT be marked core — that distinction is the whole point.
    flex.forEach((chip) => expect(chip).not.toHaveAttribute('data-core'));
  });

  it('buckets grouping quality instead of showing a raw silhouette', () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });

    expect(screen.getByText(/grouping quality/i)).toBeInTheDocument();
    // The raw float must never reach the user.
    expect(screen.queryByText(String(result.silhouette))).not.toBeInTheDocument();
  });

  it('hands the medoid to the editor callback', async () => {
    const onOpenInEditor = jest.fn();
    const { parses, result } = clusteredFixture();
    renderView({ parses, result, onOpenInEditor });

    const featured = screen.getByTestId('start-here-card');
    await userEvent.click(within(featured).getByRole('button', { name: /open in build editor/i }));

    expect(onOpenInEditor).toHaveBeenCalledTimes(1);
    const cluster = onOpenInEditor.mock.calls[0][0];
    // The medoid is a real observed parse, so the editor opens a build someone played.
    expect(cluster.memberParseIds).toContain(cluster.medoidParseId);
  });

  it('labels and disables per action while one is in flight', () => {
    const { parses, result } = clusteredFixture();
    const id = result.recommendedClusterId as string;

    const { unmount } = renderView({
      parses,
      result,
      pendingAction: { clusterId: id, kind: 'open' },
    });

    let featured = screen.getByTestId('start-here-card');
    expect(within(featured).getByRole('button', { name: /opening/i })).toBeDisabled();
    // Save must not read "Opening…" and must also be locked out.
    expect(within(featured).getByRole('button', { name: /save to my builds/i })).toBeDisabled();
    unmount();

    // A save in flight labels Save, not the primary button.
    renderView({ parses, result, pendingAction: { clusterId: id, kind: 'save' } });
    featured = screen.getByTestId('start-here-card');
    expect(within(featured).getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(within(featured).queryByRole('button', { name: /opening/i })).not.toBeInTheDocument();
    expect(within(featured).getByRole('button', { name: /open in build editor/i })).toBeDisabled();
  });

  /**
   * Cluster ids are positional ('c0', 'c1', …) and are reused by every run, so a
   * held-over id survives a change of encounter or class and silently expands an
   * unrelated archetype.
   */
  it('collapses the expanded card when the clustered result changes', async () => {
    const { parses, result } = clusteredFixture();
    const { rerender } = renderView({ parses, result });

    // The featured card always shows its detail, so count rather than assert presence.
    const detailCount = (): number => screen.queryAllByText(/consistency/i).length;
    const collapsed = detailCount();

    const [card] = screen.getAllByTestId('archetype-card');
    await userEvent.click(within(card).getByRole('button', { name: /details/i }));
    expect(detailCount()).toBe(collapsed + 1);

    // Simulate switching to another encounter: a different parse set, a fresh
    // result object — but ids starting from 'c0' all over again.
    resetFixtureIds();
    const nextParses = makeThreeArchetypeFixture().slice(0, 35);
    const nextResult = clusterBuilds({
      vectors: extractFeatureVectors(nextParses, EMPTY_CANONICAL_MAPS),
    });
    // The premise of the bug: the two runs share ids while describing different builds.
    const nextIds = new Set(nextResult.clusters.map((c) => c.id));
    expect(result.clusters.some((c) => nextIds.has(c.id))).toBe(true);

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

    expect(screen.getAllByTestId('archetype-card').length).toBeGreaterThan(0);
    // Collapse unmounts on the exit transition, so the detail leaves the DOM a tick later.
    await waitFor(() => expect(detailCount()).toBe(collapsed));
  });

  /**
   * The reset runs during render, which is React's documented form for adjusting
   * state on a prop change. StrictMode double-invokes render, so if that were
   * unsafe here it would show up as a warning or a wrong result — this pins that
   * it does neither, and is the evidence for keeping it out of an effect.
   */
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
      const detailCount = (): number => screen.queryAllByText(/consistency/i).length;
      const collapsed = detailCount();

      const [card] = screen.getAllByTestId('archetype-card');
      await userEvent.click(within(card).getByRole('button', { name: /details/i }));
      expect(detailCount()).toBe(collapsed + 1);

      resetFixtureIds();
      const nextParses = makeThreeArchetypeFixture().slice(0, 35);
      rerender(
        view(
          nextParses,
          clusterBuilds({ vectors: extractFeatureVectors(nextParses, EMPTY_CANONICAL_MAPS) }),
        ),
      );

      await waitFor(() => expect(detailCount()).toBe(collapsed));
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('expands a sibling card to reveal its detail', async () => {
    const { parses, result } = clusteredFixture();
    renderView({ parses, result });

    const [card] = screen.getAllByTestId('archetype-card');
    await userEvent.click(within(card).getByRole('button', { name: /details/i }));

    expect(within(card).getByText(/consistency/i)).toBeInTheDocument();
  });
});
