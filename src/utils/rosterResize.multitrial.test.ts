/**
 * Tests that resizeRoster prunes orphaned per-fight slot overrides across EVERY
 * trial in the multi-trial map — not just one — when the composition shrinks.
 */

import { createDefaultRoster } from '../types/roster';
import type { RaidRoster } from '../types/roster';
import type { TrialBuildOverrides } from '../types/trial-encounters';

import { resizeRoster } from './rosterResize';

function trialWithDpsSlots(trialId: string): TrialBuildOverrides {
  return {
    trialId,
    useSameBuildForAll: false,
    encounterBuilds: {
      boss_1: {
        slots: {
          'tank:0': { set1: 1 },
          'dps:0': { set1: 2 },
          'dps:7': { set1: 3 }, // will be orphaned when dps shrinks below 8
        },
      },
    },
  };
}

describe('resizeRoster — multi-trial override pruning', () => {
  it('prunes orphaned slot keys in ALL trials when the roster shrinks', () => {
    const roster: RaidRoster = createDefaultRoster();
    roster.trials = ['rockgrove', 'kynes_aegis'];
    roster.trialOverrides = {
      rockgrove: trialWithDpsSlots('rockgrove'),
      kynes_aegis: trialWithDpsSlots('kynes_aegis'),
    };

    // Shrink DPS from 8 to 4 → dps:7 no longer exists.
    const resized = resizeRoster(roster, { tanks: 2, healers: 2, dps: 4 });

    for (const trialId of ['rockgrove', 'kynes_aegis']) {
      const slots = resized.trialOverrides?.[trialId]?.encounterBuilds.boss_1?.slots ?? {};
      expect(slots['dps:7']).toBeUndefined(); // orphaned, pruned
      expect(slots['dps:0']).toBeDefined(); // still valid
      expect(slots['tank:0']).toBeDefined(); // still valid
    }
  });

  it('keeps every trial in the map (does not drop unrelated trials)', () => {
    const roster: RaidRoster = createDefaultRoster();
    roster.trialOverrides = {
      rockgrove: trialWithDpsSlots('rockgrove'),
      kynes_aegis: trialWithDpsSlots('kynes_aegis'),
      sunspire: trialWithDpsSlots('sunspire'),
    };
    const resized = resizeRoster(roster, { tanks: 2, healers: 2, dps: 6 });
    expect(Object.keys(resized.trialOverrides ?? {}).sort()).toEqual([
      'kynes_aegis',
      'rockgrove',
      'sunspire',
    ]);
  });
});
