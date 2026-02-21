import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { DamageBreakdownSection } from '../DamageBreakdownSection';
import { ReportDamageBreakdown } from '../../../types/reportSummaryTypes';

const mockDamageBreakdown: ReportDamageBreakdown = {
  totalDamage: 2500000,
  dps: 12500,
  playerBreakdown: [
    {
      playerId: '1',
      playerName: 'Top DPS Player',
      role: 'DPS',
      totalDamage: 1500000,
      dps: 7500,
      damagePercentage: 60,
      fightBreakdown: [],
    },
    {
      playerId: '2',
      playerName: 'Second DPS Player',
      role: 'DPS',
      totalDamage: 800000,
      dps: 4000,
      damagePercentage: 32,
      fightBreakdown: [],
    },
    {
      playerId: '3',
      playerName: 'Tank Player',
      role: 'Tank',
      totalDamage: 200000,
      dps: 1000,
      damagePercentage: 8,
      fightBreakdown: [],
    },
  ],
  abilityTypeBreakdown: [
    {
      abilityType: 'Direct Damage',
      totalDamage: 1250000,
      percentage: 50,
      hitCount: 625,
    },
    {
      abilityType: 'DOT',
      totalDamage: 750000,
      percentage: 30,
      hitCount: 375,
    },
    {
      abilityType: 'AOE',
      totalDamage: 500000,
      percentage: 20,
      hitCount: 250,
    },
  ],
  targetBreakdown: [
    {
      targetId: 'boss1',
      targetName: 'Main Boss',
      totalDamage: 2500000,
      percentage: 100,
    },
  ],
};

const renderWithTheme = (component: React.ReactElement) => {
  const theme = createTheme();
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('DamageBreakdownSection', () => {
  it('renders damage breakdown with correct total and DPS', () => {
    renderWithTheme(
      <DamageBreakdownSection
        damageBreakdown={mockDamageBreakdown}
        isLoading={false}
        error={undefined}
      />,
    );

    expect(screen.getByText('Damage Breakdown')).toBeInTheDocument();
    expect(screen.getByText('2.5M')).toBeInTheDocument(); // Formatted total damage
    expect(screen.getByText('12,500 DPS')).toBeInTheDocument();
  });

  it('displays top damage dealers in order', () => {
    renderWithTheme(
      <DamageBreakdownSection
        damageBreakdown={mockDamageBreakdown}
        isLoading={false}
        error={undefined}
      />,
    );

    expect(screen.getByText('Top Damage Dealers')).toBeInTheDocument();
    expect(screen.getByText('#1 Top DPS Player')).toBeInTheDocument();
    expect(screen.getByText('#2 Second DPS Player')).toBeInTheDocument();
    expect(screen.getByText('#3 Tank Player')).toBeInTheDocument();
  });

  it('shows damage type distribution', () => {
    renderWithTheme(
      <DamageBreakdownSection
        damageBreakdown={mockDamageBreakdown}
        isLoading={false}
        error={undefined}
      />,
    );

    expect(screen.getByText('Damage Type Distribution')).toBeInTheDocument();
    expect(screen.getByText('Direct Damage')).toBeInTheDocument();
    expect(screen.getByText('DOT')).toBeInTheDocument();
    expect(screen.getByText('AOE')).toBeInTheDocument();
  });

  it('displays player performance details table', () => {
    renderWithTheme(
      <DamageBreakdownSection
        damageBreakdown={mockDamageBreakdown}
        isLoading={false}
        error={undefined}
      />,
    );

    expect(screen.getByText('Player Performance Details')).toBeInTheDocument();
    expect(screen.getByText('1.5M')).toBeInTheDocument(); // Top DPS damage
    expect(screen.getByText('60.0%')).toBeInTheDocument(); // Top DPS percentage
  });

  it('shows role chips for players', () => {
    renderWithTheme(
      <DamageBreakdownSection
        damageBreakdown={mockDamageBreakdown}
        isLoading={false}
        error={undefined}
      />,
    );

    // Check for DPS and Tank role chips
    const roleChips = screen.getAllByText('DPS');
    expect(roleChips.length).toBeGreaterThan(0);
    const tankChips = screen.getAllByText('Tank');
    expect(tankChips.length).toBeGreaterThan(0);
  });

  it('shows loading skeleton when isLoading is true', () => {
    renderWithTheme(
      <DamageBreakdownSection damageBreakdown={undefined} isLoading={true} error={undefined} />,
    );

    expect(screen.getByText('Damage Breakdown')).toBeInTheDocument();
    // Should show skeleton elements - check for Skeleton components by class
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error alert when error is provided', () => {
    const errorMessage = 'Failed to load damage data';

    renderWithTheme(
      <DamageBreakdownSection damageBreakdown={undefined} isLoading={false} error={errorMessage} />,
    );

    expect(screen.getByText('Damage Breakdown')).toBeInTheDocument();
    expect(screen.getByText(`Failed to load damage data: ${errorMessage}`)).toBeInTheDocument();
  });

  it('formats damage values correctly', () => {
    const smallDamageBreakdown: ReportDamageBreakdown = {
      ...mockDamageBreakdown,
      totalDamage: 1500, // Small number
      playerBreakdown: [
        {
          ...mockDamageBreakdown.playerBreakdown[0],
          totalDamage: 1500,
        },
      ],
    };

    renderWithTheme(
      <DamageBreakdownSection
        damageBreakdown={smallDamageBreakdown}
        isLoading={false}
        error={undefined}
      />,
    );

    const formattedValues = screen.getAllByText('1.5K');
    expect(formattedValues.length).toBeGreaterThan(0); // Values >= 1000 are formatted
  });

  it('handles missing role gracefully', () => {
    const breakdownWithoutRole: ReportDamageBreakdown = {
      ...mockDamageBreakdown,
      playerBreakdown: [
        {
          ...mockDamageBreakdown.playerBreakdown[0],
          role: undefined,
        },
      ],
    };

    renderWithTheme(
      <DamageBreakdownSection
        damageBreakdown={breakdownWithoutRole}
        isLoading={false}
        error={undefined}
      />,
    );

    // Should render without crashing
    expect(screen.getByText('Damage Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Top DPS Player')).toBeInTheDocument();
  });
});
