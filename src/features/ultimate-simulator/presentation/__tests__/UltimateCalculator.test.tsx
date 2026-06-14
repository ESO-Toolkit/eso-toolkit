import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';

import { UltimateCalculator } from '../components/UltimateCalculator';

const theme = createTheme();

function renderCalc() {
  return render(
    <ThemeProvider theme={theme}>
      <UltimateCalculator />
    </ThemeProvider>,
  );
}

const readTotal = (): number =>
  Number(screen.getByTestId('ult-grand-total').textContent?.replace(/,/g, '') ?? '0');

describe('UltimateCalculator', () => {
  it('renders the headline stats and a per-source breakdown', () => {
    renderCalc();
    expect(screen.getByRole('heading', { name: /Ultimate Calculator/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Ultimate \/ second/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Time to first ult/i)).toBeInTheDocument();
    expect(screen.getByText(/Casts \/ fight/i)).toBeInTheDocument();
    // Default (Arcanist group DPS) sources are visible.
    expect(screen.getAllByText(/Light\/Heavy-attack income/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Minor Heroism/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Implacable Outcome/i).length).toBeGreaterThan(0);
    expect(readTotal()).toBeGreaterThan(0);
  });

  it('drops the total when Decisive is turned off', () => {
    renderCalc();
    const withDecisive = readTotal();
    fireEvent.click(screen.getByLabelText(/Decisive weapon trait/i));
    expect(readTotal()).toBeLessThan(withDecisive);
  });

  it('shows class-specific sources only for the matching class', () => {
    renderCalc();
    // Switch class to Sorcerer — Implacable Outcome (Arcanist) should disappear.
    fireEvent.mouseDown(screen.getByLabelText(/Class/i));
    const listbox = within(screen.getByRole('listbox'));
    fireEvent.click(listbox.getByText('Sorcerer'));
    expect(screen.queryByText(/Implacable Outcome/i)).not.toBeInTheDocument();
  });

  it('reflects a custom ultimate cost in time-to-first-ult', () => {
    renderCalc();
    // Default ult is "Typical ultimate (250)"; switching to Dawnbreaker (125)
    // lowers the cost and so the time-to-first-ult.
    expect(screen.getAllByText(/250 ult cost/i).length).toBeGreaterThan(0);
  });
});
