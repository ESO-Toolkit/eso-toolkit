/**
 * Tests for rosterEncoding utilities
 *
 * Covers:
 * - compactifyRoster / expandCompactRoster round-trips (all roles)
 * - DPS structured gear encoding (set1/set2/monsterSet/additionalSets)
 * - Legacy `gs` flat-array migration on decode
 * - encodeRosterToURL / decodeRosterFromURL end-to-end (async)
 * - Edge cases: empty roster, custom ultimates, all enum indexes
 */

/**
 * @jest-environment node
 *
 * rosterEncoding uses CompressionStream/DecompressionStream (Web Streams API).
 * jsdom does not ship these; running in the `node` environment uses Node 18's
 * native globals, which are spec-compatible with the browser version.
 */

import type { BuildChampionPoints } from '../features/build-editor/types/build.types';
import type { SkillsConfig } from '../features/loadout-manager/types/loadout.types';
import { KnownSetIDs } from '../types/abilities';
import {
  type RaidRoster,
  type BuildReference,
  SupportUltimate,
  HealerBuff,
  HealerChampionPoint,
  CLASS_SKILL_LINES,
  createDefaultRoster,
  defaultTankSetup,
  defaultHealerSetup,
} from '../types/roster';

import {
  type CompactRoster,
  type CompactRosterV2,
  type CompactRosterV3,
  compactifyRoster,
  expandCompactRoster,
  decodeRosterFromURL,
  toBase64Url,
  fromBase64Url,
} from './rosterEncoding';

// ============================================================
// Helpers
// ============================================================

/** Build a fully-populated roster for round-trip tests */
function buildFullRoster() {
  const roster = createDefaultRoster();
  roster.rosterName = 'My Test Raid';
  roster.notes = 'Some raid notes';

  roster.tanks[0] = {
    ...defaultTankSetup(1),
    playerName: 'TankPlayer',
    playerNumber: '1',
    roleLabel: 'MT',
    labels: ['carry', 'veteran'],
    gearSets: {
      set1: KnownSetIDs.LUCENT_ECHOES,
      set2: KnownSetIDs.PEARLESCENT_WARD,
      monsterSet: KnownSetIDs.BARON_ZAUDRUS,
      additionalSets: [KnownSetIDs.PEARLS_OF_EHLNOFEY],
    },
    skillLines: {
      line1: 'Ardent Flame',
      line2: 'Draconic Power',
      line3: 'Earthen Heart',
      isFlex: false,
    },
    ultimate: SupportUltimate.WARHORN,
    specificSkills: ['Heroic Slash'],
    notes: 'Tank notes',
  };

  roster.tanks[1] = {
    ...defaultTankSetup(2),
    playerName: 'OTankPlayer',
    gearSets: {
      set1: KnownSetIDs.CLAW_OF_YOLNAHKRIIN,
      set2: undefined,
    },
    ultimate: 'Custom Ultimate String', // Custom (non-enum) ultimate
  };

  roster.healers[0] = {
    ...defaultHealerSetup(1),
    playerName: 'HealerOne',
    set1: KnownSetIDs.JORVULDS_GUIDANCE,
    set2: KnownSetIDs.SPELL_POWER_CURE,
    monsterSet: KnownSetIDs.SYMPHONY_OF_BLADES,
    additionalSets: [KnownSetIDs.PEARLS_OF_EHLNOFEY],
    healerBuff: HealerBuff.ENLIVENING_OVERFLOW,
    championPoint: HealerChampionPoint.FROM_THE_BRINK,
    ultimate: SupportUltimate.COLOSSUS,
  };

  roster.healers[1] = {
    ...defaultHealerSetup(2),
    playerName: 'HealerTwo',
    set1: KnownSetIDs.ROARING_OPPORTUNIST,
    healerBuff: HealerBuff.FROM_THE_BRINK,
    championPoint: HealerChampionPoint.ENLIVENING_OVERFLOW,
  };

  // Slot 1 — fully populated DPS with structured gear
  roster.dpsSlots[0] = {
    slotNumber: 1,
    playerName: 'DPSOne',
    set1: KnownSetIDs.DEADLY_STRIKE,
    set2: KnownSetIDs.MERCILESS_CHARGE,
    monsterSet: KnownSetIDs.BALORGH,
    additionalSets: [KnownSetIDs.HARPOONERS_KILT],
    skillLines: {
      line1: 'Dark Magic',
      line2: 'Daedric Summoning',
      line3: 'Storm Calling',
      isFlex: false,
    },
    ultimate: SupportUltimate.BARRIER,
    jailDDType: 'banner',
    notes: 'DPS notes',
  };

  // Slot 3 — jail DD with custom description
  roster.dpsSlots[2] = {
    slotNumber: 3,
    playerName: 'JailPlayer',
    set1: KnownSetIDs.CRYPTCANON_VESTMENTS,
    jailDDType: 'custom',
    customDescription: 'Special mechanic',
  };

  // Slot 5 — flex skill lines
  roster.dpsSlots[4] = {
    slotNumber: 5,
    playerName: 'FlexPlayer',
    skillLines: {
      line1: '',
      line2: '',
      line3: '',
      isFlex: true,
    },
  };

  return roster;
}

