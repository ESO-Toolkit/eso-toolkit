import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { KnownSetIDs } from '../types/abilities';
import { createDefaultTanks, createDefaultHealers, type TankSetup } from '../types/roster';

import { SetAssignmentManager } from './SetAssignmentManager';

/**
 * Regression for the perfected/non-perfected rename: the Quick Assignment
 * "recommended" tiles look up assignment status by the BASE set's display name
 * (e.g. "Saxhleel Champion", id 585), but a tank actually wears the PERFECTED
 * variant (id 589) which now displays "Perfected Saxhleel Champion". Without
 * perfected-insensitive keying the recommended tile would show as unassigned
 * even though a tank is equipped with it.
 */
describe('SetAssignmentManager — perfected set assignment detection', () => {
  const renderWithTank = (set1: KnownSetIDs) => {
    const tanks: TankSetup[] = createDefaultTanks(2);
    tanks[0] = { ...tanks[0], gearSets: { ...tanks[0].gearSets, set1 } };
    const healers = createDefaultHealers(2);
    return render(<SetAssignmentManager tanks={tanks} healers={healers} onAssignSet={jest.fn()} />);
  };

  it('shows the recommended "Saxhleel Champion" tile as assigned when a tank wears the Perfected variant (589)', async () => {
    const user = userEvent.setup();
    renderWithTank(KnownSetIDs.PERFECTED_SAXHLEEL_CHAMPION);

    // The recommended tile is labelled with the base name.
    const tile = screen.getByText('Saxhleel Champion');
    await user.hover(tile);

    // Its tooltip must report the tank assignment (proves perfected-insensitive keying).
    expect(await screen.findByText(/Assigned to:.*Tank 1/)).toBeInTheDocument();
  });

  it('shows the recommended tile as assigned for the base variant too (585)', async () => {
    const user = userEvent.setup();
    renderWithTank(KnownSetIDs.SAXHLEEL_CHAMPION);

    const tile = screen.getByText('Saxhleel Champion');
    await user.hover(tile);

    expect(await screen.findByText(/Assigned to:.*Tank 1/)).toBeInTheDocument();
  });
});
