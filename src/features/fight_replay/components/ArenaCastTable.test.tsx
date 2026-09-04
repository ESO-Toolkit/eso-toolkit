import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { TimestampPositionLookup } from '../../../workers/calculations/CalculateActorPositions';

import { ArenaCastTable } from './ArenaCastTable';

const lookup = {
  positionsByTimestamp: {
    0: {
      1: { id: 1, name: 'TankPlayer', type: 'player', role: 'tank' },
      2: { id: 2, name: '', type: 'boss' },
    },
  },
  sortedTimestamps: [0],
  actorIds: [1, 2],
  fightDuration: 1000,
  fightStartTime: 0,
  sampleInterval: 4.7,
  hasRegularIntervals: true,
} as unknown as TimestampPositionLookup;

describe('ArenaCastTable', () => {
  it('renders nothing without a lookup', () => {
    const { container } = render(<ArenaCastTable lookup={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists the cast with a follow action per actor', async () => {
    const onFollow = jest.fn();
    render(<ArenaCastTable lookup={lookup} onFollow={onFollow} />);

    expect(screen.getByText('TankPlayer')).toBeInTheDocument();
    // Empty names fall back to a stable label instead of leaking "Actor undefined".
    expect(screen.getByText('Unknown actor 2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Follow TankPlayer' }));
    expect(onFollow).toHaveBeenCalledWith(1);
  });
});
