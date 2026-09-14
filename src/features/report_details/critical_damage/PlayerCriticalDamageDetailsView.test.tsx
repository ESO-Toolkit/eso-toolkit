import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';

import {
  buildEsoLogsSourceUrl,
  getCriticalDamageMetricIntent,
  getTimeAtCapMetricIntent,
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

type CriticalMultiplier = ComponentProps<
  typeof PlayerCriticalDamageDetailsView
>['criticalMultiplier'];

const validCriticalMultiplier: NonNullable<CriticalMultiplier> = {
  abilityName: 'Test Ability',
  abilityId: 123,
  criticalDamage: 1750,
  normalDamage: 1000,
  criticalMultiplier: 1.75,
  foundPair: true,
  criticalTimestamp: 1,
  accountedCritDamagePercent: 25,
  unaccountedCritDamagePercent: 0,
  activeSources: [],
};

const renderCriticalMultiplier = (criticalMultiplier: CriticalMultiplier) =>
  render(
    <PlayerCriticalDamageDetailsView
      id={1}
      player={{ id: 1, name: 'Test Player' } as never}
      name="Test Player"
      expanded
      isLoading={false}
      criticalDamageData={{
        playerId: 1,
        playerName: 'Test Player',
        dataPoints: [{ timestamp: 0, relativeTime: 0, criticalDamage: 100 }],
        effectiveCriticalDamage: 100,
        maximumCriticalDamage: 100,
        timeAtCapPercentage: 0,
        criticalDamageAlerts: [],
        inactiveCombatIntervals: [],
      }}
      criticalDamageSources={[]}
      criticalMultiplier={criticalMultiplier}
      fightDurationMs={1000}
    />,
  );

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

  it('keeps critical-damage and time-at-cap grading thresholds distinct', () => {
    expect(getCriticalDamageMetricIntent(null)).toBe('neutral');
    expect(getCriticalDamageMetricIntent(110)).toBe('warning');
    expect(getCriticalDamageMetricIntent(125)).toBe('success');
    expect(getTimeAtCapMetricIntent(null)).toBe('neutral');
    expect(getTimeAtCapMetricIntent(50)).toBe('warning');
    expect(getTimeAtCapMetricIntent(80)).toBe('success');
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
    expect(
      screen
        .getAllByRole('status')
        .some((status) => status.textContent?.includes('No valid critical damage samples')),
    ).toBe(true);
    expect(screen.queryByTestId('critical-damage-chart')).not.toBeInTheDocument();
  });

  it('renders an explicit unavailable state when no critical multiplier pair exists', () => {
    renderCriticalMultiplier(null);

    expect(screen.getByRole('status')).toHaveTextContent(
      'no matched normal and critical hit sample',
    );
    expect(screen.queryByText(/unknown sources/)).not.toBeInTheDocument();
  });

  it.each([null, Number.NaN, Number.POSITIVE_INFINITY])(
    'renders an unavailable multiplier without formatting invalid value %s',
    (criticalMultiplier) => {
      renderCriticalMultiplier({ ...validCriticalMultiplier, criticalMultiplier });

      expect(screen.getByText('Critical Multiplier:').parentElement).toHaveTextContent(
        'Unavailable',
      );
      expect(screen.getByRole('status')).toHaveTextContent('incomplete or invalid');
    },
  );

  it.each([
    ['accounted', { accountedCritDamagePercent: null }, 'Accounted Critical Damage:'],
    ['accounted', { accountedCritDamagePercent: Number.NaN }, 'Accounted Critical Damage:'],
    [
      'accounted',
      { accountedCritDamagePercent: Number.POSITIVE_INFINITY },
      'Accounted Critical Damage:',
    ],
    ['unaccounted', { unaccountedCritDamagePercent: null }, 'Unaccounted Critical Damage:'],
    ['unaccounted', { unaccountedCritDamagePercent: Number.NaN }, 'Unaccounted Critical Damage:'],
    [
      'unaccounted',
      { unaccountedCritDamagePercent: Number.POSITIVE_INFINITY },
      'Unaccounted Critical Damage:',
    ],
  ])('renders invalid %s values as unavailable', (_label, override, fieldLabel) => {
    renderCriticalMultiplier({ ...validCriticalMultiplier, ...override });

    expect(screen.getByText(fieldLabel).parentElement).toHaveTextContent('Unavailable');
    expect(screen.getByRole('status')).toHaveTextContent('incomplete or invalid');
    expect(screen.queryByText(/unknown sources/)).not.toBeInTheDocument();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, null])(
    'does not calculate or grade multiplier data with invalid denominator %s',
    (normalDamage) => {
      renderCriticalMultiplier({ ...validCriticalMultiplier, normalDamage });

      expect(screen.getByRole('status')).toHaveTextContent(
        'positive finite normal-damage average is required',
      );
      expect(screen.getByText('Critical Multiplier:').parentElement).toHaveTextContent(
        'Unavailable',
      );
      expect(screen.getByText('Accounted Critical Damage:').parentElement).toHaveTextContent(
        'Unavailable',
      );
      expect(screen.getByText('Unaccounted Critical Damage:').parentElement).toHaveTextContent(
        'Unavailable',
      );
      expect(screen.queryByText(/unknown sources/)).not.toBeInTheDocument();
    },
  );
});
