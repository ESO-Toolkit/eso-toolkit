import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock the heavy children so the test exercises only the tab-switching wrapper.
jest.mock('../Calculator', () => ({
  Calculator: () => <div data-testid="stat-calculator">STAT CALCULATOR</div>,
}));
jest.mock('../UltimateCalculatorSkeleton', () => ({
  UltimateCalculatorSkeleton: () => <div>loading…</div>,
}));
jest.mock(
  '@features/ultimate-simulator/presentation/components/UltimateCalculator',
  () => ({
    UltimateCalculator: () => <div data-testid="ultimate-calculator">ULTIMATE CALCULATOR</div>,
  }),
  { virtual: true },
);
jest.mock(
  '@features/scribing/presentation/components/ScribingSimulator',
  () => ({
    ScribingSimulator: () => <div data-testid="scribing-simulator">SCRIBING PLANNER</div>,
  }),
  { virtual: true },
);
jest.mock(
  '@features/gear-upgrade/GearUpgradeCalculator',
  () => ({
    GearUpgradeCalculator: () => <div data-testid="gear-upgrade-calculator">GEAR UPGRADES</div>,
  }),
  { virtual: true },
);

import { CalculatorPage } from '../CalculatorPage';

const theme = createTheme();

function renderPage(initialPath = '/calculator') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider theme={theme}>
        <CalculatorPage />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('CalculatorPage', () => {
  it('shows all top-level tabs and defaults to Stats', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /Stats/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Ultimate/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Scribing/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Gear Upgrades/i })).toBeInTheDocument();
    // Stat calculator is rendered by default.
    expect(screen.getByTestId('stat-calculator')).toBeInTheDocument();
  });

  it('switches to the Gear Upgrades tab and lazy-loads the optimizer', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Gear Upgrades/i }));
    await waitFor(() => expect(screen.getByTestId('gear-upgrade-calculator')).toBeInTheDocument());
  });

  it('honors a #gear deep-link on first render', async () => {
    renderPage('/calculator#gear');
    await waitFor(() => expect(screen.getByTestId('gear-upgrade-calculator')).toBeInTheDocument());
  });

  it('switches to the Ultimate tab and lazy-loads the calculator', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Ultimate/i }));
    await waitFor(() => expect(screen.getByTestId('ultimate-calculator')).toBeInTheDocument());
  });

  it('switches to the Scribing tab and lazy-loads the planner', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Scribing/i }));
    await waitFor(() => expect(screen.getByTestId('scribing-simulator')).toBeInTheDocument());
  });

  it('keeps the stat calculator mounted (hidden) when on another tab', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Ultimate/i }));
    await waitFor(() => screen.getByTestId('ultimate-calculator'));
    // Still in the DOM (mounted, just display:none) so switching back is instant
    // and the stat calc's sticky-footer measurements aren't torn down.
    expect(screen.getByTestId('stat-calculator')).toBeInTheDocument();
  });

  it('honors a #ultimate deep-link on first render', async () => {
    renderPage('/calculator#ultimate');
    await waitFor(() => expect(screen.getByTestId('ultimate-calculator')).toBeInTheDocument());
  });

  it('honors a #scribing deep-link on first render', async () => {
    renderPage('/calculator#scribing');
    await waitFor(() => expect(screen.getByTestId('scribing-simulator')).toBeInTheDocument());
  });
});
