import { KnownSetIDs } from '../types/abilities';
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