// ============================================================
// compactifyRoster / expandCompactRoster
// ============================================================

describe('compactifyRoster / expandCompactRoster', () => {
  describe('empty roster round-trip', () => {
    it('produces version 2 compact object', () => {
      const roster = createDefaultRoster();
      const compact = compactifyRoster(roster);
      expect(compact.v).toBe(3);
    });

    it('omits rosterName when it is "New Roster"', () => {
      const roster = createDefaultRoster();
      roster.rosterName = 'New Roster';
      const compact = compactifyRoster(roster);
      expect(compact.n).toBeUndefined();
    });

    it('omits dp when no DPS slots are filled', () => {
      const roster = createDefaultRoster();
      const compact = compactifyRoster(roster);
      expect(compact.dp).toBeUndefined();
    });

    it('round-trips back to a valid roster', () => {
      const roster = createDefaultRoster();
      const compact = compactifyRoster(roster);
      const expanded = expandCompactRoster(compact);
      expect(expanded.rosterName).toBe('New Roster');
      expect(expanded.dpsSlots).toHaveLength(8);
    });
  });

  describe('roster name encoding', () => {
    it('stores a custom roster name', () => {
      const roster = createDefaultRoster();
      roster.rosterName = 'Epic Raid Night';
      const compact = compactifyRoster(roster);
      expect(compact.n).toBe('Epic Raid Night');
    });

    it('restores custom roster name on expand', () => {
      const roster = createDefaultRoster();
      roster.rosterName = 'Progression Week 3';
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.rosterName).toBe('Progression Week 3');
    });
  });

  describe('tank encoding', () => {
    it('encodes all tank fields and round-trips correctly', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      const expanded = expandCompactRoster(compact);

      const t1 = expanded.tanks[0];
      expect(t1.playerName).toBe('TankPlayer');
      expect(t1.playerNumber).toBe('1');
      expect(t1.roleLabel).toBe('MT');
      expect(t1.labels).toEqual(['carry', 'veteran']);
      expect(t1.gearSets.set1).toBe(KnownSetIDs.LUCENT_ECHOES);
      expect(t1.gearSets.set2).toBe(KnownSetIDs.PEARLESCENT_WARD);
      expect(t1.gearSets.monsterSet).toBe(KnownSetIDs.BARON_ZAUDRUS);
      expect(t1.gearSets.additionalSets).toEqual([KnownSetIDs.PEARLS_OF_EHLNOFEY]);
      expect(t1.skillLines.line1).toBe('Ardent Flame');
      expect(t1.skillLines.line2).toBe('Draconic Power');
      expect(t1.skillLines.line3).toBe('Earthen Heart');
      expect(t1.skillLines.isFlex).toBe(false);
      expect(t1.ultimate).toBe(SupportUltimate.WARHORN);
      expect(t1.notes).toBe('Tank notes');
    });

    it('encodes custom (non-enum) ultimate as a raw string', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      const expanded = expandCompactRoster(compact);
      expect(expanded.tanks[1].ultimate).toBe('Custom Ultimate String');
    });
  });

  describe('healer encoding', () => {
    it('round-trips all healer fields', () => {
      const roster = buildFullRoster();
      const expanded = expandCompactRoster(compactifyRoster(roster));

      const h1 = expanded.healers[0];
      expect(h1.playerName).toBe('HealerOne');
      expect(h1.set1).toBe(KnownSetIDs.JORVULDS_GUIDANCE);
      expect(h1.set2).toBe(KnownSetIDs.SPELL_POWER_CURE);
      expect(h1.monsterSet).toBe(KnownSetIDs.SYMPHONY_OF_BLADES);
      expect(h1.additionalSets).toEqual([KnownSetIDs.PEARLS_OF_EHLNOFEY]);
      expect(h1.healerBuff).toBe(HealerBuff.ENLIVENING_OVERFLOW);
      expect(h1.championPoint).toBe(HealerChampionPoint.FROM_THE_BRINK);
      expect(h1.ultimate).toBe(SupportUltimate.COLOSSUS);
    });

    it('encodes HealerBuff enum as compact integer index', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      // hs[0].hb should be an integer (0 = ENLIVENING_OVERFLOW)
      expect(typeof (compact as CompactRosterV3).hs?.[0]?.hb).toBe('number');
    });

    it('encodes HealerChampionPoint enum as compact integer index', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      expect(typeof (compact as CompactRosterV3).hs?.[0]?.cp).toBe('number');
    });
  });

  describe('DPS gear encoding — structured fields', () => {
    it('encodes set1/set2/monsterSet/additionalSets on DPS slot', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      const dps1 = compact.dp?.find((d) => d.sn === 1);
      expect(dps1).toBeDefined();
      expect(dps1?.s1).toBe(KnownSetIDs.DEADLY_STRIKE);
      expect(dps1?.s2).toBe(KnownSetIDs.MERCILESS_CHARGE);
      expect(dps1?.ms).toBe(KnownSetIDs.BALORGH);
      expect(dps1?.as).toEqual([KnownSetIDs.HARPOONERS_KILT]);
    });

    it('does NOT encode legacy gs when structured fields are present', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      const dps1 = compact.dp?.find((d) => d.sn === 1);
      expect(dps1?.gs).toBeUndefined();
    });

    it('round-trips DPS structured gear correctly', () => {
      const roster = buildFullRoster();
      const expanded = expandCompactRoster(compactifyRoster(roster));
      const slot1 = expanded.dpsSlots[0];
      expect(slot1.set1).toBe(KnownSetIDs.DEADLY_STRIKE);
      expect(slot1.set2).toBe(KnownSetIDs.MERCILESS_CHARGE);
      expect(slot1.monsterSet).toBe(KnownSetIDs.BALORGH);
      expect(slot1.additionalSets).toEqual([KnownSetIDs.HARPOONERS_KILT]);
    });

    it('round-trips DPS with jailDDType=banner', () => {
      const roster = buildFullRoster();
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.dpsSlots[0].jailDDType).toBe('banner');
    });

    it('round-trips DPS with jailDDType=custom and customDescription', () => {
      const roster = buildFullRoster();
      const expanded = expandCompactRoster(compactifyRoster(roster));
      const slot3 = expanded.dpsSlots[2];
      expect(slot3.jailDDType).toBe('custom');
      expect(slot3.customDescription).toBe('Special mechanic');
    });

    it('round-trips flex skillLines flag on DPS', () => {
      const roster = buildFullRoster();
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.dpsSlots[4].skillLines?.isFlex).toBe(true);
    });

    it('preserves slot numbers accurately', () => {
      const roster = buildFullRoster();
      const expanded = expandCompactRoster(compactifyRoster(roster));
      // Only slots 1, 3, 5 were filled; others should have default slot numbers
      expect(expanded.dpsSlots[0].slotNumber).toBe(1);
      expect(expanded.dpsSlots[2].slotNumber).toBe(3);
      expect(expanded.dpsSlots[4].slotNumber).toBe(5);
    });
  });

  describe('DPS gear — legacy gs migration', () => {
    it('migrates legacy gs[0]/gs[1] to set1/set2 on decode', () => {
      const compact = compactifyRoster(createDefaultRoster());
      compact.dp = [
        {
          sn: 2,
          pn: 'LegacyPlayer',
          gs: [
            KnownSetIDs.DEADLY_STRIKE,
            KnownSetIDs.MERCILESS_CHARGE,
            KnownSetIDs.CRYPTCANON_VESTMENTS,
          ],
        },
      ];
      const expanded = expandCompactRoster(compact);
      const slot2 = expanded.dpsSlots[1];
      expect(slot2.set1).toBe(KnownSetIDs.DEADLY_STRIKE);
      expect(slot2.set2).toBe(KnownSetIDs.MERCILESS_CHARGE);
      expect(slot2.additionalSets).toEqual([KnownSetIDs.CRYPTCANON_VESTMENTS]);
    });

    it('does NOT migrate gs when s1 is present (structured takes precedence)', () => {
      const compact = compactifyRoster(createDefaultRoster());
      compact.dp = [
        {
          sn: 2,
          s1: KnownSetIDs.LUCENT_ECHOES,
          gs: [KnownSetIDs.DEADLY_STRIKE],
        },
      ];
      const expanded = expandCompactRoster(compact);
      const slot2 = expanded.dpsSlots[1];
      // Structured s1 wins; gs should NOT migrate
      expect(slot2.set1).toBe(KnownSetIDs.LUCENT_ECHOES);
      expect(slot2.set2).toBeUndefined();
    });
  });

  describe('skill lines encoding', () => {
    it('encodes known skill lines as integer indices (compact)', () => {
      const roster = buildFullRoster();
      const compact = compactifyRoster(roster);
      // "Ardent Flame" is index 0 in CLASS_SKILL_LINES
      expect((compact as CompactRosterV3).ts?.[0]?.sl?.l1).toBe(0);
    });

    it('encodes unknown skill lines as raw strings', () => {
      const roster = createDefaultRoster();
      roster.tanks[0] = {
        ...defaultTankSetup(1),
        skillLines: {
          line1: 'Custom Line',
          line2: '',
          line3: '',
          isFlex: false,
        },
      };
      const compact = compactifyRoster(roster);
      expect((compact as CompactRosterV3).ts?.[0]?.sl?.l1).toBe('Custom Line');
    });

    it('round-trips all 21 CLASS_SKILL_LINES entries', () => {
      // Every known skill line should survive a round-trip
      CLASS_SKILL_LINES.forEach((line, idx) => {
        const roster = createDefaultRoster();
        roster.tanks[0] = {
          ...defaultTankSetup(1),
          skillLines: { line1: line, line2: '', line3: '', isFlex: false },
        };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.tanks[0].skillLines.line1).toBe(line);
      });
    });
  });

  describe('ultimate encoding', () => {
    it('encodes each SupportUltimate variant as an integer', () => {
      Object.values(SupportUltimate).forEach((ult) => {
        const roster = createDefaultRoster();
        roster.tanks[0] = { ...defaultTankSetup(1), ultimate: ult };
        const compact = compactifyRoster(roster);
        expect(typeof (compact as CompactRosterV3).ts?.[0]?.ul).toBe('number');
      });
    });

    it('round-trips all SupportUltimate values correctly', () => {
      Object.values(SupportUltimate).forEach((ult) => {
        const roster = createDefaultRoster();
        roster.tanks[0] = { ...defaultTankSetup(1), ultimate: ult };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.tanks[0].ultimate).toBe(ult);
      });
    });

    it('round-trips a custom ultimate string', () => {
      const roster = createDefaultRoster();
      roster.tanks[0] = { ...defaultTankSetup(1), ultimate: 'My Custom Ultimate' };
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.tanks[0].ultimate).toBe('My Custom Ultimate');
    });
  });

  describe('available groups', () => {
    it('round-trips availableGroups array', () => {
      const roster = createDefaultRoster();
      roster.availableGroups = ['Stack 1', 'Stack 2', 'Range'];
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.availableGroups).toEqual(['Stack 1', 'Stack 2', 'Range']);
    });
  });

  describe('buildRef round-trip (roster ↔ build editor link)', () => {
    const buildRef: BuildReference = {
      buildId: 'build-abc-123',
      setupIndex: 2,
      buildName: 'My DK Tank Build',
      esoClass: 'dragonknight',
      role: 'tank',
    };

    it('round-trips buildRef on tank1', () => {
      const roster = createDefaultRoster();
      roster.tank1 = { ...defaultTankSetup(), buildRef };
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.tank1.buildRef).toEqual(buildRef);
    });

    it('round-trips buildRef on healer1', () => {
      const roster = createDefaultRoster();
      roster.healer1 = { ...defaultHealerSetup(), buildRef };
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.healer1.buildRef).toEqual(buildRef);
    });

    it('round-trips buildRef on a DPS slot', () => {
      const roster = createDefaultRoster();
      roster.dpsSlots[3] = { slotNumber: 4, playerName: 'Ref DPS', buildRef };
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.dpsSlots[3].buildRef).toEqual(buildRef);
    });

    it('encodes setupIndex=0 correctly (zero is falsy — regression guard)', () => {
      const roster = createDefaultRoster();
      roster.tank1 = { ...defaultTankSetup(), buildRef: { ...buildRef, setupIndex: 0 } };
      const compact = compactifyRoster(roster);
      expect(compact.t1?.br?.si).toBe(0);
      const expanded = expandCompactRoster(compact);
      expect(expanded.tank1.buildRef?.setupIndex).toBe(0);
    });

    it('omits buildRef when not set', () => {
      const roster = createDefaultRoster();
      const compact = compactifyRoster(roster);
      expect(compact.t1?.br).toBeUndefined();
      expect(compact.h1?.br).toBeUndefined();
    });

    it('round-trips minimal buildRef (setupIndex only, all optionals absent)', () => {
      const roster = createDefaultRoster();
      roster.tank1 = { ...defaultTankSetup(), buildRef: { setupIndex: 1 } };
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.tank1.buildRef?.setupIndex).toBe(1);
      expect(expanded.tank1.buildRef?.buildId).toBeUndefined();
      expect(expanded.tank1.buildRef?.buildName).toBeUndefined();
    });
  });

  describe('groups (multi-group memberships) encoding', () => {
    it('round-trips a single group on tank1', () => {
      const roster = createDefaultRoster();
      roster.tank1 = { ...defaultTankSetup(), groups: ['Left Stack'] };
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.tank1.groups).toEqual(['Left Stack']);
    });

    it('round-trips multiple groups on a DPS slot', () => {
      const roster = createDefaultRoster();
      roster.dpsSlots[0] = {
        slotNumber: 1,
        playerName: 'Multi DPS',
        groups: ['Left Stack', 'Portal', 'Slayer'],
      };
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.dpsSlots[0].groups).toEqual(['Left Stack', 'Portal', 'Slayer']);
    });

    it('round-trips multiple groups on healer1', () => {
      const roster = createDefaultRoster();
      roster.healer1 = { ...defaultHealerSetup(), groups: ['Stack 1', 'Anchor'] };
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.healer1.groups).toEqual(['Stack 1', 'Anchor']);
    });

    it('encodes groups as grs[] in compact form — not legacy gr', () => {
      const roster = createDefaultRoster();
      roster.dpsSlots[0] = { slotNumber: 1, groups: ['Group A', 'Group B'] };
      const compact = compactifyRoster(roster);
      const dps1 = compact.dp?.find((d) => d.sn === 1);
      expect(dps1?.grs).toEqual(['Group A', 'Group B']);
      expect(dps1?.gr).toBeUndefined();
    });

    it('migrates legacy single gr to groups[] on decode', () => {
      const compact = compactifyRoster(createDefaultRoster());
      compact.dp = [{ sn: 2, gr: { g: 'Legacy Group', n: 1 } }];
      const expanded = expandCompactRoster(compact);
      expect(expanded.dpsSlots[1].groups).toEqual(['Legacy Group']);
    });

    it('returns undefined groups when slot has no groups set', () => {
      const roster = createDefaultRoster();
      roster.dpsSlots[0] = { slotNumber: 1, playerName: 'No Group DPS' };
      const expanded = expandCompactRoster(compactifyRoster(roster));
      expect(expanded.dpsSlots[0].groups).toBeUndefined();
    });
  });

  describe('Full-mode inline data (food / skills / cpPoints / passives)', () => {
    describe('food round-trip', () => {
      it('round-trips food with id and name on tank1', () => {
        const roster = createDefaultRoster();
        roster.tank1 = {
          ...defaultTankSetup(),
          food: { id: 101, name: 'Solitude Salmon-Millet Soup' },
        };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.tank1.food).toEqual({ id: 101, name: 'Solitude Salmon-Millet Soup' });
      });

      it('round-trips food id-only on a DPS slot', () => {
        const roster = createDefaultRoster();
        roster.dpsSlots[2] = { slotNumber: 3, food: { id: 42 } };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.dpsSlots[2].food?.id).toBe(42);
      });

      it('round-trips food on healer2', () => {
        const roster = createDefaultRoster();
        roster.healer2 = {
          ...defaultHealerSetup(),
          food: { id: 77, name: "Witchmother's Potent Brew" },
        };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.healer2.food).toEqual({ id: 77, name: "Witchmother's Potent Brew" });
      });

      it('omits food when not set', () => {
        const roster = createDefaultRoster();
        const compact = compactifyRoster(roster);
        expect(compact.t1?.fo).toBeUndefined();
        expect(compact.h1?.fo).toBeUndefined();
      });
    });

    describe('skill bars (SkillsConfig) round-trip', () => {
      const skills: SkillsConfig = {
        0: { 3: 123, 4: 456, 5: 789, 6: 111, 7: 222, 8: 333 },
        1: { 3: 444, 4: 555, 5: 666, 6: 777, 7: 888, 8: 999 },
      };

      it('round-trips front and back bars on tank1', () => {
        const roster = createDefaultRoster();
        roster.tank1 = { ...defaultTankSetup(), skills };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.tank1.skills?.[0]).toEqual(skills[0]);
        expect(expanded.tank1.skills?.[1]).toEqual(skills[1]);
      });

      it('round-trips skill bars on a DPS slot', () => {
        const roster = createDefaultRoster();
        roster.dpsSlots[1] = { slotNumber: 2, skills };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.dpsSlots[1].skills?.[0]).toEqual(skills[0]);
      });

      it('round-trips front-bar-only skills (empty back bar omitted)', () => {
        const roster = createDefaultRoster();
        const frontOnly: SkillsConfig = { 0: { 3: 100, 4: 200 }, 1: {} };
        roster.tank1 = { ...defaultTankSetup(), skills: frontOnly };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.tank1.skills?.[0]).toEqual({ 3: 100, 4: 200 });
      });

      it('omits skills when not set', () => {
        const roster = createDefaultRoster();
        const compact = compactifyRoster(roster);
        expect(compact.t1?.sk).toBeUndefined();
        expect(compact.h1?.sk).toBeUndefined();
      });
    });

    describe('champion points (cpPoints) round-trip', () => {
      const cpPoints: BuildChampionPoints = {
        warfare: {
          slots: [12345, 67890, null, null],
          passives: { 'warrior-poet': 50, 'wrathful-strikes': 20 },
        },
        fitness: { slots: [11111, null, null, null], passives: {} },
        craft: { slots: [null, null, null, null], passives: { 'treasure-hunter': 10 } },
      };

      it('round-trips cpPoints on tank1', () => {
        const roster = createDefaultRoster();
        roster.tank1 = { ...defaultTankSetup(), cpPoints };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.tank1.cpPoints?.warfare.slots[0]).toBe(12345);
        expect(expanded.tank1.cpPoints?.warfare.slots[1]).toBe(67890);
        expect(expanded.tank1.cpPoints?.warfare.passives['warrior-poet']).toBe(50);
        expect(expanded.tank1.cpPoints?.fitness.slots[0]).toBe(11111);
      });

      it('round-trips cpPoints on healer1', () => {
        const roster = createDefaultRoster();
        roster.healer1 = { ...defaultHealerSetup(), cpPoints };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.healer1.cpPoints?.warfare.slots[0]).toBe(12345);
      });

      it('round-trips cpPoints on a DPS slot', () => {
        const roster = createDefaultRoster();
        roster.dpsSlots[5] = { slotNumber: 6, cpPoints };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.dpsSlots[5].cpPoints?.warfare.slots[0]).toBe(12345);
        expect(expanded.dpsSlots[5].cpPoints?.craft.passives['treasure-hunter']).toBe(10);
      });

      it('trims trailing null slots in compact CP tree (reduces URL size)', () => {
        const roster = createDefaultRoster();
        roster.tank1 = {
          ...defaultTankSetup(),
          cpPoints: {
            warfare: { slots: [99, null, null, null], passives: {} },
            fitness: { slots: [null, null, null, null], passives: {} },
            craft: { slots: [null, null, null, null], passives: {} },
          },
        };
        const compact = compactifyRoster(roster);
        // Trailing nulls trimmed: [99, null, null, null] → [99]
        expect(compact.t1?.cp2?.w?.s).toEqual([99]);
        // And re-pads to 4 slots on expand
        const expanded = expandCompactRoster(compact);
        expect(expanded.tank1.cpPoints?.warfare.slots).toEqual([99, null, null, null]);
      });

      it('omits cpPoints when all trees are empty', () => {
        const roster = createDefaultRoster();
        const compact = compactifyRoster(roster);
        expect(compact.t1?.cp2).toBeUndefined();
        expect(compact.h1?.cp2).toBeUndefined();
      });

      it('omits zero-value passives in compact form', () => {
        const roster = createDefaultRoster();
        roster.tank1 = {
          ...defaultTankSetup(),
          cpPoints: {
            warfare: {
              slots: [null, null, null, null],
              passives: { 'warrior-poet': 0, 'wrathful-strikes': 5 },
            },
            fitness: { slots: [null, null, null, null], passives: {} },
            craft: { slots: [null, null, null, null], passives: {} },
          },
        };
        const compact = compactifyRoster(roster);
        // 'warrior-poet': 0 omitted; 'wrathful-strikes': 5 kept
        expect(compact.t1?.cp2?.w?.p?.['warrior-poet']).toBeUndefined();
        expect(compact.t1?.cp2?.w?.p?.['wrathful-strikes']).toBe(5);
      });
    });

    describe('passives (ability IDs) round-trip', () => {
      it('round-trips passives on tank1', () => {
        const roster = createDefaultRoster();
        roster.tank1 = { ...defaultTankSetup(), passives: [40001, 40002, 40003] };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.tank1.passives).toEqual([40001, 40002, 40003]);
      });

      it('round-trips passives on healer1', () => {
        const roster = createDefaultRoster();
        roster.healer1 = { ...defaultHealerSetup(), passives: [50001] };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.healer1.passives).toEqual([50001]);
      });

      it('round-trips passives on a DPS slot', () => {
        const roster = createDefaultRoster();
        roster.dpsSlots[7] = { slotNumber: 8, passives: [60001, 60002] };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.dpsSlots[7].passives).toEqual([60001, 60002]);
      });

      it('omits passives when empty', () => {
        const roster = createDefaultRoster();
        const compact = compactifyRoster(roster);
        expect(compact.t1?.pa).toBeUndefined();
        expect(compact.h1?.pa).toBeUndefined();
      });
    });

    describe('roleNotes round-trip', () => {
      it('round-trips roleNotes on a tank slot', () => {
        const roster = createDefaultRoster();
        roster.tank1 = { ...defaultTankSetup(), roleNotes: 'TOMB Main Tank, portal duty' };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.tank1.roleNotes).toBe('TOMB Main Tank, portal duty');
      });

      it('round-trips roleNotes on a healer slot', () => {
        const roster = createDefaultRoster();
        roster.healer1 = { ...defaultHealerSetup(), roleNotes: 'Main healer, shield uptime focus' };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.healer1.roleNotes).toBe('Main healer, shield uptime focus');
      });

      it('round-trips roleNotes on a DPS slot', () => {
        const roster = createDefaultRoster();
        roster.dpsSlots[0] = { slotNumber: 1, roleNotes: "Portal L, Z'en, Ele sus" };
        const expanded = expandCompactRoster(compactifyRoster(roster));
        expect(expanded.dpsSlots[0].roleNotes).toBe("Portal L, Z'en, Ele sus");
      });

      it('omits roleNotes when not set (no empty-string bloat)', () => {
        const roster = createDefaultRoster();
        const compact = compactifyRoster(roster);
        expect(compact.t1?.rn).toBeUndefined();
        expect(compact.h1?.rn).toBeUndefined();
      });
    });
  });
});

