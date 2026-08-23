import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';

import { GearUpgradeCalculator } from '../GearUpgradeCalculator';

const renderCalc = (): ReturnType<typeof render> =>
  render(
    <ThemeProvider theme={createTheme()}>
      <GearUpgradeCalculator />
    </ThemeProvider>,
  );

describe('GearUpgradeCalculator', () => {
  it('leads with the single best next upgrade', () => {
    renderCalc();
    expect(screen.getByText('Gear Upgrade Optimizer')).toBeInTheDocument();
    expect(screen.getByText('Your best next upgrade')).toBeInTheDocument();
    // The hero (and the top list row) show a positive percentage.
    expect(screen.getAllByText(/^\+\d+\.\d{2}%$/).length).toBeGreaterThan(0);
  });

  it('renders a ranked priority list with magnitude values', () => {
    renderCalc();
    const list = screen.getByText('Upgrade priority').closest('div')?.parentElement;
    expect(list).toBeTruthy();
    // Several rows render a "+x.xx%" gain or an "at cap" marker.
    const gains = screen.getAllByText(/(^\+\d+\.\d{2}%$|^at cap$)/);
    expect(gains.length).toBeGreaterThan(3);
  });

  it('filters the list by category', () => {
    renderCalc();
    const before = screen.getAllByText(/(^\+\d+\.\d{2}%$|^at cap$)/).length;
    fireEvent.click(screen.getByRole('button', { name: 'Quality' }));
    const after = screen.getAllByText(/(^\+\d+\.\d{2}%$|^at cap$)/).length;
    // Filtering to a single category shows fewer rows than "All".
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  it('applies a preset and recomputes without throwing', () => {
    renderCalc();
    fireEvent.click(screen.getByRole('button', { name: 'New character' }));
    expect(screen.getAllByText(/(^\+\d+\.\d{2}%$|^at cap$)/).length).toBeGreaterThan(0);
  });

  it('shows the qualitative front-bar weapon-trait guide', () => {
    renderCalc();
    expect(screen.getByText('Front-bar weapon traits')).toBeInTheDocument();
    expect(screen.getByText('Charged / Charged')).toBeInTheDocument();
  });

  it('updates when a stat changes', () => {
    renderCalc();
    const wsd = screen.getByLabelText(/Weapon\/Spell Dmg/i);
    fireEvent.change(wsd, { target: { value: '3000' } });
    expect(screen.getAllByText(/(^\+\d+\.\d{2}%$|^at cap$)/).length).toBeGreaterThan(0);
  });
});
