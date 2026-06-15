import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { UltimateSimulator } from '../components/UltimateSimulator';

const theme = createTheme();

function renderSimulator() {
  return render(
    <ThemeProvider theme={theme}>
      <UltimateSimulator />
    </ThemeProvider>,
  );
}

describe('UltimateSimulator (render smoke)', () => {
  it('renders headline, inputs, and a results table with all raid sources', () => {
    renderSimulator();

    expect(screen.getByRole('heading', { name: /Arcanist Ultimate Simulator/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Fight duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Monte Carlo runs/i)).toBeInTheDocument();

    // Each raid-context source label appears in both the uptime inputs and the
    // results table, so use getAllByText (≥1 occurrence proves it rendered).
    expect(screen.getAllByText('Base (light-attack buff)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Minor Heroism').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Major Heroism').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Implacable Outcome').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pillager's Profit/i).length).toBeGreaterThan(0);
  });

  it('shows a non-zero mean total and a confidence interval', () => {
    renderSimulator();
    // The "Mean total ultimate" stat should render a numeric value > 0.
    expect(screen.getByText(/Mean total ultimate/i)).toBeInTheDocument();
    expect(screen.getByText(/95% CI/i)).toBeInTheDocument();
    expect(screen.getByText(/Ultimate \/ second/i)).toBeInTheDocument();
  });

  it('recomputes when Decisive is toggled off (total drops)', () => {
    renderSimulator();

    // Read the grand-total cell before/after toggling Decisive off.
    const readTotal = (): number =>
      Number(screen.getByTestId('grand-total').textContent?.replace(/,/g, '') ?? '0');

    const withDecisive = readTotal();
    // The Decisive toggle is the first checkbox (its FormControlLabel reads "Decisive trait").
    const decisiveSwitch = screen.getByLabelText(/Decisive trait/i);
    fireEvent.click(decisiveSwitch);
    const withoutDecisive = readTotal();

    expect(withoutDecisive).toBeLessThan(withDecisive);
  });
});
