import { render, screen } from '@testing-library/react';

import {
  buildEsoLogsSourceUrl,
  getValidCriticalDamageDataPoints,
  PlayerCriticalDamageDetailsView,
} from './PlayerCriticalDamageDetailsView';

jest.mock('../../../components/EChart', () => ({
  EChart: () => <div data-testid="critical-damage-chart" />,
}));

jest.mock('../../../components/MetricPill', () => ({
  MetricPill: ({ label, suffix, value }: { label: string; suffix?: string; value: string }) => (
    <div>{`${label}: ${value}${suffix ?? ''}`}</div>
  ),
}));

jest.mock('../../../components/PlayerIcon', () => ({
  PlayerIcon: () => null,
}));

jest.mock('../../../components/StatChecklist', () => ({
  StatChecklist: () => null,
}));

jest.mock('../../../hooks', () => ({
  useRoleColors: jest.fn(),
}));

jest.mock('../../../hooks/useEChartsAnnotations', () => ({
  useInactiveMarkAreas: jest.fn(() => undefined),
  usePhaseMarkLines: jest.fn(() => undefined),
}));

jest.mock('../../../hooks/useEChartsTheme', () => ({
  useEChartsTheme: jest.fn(() => ({
    theme: {
      borderColor: '#000',
      gridLineColor: '#000',
      intensity: 'low',
      mutedColor: '#000',
      perfTier: 'low',
    },
  })),
}));

const hooks = jest.requireMock('../../../hooks');
const eChartsThemeHooks = jest.requireMock('../../../hooks/useEChartsTheme');

describe('PlayerCriticalDamageDetailsView data boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hooks.useRoleColors.mockReturnValue({
      getAccordionStyles: () => ({}),
      getAccordionTextShadow: () => 'none',
    });
    eChartsThemeHooks.useEChartsTheme.mockReturnValue({
      theme: {
        borderColor: '#000',
        gridLineColor: '#000',
        intensity: 'low',
        mutedColor: '#000',
        perfTier: 'low',
      },
    });
  });

  it('retains legitimate zero-valued timestamps and measurements while omitting non-finite samples', () => {
    expect(
      getValidCriticalDamageDataPoints([
        { timestamp: 0, relativeTime: 0, criticalDamage: 0 },
        { timestamp: Number.NaN, relativeTime: 1, criticalDamage: 100 },
        { timestamp: 2, relativeTime: Infinity, criticalDamage: 100 },
        { timestamp: 3, relativeTime: 3, criticalDamage: -Infinity },
      ]),
    ).toEqual([{ timestamp: 0, relativeTime: 0, criticalDamage: 0 }]);
  });

  it('does not create an ESO Logs link only because a report or fight id is zero', () => {
    expect(buildEsoLogsSourceUrl(0, 0, 123, 0, false)).toBe(
      'https://www.esologs.com/reports/0?fight=0&type=auras&hostility=0&ability=123&target=0',
    );
  });

  it('renders unavailable metrics and an explicit status for an all-invalid sample set', () => {
    render(
      <PlayerCriticalDamageDetailsView
        criticalDamageData={
          {
            dataPoints: [{ timestamp: Number.NaN, relativeTime: Infinity, criticalDamage: NaN }],
            effectiveCriticalDamage: Infinity,
            inactiveCombatIntervals: [{ start: 0, end: Infinity }],
            maximumCriticalDamage: NaN,
            timeAtCapPercentage: NaN,
          } as never
        }
        criticalDamageSources={[]}
        criticalMultiplier={null}
        expanded
        fightDurationMs={Number.NaN}
        id={0}
        isLoading={false}
        name="Zero"
        player={{ id: 0, name: 'Zero' } as never}
      />,
    );

    expect(screen.getAllByText(/Unavailable/)).toHaveLength(6);
    expect(screen.queryByText('Unavailable%')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No valid critical damage samples');
    expect(screen.queryByTestId('critical-damage-chart')).not.toBeInTheDocument();
  });
});
