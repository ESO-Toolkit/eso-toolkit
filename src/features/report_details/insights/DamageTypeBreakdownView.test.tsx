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
        state="ready"
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
      />
    </ThemeProvider>,
  );
};

describe('DamageTypeBreakdownView critical metric labels', () => {
  it('describes critical hit rate and critical damage share as distinct metrics', async () => {
    const user = userEvent.setup();
    renderView(50, 90);

    // Crit metrics live in the percentage tooltip, not as visible row text.
    expect(screen.queryByText('Crit hit rate 50.0%')).not.toBeInTheDocument();
    const percentage = screen.getByLabelText(
      'Overlapping damage share: 100.0% of total damage; categories may overlap. Critical hit rate: 1 critical hits out of 2 eligible hits. Critical damage share: 900 critical damage out of 1.0K total damage.',
    );
    expect(percentage).toHaveTextContent('100.0%');

    await user.hover(percentage);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(
      'Overlapping damage share: 100.0% of total damage; categories may overlap',
    );
    expect(tooltip).toHaveTextContent('Crit hit rate 50.0%');
    expect(tooltip).toHaveTextContent('Crit damage share 90.0%');
  });

  it('renders unavailable category metrics instead of a zero percent rate or share', async () => {
    const user = userEvent.setup();
    renderView(null, null);

    const percentage = screen.getByLabelText(
      /Critical hit rate is unavailable because no eligible normal or critical hits were recorded\. Critical damage share is unavailable because one or more hit types are unknown\.$/,
    );

    await user.hover(percentage);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Crit hit rate unavailable');
    expect(tooltip).toHaveTextContent('Crit damage share unavailable');
    expect(tooltip).not.toHaveTextContent('Crit hit rate 0.0%');
    expect(tooltip).not.toHaveTextContent('Crit damage share 0.0%');
  });

  it('reports a valid zero category critical rate when eligible non-critical hits exist', async () => {
    const user = userEvent.setup();
    renderView(0, 0);

    const percentage = screen.getByLabelText(
      /Critical hit rate: 0 critical hits out of 2 eligible hits\. Critical damage share: 0 critical damage out of 1\.0K total damage\.$/,
    );

    await user.hover(percentage);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Crit hit rate 0.0%');
    expect(tooltip).toHaveTextContent('Crit damage share 0.0%');
  });

  it('renders unavailable labels for empty denominators instead of zero percentages', () => {
    renderView(0, 0, true);

    expect(screen.getByText('Overlapping damage share unavailable')).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        'Overlapping damage share unavailable because total damage is zero. Critical hit rate is unavailable because no eligible normal or critical hits were recorded. Critical damage share is unavailable because total damage is zero.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('0.0%')).not.toBeInTheDocument();
  });
});
