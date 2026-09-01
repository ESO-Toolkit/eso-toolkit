/**
 * Tests that resizeRoster prunes orphaned per-fight slot overrides across EVERY
 * trial in the multi-trial map — not just one — when the composition shrinks.
 */

import { createDefaultRoster } from '../types/roster';
import type { RaidRoster } from '../types/roster';
import type { TrialBuildOverrides } from '../types/trial-encounters';

import { resizeRoster, wouldLoseData } from './rosterResize';

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

describe('wouldLoseData', () => {
  const shrinkLastDps = { tanks: 3, healers: 2, dps: 7 };

  it('does not report empty default slots as meaningful data', () => {
    const roster = createDefaultRoster();

    expect(wouldLoseData(roster, shrinkLastDps)).toEqual({
      tanks: false,
      healers: false,
      dps: false,
    });
  });

  it('detects meaningful fields beyond player name and primary sets', () => {
    const roster = createDefaultRoster();
    roster.dpsSlots[7] = {
      ...roster.dpsSlots[7],
      notes: 'Keep a ranged interrupt available',
    };

    expect(wouldLoseData(roster, shrinkLastDps).dps).toBe(true);
  });

  it('detects meaningful per-fight overrides on an otherwise empty removed slot', () => {
    const roster = createDefaultRoster();
    roster.trialOverrides = {
      rockgrove: {
        trialId: 'rockgrove',
        useSameBuildForAll: false,
        encounterBuilds: {
          boss_1: {
            slots: {
              'dps:7': { set1: 42 },
            },
          },
        },
      },
    };

    expect(wouldLoseData(roster, shrinkLastDps).dps).toBe(true);
  });

  it('detects an orphaned override that resize would prune', () => {
    const roster = createDefaultRoster();
    roster.dpsSlots = roster.dpsSlots.slice(0, 7);
    roster.trialOverrides = {
      rockgrove: {
        trialId: 'rockgrove',
        useSameBuildForAll: false,
        encounterBuilds: {
          boss_1: {
            slots: {
              'dps:7': { set1: 42 },
            },
          },
        },
      },
    };

    expect(wouldLoseData(roster, shrinkLastDps).dps).toBe(true);
  });
});
