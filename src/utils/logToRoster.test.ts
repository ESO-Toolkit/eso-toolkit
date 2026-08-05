import { KnownSetIDs } from '../types/abilities';
import { GearSlot, WeaponType } from '../types/playerDetails';
import { createDefaultRoster } from '../types/roster';

import {
  convertLogPlayersToRoster,
  type LogPlayerDetails,
  type LogCombatantInfoEvent,
} from './logToRoster';

/** Build a gear array of `count` identical pieces for a named set. */
const pieces = (setName: string, count: number): Array<{ setName: string }> =>
  Array.from({ length: count }, () => ({ setName }));

const NO_EVENTS: LogCombatantInfoEvent[] = [];

describe('convertLogPlayersToRoster — perfected set IDs', () => {
  /**
   * Regression: categorizeSets used to consolidate pieces under the base name and
   * resolve the set ID from that base name, so a player wearing the Perfected
   * variant was imported as the non-perfected set ID. After the fix the perfected
   * display name is preserved through to findSetIdByName.
   */
  it('preserves Perfected Saxhleel Champion + Perfected Claw of Yolnahkriin as their perfected IDs', () => {
    const details: LogPlayerDetails = {
      tanks: [
        {
          name: 'PerfTank',
          id: 1,
          combatantInfo: {
            gear: [
              ...pieces('Perfected Saxhleel Champion', 5),
              ...pieces('Perfected Claw of Yolnahkriin', 5),
            ],
          },
        },
      ],
    };

    const result = convertLogPlayersToRoster(details, NO_EVENTS, createDefaultRoster());
    const sets = result.tanks[0].gearSets;
    const allIds = [sets.set1, sets.set2, ...(sets.additionalSets ?? [])];

    expect(allIds).toContain(KnownSetIDs.PERFECTED_SAXHLEEL_CHAMPION);
    expect(allIds).toContain(KnownSetIDs.PERFECTED_CLAW_OF_YOLNAHKRIIN);
    // The non-perfected variants must NOT be substituted in.
    expect(allIds).not.toContain(KnownSetIDs.SAXHLEEL_CHAMPION);
    expect(allIds).not.toContain(KnownSetIDs.CLAW_OF_YOLNAHKRIIN);
    // Both perfected 5-piece sets land in the two body slots.
    expect([sets.set1, sets.set2].filter((id) => id !== undefined)).toHaveLength(2);
  });

  it('still imports the non-perfected variant when no perfected piece is worn', () => {
    const details: LogPlayerDetails = {
      tanks: [
        {
          name: 'BaseTank',
          id: 1,
          combatantInfo: { gear: pieces('Saxhleel Champion', 5) },
        },
      ],
    };

    const result = convertLogPlayersToRoster(details, NO_EVENTS, createDefaultRoster());
    const sets = result.tanks[0].gearSets;
    const allIds = [sets.set1, sets.set2, ...(sets.additionalSets ?? [])];

    expect(allIds).toContain(KnownSetIDs.SAXHLEEL_CHAMPION);
    expect(allIds).not.toContain(KnownSetIDs.PERFECTED_SAXHLEEL_CHAMPION);
  });
});

describe('convertLogPlayersToRoster — two-handed weapon set counting', () => {
  /**
   * A two-handed weapon grants two set pieces from one equipped item. A 5-piece
   * set completed via 3 body pieces + a 2H staff (3 + 2 = 5) must land in a
   * primary set slot, not be demoted to additionalSets by a naive 1-per-slot count.
   */
  it('counts a staff as 2 pieces so a staff-completed 5pc set fills a primary slot', () => {
    const details: LogPlayerDetails = {
      tanks: [
        {
          name: 'StaffTank',
          id: 1,
          combatantInfo: {
            gear: [
              ...pieces('Saxhleel Champion', 3),
              {
                setName: 'Saxhleel Champion',
                type: WeaponType.LIGHTNING_STAFF,
                slot: GearSlot.MAIN_HAND,
              },
            ],
          },
        },
      ],
    };

    const result = convertLogPlayersToRoster(details, NO_EVENTS, createDefaultRoster());
    const sets = result.tanks[0].gearSets;

    expect([sets.set1, sets.set2]).toContain(KnownSetIDs.SAXHLEEL_CHAMPION);
  });

  it('does not double-count a one-handed weapon (only 4 pieces stays sub-5)', () => {
    const details: LogPlayerDetails = {
      tanks: [
        {
          name: 'DaggerTank',
          id: 1,
          combatantInfo: {
            gear: [
              ...pieces('Saxhleel Champion', 3),
              {
                setName: 'Saxhleel Champion',
                type: WeaponType.DAGGER,
                slot: GearSlot.MAIN_HAND,
              },
            ],
          },
        },
      ],
    };

    const result = convertLogPlayersToRoster(details, NO_EVENTS, createDefaultRoster());
    const sets = result.tanks[0].gearSets;

    // 3 body + 1 dagger = 4 pieces < 5, so it must NOT occupy a primary 5pc slot.
    expect([sets.set1, sets.set2]).not.toContain(KnownSetIDs.SAXHLEEL_CHAMPION);
  });
});
