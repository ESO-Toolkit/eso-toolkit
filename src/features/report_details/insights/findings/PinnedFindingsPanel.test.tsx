import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import {
  appendResolution,
  assignFinding,
  pinFinding,
  type PinnedFindingSeed,
  unpinFinding,
} from './pinnedFindings';
import { PinnedFindingsPanel } from './PinnedFindingsPanel';

const theme = createTheme();
const seed: PinnedFindingSeed = {
  id: 'finding-1',
  whatHappened: 'A mechanic was missed by Ada.',
  whyItMatters: 'The missed mechanic increased healer pressure.',
  evidence: [
    {
      timestampMs: 0,
      phaseName: 'Opening',
      observation: 'Interrupt was missed.',
      actor: { id: 'ada-id', displayName: 'Ada', role: 'damage-dealer' },
    },
  ],
  confidence: { level: 'medium', rationale: 'Evidence is present in the encounter timeline.' },
  provenance: {
    kind: 'authoritative-rule',
    source: 'Encounter rules',
    observedAt: '2026-09-08T12:00:00.000Z',
  },
  recommendedAction: {
    action: 'Assign an interrupt owner.',
    expectedOutcome: 'Fewer missed mechanics.',
  },
};
const finding = pinFinding(seed, '2026-09-08T12:01:00.000Z');
const assignedFinding = appendResolution(
  assignFinding(
    finding,
    { kind: 'role', role: 'damage-dealer' },
    '2026-09-08T12:02:00.000Z',
    'Cover interrupts during the opening phase.',
  ),
  {
    id: 'resolution-1',
    at: '2026-09-08T12:03:00.000Z',
    status: 'acknowledged',
    note: 'The assignment was acknowledged.',
  },
);

const renderPanel = (
  state: Parameters<typeof PinnedFindingsPanel>[0]['state'],
  onShare?: jest.Mock,
) =>
  render(
    <ThemeProvider theme={theme}>
      <PinnedFindingsPanel state={state} onShare={onShare} />
    </ThemeProvider>,
  );

describe('PinnedFindingsPanel', () => {
  it('renders evidence, lineage and a privacy-safe share preview', () => {
    const onShare = jest.fn();
    renderPanel({ status: 'ready', findings: [finding] }, onShare);

    expect(screen.getByRole('region', { name: 'Pinned findings' })).toBeInTheDocument();
    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByLabelText('0s into encounter')).toBeInTheDocument();
    expect(screen.getByText(/Opening/)).toBeInTheDocument();
    expect(screen.getByText(/Player identifiers hidden/)).toBeInTheDocument();
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Prepare privacy-safe share/ }));
    expect(onShare).toHaveBeenCalledWith(
      expect.objectContaining({
        sharedWith: { audience: 'team', includesPlayerIdentifiers: false },
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Player identifiers remain hidden');
  });

  it('renders ownership and resolution lineage without player identifiers', () => {
    renderPanel({ status: 'ready', findings: [assignedFinding] });

    expect(screen.getByText('Ownership lineage')).toBeInTheDocument();
    expect(screen.getByText(/Unassigned.*role \(damage dealer\)/)).toBeInTheDocument();
    expect(screen.getByText(/Cover interrupts during the opening phase/)).toBeInTheDocument();
    expect(screen.getByText(/open.*acknowledged/)).toBeInTheDocument();
    expect(screen.getByText(/The assignment was acknowledged/)).toBeInTheDocument();
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
  });

  it('shows lifecycle status and does not fabricate share controls without a handler', () => {
    const unpinned = unpinFinding(finding, '2026-09-08T12:04:00.000Z');
    renderPanel({ status: 'ready', findings: [unpinned] });

    expect(screen.getByText('Unpinned')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Prepare privacy-safe share/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Share recipient' })).not.toBeInTheDocument();
  });

  it('uses unique accessible names and controls for multiple panel instances', () => {
    render(
      <ThemeProvider theme={theme}>
        <PinnedFindingsPanel
          state={{ status: 'ready', findings: [finding, finding] }}
          onShare={jest.fn()}
        />
        <PinnedFindingsPanel state={{ status: 'empty' }} />
      </ThemeProvider>,
    );

    const regions = screen.getAllByRole('region', { name: 'Pinned findings' });
    expect(regions).toHaveLength(2);
    expect(new Set(regions.map((region) => region.getAttribute('aria-labelledby'))).size).toBe(2);
    expect(screen.getAllByRole('combobox', { name: 'Share recipient' })).toHaveLength(2);
  });

  it('renders an accessible empty state', () => {
    renderPanel({ status: 'empty' });
    expect(screen.getByRole('status')).toHaveTextContent('No pinned findings yet');
  });

  it('renders loading as a live status and failed data as an alert', () => {
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <PinnedFindingsPanel state={{ status: 'loading' }} />
      </ThemeProvider>,
    );
    expect(screen.getByRole('status', { name: 'Loading pinned findings' })).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <PinnedFindingsPanel state={{ status: 'failed', message: 'Network unavailable.' }} />
      </ThemeProvider>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable');
  });

  it('fails closed for invalid findings without exposing their content', () => {
    renderPanel({ status: 'ready', findings: [{ ...finding, evidence: [] }] });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'unavailable because its evidence or lineage is invalid',
    );
    expect(screen.queryByText(seed.whatHappened)).not.toBeInTheDocument();
  });

  it('exposes retry for unavailable data', () => {
    const onRetry = jest.fn();
    render(
      <ThemeProvider theme={theme}>
        <PinnedFindingsPanel
          state={{ status: 'unavailable', reason: 'Baseline unavailable.' }}
          onRetry={onRetry}
        />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Baseline unavailable');
  });
});
