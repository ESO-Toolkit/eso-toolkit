import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { LoadoutSetup } from '@features/loadout-manager/types/loadout.types';

import { BuildComparator } from './BuildComparator';
import { makeLoadoutColumn, type ComparatorColumn } from './comparatorColumns';

const SLOTS = [0, 2, 3, 6, 16, 8, 9];

const loadout = (weight: 'heavy' | 'light'): LoadoutSetup => {
  const gear: Record<number, { id: string; weight: 'heavy' | 'light' }> = {};
  let id = 1;
  for (const s of SLOTS) gear[s] = { id: String(id++), weight };
  return {
    name: weight,
    disabled: false,
    condition: {},
    skills: { 0: {}, 1: {} },
    cp: {},
    food: {},
    gear,
  };
};

const renderComparator = (columns: ComparatorColumn[]) =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <BuildComparator columns={columns} />
    </ThemeProvider>,
  );

describe('BuildComparator', () => {
  it('asks for at least two columns', () => {
    renderComparator([makeLoadoutColumn('a', 'Heavy', loadout('heavy'))]);
    expect(screen.getByText(/at least two/i)).toBeInTheDocument();
  });

  it('renders one column per input and the stat rows', () => {
    renderComparator([
      makeLoadoutColumn('a', 'Heavy Tank', loadout('heavy')),
      makeLoadoutColumn('b', 'Light DPS', loadout('light')),
    ]);
    expect(screen.getByText('Heavy Tank')).toBeInTheDocument();
    expect(screen.getByText('Light DPS')).toBeInTheDocument();
    expect(screen.getByText('Max Health')).toBeInTheDocument();
    expect(screen.getByText('Effective HP')).toBeInTheDocument();
    expect(screen.getByText('Resistance')).toBeInTheDocument();
    expect(screen.getByText('Mitigation')).toBeInTheDocument();
    // First column is the baseline.
    expect(screen.getByText('Baseline')).toBeInTheDocument();
  });

  it('shows a signed delta against the baseline (heavy has more resistance than light)', () => {
    const heavy = makeLoadoutColumn('a', 'Heavy', loadout('heavy'));
    const light = makeLoadoutColumn('b', 'Light', loadout('light'));
    renderComparator([heavy, light]);
    // Heavy gear base resistance 14897 vs light 7501 → the light column's
    // Resistance delta is negative (− sign), and the magnitude is the difference.
    const diff = heavy.survivability.physical.resistance - light.survivability.physical.resistance;
    expect(diff).toBe(14897 - 7501);
    // Match either ASCII '-' or Unicode minus '−' before the magnitude.
    expect(
      screen.getByText(
        (content) => /[-−]/.test(content) && content.includes(diff.toLocaleString()),
      ),
    ).toBeInTheDocument();
  });
});
