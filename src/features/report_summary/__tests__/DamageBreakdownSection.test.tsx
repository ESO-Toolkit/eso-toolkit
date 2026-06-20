import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';

import { ReportDamageBreakdown } from '../../../types/reportSummaryTypes';
import { DamageBreakdownSection } from '../DamageBreakdownSection';

// Production-realistic shape: the live hook never populates `role` or
// `targetBreakdown`, and emits full damage-type labels.
const mockDamageBreakdown: ReportDamageBreakdown = {
  totalDamage: 2500000,
  dps: 12500,
  playerBreakdown: [
    {
      playerId: '1',
      playerName: 'Top DPS Player',
      totalDamage: 1500000,
      dps: 7500,
      damagePercentage: 60,
      fightBreakdown: [],
    },
    {
      playerId: '2',
      playerName: 'Second DPS Player',
      totalDamage: 800000,
      dps: 4000,
      damagePercentage: 32,
      fightBreakdown: [],
    },
    {
      playerId: '3',
      playerName: 'Tank Player',
      totalDamage: 200000,
      dps: 1000,
      damagePercentage: 8,
      fightBreakdown: [],
    },
  ],
  abilityTypeBreakdown: [
    { abilityType: 'Direct', totalDamage: 1250000, percentage: 50, hitCount: 625 },
    { abilityType: 'Damage over Time', totalDamage: 750000, percentage: 30, hitCount: 375 },
    { abilityType: 'Area of Effect', totalDamage: 500000, percentage: 20, hitCount: 250 },
  ],
  targetBreakdown: [],
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
    // Each top dealer now shows a medal rank badge (the ordinal) beside the name;
    // scope to the dealers list since the same names also appear in the table below.
    const dealers = within(
      screen.getByText('Top Damage Dealers').closest('.MuiBox-root') as HTMLElement,
    );
    expect(dealers.getByText('Top DPS Player')).toBeInTheDocument();
    expect(dealers.getByText('Second DPS Player')).toBeInTheDocument();
    expect(dealers.getByText('Tank Player')).toBeInTheDocument();
    expect(dealers.getByText('1')).toBeInTheDocument();
    expect(dealers.getByText('2')).toBeInTheDocument();
    expect(dealers.getByText('3')).toBeInTheDocument();
  });

  it('shows damage by type with an overlap disclaimer', () => {
    renderWithTheme(
      <DamageBreakdownSection
        damageBreakdown={mockDamageBreakdown}
        isLoading={false}
        error={undefined}
      />,
    );

    expect(screen.getByText('Damage by Type')).toBeInTheDocument();
    expect(screen.getByText('Direct')).toBeInTheDocument();
    expect(screen.getByText('Damage over Time')).toBeInTheDocument();
    expect(screen.getByText('Area of Effect')).toBeInTheDocument();
    expect(screen.getByText(/percentages can add up to more than 100%/i)).toBeInTheDocument();
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

  it('does not render dead role UI (the hook never populates role)', () => {
    renderWithTheme(
      <DamageBreakdownSection
        damageBreakdown={mockDamageBreakdown}
        isLoading={false}
        error={undefined}
      />,
    );

    // No Role column header and no standalone role chips.
    expect(screen.queryByRole('columnheader', { name: 'Role' })).not.toBeInTheDocument();
    expect(screen.queryByText('Tank')).not.toBeInTheDocument();
  });

  it('shows an empty state when there is no player damage', () => {
    renderWithTheme(
      <DamageBreakdownSection
        damageBreakdown={{ ...mockDamageBreakdown, playerBreakdown: [] }}
        isLoading={false}
        error={undefined}
      />,
    );

    expect(screen.getByText('No player damage was recorded for this report.')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    renderWithTheme(
      <DamageBreakdownSection damageBreakdown={undefined} isLoading={true} error={undefined} />,
    );

    expect(screen.getByText('Damage Breakdown')).toBeInTheDocument();
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
      totalDamage: 1500,
      playerBreakdown: [{ ...mockDamageBreakdown.playerBreakdown[0], totalDamage: 1500 }],
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
});