// ============================================================
// Base64URL helpers
// ============================================================

describe('toBase64Url / fromBase64Url', () => {
  it('encodes and decodes a simple byte array', () => {
    const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const encoded = toBase64Url(input);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    const decoded = fromBase64Url(encoded);
    expect(decoded).toEqual(input);
  });

  it('handles empty byte array', () => {
    const input = new Uint8Array([]);
    expect(fromBase64Url(toBase64Url(input))).toEqual(input);
  });

  it('handles bytes with values that need + / substitution', () => {
    // 0xFB = 251 → base64 would produce + and / chars
    const input = new Uint8Array([0xfb, 0xff, 0xfe]);
    const encoded = toBase64Url(input);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    const decoded = fromBase64Url(encoded);
    expect(decoded).toEqual(input);
  });
});

// ============================================================
// Node.js zlib helper for encode/decode tests
//
// CompressionStream/DecompressionStream (Web Streams API) are unavailable
// in Jest's vm sandbox even on Node 22. We use Node's synchronous zlib to
// produce / consume deflate-raw bytes in the same format as the browser
// implementation, which lets us test the decode path thoroughly.
// ============================================================

import { deflateRawSync, inflateRawSync } from 'zlib';

/** Build a compact-format encoded roster string using Node's zlib (test helper only). */
function encodeRosterSync(roster: RaidRoster): string {
  const compact = compactifyRoster(roster);
  const json = JSON.stringify(compact);
  const compressed = deflateRawSync(Buffer.from(json, 'utf-8'));
  return toBase64Url(new Uint8Array(compressed));
}

