import { createTheme, ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';

import type { DecisionSummary } from '../decisionSummary';

import { DecisionSummaryPanel } from './DecisionSummaryPanel';

const scope = {
  partitionId: 'pc-na-u50',
  update: 'U50',
  encounterId: 'trial-123',
  encounterVersion: '2026.09',
  encounterKind: 'encounter' as const,
  difficulty: 'Veteran',
  role: 'damage',
  esoClass: 'Arcanist',
  buildBracket: 'two-bar-dps',
};

const populatedSummary: DecisionSummary = {
  scope,
  items: [
    {
      id: 'interrupt-1',
      scope,
      whatHappened: 'Interrupt was missed',
      whyItMatters: 'The cast delayed the group damage window.',
      evidence: {
        timestampMs: 42_000,
        phase: 'Execute',
        provenance: {
          kind: 'game-rule',
          ruleId: 'interrupt-required',
          source: 'combat-log:event-17',
        },
        context: 'Boss cast at 42 seconds.',
      },
      recommendedNextAction: 'Assign an interrupt before the next pull.',
      confidence: { state: 'known', score: 0.8 },
      observedBehavior: 'No interrupt arrived before the cast completed.',
      expectedBehavior: 'An assigned player interrupts the cast.',
      estimatedImpact: 12_500,
      responsible: { actorName: 'Lyris', role: 'damage' },
      priority: { rank: 1, stableOrder: 0 },
    },
  ],
  rejected: [],
};

const renderPanel = (summary: DecisionSummary) =>
  render(
    <ThemeProvider theme={createTheme()}>
      <DecisionSummaryPanel summary={summary} />
    </ThemeProvider>,
  );

describe('DecisionSummaryPanel', () => {
  it('presents a prioritized, evidence-backed next action with accessible structure', () => {
    renderPanel(populatedSummary);

    expect(screen.getByRole('region', { name: 'Decision summary' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Decision summary' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Priority 1: Interrupt was missed' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Why it matters: The cast delayed the group damage window.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Timestamp 0:42')).toBeInTheDocument();
    expect(screen.getByText('Phase Execute')).toBeInTheDocument();
    expect(screen.getByText('Confidence: 80%')).toBeInTheDocument();
    expect(
      screen.getByText('Game rule: interrupt-required (combat-log:event-17)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Boss cast at 42 seconds.')).toBeInTheDocument();
    expect(screen.getByText('Assign an interrupt before the next pull.')).toBeInTheDocument();
    expect(screen.getByText('Lyris · damage')).toBeInTheDocument();
  });

  it('gives multiple panel instances distinct accessible labels', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <DecisionSummaryPanel summary={populatedSummary} />
        <DecisionSummaryPanel summary={populatedSummary} />
      </ThemeProvider>,
    );

    const panels = screen.getAllByRole('region', { name: 'Decision summary' });
    const labelIds = panels.map((panel) => panel.getAttribute('aria-labelledby'));

    expect(new Set(labelIds).size).toBe(2);
    labelIds.forEach((labelId) => {
      expect(labelId).toEqual(expect.any(String));
      expect(document.getElementById(labelId as string)).toHaveTextContent('Decision summary');
    });
  });

  it('labels fixed heuristics separately from rules and exposes peer benchmark context', () => {
    const heuristicItem = populatedSummary.items[0];
    const { rerender } = renderPanel({
      ...populatedSummary,
      items: [
        {
          ...heuristicItem,
          evidence: {
            ...heuristicItem.evidence,
            provenance: {
              kind: 'fixed-heuristic',
              heuristicId: 'interrupt-window',
              source: 'analysis-config:v2',
            },
          },
        },
      ],
    });

    expect(
      screen.getByText('Fixed heuristic: interrupt-window (analysis-config:v2)'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Game rule:/)).not.toBeInTheDocument();

    rerender(
      <ThemeProvider theme={createTheme()}>
        <DecisionSummaryPanel
          summary={{
            ...populatedSummary,
            items: [
              {
                ...heuristicItem,
                evidence: {
                  ...heuristicItem.evidence,
                  provenance: {
                    kind: 'peer-benchmark',
                    baselineSource: 'ESO Logs cohort',
                    baselinePeriod: 'U50 Q3',
                    sampleSize: 128,
                    distribution: 'p25=70%, p50=82%, p75=91%',
                    refreshedAt: '2026-09-01',
                    confidence: { state: 'known', score: 0.91 },
                    provisional: true,
                  },
                },
              },
            ],
          }}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText(/Peer benchmark: ESO Logs cohort/)).toBeInTheDocument();
    expect(screen.getByText(/period U50 Q3/)).toBeInTheDocument();
    expect(screen.getByText(/sample 128/)).toBeInTheDocument();
    expect(screen.getByText(/distribution p25=70%, p50=82%, p75=91%/)).toBeInTheDocument();
    expect(screen.getByText(/refreshed 2026-09-01/)).toBeInTheDocument();
    expect(screen.getByText(/Confidence: 91%/)).toBeInTheDocument();
    expect(screen.getByText(/provisional/)).toBeInTheDocument();
  });

  it('honestly exposes blocked and unavailable candidates without inventing a recommendation', () => {
    renderPanel({
      scope,
      items: [],
      rejected: [
        { candidateId: 'missing-stream', reason: 'unavailable-evidence', outcome: 'warning' },
        { candidateId: 'wrong-partition', reason: 'context-mismatch', outcome: 'blocked' },
      ],
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Decision evidence is unavailable. No recommendation was inferred.',
    );
    expect(screen.getByRole('heading', { name: 'Withheld candidates' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent(
      'The supporting evidence stream is unavailable.',
    );
    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('Blocked candidate:');
    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent(
      'different analysis partition or encounter context',
    );
    expect(screen.queryByText(/Next action:/)).not.toBeInTheDocument();
  });

  it('announces loading without rendering stale findings', () => {
    const { rerender } = render(
      <ThemeProvider theme={createTheme()}>
        <DecisionSummaryPanel summary={populatedSummary} state="loading" />
      </ThemeProvider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading decision evidence');
    expect(screen.queryByRole('heading', { name: /Priority 1/ })).not.toBeInTheDocument();
    rerender(
      <ThemeProvider theme={createTheme()}>
        <DecisionSummaryPanel summary={{ ...populatedSummary, items: [], rejected: [] }} />
      </ThemeProvider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No decision findings were identified');
  });

  it('distinguishes rejected candidates from an empty result', () => {
    renderPanel({
      ...populatedSummary,
      items: [],
      rejected: [{ candidateId: null, reason: 'invalid-evidence', outcome: 'blocked' }],
    });

    expect(screen.getByRole('status')).toHaveTextContent('Decision candidates were rejected');
    expect(screen.getByRole('status')).toHaveTextContent('No recommendation was inferred');
  });
});
