import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { useInactiveMarkAreas, usePhaseMarkLines } from '../../../hooks/useEChartsAnnotations';
import { useEChartsTheme } from '../../../hooks/useEChartsTheme';
import { useRoleColors } from '../../../hooks/useRoleColors';
import type { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import type { PlayerPenetrationData } from '../../../workers/calculations/CalculatePenetration';
import { PlayerDamageReductionDetails } from '../damage_reduction/PlayerDamageReductionDetails';

import { PlayerPenetrationDetailsView } from './PlayerPenetrationDetailsView';

jest.mock('../../../components/EChart', () => ({
  EChart: () => <div data-testid="penetration-chart" />,
}));

jest.mock('../../../components/PlayerIcon', () => ({
  PlayerIcon: () => <span data-testid="player-icon" />,
}));

jest.mock('../../../components/StatChecklist', () => ({
  StatChecklist: () => <div data-testid="penetration-sources" />,
}));

jest.mock('../../../hooks/useEChartsAnnotations', () => ({
  useInactiveMarkAreas: jest.fn(),
  usePhaseMarkLines: jest.fn(),
}));

jest.mock('../../../hooks/useEChartsTheme', () => ({
  useEChartsTheme: jest.fn(),
}));

jest.mock('../../../hooks/useRoleColors', () => ({
  useRoleColors: jest.fn(),
}));

const player = {
  id: 100,
  name: 'Test Player',
  displayName: 'Test Player',
  role: 'dps',
} as PlayerDetailsWithRole;

const createPenetrationData = (
  overrides: Partial<PlayerPenetrationData> = {},
): PlayerPenetrationData => ({
  playerId: '100',
  playerName: 'Test Player',
  dataPoints: [{ timestamp: 1000, relativeTime: 1, penetration: 0 }],
  max: 0,
  effective: 0,
  timeAtCapPercentage: 0,
  availability: 'complete',
  validSampleCount: 1,
  invalidSampleCount: 0,
  penetrationSources: [],
  playerBasePenetration: 0,
  inactiveCombatIntervals: [],
  ...overrides,
});

const renderView = (penetrationData: PlayerPenetrationData) =>
  render(
    <ThemeProvider theme={createTheme()}>
      <PlayerPenetrationDetailsView
        id="100"
        name="Test Player"
        fightDurationMs={10_000}
        player={player}
        penetrationData={penetrationData}
        penetrationSources={penetrationData.penetrationSources}
        playerBasePenetration={penetrationData.playerBasePenetration}
        expanded
        isLoading={false}
      />
    </ThemeProvider>,
  );

describe('PlayerPenetrationDetailsView availability semantics', () => {
  beforeEach(() => {
    jest.mocked(useRoleColors).mockReturnValue({
      getAccordionStyles: () => ({}),
      getAccordionTextShadow: () => 'none',
    } as unknown as ReturnType<typeof useRoleColors>);
    jest.mocked(useEChartsTheme).mockReturnValue({
      theme: {
        mutedColor: '#999999',
        borderColor: '#111111',
        gridLineColor: '#222222',
      },
    } as ReturnType<typeof useEChartsTheme>);
    jest.mocked(usePhaseMarkLines).mockReturnValue(null);
    jest.mocked(useInactiveMarkAreas).mockReturnValue(null);
  });

  it('renders a measured zero as numeric data rather than unavailable', () => {
    renderView(createPenetrationData());

    expect(screen.getAllByLabelText('Max: 0')).not.toHaveLength(0);
    expect(screen.getAllByLabelText('Active: 0')).not.toHaveLength(0);
    expect(screen.getAllByLabelText('At Cap: 0%')).not.toHaveLength(0);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('exposes penetration samples with player identity and units without using the chart', () => {
    renderView(
      createPenetrationData({
        dataPoints: [{ timestamp: 1000, relativeTime: 1, penetration: 18200 }],
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'View data table: Test Player penetration over time' }),
    );
    const table = within(screen.getByRole('table', { name: 'Test Player penetration over time' }));
    expect(table.getByRole('columnheader', { name: 'Fight time (seconds)' })).toBeInTheDocument();
    expect(table.getByRole('columnheader', { name: 'Penetration (points)' })).toBeInTheDocument();
    expect(table.getByRole('row', { name: '1 18,200' })).toBeInTheDocument();
  });

  it('exposes both damage reduction series with player identity and percentage units', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <PlayerDamageReductionDetails
          id="100"
          name="Test Player"
          player={player}
          expanded
          onExpandChange={jest.fn()}
          damageReductionData={{
            playerId: 100,
            playerName: 'Test Player',
            staticResistance: 16500,
            maxDynamicResistance: 16500,
            averageDynamicResistance: 16500,
            damageReductionSources: [],
            dataPoints: [
              {
                timestamp: 1000,
                relativeTime: 1,
                damageReduction: 50,
                totalResistance: 33000,
                staticResistance: 16500,
                dynamicResistance: 16500,
              },
            ],
          }}
        />
      </ThemeProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'View data table: Test Player damage reduction over time',
      }),
    );
    const table = within(
      screen.getByRole('table', { name: 'Test Player damage reduction over time' }),
    );
    expect(table.getByRole('columnheader', { name: 'Fight time (seconds)' })).toBeInTheDocument();
    expect(table.getByRole('columnheader', { name: 'Damage reduction (%)' })).toBeInTheDocument();
    expect(table.getByRole('columnheader', { name: 'Static reduction (%)' })).toBeInTheDocument();
    expect(table.getByRole('row', { name: '1 50 25' })).toBeInTheDocument();
  });

  it('shows an explicit unavailable state without a numeric grade when no samples exist', () => {
    renderView(
      createPenetrationData({
        dataPoints: [],
        max: null,
        effective: null,
        timeAtCapPercentage: null,
        availability: 'unavailable',
        unavailableReason: 'no-active-combat-samples',
        validSampleCount: 0,
        playerBasePenetration: null,
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(/no active combat samples were recorded/i);
    expect(screen.queryByLabelText(/^Max:/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('penetration-chart')).not.toBeInTheDocument();
  });

  it('shows a partial-data warning without a numeric grade', () => {
    renderView(
      createPenetrationData({
        max: null,
        effective: null,
        timeAtCapPercentage: null,
        availability: 'partial',
        unavailableReason: 'invalid-penetration-samples',
        invalidSampleCount: 1,
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(/data is partial/i);
    expect(screen.queryByLabelText(/^Max:/)).not.toBeInTheDocument();
    expect(screen.getByTestId('penetration-chart')).toBeInTheDocument();
  });
});
