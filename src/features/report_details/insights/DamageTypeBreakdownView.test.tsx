import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { DamageTypeFlags } from '../../../types/abilities';

import { DamageTypeBreakdownView } from './DamageTypeBreakdownView';

const renderView = (
  criticalRate: number | null,
  criticalDamageShare: number | null,
  emptyDenominators = false,
): void => {
  render(
    <ThemeProvider theme={createTheme()}>
      <DamageTypeBreakdownView
        damageTypeBreakdown={[
          {
            damageType: DamageTypeFlags.MAGIC,
            displayName: 'Magic',
            totalDamage: emptyDenominators ? 0 : 1000,
            hitCount: emptyDenominators ? 0 : 2,
            eligibleHitCount: emptyDenominators ? 0 : criticalRate === null ? 0 : 2,
            criticalHits: emptyDenominators ? 0 : criticalRate === 50 ? 1 : 0,
            criticalRate,
            criticalDamage: emptyDenominators ? 0 : criticalDamageShare === 90 ? 900 : 0,
            criticalDamageShare,
            averageDamage: emptyDenominators ? 0 : 500,
          },
        ]}
        totalDamage={emptyDenominators ? 0 : 1000}
        isLoading={false}
      />
    </ThemeProvider>,
  );
};

describe('DamageTypeBreakdownView critical metric labels', () => {
  it('labels critical hit rate and critical damage share as distinct metrics', async () => {
    const user = userEvent.setup();
    renderView(50, 90);

    const criticalRate = screen.getByText('Crit hit rate 50.0%');
    expect(screen.getByText('Crit damage share 90.0%')).toBeInTheDocument();
    expect(screen.getByText('overlapping damage share')).toBeInTheDocument();

    await user.hover(criticalRate);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Critical hit rate: 1 critical hits out of 2 eligible hits.',
    );

    await user.unhover(criticalRate);
    await user.hover(screen.getByText('Crit damage share 90.0%'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Critical damage share: 900 critical damage out of 1.0K total damage.',
    );
  });

  it('renders unavailable category metrics instead of a zero percent rate or share', async () => {
    renderView(null, null);

    expect(screen.getByText('Crit hit rate unavailable')).toBeInTheDocument();
    expect(screen.getByText('Crit damage share unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Crit hit rate 0.0%')).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.hover(screen.getByText('Crit damage share unavailable'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Critical damage share is unavailable because one or more hit types are unknown.',
    );
  });

  it('renders a valid zero category critical rate when eligible non-critical hits exist', () => {
    renderView(0, 0);

    expect(screen.getByText('Crit hit rate 0.0%')).toBeInTheDocument();
    expect(screen.getByText('Crit damage share 0.0%')).toBeInTheDocument();
  });

  it('renders unavailable labels for empty denominators instead of zero percentages', () => {
    renderView(0, 0, true);

    expect(screen.getByText('Crit hit rate unavailable')).toBeInTheDocument();
    expect(screen.getByText('Crit damage share unavailable')).toBeInTheDocument();
    expect(screen.getByText('Overlapping damage share unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Crit hit rate 0.0%')).not.toBeInTheDocument();
    expect(screen.queryByText('Crit damage share 0.0%')).not.toBeInTheDocument();
    expect(screen.queryByText('0.0%')).not.toBeInTheDocument();
  });
});
