import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { DamageBreakdownView } from './DamageBreakdownView';

const renderView = (
  criticalRate: number | null,
  criticalDamageShare: number | null,
  emptyDenominators = false,
): void => {
  render(
    <ThemeProvider theme={createTheme()}>
      <DamageBreakdownView
        state="ready"
        damageBreakdown={[
          {
            abilityGameID: '100',
            abilityName: 'Test Ability',
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

describe('DamageBreakdownView critical metric labels', () => {
  it('renders the panel heading above the populated list', () => {
    renderView(50, 90);

    expect(screen.getByRole('heading', { name: 'Damage Breakdown' })).toBeInTheDocument();
  });

  it('describes critical hit rate and critical damage share as distinct metrics', async () => {
    const user = userEvent.setup();
    renderView(50, 90);

    const criticalChip = screen.getByText('50.0% crit');
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.getByLabelText('Damage share: 100.0% of total damage')).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        'Critical hit rate: 1 critical hits out of 2 eligible hits. Critical damage share: 900 critical damage out of 1.0K total damage.',
      ),
    ).toBeInTheDocument();

    await user.hover(criticalChip);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Critical hit rate: 1 critical hits out of 2 eligible hits.');
    expect(tooltip).toHaveTextContent(
      'Critical damage share: 900 critical damage out of 1.0K total damage.',
    );
  });

  it('explains an unavailable critical damage share instead of reporting zero', async () => {
    const user = userEvent.setup();
    renderView(50, null);

    await user.hover(screen.getByText('50.0% crit'));
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(
      'Critical damage share is unavailable because one or more hit types are unknown.',
    );
    expect(tooltip).not.toHaveTextContent('Critical damage share: 0');
  });

  it('does not render a crit chip or a fake zero rate when the rate is unavailable', () => {
    renderView(null, null);

    expect(screen.queryByText(/% crit$/)).not.toBeInTheDocument();
    expect(screen.queryByText('0.0% crit')).not.toBeInTheDocument();
  });

  it('omits the crit chip for a valid zero critical rate', () => {
    renderView(0, 0);

    expect(screen.queryByText(/% crit$/)).not.toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('renders unavailable labels for empty denominators instead of zero percentages', () => {
    renderView(0, 0, true);

    expect(screen.getByText('Damage share unavailable')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Damage share unavailable because total damage is zero'),
    ).toBeInTheDocument();
    expect(screen.queryByText('0.0%')).not.toBeInTheDocument();
    expect(screen.queryByText('0.0% crit')).not.toBeInTheDocument();
    expect(screen.queryByText(/% crit$/)).not.toBeInTheDocument();
  });
});
