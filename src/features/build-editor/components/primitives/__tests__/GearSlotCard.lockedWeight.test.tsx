/**
 * Regression test (Codex round 7, P3): the read-only LOCKED weight badge sits
 * inside the row-level button that opens the gear picker. Clicking the badge must
 * NOT bubble up and open the picker — it's an inert/tooltip-only control, matching
 * the unlocked weight chip which already stops propagation.
 */

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';

import { GearSlotCard } from '../GearSlotCard';
import type { EquipSlotDef } from '../../../data/esoStaticData';

const chestSlot: EquipSlotDef = {
  slot: 2,
  name: 'Chest',
  category: 'apparel',
  slotType: 'chest',
};

const renderCard = (props: Partial<React.ComponentProps<typeof GearSlotCard>> = {}) => {
  const onOpen = jest.fn();
  render(
    <ThemeProvider theme={createTheme()}>
      <GearSlotCard
        slotDef={chestSlot}
        itemId={97232}
        setName="Mother's Sorrow"
        onOpen={onOpen}
        onClear={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
  return { onOpen };
};

describe('GearSlotCard — locked weight badge click', () => {
  it('does not open the picker when the locked weight badge is clicked', () => {
    const { onOpen } = renderCard({ lockedWeight: 'light' });
    const badge = screen.getByLabelText(/Weight: Light \(fixed\)/i);
    fireEvent.click(badge);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('still opens the picker when the row itself is clicked', () => {
    const { onOpen } = renderCard({ lockedWeight: 'light' });
    const row = screen.getByRole('button', { name: /Mother's Sorrow — click to change/i });
    fireEvent.click(row);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not open the picker when the unlocked weight chip is cycled', () => {
    const onWeightChange = jest.fn();
    const { onOpen } = renderCard({ weight: 'heavy', onWeightChange });
    const chip = screen.getByLabelText(/Weight: Heavy — click to cycle/i);
    fireEvent.click(chip);
    expect(onWeightChange).toHaveBeenCalledWith('light');
    expect(onOpen).not.toHaveBeenCalled();
  });
});
