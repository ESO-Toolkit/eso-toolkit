import { createTheme, ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';

import type { DecisionSummary } from '../decisionSummary';

import { DecisionSummaryPanel, type DecisionSummaryPanelState } from './DecisionSummaryPanel';

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
        timestampMs: 0,
        phase: 'Execute',
        provenance: 'combat-log:event-17',
        context: 'Boss cast at pull start.',
      },
      recommendedNextAction: 'Assign an interrupt before the next pull.',
      confidence: { state: 'known', score: 0.8 },
      observedBehavior: 'No interrupt arrived before the cast completed.',
      expectedBehavior: 'An assigned player interrupts the cast.',
      estimatedImpact: 0,
      responsible: { actorId: 'actor-7', role: 'damage' },
      priority: { rank: 1, stableOrder: 0 },
    },
  ],
  rejected: [],
};

const renderPanel = (
  summary: DecisionSummary,
  state?: DecisionSummaryPanelState,
): ReturnType<typeof render> =>
  render(
    <ThemeProvider theme={createTheme()}>
      <DecisionSummaryPanel summary={summary} state={state} />
    </ThemeProvider>,
  );

const renderElement = (element: ReactElement): ReturnType<typeof render> =>
  render(<ThemeProvider theme={createTheme()}>{element}</ThemeProvider>);

describe('DecisionSummaryPanel', () => {
  it('presents a privacy-safe, prioritized decision with complete evidence and timestamp zero', () => {
    renderPanel(populatedSummary);

    expect(screen.getByRole('region', { name: 'Decision summary' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Decision summary' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Priority 1: Interrupt was missed' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Why it matters: The cast delayed the group damage window.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Timestamp 0:00')).toBeInTheDocument();
    expect(screen.getByText('Phase Execute')).toBeInTheDocument();
    expect(screen.getByText('Confidence: 80%')).toBeInTheDocument();
    expect(screen.getByText('combat-log:event-17')).toBeInTheDocument();
    expect(screen.getByText('Boss cast at pull start.')).toBeInTheDocument();
    expect(screen.getByText('No interrupt arrived before the cast completed.')).toBeInTheDocument();
    expect(screen.getByText('An assigned player interrupts the cast.')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Role damage')).toBeInTheDocument();
    expect(screen.getByText('Assign an interrupt before the next pull.')).toBeInTheDocument();
  });

  it('never renders caller-supplied actor identifiers or display names', () => {
    const summaryWithUntrustedName = {
      ...populatedSummary,
      items: [
        {
          ...populatedSummary.items[0],
          responsible: { actorId: 'actor-7', actorName: 'Private Player', role: 'damage' },
        },
      ],
    } as unknown as DecisionSummary;

    renderPanel(summaryWithUntrustedName);

    expect(screen.getByText('Role damage')).toBeInTheDocument();
    expect(screen.queryByText('actor-7')).not.toBeInTheDocument();
    expect(screen.queryByText('Private Player')).not.toBeInTheDocument();
  });

  it.each<readonly [DecisionSummaryPanelState, string]>([
    ['loading', 'Loading decision evidence'],
    ['empty', 'No decision findings were identified'],
    ['unavailable', 'Decision evidence is unavailable. No recommendation was inferred.'],
    ['rejected', 'Decision candidates were rejected'],
  ])('announces the explicit %s state and withholds stale findings', (state, message) => {
    const summary =
      state === 'empty'
        ? {
            ...populatedSummary,
            rejected: [
              {
                candidateId: 'stale',
                reason: 'incomplete-evidence' as const,
                outcome: 'blocked' as const,
              },
            ],
          }
        : populatedSummary;

    renderPanel(summary, state);

    expect(screen.getByRole('status')).toHaveTextContent(message);
    expect(screen.queryByRole('heading', { name: /Priority 1/ })).not.toBeInTheDocument();
    if (state === 'empty') {
      expect(
        screen.queryByRole('heading', { name: 'Withheld candidates' }),
      ).not.toBeInTheDocument();
    }
  });

  it('uses ready state for populated findings and normalizes an empty ready response', () => {
    const { rerender } = renderElement(
      <DecisionSummaryPanel summary={populatedSummary} state="ready" />,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Priority 1/ })).toBeInTheDocument();
    rerender(
      <ThemeProvider theme={createTheme()}>
        <DecisionSummaryPanel
          summary={{ ...populatedSummary, items: [], rejected: [] }}
          state="ready"
        />
      </ThemeProvider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No decision findings were identified');
  });

  it('renders every hardened rejection reason without creating a recommendation', () => {
    renderPanel({
      scope,
      items: [],
      rejected: [
        { candidateId: null, reason: 'invalid-request', outcome: 'blocked' },
        { candidateId: 'incomplete', reason: 'incomplete-evidence', outcome: 'blocked' },
        { candidateId: 'invalid', reason: 'invalid-evidence', outcome: 'blocked' },
        { candidateId: 'unavailable', reason: 'unavailable-evidence', outcome: 'warning' },
        { candidateId: 'mismatch', reason: 'context-mismatch', outcome: 'blocked' },
        { candidateId: 'duplicate', reason: 'duplicate-candidate', outcome: 'warning' },
      ],
    });

    expect(screen.getByRole('status')).toHaveTextContent('Decision evidence is unavailable');
    expect(screen.getByRole('heading', { name: 'Withheld candidates' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText(/analysis request was invalid/)).toBeInTheDocument();
    expect(screen.getByText(/Required evidence is incomplete/)).toBeInTheDocument();
    expect(screen.getByText(/supplied evidence is invalid/)).toBeInTheDocument();
    expect(screen.getByText(/supporting evidence stream is unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/different analysis partition/)).toBeInTheDocument();
    expect(screen.getByText(/duplicate candidate was withheld/)).toBeInTheDocument();
    expect(screen.queryByText(/Next action:/)).not.toBeInTheDocument();
  });

  it('shows unknown confidence honestly', () => {
    renderPanel({
      ...populatedSummary,
      items: [
        { ...populatedSummary.items[0], confidence: { state: 'unknown', reason: 'No baseline' } },
      ],
    });

    expect(screen.getByText('Confidence unavailable: No baseline')).toBeInTheDocument();
  });
});