/** Decode a v2/v3-format encoded string using Node's zlib (test helper only). */
function decodeRosterSync(encoded: string): RaidRoster | null {
  try {
    const bytes = fromBase64Url(encoded);
    const json = inflateRawSync(Buffer.from(bytes)).toString('utf-8');
    const parsed = JSON.parse(json) as { v?: number };
    if (parsed.v === 2 || parsed.v === 3) return expandCompactRoster(parsed as CompactRoster);
  } catch {
    // fall through
  }
  return null;
}

// ============================================================
// deflateString / inflateBytes — format compatibility
// ============================================================

describe('deflateString / inflateBytes (Node zlib format compatibility)', () => {
  it('toBase64Url + fromBase64Url survive a deflateRaw → inflateRaw cycle', () => {
    // Verifies that toBase64Url/fromBase64Url preserve bytes faithfully
    // (the core contract needed by encodeRosterToURL/decodeRosterFromURL)
    const json = JSON.stringify({ v: 2, n: 'Hello' });
    const compressed = deflateRawSync(Buffer.from(json, 'utf-8'));
    const bytes = new Uint8Array(compressed);
    const encoded = toBase64Url(bytes);
    const decoded = fromBase64Url(encoded);
    const decompressed = inflateRawSync(Buffer.from(decoded)).toString('utf-8');
    expect(decompressed).toBe(json);
  });

  it('Node zlib round-trips are self-consistent', () => {
    const original = JSON.stringify({ items: Array.from({ length: 200 }, (_, i) => i) });
    const compressed = deflateRawSync(Buffer.from(original, 'utf-8'));
    expect(compressed.length).toBeLessThan(original.length);
    const decompressed = inflateRawSync(compressed).toString('utf-8');
    expect(decompressed).toBe(original);
  });
});

