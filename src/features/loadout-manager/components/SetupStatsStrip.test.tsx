import { ThemeProvider, createTheme } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { LoadoutSetup } from '../types/loadout.types';

import { SetupStatsStrip } from './SetupStatsStrip';

const makeSetup = (over: Partial<LoadoutSetup> = {}): LoadoutSetup => ({
  name: 'Strip Test',
  disabled: false,
  condition: {},
  skills: { 0: {}, 1: {} },
  cp: {},
  food: {},
  gear: {},
  ...over,
});

const renderStrip = (setup: LoadoutSetup) =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <SetupStatsStrip setup={setup} />
    </ThemeProvider>,
  );

describe('SetupStatsStrip', () => {
  it('shows an empty-state prompt when the setup has no gear', () => {
    renderStrip(makeSetup());
    expect(screen.getByText('Add gear to preview stats.')).toBeInTheDocument();
    expect(screen.queryByText('Penetration')).not.toBeInTheDocument();
  });

  it('renders the four gear-derived gauges when gear is present', () => {
    renderStrip(makeSetup({ gear: { 2: { id: '1', weight: 'light' } } }));
    expect(screen.getByText('Gear-Derived Stats')).toBeInTheDocument();
    expect(screen.getByText('Crit Damage')).toBeInTheDocument();
    expect(screen.getByText('Crit Chance')).toBeInTheDocument();
    // "Penetration"/"Armor" labels appear on both the gauge and the (mounted but
    // collapsed) breakdown row, so there are two of each.
    expect(screen.getAllByText('Penetration').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Armor').length).toBeGreaterThanOrEqual(1);
  });

  it('toggles the source breakdown open', () => {
    renderStrip(makeSetup({ gear: { 2: { id: '1', weight: 'light' } } }));
    const btn = screen.getByRole('button', { name: /Source Breakdown/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });
});
