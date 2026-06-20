import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';

import { MechanicCategory, ReportDeathAnalysis } from '../../../types/reportSummaryTypes';
import { EnhancedDeathAnalysisSection } from '../EnhancedDeathAnalysisSection';

const renderWithTheme = (component: React.ReactElement) => {
  const theme = createTheme();
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

const analysis: ReportDeathAnalysis = {
  totalDeaths: 2,
  playerDeaths: [
    {
      playerId: '1',
      playerName: 'Alice',
      totalDeaths: 1,
      averageTimeAlive: 45_000, // 45s — stored in ms, rendered as seconds
      fightDeaths: [],
      topCausesOfDeath: [],
    },
  ],
  mechanicDeaths: [
    {
      mechanicId: 9000,
      mechanicName: 'Meteor',
      totalDeaths: 2,
      percentage: 100,
      playersAffected: ['Alice'],
      fightsWithDeaths: [1],
      averageKillingBlowDamage: 1000,
      category: MechanicCategory.DIRECT_DAMAGE,
    },
  ],
  fightDeaths: [
    {
      fightId: 1,
      fightName: 'Boss A',
      totalDeaths: 2,
      deathRate: 1,
      success: false,
      isBoss: true,
      mechanicBreakdown: [],
    },
    {
      fightId: 2,
      fightName: 'Trash Pull',
      totalDeaths: 0,
      deathRate: 0,
      success: true,
      isBoss: false,
      mechanicBreakdown: [],
    },
  ],
  deathPatterns: [],
};

describe('EnhancedDeathAnalysisSection', () => {
  it('renders an error state', () => {
    renderWithTheme(
      <EnhancedDeathAnalysisSection isLoading={false} error="boom" deathAnalysis={undefined} />,
    );
    expect(screen.getByText('Analysis Failed')).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });

  it('renders a loading state', () => {
    renderWithTheme(
      <EnhancedDeathAnalysisSection isLoading={true} error={undefined} deathAnalysis={undefined} />,
    );
    expect(screen.getByText(/Analyzing death patterns/)).toBeInTheDocument();
  });

  it('celebrates a flawless run with no deaths', () => {
    renderWithTheme(
      <EnhancedDeathAnalysisSection
        isLoading={false}
        error={undefined}
        deathAnalysis={{ ...analysis, totalDeaths: 0 }}
      />,
    );
    expect(screen.getByText('Flawless Performance!')).toBeInTheDocument();
  });

  it('renders the time-to-first-death in seconds (the ms→s contract)', () => {
    renderWithTheme(
      <EnhancedDeathAnalysisSection isLoading={false} error={undefined} deathAnalysis={analysis} />,
    );
    expect(screen.getByText('45s')).toBeInTheDocument();
    // No top cause of death → an em-dash placeholder.
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('groups boss fights and trash by the isBoss flag (trash behind a toggle)', () => {
    renderWithTheme(
      <EnhancedDeathAnalysisSection isLoading={false} error={undefined} deathAnalysis={analysis} />,
    );

    // The boss encounter is always shown; the trash fight is in the trash group.
    expect(screen.getByText('Boss A')).toBeInTheDocument();
    expect(screen.getByText('Trash Pull')).toBeInTheDocument();

    // The trash group is gated behind a toggle that reports its count.
    expect(screen.getByText('1 trash (0 deaths)')).toBeInTheDocument();
    const toggle = document.querySelector('.MuiSwitch-input') as HTMLInputElement;
    expect(toggle).toBeTruthy();
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });
});