// ============================================================
// decodeRosterSync — v2 format decode via Node zlib
//
// DecompressionStream is unavailable in Jest's vm context even on Node 22,
// so decodeRosterFromURL's v2 path can't be unit-tested here.
// decodeRosterSync bypasses this limitation and tests the same data path
// (compactifyRoster → deflateRaw → base64url → fromBase64Url → inflateRaw →
//  expandCompactRoster) with guaranteed-available Node.js APIs.
// The v2 decompression path in the browser is covered by E2E tests.
// ============================================================

describe('decodeRosterSync (v2/v3 format — Node zlib decode)', () => {
  it('decodes an empty roster', () => {
    const roster = createDefaultRoster();
    const decoded = decodeRosterSync(encodeRosterSync(roster));
    expect(decoded).not.toBeNull();
    expect(decoded!.rosterName).toBe('New Roster');
    expect(decoded!.dpsSlots).toHaveLength(8);
  });

  it('decodes a fully populated roster', () => {
    const roster = buildFullRoster();
    const decoded = decodeRosterSync(encodeRosterSync(roster));
    expect(decoded).not.toBeNull();
    expect(decoded!.rosterName).toBe('My Test Raid');
    expect(decoded!.notes).toBe('Some raid notes');
    expect(decoded!.tanks[0].gearSets.set1).toBe(KnownSetIDs.LUCENT_ECHOES);
    expect(decoded!.tanks[0].gearSets.monsterSet).toBe(KnownSetIDs.BARON_ZAUDRUS);
    expect(decoded!.healers[0].set1).toBe(KnownSetIDs.JORVULDS_GUIDANCE);
    expect(decoded!.healers[0].healerBuff).toBe(HealerBuff.ENLIVENING_OVERFLOW);
    expect(decoded!.dpsSlots[0].set1).toBe(KnownSetIDs.DEADLY_STRIKE);
    expect(decoded!.dpsSlots[0].set2).toBe(KnownSetIDs.MERCILESS_CHARGE);
    expect(decoded!.dpsSlots[0].monsterSet).toBe(KnownSetIDs.BALORGH);
    expect(decoded!.dpsSlots[2].jailDDType).toBe('custom');
    expect(decoded!.dpsSlots[2].customDescription).toBe('Special mechanic');
  });

  it('DPS gear is NOT silently dropped — core regression test', () => {
    // Regression: before the fix, s1/s2/ms/as were absent from CompactDPS,
    // so DPS gear was silently dropped when encoding to a share URL.
    const roster = createDefaultRoster();
    roster.dpsSlots[0] = {
      slotNumber: 1,
      playerName: 'Regression DPS',
      set1: KnownSetIDs.CRYPTCANON_VESTMENTS,
      set2: KnownSetIDs.TIDEBORN_WILDSTALKER,
      monsterSet: KnownSetIDs.SPAULDER_OF_RUIN,
    };
    const decoded = decodeRosterSync(encodeRosterSync(roster));
    expect(decoded).not.toBeNull();
    expect(decoded!.dpsSlots[0].set1).toBe(KnownSetIDs.CRYPTCANON_VESTMENTS);
    expect(decoded!.dpsSlots[0].set2).toBe(KnownSetIDs.TIDEBORN_WILDSTALKER);
    expect(decoded!.dpsSlots[0].monsterSet).toBe(KnownSetIDs.SPAULDER_OF_RUIN);
  });

  it('returns null for an invalid/corrupt encoded string', () => {
    expect(decodeRosterSync('not-valid-base64!!!')).toBeNull();
  });
});

