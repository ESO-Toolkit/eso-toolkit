import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the heavy children so the test exercises only the tab-switching wrapper.
jest.mock('../Calculator', () => ({
  Calculator: () => <div data-testid="stat-calculator">STAT CALCULATOR</div>,
}));
jest.mock('../SmartCalculatorSkeleton', () => ({
  SmartCalculatorSkeleton: () => <div>loading…</div>,
}));
jest.mock(
  '@features/ultimate-simulator/presentation/components/UltimateCalculator',
  () => ({
    UltimateCalculator: () => <div data-testid="ultimate-calculator">ULTIMATE CALCULATOR</div>,
  }),
  { virtual: true },
);

import { CalculatorPage } from '../CalculatorPage';

const theme = createTheme();

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <CalculatorPage />
    </ThemeProvider>,
  );
}

describe('CalculatorPage', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('shows both top-level tabs and defaults to Stats', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /Stats/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Ultimate/i })).toBeInTheDocument();
    // Stat calculator is rendered by default.
    expect(screen.getByTestId('stat-calculator')).toBeInTheDocument();
  });

  it('switches to the Ultimate tab and lazy-loads the calculator', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Ultimate/i }));
    await waitFor(() => expect(screen.getByTestId('ultimate-calculator')).toBeInTheDocument());
  });

  it('keeps the stat calculator mounted (hidden) when on the Ultimate tab', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Ultimate/i }));
    await waitFor(() => screen.getByTestId('ultimate-calculator'));
    // Still in the DOM (mounted, just display:none) so switching back is instant
    // and the stat calc's sticky-footer measurements aren't torn down.
    expect(screen.getByTestId('stat-calculator')).toBeInTheDocument();
  });

  it('honors a #ultimate deep-link on first render', async () => {
    window.location.hash = '#ultimate';
    renderPage();
    await waitFor(() => expect(screen.getByTestId('ultimate-calculator')).toBeInTheDocument());
  });
});
