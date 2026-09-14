import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type {
  DamageOverTimeDataPoint,
  DamageOverTimeSuccessResult,
} from '../../../workers/calculations/CalculateDamageOverTime';

import { DamageTimelineChart } from './DamageTimelineChart';

jest.mock('../../../components/EChart', () => ({
  EChart: ({ option }: { option: { animation?: boolean } }) => (
    <div data-testid="e-chart" data-animation={String(option.animation)} />
  ),
}));

jest.mock('../../../hooks/useEChartsTheme', () => ({
  useEChartsTheme: () => ({
    theme: {
      darkMode: false,
      intensity: 1,
      perfTier: 'standard',
      mutedColor: '#64748b',
      gridLineColor: '#e2e8f0',
      borderColor: '#cbd5e1',
    },
  }),
}));

jest.mock('../../../hooks/useUptimeSeriesForStackedView', () => {
  const uptimeSeries: never[] = [];

  return {
    useUptimeSeriesForStackedView: () => ({ uptimeSeries }),
  };
});

jest.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

const useMediaQueryMock = jest.requireMock('@mui/material/useMediaQuery').default as jest.Mock;

const points: DamageOverTimeDataPoint[] = [
  { timestamp: 0, relativeTime: 0, damage: 100, eventCount: 1 },
  { timestamp: 1000, relativeTime: 1, damage: 200, eventCount: 2 },
  { timestamp: 2000, relativeTime: 2, damage: 300, eventCount: 3 },
];

const createDamageData = (
  allTargets: DamageOverTimeSuccessResult['allTargets'] = {
    1: {
      playerId: 1,
      playerName: 'Player One',
      targetId: null,
      dataPoints: points,
      totalDamage: 600,
      totalEvents: 6,
      averageDps: 200,
      maxDps: 300,
    },
  },
): DamageOverTimeSuccessResult => ({
  status: 'ok',
  fightStartTime: 0,
  fightEndTime: 3000,
  fightDuration: 3000,
  bucketSizeMs: 1000,
  byTarget: {},
  allTargets,
});

const renderChart = (props: Partial<React.ComponentProps<typeof DamageTimelineChart>> = {}) =>
  render(
    <ThemeProvider theme={createTheme()}>
      <DamageTimelineChart
        damageOverTimeData={createDamageData()}
        selectedTargetIds={new Set()}
        {...props}
      />
    </ThemeProvider>,
  );

describe('DamageTimelineChart accessibility', () => {
  beforeEach(() => {
    useMediaQueryMock.mockReturnValue(false);
  });

  it('announces loading and empty states as live status updates', () => {
    const { rerender } = render(
      <ThemeProvider theme={createTheme()}>
        <DamageTimelineChart damageOverTimeData={null} selectedTargetIds={new Set()} isLoading />
      </ThemeProvider>,
    );

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading damage timeline...')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={createTheme()}>
        <DamageTimelineChart damageOverTimeData={null} selectedTargetIds={new Set()} />
      </ThemeProvider>,
    );

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByText('No damage data available')).toBeInTheDocument();
  });

  it('connects the filter toggle to its expanded region and exposes stacking state', () => {
    renderChart();

    const filterToggle = screen.getByRole('button', { name: 'Toggle filters' });
    expect(filterToggle).toHaveAttribute('aria-expanded', 'false');
    const filtersId = filterToggle.getAttribute('aria-controls');
    expect(filtersId).toBeTruthy();
    expect(document.getElementById(filtersId ?? '')).toHaveAttribute(
      'aria-label',
      'Damage timeline filters',
    );

    fireEvent.click(filterToggle);
    expect(filterToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Show all players' })).toHaveStyle(
      'min-height: 44px',
    );

    const stackToggle = screen.getByRole('button', { name: 'Stack buff timeline below' });
    expect(stackToggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(stackToggle);
    expect(screen.getByRole('button', { name: 'Hide buff timeline' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('provides bounded text data alongside the chart', () => {
    renderChart();

    const chart = screen.getByRole('img', { name: /Damage timeline chart/ });
    const alternativeId = chart.getAttribute('aria-describedby');
    expect(alternativeId).toBeTruthy();
    expect(document.getElementById(alternativeId ?? '')).toHaveTextContent(
      'Damage over 3.0 seconds for 1 visible player',
    );
    expect(screen.getByText('View damage timeline data')).toBeInTheDocument();
    expect(screen.getByText(/Player One: 600 total damage, 200 average DPS/)).toBeInTheDocument();
  });

  it('disables chart animation when reduced motion is requested', () => {
    useMediaQueryMock.mockReturnValue(true);
    renderChart();

    expect(screen.getByTestId('e-chart')).toHaveAttribute('data-animation', 'false');
  });
});
