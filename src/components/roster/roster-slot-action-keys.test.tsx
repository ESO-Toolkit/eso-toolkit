import { render, screen } from '@testing-library/react';
import React from 'react';

import { createDefaultDPSSlots, defaultHealerSetup, defaultTankSetup } from '../../types/roster';

jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

jest.mock('./shared/LazyCardContent', () => ({
  LazyCardContent: () => null,
}));

jest.mock('./shared/slot-action-pill', () => ({
  SlotActionPill: ({ label, slotKey }: { label: string; slotKey?: string }) => (
    <span data-testid={`slot-action-${label}`}>{slotKey}</span>
  ),
}));

import { DPSSlotCard } from './DPSSlotCard';
import { HealerCard } from './HealerSlotCard';
import { TankCard } from './TankSlotCard';

describe('roster slot action keys', () => {
  it('uses a zero-based canonical key for a DPS slot', () => {
    render(
      <DPSSlotCard
        slot={createDefaultDPSSlots(3)[2]}
        slotIndex={2}
        availableGroups={[]}
        onSlotChange={jest.fn()}
        onConvertToJail={jest.fn()}
        onConvertToDPS={jest.fn()}
      />,
    );

    expect(screen.getByTestId('slot-action-DPS 3')).toHaveTextContent('dps:2');
  });

  it('uses a zero-based canonical key for a tank slot', () => {
    render(
      <TankCard tankNum={1} tank={defaultTankSetup(1)} availableGroups={[]} onChange={jest.fn()} />,
    );

    expect(screen.getByTestId('slot-action-Tank 1')).toHaveTextContent('tank:0');
  });

  it('uses a zero-based canonical key for a healer slot', () => {
    render(
      <HealerCard
        healerNum={2}
        healer={defaultHealerSetup(2)}
        availableGroups={[]}
        usedBuffs={[]}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('slot-action-Healer 2')).toHaveTextContent('healer:1');
  });
});
