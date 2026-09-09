import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { createMockDamageEvent, createMockFight } from '../../../test/utils/combatLogMockFactories';

import { DamageBreakdownPanel } from './DamageBreakdownPanel';

jest.mock('../../../hooks', () => ({
  useDamageEvents: jest.fn(),
  useReportMasterData: jest.fn(),
}));

jest.mock('../../../hooks/useSelectedTargetIds', () => ({
  useSelectedTargetIds: jest.fn(),
}));

const { useDamageEvents, useReportMasterData } = jest.requireMock('../../../hooks') as {
  useDamageEvents: jest.Mock;
  useReportMasterData: jest.Mock;
};
const { useSelectedTargetIds } = jest.requireMock('../../../hooks/useSelectedTargetIds') as {
  useSelectedTargetIds: jest.Mock;
};

const theme = createTheme();
const fight = createMockFight({ id: 1 });

const masterData = {
  actorsById: {},
  abilitiesById: {
    12345: { name: 'Searing Strike' },
  },
  loaded: true,
};

const renderPanel = (overrides: Record<string, unknown> = {}) => {
  useDamageEvents.mockReturnValue({
    damageEvents: [],
    isDamageEventsLoading: false,
    damageEventsStatus: 'succeeded',
    damageEventsError: null,
    ...overrides,
  });
  useReportMasterData.mockReturnValue({
    reportMasterData: masterData,
    isMasterDataLoading: false,
  });
  useSelectedTargetIds.mockReturnValue(new Set<number>());

  return render(
    <ThemeProvider theme={theme}>
      <DamageBreakdownPanel fight={fight} />
    </ThemeProvider>,
  );
};

describe('DamageBreakdownPanel direct states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the populated panel and aggregates friendly damage by ability', () => {
    renderPanel({
      damageEvents: [
        createMockDamageEvent({ abilityGameID: 12345, amount: 1250 }),
        createMockDamageEvent({ abilityGameID: 12345, amount: 750, hitType: 2 }),
      ],
    });

    expect(screen.getByRole('heading', { name: 'Damage Breakdown' })).toBeInTheDocument();
    expect(screen.getByText('Searing Strike')).toBeInTheDocument();
    expect(screen.getByText('50.0% crit')).toBeInTheDocument();
    expect(
      screen.queryByText('No damage events found for friendly players.'),
    ).not.toBeInTheDocument();
    const abilityRow = screen.getByRole('progressbar', { name: /Searing Strike/ }).closest('li');
    expect(abilityRow).not.toBeNull();
    expect(abilityRow).toHaveTextContent('2.0K');
  });

  it('renders an explicit empty result after a successful empty stream', () => {
    renderPanel();

    expect(screen.getByRole('heading', { name: 'Damage Breakdown' })).toBeInTheDocument();
    expect(screen.getByText('Total damage dealt by friendly players: 0')).toBeInTheDocument();
    expect(screen.getByText('No damage events found for friendly players.')).toBeInTheDocument();
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
    expect(screen.queryByText('Searing Strike')).not.toBeInTheDocument();
  });

  it('keeps the intended panel visible while damage or master data is loading', () => {
    renderPanel({ isDamageEventsLoading: true, damageEventsStatus: 'loading' });

    expect(screen.getByRole('heading', { name: 'Damage Breakdown' })).toBeInTheDocument();
    expect(screen.getByText(/Total damage dealt by friendly players:/)).toBeInTheDocument();
    expect(
      screen.queryByText('No damage events found for friendly players.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Searing Strike')).not.toBeInTheDocument();
  });

  it('renders partial results instead of replacing them with a shell when a stream is incomplete', () => {
    renderPanel({
      damageEvents: [createMockDamageEvent({ abilityGameID: 12345, amount: 900 })],
      damageEventsStatus: 'loading',
      isDamageEventsLoading: false,
    });

    expect(screen.getByRole('heading', { name: 'Damage Breakdown' })).toBeInTheDocument();
    expect(screen.getByText('Searing Strike')).toBeInTheDocument();
    const abilityRow = screen.getByRole('progressbar', { name: /Searing Strike/ }).closest('li');
    expect(abilityRow).not.toBeNull();
    expect(abilityRow).toHaveTextContent('900');
    expect(
      screen.queryByText('No damage events found for friendly players.'),
    ).not.toBeInTheDocument();
  });

  it('keeps a failed stream diagnosable as an empty panel rather than an infinite skeleton', () => {
    renderPanel({
      damageEventsStatus: 'failed',
      damageEventsError: 'Unable to fetch damage events',
    });

    expect(screen.getByRole('heading', { name: 'Damage Breakdown' })).toBeInTheDocument();
    expect(screen.getByText('No damage events found for friendly players.')).toBeInTheDocument();
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
  });
});
