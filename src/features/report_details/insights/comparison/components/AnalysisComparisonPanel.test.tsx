import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';

import {
  comparePulls,
  compareWithCohort,
  type AnalysisContext,
  type PullAnalysis,
} from '../comparisonModel';

import { AnalysisComparisonPanel } from './AnalysisComparisonPanel';

const theme = createTheme();

const context: AnalysisContext = {
  partition: 'live-10.4.5',
  encounterKind: 'encounter',
  encounterId: 'lucent-citadel-zel-dragon',
  encounterVersion: '2026.09',
  difficulty: 'veteran-hard-mode',
  role: 'damage',
  classId: 'sorcerer',
  buildBracket: 'cp-1600-plus',
};

const createPull = (pullId: string, overrides: Partial<PullAnalysis> = {}): PullAnalysis => ({
  pullId,
  occurredAt: '2026-09-08T20:00:00.000Z',
  context,
  metrics: {
    damagePerSecond: { kind: 'observed', value: 101_000 },
    criticalHitRate: { kind: 'unknown', reason: 'Critical event sampling was incomplete.' },
  },
  provenance: {
    source: 'ESO Logs verified report export',
    collectedAt: '2026-09-08T20:10:00.000Z',
    baselinePeriod: {
      startAt: '2026-08-01T00:00:00.000Z',
      endAt: '2026-09-01T00:00:00.000Z',
    },
    refreshedAt: '2026-09-08T20:15:00.000Z',
  },
  confidence: 'medium',
  ...overrides,
});

const renderPanel = (
  comparison: ReturnType<typeof comparePulls> | ReturnType<typeof compareWithCohort>,
) =>
  render(
    <ThemeProvider theme={theme}>
      <AnalysisComparisonPanel comparison={comparison} />
    </ThemeProvider>,
  );

