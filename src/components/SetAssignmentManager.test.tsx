import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { KnownSetIDs } from '../types/abilities';
import { createDefaultTanks, createDefaultHealers, type TankSetup } from '../types/roster';

import { SetAssignmentManager } from './SetAssignmentManager';

/**
 * Regression for the perfected/non-perfected handling: the Quick Assignment
 * "recommended" tiles now curate the PERFECTED Saxhleel variant (id 589), so the
 * tile is labelled "Perfected Saxhleel Champion" — matching the slot-card picker
 * (issue #1254 item 4). A tank may wear EITHER the base (585) or perfected (589)
 * variant; perfected/base-insensitive keying must mark the tile as assigned in
 * both cases.
 */
describe('SetAssignmentManager — perfected set assignment detection', () => {
  const renderWithTank = (set1: KnownSetIDs) => {
    const tanks: TankSetup[] = createDefaultTanks(2);
    tanks[0] = { ...tanks[0], gearSets: { ...tanks[0].gearSets, set1 } };
    const healers = createDefaultHealers(2);
    return render(<SetAssignmentManager tanks={tanks} healers={healers} onAssignSet={jest.fn()} />);
  };

  it('shows the recommended "Perfected Saxhleel Champion" tile as assigned when a tank wears the Perfected variant (589)', async () => {
    const user = userEvent.setup();
    renderWithTank(KnownSetIDs.PERFECTED_SAXHLEEL_CHAMPION);

    // The recommended tile is now labelled with the perfected name.
    const tile = screen.getByText('Perfected Saxhleel Champion');
    await user.hover(tile);

    // Its tooltip must report the tank assignment (proves perfected-insensitive keying).
    expect(await screen.findByText(/Assigned to:.*Tank 1/)).toBeInTheDocument();
  });

  it('shows the recommended tile as assigned when a tank wears the base variant too (585)', async () => {
    const user = userEvent.setup();
    renderWithTank(KnownSetIDs.SAXHLEEL_CHAMPION);

    const tile = screen.getByText('Perfected Saxhleel Champion');
    await user.hover(tile);

    expect(await screen.findByText(/Assigned to:.*Tank 1/)).toBeInTheDocument();
  });
});
