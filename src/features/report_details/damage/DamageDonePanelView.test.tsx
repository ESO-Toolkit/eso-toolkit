import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { calculateCriticalDamageShare } from './DamageDonePanel';
import { DamageDonePanelView } from './DamageDonePanelView';

jest.mock('../../../hooks', () => ({
  useRoleColors: jest.fn(),
}));

jest.mock('./DamageTimelineChart', () => ({
  DamageTimelineChart: () => null,
}));

const { useRoleColors } = jest.requireMock('../../../hooks');

const mockRoleColors = {
  dps: '#ff6b6b',
  healer: '#51cf66',
  tank: '#339af0',
  getGradientColor: () => 'linear-gradient(#ff6b6b, #ff6b6b)',
  getPlayerColor: () => '#ff6b6b',
  getTableBackground: () => '#ffffff',
  isDarkMode: false,
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={createTheme()}>{children}</ThemeProvider>
);

const createDamageRow = (overrides: Record<string, unknown> = {}) => ({
  id: '1',
  name: 'Damage Dealer',
  total: 200,
  dps: 100,
  activePercentage: 100,
  criticalDamageShare: 80,
  criticalDamageTotal: 160,
  deaths: 0,
  resurrects: 0,
  cpm: 0,
  role: 'dps' as const,
  ...overrides,
});

describe('DamageDonePanel critical damage share', () => {
  beforeEach(() => {
    useRoleColors.mockReturnValue(mockRoleColors);
  });

  it('reports the share of damage from critical hits, not a critical-hit rate', () => {
    // Two critical hits out of five eligible hits would have a 40% hit rate, but
    // the available damage totals establish an 80% critical-damage share.
    expect(calculateCriticalDamageShare(200, 160)).toBe(80);

    render(
      <TestWrapper>
        <DamageDonePanelView damageRows={[createDamageRow()]} />
      </TestWrapper>,
    );

    expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: /^Sort by Critical damage share/ }).length,
    ).toBeGreaterThan(0);
  });

  it.each([
    [0, 0],
    [-1, 0],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [100, Number.NaN],
    [100, 101],
  ])('returns no share for invalid damage totals (%p, %p)', (totalDamage, criticalDamageTotal) => {
    expect(calculateCriticalDamageShare(totalDamage, criticalDamageTotal)).toBeNull();
  });

  it('renders an unavailable state instead of a false zero when the share is unknown', () => {
    render(
      <TestWrapper>
        <DamageDonePanelView
          damageRows={[createDamageRow({ criticalDamageShare: null, criticalDamageTotal: 0 })]}
        />
      </TestWrapper>,
    );

    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });
});