describe('AnalysisComparisonPanel', () => {
  it('renders an accessible A/B comparison with context, provenance, confidence, and unknown evidence', () => {
    const baseline = createPull('baseline-1', {
      metrics: {
        damagePerSecond: { kind: 'observed', value: 100_000 },
        criticalHitRate: { kind: 'unknown', reason: 'Critical event sampling was incomplete.' },
      },
    });
    const candidate = createPull('candidate-1');

    renderPanel(comparePulls(baseline, candidate));

    expect(screen.getByRole('heading', { name: 'Analysis comparison' })).toBeInTheDocument();
    expect(screen.getByText('A/B pull comparison')).toBeInTheDocument();
    expect(screen.getByText('Confidence: medium')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Comparison context' })).toBeInTheDocument();
    expect(screen.getByText('ESO partition')).toBeInTheDocument();
    expect(screen.getByText('live-10.4.5')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Provenance' })).toBeInTheDocument();
    expect(screen.getByText(/baseline-1 at 2026-09-08T20:00:00.000Z/)).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Comparison metrics' });
    expect(within(table).getByRole('columnheader', { name: 'Baseline pull' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'damagePerSecond' })).toBeInTheDocument();
    expect(within(table).getByText('+1,000')).toBeInTheDocument();
    expect(
      within(table).getByText(/Unknown: Critical event sampling was incomplete/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Scrollable comparison metrics')).toHaveAttribute('tabindex', '0');
  });

  it('clearly labels a cohort comparison and exposes cohort sample policy', () => {
    const candidate = createPull('candidate-1');
    const firstBaseline = createPull('baseline-1', {
      metrics: { damagePerSecond: { kind: 'observed', value: 99_000 } },
    });
    const secondBaseline = createPull('baseline-2', {
      metrics: { damagePerSecond: { kind: 'observed', value: 101_000 } },
    });

    renderPanel(
      compareWithCohort(candidate, [firstBaseline, secondBaseline], {
        minimumObservedBaselineSamples: 2,
      }),
    );

    expect(screen.getByText('Cohort comparison')).toBeInTheDocument();
    expect(
      screen.getByText(
        '2 context-compatible baseline pulls; 2 observed samples required per metric.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Cohort baseline source:')).toBeInTheDocument();

    const baselinePulls = screen.getByLabelText('Cohort baseline pulls');
    expect(baselinePulls).toHaveTextContent('baseline-1 at 2026-09-08T20:00:00.000Z');
    expect(baselinePulls).toHaveTextContent('baseline-2 at 2026-09-08T20:00:00.000Z');

    const table = screen.getByRole('table', { name: 'Comparison metrics' });
    expect(within(table).getByRole('columnheader', { name: 'Cohort average' })).toBeInTheDocument();
    expect(within(table).getByText('100,000')).toBeInTheDocument();
    expect(within(table).getByText('2/2 observed; Range 99,000–101,000')).toBeInTheDocument();
  });

  it('fails closed for an invalid comparison context and announces why no metric is shown', () => {
    const baseline = createPull('baseline-1');
    const candidate = createPull('candidate-1', {
      context: { ...context, partition: 'pts-10.4.5' },
    });

    renderPanel(comparePulls(baseline, candidate));

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Comparison incompatible')).toBeInTheDocument();
    expect(within(alert).getByText('Incompatible context')).toBeInTheDocument();
    expect(
      within(alert).getByText(/different ESO partitions cannot be compared/),
    ).toBeInTheDocument();
    expect(within(alert).getByText(/No metric or score is shown/)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Comparison metrics' })).not.toBeInTheDocument();
  });

  it('distinguishes an unavailable baseline from an incompatible context', () => {
    const candidate = createPull('candidate-1', {
      metrics: { damagePerSecond: { kind: 'observed', value: 101_000 } },
    });

    renderPanel(
      compareWithCohort(candidate, [], {
        minimumObservedBaselineSamples: 1,
      }),
    );

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Comparison unavailable')).toBeInTheDocument();
    expect(within(alert).queryByText('Incompatible context')).not.toBeInTheDocument();
    expect(within(alert).getByText(/valid comparison baseline is unavailable/)).toBeInTheDocument();
  });

  it('marks incomplete cohort evidence as provisional and exposes sample quality', () => {
    const candidate = createPull('candidate-1', {
      metrics: { damagePerSecond: { kind: 'observed', value: 101_000 } },
    });
    const observedBaseline = createPull('baseline-1', {
      metrics: { damagePerSecond: { kind: 'observed', value: 99_000 } },
    });
    const unknownBaseline = createPull('baseline-2', {
      metrics: {
        damagePerSecond: { kind: 'unknown', reason: 'Sampling was incomplete.' },
      },
    });

    renderPanel(
      compareWithCohort(candidate, [observedBaseline, unknownBaseline], {
        minimumObservedBaselineSamples: 2,
      }),
    );

    const status = screen.getByRole('status');
    expect(within(status).getByText('Provisional comparison')).toBeInTheDocument();
    expect(
      within(status).getByText(/Some metrics have incomplete or insufficient evidence/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Unavailable: 1 observed baseline samples; 2 required/),
    ).toBeInTheDocument();
    expect(screen.getByText(/1\/2 observed; Range 99,000/)).toBeInTheDocument();
    expect(screen.getByText(/\(1 unknown\)/)).toBeInTheDocument();
  });

  it('keeps section identifiers unique when multiple panels are rendered', () => {
    const baseline = createPull('baseline-1', {
      metrics: { damagePerSecond: { kind: 'observed', value: 100_000 } },
    });
    const candidate = createPull('candidate-1', {
      metrics: { damagePerSecond: { kind: 'observed', value: 101_000 } },
    });
    const comparison = comparePulls(baseline, candidate);

    render(
      <ThemeProvider theme={theme}>
        <AnalysisComparisonPanel comparison={comparison} />
        <AnalysisComparisonPanel comparison={comparison} />
      </ThemeProvider>,
    );

    const contextHeadings = screen.getAllByRole('heading', { name: 'Comparison context' });
    expect(new Set(contextHeadings.map((heading) => heading.id)).size).toBe(2);
    expect(screen.getAllByLabelText('Scrollable comparison metrics')).toHaveLength(2);
  });

  it('does not invent a baseline when the validated comparison has no metrics', () => {
    const baseline = createPull('baseline-1', { metrics: {} });
    const candidate = createPull('candidate-1', { metrics: {} });

    renderPanel(comparePulls(baseline, candidate));

    expect(screen.getByRole('alert')).toHaveTextContent('Comparison unavailable');
    expect(screen.getByRole('alert')).toHaveTextContent('Analysis metrics are empty.');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No metric or score is shown because a valid comparison baseline is unavailable.',
    );
    expect(screen.queryByRole('table', { name: 'Comparison metrics' })).not.toBeInTheDocument();
  });
});
