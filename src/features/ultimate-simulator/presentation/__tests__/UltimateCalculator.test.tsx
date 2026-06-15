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

  it('offers a cost-reduction toggle for a class that has one, and applying it lowers the cost', () => {
    renderCalc();
    // Switch to Sorcerer — Power Stone (−15%) is a default-on reduction with a toggle.
    fireEvent.mouseDown(screen.getByLabelText(/Class/i));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Sorcerer'));

    // The reduction toggle is rendered and on by default.
    const toggle = screen.getByLabelText(/Power Stone/i);
    expect(toggle).toBeInTheDocument();

    // With it on, the reduced-cost note is shown; turning it off removes the note.
    expect(screen.getByText(/Cost reduced/i)).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText(/Cost reduced/i)).not.toBeInTheDocument();
  });

  it('does not apply class reductions to a custom cost (no double-reduction)', () => {
    renderCalc();
    // Sorcerer (Power Stone −15% default-on), then pick a custom cost.
    fireEvent.mouseDown(screen.getByLabelText(/Class/i));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Sorcerer'));
    fireEvent.mouseDown(screen.getByLabelText(/^Ultimate$/i));
    fireEvent.click(within(screen.getByRole('listbox')).getByText(/Custom cost/i));

    // A custom cost is taken as already-effective: no "Cost reduced" note and no
    // reduction toggles (they don't apply to a user-entered effective number).
    expect(screen.queryByText(/Cost reduced/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Power Stone/i)).not.toBeInTheDocument();
  });
});
