import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { Survivability } from '@/engine';

import { StatHealthBadge } from './StatHealthBadge';

const survivability = (over: Partial<Survivability> = {}): Survivability => ({
  health: { total: 28033, cap: 28033, maxCap: 28033, status: 'optimal', items: [] },
  resistance: { total: 16897, cap: 16897, maxCap: 16897, status: 'optimal', items: [] },
  physical: { resistance: 16897, mitigation: 0.256, ehp: 37679 },
  spell: { resistance: 16897, mitigation: 0.256, ehp: 37679 },
  ...over,
});

const renderBadge = (props: Parameters<typeof StatHealthBadge>[0]) =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <StatHealthBadge {...props} />
    </ThemeProvider>,
  );

describe('StatHealthBadge', () => {
  it('compact variant shows abbreviated health, EHP and mitigation %', () => {
    renderBadge({ survivability: survivability(), variant: 'compact' });
    expect(screen.getByText('28.0k')).toBeInTheDocument(); // health
    expect(screen.getByText('37.7k')).toBeInTheDocument(); // ehp
    expect(screen.getByText('26%')).toBeInTheDocument(); // mitigation rounded
  });

  it('full variant shows full numbers under labelled tiles', () => {
    renderBadge({ survivability: survivability(), variant: 'full' });
    expect(screen.getByText('Max Health')).toBeInTheDocument();
    expect(screen.getByText('Effective HP')).toBeInTheDocument();
    expect(screen.getByText('Mitigation')).toBeInTheDocument();
    expect(screen.getByText('28,033')).toBeInTheDocument();
    expect(screen.getByText('37,679')).toBeInTheDocument();
    expect(screen.getByText('26%')).toBeInTheDocument();
  });

  it('headlines the worst-case (lower) EHP channel', () => {
    renderBadge({
      survivability: survivability({
        physical: { resistance: 20000, mitigation: 0.303, ehp: 40000 },
        spell: { resistance: 10000, mitigation: 0.151, ehp: 33000 },
      }),
      variant: 'full',
    });
    // spell is the weaker channel → 33,000 EHP and 15% mitigation are the headline
    expect(screen.getByText('33,000')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
  });
});