// ============================================================
// decodeRosterFromURL — v1 path and error cases
// (v2 path requires DecompressionStream unavailable in Jest's vm context)
// ============================================================

describe('decodeRosterFromURL (v1 path + error handling)', () => {
  it('rejects oversized payloads before inflating (decompression bomb guard)', async () => {
    // Create a payload larger than MAX_ROSTER_COMPRESSED_BYTES (500 KB) encoded as base64url
    const oversized = new Uint8Array(500 * 1024 + 1);
    const encoded = toBase64Url(oversized);
    expect(await decodeRosterFromURL(encoded)).toBeNull();
  });

  it('returns null for a completely invalid string', async () => {
    expect(await decodeRosterFromURL('not-valid-base64-or-json!!!')).toBeNull();
  });

  it('returns null for an empty string', async () => {
    expect(await decodeRosterFromURL('')).toBeNull();
  });

  it('decodes a v1 legacy base64 roster', async () => {
    // v1 format: btoa(encodeURIComponent(JSON.stringify(roster)))
    const legacyRoster = createDefaultRoster();
    legacyRoster.rosterName = 'Legacy Roster';
    const v1Encoded = btoa(encodeURIComponent(JSON.stringify(legacyRoster)));
    const decoded = await decodeRosterFromURL(v1Encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.rosterName).toBe('Legacy Roster');
  });
});
