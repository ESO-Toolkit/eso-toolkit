import { render, screen, within } from '@testing-library/react';

import { EvidenceDrilldownPanel } from './EvidenceDrilldownPanel';

const makeEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'interrupt-1',
  esoUpdate: 'update-45',
  encounterId: 'encounter-1',
  encounterVersion: '1',
  partitionId: 'update-45',
  difficulty: 'veteran',
  actorId: 'actor-1',
  role: 'healer',
  phaseId: 'phase-1',
  timestamp: 250,
  observed: 'The priority add was not interrupted.',
  expected: 'Interrupt the priority add during phase 1.',
  estimatedImpact: 12,
  confidence: 'unknown',
  scoreContribution: 3,
  ...overrides,
});

const makeInput = (overrides: Record<string, unknown> = {}) => ({
  context: {
    esoUpdate: 'update-45',
    partitionId: 'update-45',
    encounterId: 'encounter-1',
    encounterVersion: '1',
    difficulty: 'veteran',
  },
  fight: { startTimestamp: 0, endTimestamp: 1000 },
  entries: [makeEntry()],
  ...overrides,
});

describe('EvidenceDrilldownPanel', () => {
  it('renders evidence context, behavior, impact, confidence, and provenance', () => {
    render(
      <EvidenceDrilldownPanel
        input={makeInput()}
        provenance={{
          source: 'ESO Logs peer benchmark',
          period: 'Update 45 / Q2 2026',
          refreshedAt: '2026-09-09',
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Evidence drilldown' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Source provenance' })).toBeInTheDocument();
    expect(screen.getByText(/ESO Logs peer benchmark/)).toBeInTheDocument();

    const evidence = screen.getByRole('article', { name: 'Evidence item 1' });
    expect(within(evidence).getByText(/250 ms/)).toBeInTheDocument();
    expect(within(evidence).getByText(/phase phase-1/)).toBeInTheDocument();
    expect(within(evidence).queryByText(/actor-1/)).not.toBeInTheDocument();
    expect(within(evidence).getByText(/role healer/)).toBeInTheDocument();
    expect(within(evidence).getByText('Observed behavior')).toBeInTheDocument();
    expect(within(evidence).getByText(/priority add was not interrupted/)).toBeInTheDocument();
    expect(within(evidence).getByText('Expected behavior and next step')).toBeInTheDocument();
    expect(within(evidence).getByText(/Interrupt the priority add/)).toBeInTheDocument();
    expect(within(evidence).getByText(/Why it matters/)).toBeInTheDocument();
    expect(within(evidence).getByText('Confidence unknown')).toBeInTheDocument();
  });

  it('preserves a valid evidence event at timestamp zero', () => {
    render(
      <EvidenceDrilldownPanel input={makeInput({ entries: [makeEntry({ timestamp: 0 })] })} />,
    );

    const evidence = screen.getByRole('article', { name: 'Evidence item 1' });
    expect(within(evidence).getByText(/0 ms/)).toBeInTheDocument();
    expect(screen.getByTestId('evidence-drilldown-panel')).toHaveAttribute('data-state', 'ready');
    expect(screen.queryByText(/payload is invalid/)).not.toBeInTheDocument();
  });

  it('exposes the reported timestamp when evidence is clipped to the fight window', () => {
    render(
      <EvidenceDrilldownPanel input={makeInput({ entries: [makeEntry({ timestamp: 1200 })] })} />,
    );

    const evidence = screen.getByRole('article', { name: 'Evidence item 1' });
    expect(within(evidence).getByText(/1000 ms/)).toBeInTheDocument();
    expect(within(evidence).getByText(/reported timestamp 1200 ms/)).toBeInTheDocument();
    expect(within(evidence).getByText(/clipped to fight bounds/)).toBeInTheDocument();
  });

  it('announces invalid evidence and missing provenance as unavailable', () => {
    render(
      <EvidenceDrilldownPanel
        input={{ fight: { startTimestamp: 0, endTimestamp: 0 }, entries: [] }}
      />,
    );

    expect(screen.getByTestId('evidence-drilldown-panel')).toHaveAttribute('data-state', 'failed');
    expect(screen.getByRole('alert')).toHaveTextContent(/payload is invalid/i);
    expect(screen.getByRole('status')).toHaveTextContent(/provenance is unavailable/i);
  });

  it('treats a valid empty stream as known empty data', () => {
    render(
      <EvidenceDrilldownPanel
        input={makeInput({ entries: [] })}
        provenance={{ source: 'fixture', period: 'test', refreshedAt: 'now' }}
      />,
    );

    expect(screen.getByTestId('evidence-drilldown-panel')).toHaveAttribute('data-state', 'ready');
    expect(screen.getByRole('status')).toHaveTextContent(/no evidence was recorded/i);
  });

  it.each([
    ['loading', /evidence is loading/i],
    ['partial', /evidence is partial/i],
    ['stale', /evidence is stale/i],
  ] as const)('states when valid evidence is %s', (dataState, message) => {
    render(
      <EvidenceDrilldownPanel
        dataState={dataState}
        input={makeInput()}
        provenance={{ source: 'fixture', period: 'test', refreshedAt: 'now' }}
      />,
    );

    expect(screen.getByTestId('evidence-drilldown-panel')).toHaveAttribute('data-state', dataState);
    expect(screen.getByRole('status')).toHaveTextContent(message);
    expect(screen.getByRole('article', { name: 'Evidence item 1' })).toBeInTheDocument();
  });

  it('marks retained evidence failed instead of presenting it as current', () => {
    render(<EvidenceDrilldownPanel dataState="failed" input={makeInput()} />);

    expect(screen.getByTestId('evidence-drilldown-panel')).toHaveAttribute('data-state', 'failed');
    expect(screen.getByRole('alert')).toHaveTextContent(/evidence below is not current/i);
    expect(screen.getByRole('article', { name: 'Evidence item 1' })).toBeInTheDocument();
  });

  it('never presents an invalid payload as fresh data even when a caller says it is loading', () => {
    render(
      <EvidenceDrilldownPanel
        dataState="loading"
        input={{ fight: { startTimestamp: 0, endTimestamp: 0 }, entries: [] }}
      />,
    );

    expect(screen.getByTestId('evidence-drilldown-panel')).toHaveAttribute('data-state', 'failed');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByText(/evidence is loading/i)).not.toBeInTheDocument();
  });

  it('labels numeric confidence as a percentage without inventing a grade', () => {
    render(
      <EvidenceDrilldownPanel
        input={makeInput({ entries: [makeEntry({ confidence: 0.625 })] })}
        provenance={{ source: 'fixture', period: 'test', refreshedAt: 'now' }}
      />,
    );

    expect(screen.getByText('Confidence 63%')).toBeInTheDocument();
    expect(screen.queryByText(/grade/i)).not.toBeInTheDocument();
  });
});
