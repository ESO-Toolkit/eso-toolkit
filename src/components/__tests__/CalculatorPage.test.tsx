import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';

// Mock the heavy children so the test exercises only the tab-switching wrapper.
let mockCalculatorRenderCount = 0;
jest.mock('../Calculator', () => ({
  Calculator: jest.requireActual<typeof import('react')>('react').memo(() => {
    mockCalculatorRenderCount += 1;
    return <div data-testid="stat-calculator">STAT CALCULATOR</div>;
  }),
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

function RouterHistoryControls() {
  const navigate = useNavigate();

  return (
    <>
      <button type="button" onClick={() => navigate('/calculator#scribing')}>
        Navigate to Scribing
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
    </>
  );
}

function renderPageWithHistoryControls(initialPath = '/calculator#ultimate') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider theme={theme}>
        <RouterHistoryControls />
        <CalculatorPage />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('CalculatorPage', () => {
  beforeEach(() => {
    mockCalculatorRenderCount = 0;
  });

  it('shows all three top-level tabs and defaults to Stats', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /Stats/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Ultimate/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Scribing/i })).toBeInTheDocument();
    // Stat calculator is rendered by default.
    expect(screen.getByTestId('stat-calculator')).toBeInTheDocument();
  });

  it('switches to the Ultimate tab and lazy-loads the calculator', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Ultimate/i }));
    await waitFor(() => expect(screen.getByTestId('ultimate-calculator')).toBeInTheDocument());
  });

  it('commits the selected tab before deferred panel work and preserves the static calculator bailout', async () => {
    renderPage('/calculator#ultimate');
    await waitFor(() => expect(screen.getByTestId('ultimate-calculator')).toBeInTheDocument());
    expect(mockCalculatorRenderCount).toBe(1);

    const statsTab = screen.getByRole('tab', { name: /Stats/i });
    fireEvent.click(statsTab);

    // The local state update is a discrete input update; it must not wait for Router navigation or
    // the deferred panel subtree before exposing the selected tab state to assistive technology.
    expect(statsTab).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(screen.getByTestId('stat-calculator')).toBeVisible());
    expect(mockCalculatorRenderCount).toBe(1);
  });

  it('synchronizes local tab state after external hash navigation and history back', async () => {
    renderPageWithHistoryControls();
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Ultimate/i })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Navigate to Scribing' }));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Scribing/i })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Ultimate/i })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
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
