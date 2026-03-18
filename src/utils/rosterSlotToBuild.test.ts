/**
 * Tests for rosterSlotToBuild utilities
 *
 * Covers:
 * - dpsSlotToBuild / tankSlotToBuild / healerSlotToBuild
 * - Naming (playerName vs fallback)
 * - Role assignment
 * - Class inference from skill line labels
 * - shortDescription gear set encoding
 * - Inline data mapping (skills / cpPoints / food / passives)
 * - Build metadata (visibility, gameMode, unique IDs)
 */

import type { BuildChampionPoints } from '../features/build-editor/types/build.types';
import type { SkillsConfig } from '../features/loadout-manager/types/loadout.types';
import { KnownSetIDs } from '../types/abilities';
import { defaultTankSetup, defaultHealerSetup } from '../types/roster';
import type { DPSSlot, TankSetup, HealerSetup } from '../types/roster';

import { dpsSlotToBuild, tankSlotToBuild, healerSlotToBuild } from './rosterSlotToBuild';

// ─── helpers ─────────────────────────────────────────────────────────────────

const makeEmptyCP = (): BuildChampionPoints => ({
  warfare: { slots: [null, null, null, null], passives: {} },
  fitness: { slots: [null, null, null, null], passives: {} },
  craft: { slots: [null, null, null, null], passives: {} },
});

// ============================================================
// dpsSlotToBuild
// ============================================================

describe('dpsSlotToBuild', () => {
  describe('naming', () => {
    it('uses playerName when present', () => {
      const slot: DPSSlot = { slotNumber: 3, playerName: 'Alice' };
      expect(dpsSlotToBuild(slot).name).toBe("Alice's Build");
    });

    it('falls back to slot number when no playerName', () => {
      const slot: DPSSlot = { slotNumber: 5 };
      expect(dpsSlotToBuild(slot).name).toBe('DPS 5 Build');
    });
  });

  describe('role and class', () => {
    it('sets role to hybrid-dps', () => {
      expect(dpsSlotToBuild({ slotNumber: 1 }).role).toBe('hybrid-dps');
    });

    it('infers sorcerer from sorcerer skill lines', () => {
      const slot: DPSSlot = {
        slotNumber: 1,
        skillLines: {
          line1: 'Dark Magic',
          line2: 'Daedric Summoning',
          line3: 'Storm Calling',
          isFlex: false,
        },
      };
      expect(dpsSlotToBuild(slot).esoClass).toBe('sorcerer');
    });

    it('infers nightblade from nightblade skill lines', () => {
      const slot: DPSSlot = {
        slotNumber: 1,
        skillLines: {
          line1: 'Assassination',
          line2: 'Shadow',
          line3: 'Siphoning',
          isFlex: false,
        },
      };
      expect(dpsSlotToBuild(slot).esoClass).toBe('nightblade');
    });

    it('falls back to any-class when no skill lines', () => {
      expect(dpsSlotToBuild({ slotNumber: 1 }).esoClass).toBe('any-class');
    });

    it('falls back to any-class when skill lines are empty strings', () => {
      const slot: DPSSlot = {
        slotNumber: 1,
        skillLines: { line1: '', line2: '', line3: '', isFlex: false },
      };
      expect(dpsSlotToBuild(slot).esoClass).toBe('any-class');
    });
  });

  describe('shortDescription gear encoding', () => {
    it('includes 5pc set display names', () => {
      const slot: DPSSlot = {
        slotNumber: 1,
        set1: KnownSetIDs.WAY_OF_MARTIAL_KNOWLEDGE,
        set2: KnownSetIDs.POWERFUL_ASSAULT,
      };
      const desc = dpsSlotToBuild(slot).shortDescription;
      expect(desc).toContain('Martial Knowledge');
      expect(desc).toContain('Powerful Assault');
    });

    it('labels monster set as Monster/Mythic', () => {
      const slot: DPSSlot = { slotNumber: 1, monsterSet: KnownSetIDs.ROAR_OF_ALKOSH };
      const desc = dpsSlotToBuild(slot).shortDescription;
      expect(desc).toContain('Monster/Mythic');
      expect(desc).toContain('Alkosh');
    });

    it('includes ultimate when set', () => {
      const slot: DPSSlot = { slotNumber: 1, ultimate: 'Aggressive Warhorn' };
      expect(dpsSlotToBuild(slot).shortDescription).toContain('Aggressive Warhorn');
    });

    it('includes champion point when set', () => {
      const slot: DPSSlot = { slotNumber: 1, championPoint: 'Thaumaturge' };
      expect(dpsSlotToBuild(slot).shortDescription).toContain('Thaumaturge');
    });

    it('is empty string when no gear info provided', () => {
      expect(dpsSlotToBuild({ slotNumber: 1 }).shortDescription).toBe('');
    });
  });

  describe('inline data mapping', () => {
    it('transfers skills, cpPoints, food, and passives to the first setup', () => {
      const skills: SkillsConfig = { 0: { 0: 10, 1: 20 }, 1: { 0: 30 } };
      const cpPoints: BuildChampionPoints = {
        ...makeEmptyCP(),
        warfare: { slots: [1, null, null, null], passives: { health: 2 } },
      };
      const slot: DPSSlot = {
        slotNumber: 1,
        skills,
        cpPoints,
        food: { id: 33, name: 'Dubious Camoran Throne' },
        passives: [101, 202],
      };
      const setup = dpsSlotToBuild(slot).setups[0];
      expect(setup.skills).toBe(skills);
      expect(setup.cp).toBe(cpPoints);
      expect(setup.consumables.food).toEqual({ id: 33, name: 'Dubious Camoran Throne' });
      expect(setup.passives).toEqual([101, 202]);
    });

    it('produces empty defaults when inline data is absent', () => {
      const setup = dpsSlotToBuild({ slotNumber: 1 }).setups[0];
      expect(setup.skills).toEqual({ 0: {}, 1: {} });
      expect(setup.cp).toEqual(makeEmptyCP());
      expect(setup.passives).toEqual([]);
    });
  });

  describe('build metadata', () => {
    it('generates unique IDs on each call', () => {
      const slot: DPSSlot = { slotNumber: 1 };
      expect(dpsSlotToBuild(slot).id).not.toBe(dpsSlotToBuild(slot).id);
    });

    it('sets visibility to private', () => {
      expect(dpsSlotToBuild({ slotNumber: 1 }).settings.visibility).toBe('private');
    });

    it('sets gameMode to pve', () => {
      expect(dpsSlotToBuild({ slotNumber: 1 }).gameMode).toBe('pve');
    });

    it('has exactly one setup', () => {
      expect(dpsSlotToBuild({ slotNumber: 1 }).setups).toHaveLength(1);
    });
  });
});

// ============================================================
// tankSlotToBuild
// ============================================================

describe('tankSlotToBuild', () => {
  describe('naming', () => {
    it('uses playerName when present', () => {
      const tank: TankSetup = { ...defaultTankSetup(), playerName: 'Bob' };
      expect(tankSlotToBuild(tank, 1).name).toBe("Bob's Build");
    });

    it('falls back to slot number: Tank 1 Build', () => {
      expect(tankSlotToBuild(defaultTankSetup(), 1).name).toBe('Tank 1 Build');
    });

    it('falls back to slot number: Tank 2 Build', () => {
      expect(tankSlotToBuild(defaultTankSetup(), 2).name).toBe('Tank 2 Build');
    });
  });

  describe('role and class', () => {
    it('sets role to tank', () => {
      expect(tankSlotToBuild(defaultTankSetup(), 1).role).toBe('tank');
    });

    it('infers dragonknight from dragonknight skill lines', () => {
      const tank: TankSetup = {
        ...defaultTankSetup(),
        skillLines: {
          line1: 'Ardent Flame',
          line2: 'Draconic Power',
          line3: 'Earthen Heart',
          isFlex: false,
        },
      };
      expect(tankSlotToBuild(tank, 1).esoClass).toBe('dragonknight');
    });

    it('falls back to any-class when skill lines are empty', () => {
      expect(tankSlotToBuild(defaultTankSetup(), 1).esoClass).toBe('any-class');
    });
  });

  describe('shortDescription gear encoding', () => {
    it('includes 5pc tank set display names', () => {
      const tank: TankSetup = {
        ...defaultTankSetup(),
        gearSets: {
          set1: KnownSetIDs.ROAR_OF_ALKOSH,
          set2: KnownSetIDs.WAR_MACHINE,
        },
      };
      const desc = tankSlotToBuild(tank, 1).shortDescription;
      expect(desc).toContain('Alkosh');
      expect(desc).toContain('War Machine');
    });

    it('includes monster set name when present', () => {
      const tank: TankSetup = {
        ...defaultTankSetup(),
        gearSets: {
          set1: undefined,
          set2: undefined,
          monsterSet: KnownSetIDs.WAY_OF_MARTIAL_KNOWLEDGE,
        },
      };
      const desc = tankSlotToBuild(tank, 1).shortDescription;
      expect(desc).toContain('Monster/Mythic');
      expect(desc).toContain('Martial Knowledge');
    });

    it('includes ultimate when set', () => {
      const tank: TankSetup = { ...defaultTankSetup(), ultimate: 'Aggressive Warhorn' };
      expect(tankSlotToBuild(tank, 1).shortDescription).toContain('Aggressive Warhorn');
    });

    it('is empty string when no gear info', () => {
      expect(tankSlotToBuild(defaultTankSetup(), 1).shortDescription).toBe('');
    });
  });

  describe('inline data mapping', () => {
    it('transfers skills and passives to the first setup', () => {
      const skills: SkillsConfig = { 0: { 0: 55 }, 1: {} };
      const tank: TankSetup = {
        ...defaultTankSetup(),
        skills,
        passives: [999],
        food: { id: 7, name: 'Orzorga Tripe Trifle Pocket' },
      };
      const setup = tankSlotToBuild(tank, 1).setups[0];
      expect(setup.skills).toBe(skills);
      expect(setup.passives).toEqual([999]);
      expect(setup.consumables.food).toEqual({ id: 7, name: 'Orzorga Tripe Trifle Pocket' });
    });
  });

  describe('build metadata', () => {
    it('sets visibility to private', () => {
      expect(tankSlotToBuild(defaultTankSetup(), 1).settings.visibility).toBe('private');
    });

    it('sets gameMode to pve', () => {
      expect(tankSlotToBuild(defaultTankSetup(), 1).gameMode).toBe('pve');
    });
  });
});

// ============================================================
// healerSlotToBuild
// ============================================================

describe('healerSlotToBuild', () => {
  describe('naming', () => {
    it('uses playerName when present', () => {
      const healer: HealerSetup = { ...defaultHealerSetup(), playerName: 'Carol' };
      expect(healerSlotToBuild(healer, 1).name).toBe("Carol's Build");
    });

    it('falls back: Healer 1 Build', () => {
      expect(healerSlotToBuild(defaultHealerSetup(), 1).name).toBe('Healer 1 Build');
    });

    it('falls back: Healer 2 Build', () => {
      expect(healerSlotToBuild(defaultHealerSetup(), 2).name).toBe('Healer 2 Build');
    });
  });

  describe('role and class', () => {
    it('sets role to healer', () => {
      expect(healerSlotToBuild(defaultHealerSetup(), 1).role).toBe('healer');
    });

    it('infers warden from warden skill lines (majority wins)', () => {
      // Green Balance + Winter's Embrace (warden, 2) vs Restoring Light (templar, 1)
      const healer: HealerSetup = {
        ...defaultHealerSetup(),
        skillLines: {
          line1: 'Green Balance',
          line2: "Winter's Embrace",
          line3: 'Restoring Light',
          isFlex: false,
        },
      };
      expect(healerSlotToBuild(healer, 1).esoClass).toBe('warden');
    });

    it('infers templar from three templar skill lines', () => {
      const healer: HealerSetup = {
        ...defaultHealerSetup(),
        skillLines: {
          line1: 'Aedric Spear',
          line2: "Dawn's Wrath",
          line3: 'Restoring Light',
          isFlex: false,
        },
      };
      expect(healerSlotToBuild(healer, 1).esoClass).toBe('templar');
    });

    it('falls back to any-class when skill lines are empty', () => {
      expect(healerSlotToBuild(defaultHealerSetup(), 1).esoClass).toBe('any-class');
    });
  });

  describe('shortDescription gear encoding', () => {
    it('includes healer set display names', () => {
      const healer: HealerSetup = {
        ...defaultHealerSetup(),
        set1: KnownSetIDs.VESTMENT_OF_OLORIME,
        set2: KnownSetIDs.ROARING_OPPORTUNIST,
      };
      const desc = healerSlotToBuild(healer, 1).shortDescription;
      expect(desc).toContain('Olorime');
      expect(desc).toContain('Roaring Opportunist');
    });

    it('includes ultimate when set', () => {
      const healer: HealerSetup = { ...defaultHealerSetup(), ultimate: 'Barrier' };
      expect(healerSlotToBuild(healer, 1).shortDescription).toContain('Barrier');
    });

    it('is empty string when no gear info', () => {
      expect(healerSlotToBuild(defaultHealerSetup(), 1).shortDescription).toBe('');
    });
  });

  describe('inline data mapping', () => {
    it('transfers cpPoints, food, and passives to the first setup', () => {
      const cpPoints: BuildChampionPoints = {
        ...makeEmptyCP(),
        fitness: { slots: [2, null, null, null], passives: {} },
      };
      const healer: HealerSetup = {
        ...defaultHealerSetup(),
        cpPoints,
        food: { name: 'Artaeum Pickled Fish Bowl' },
        passives: [500, 501],
      };
      const setup = healerSlotToBuild(healer, 1).setups[0];
      expect(setup.cp).toBe(cpPoints);
      expect(setup.consumables.food).toEqual({ name: 'Artaeum Pickled Fish Bowl' });
      expect(setup.passives).toEqual([500, 501]);
    });
  });

  describe('build metadata', () => {
    it('sets visibility to private', () => {
      expect(healerSlotToBuild(defaultHealerSetup(), 1).settings.visibility).toBe('private');
    });

    it('generates unique IDs on each call', () => {
      const healer = defaultHealerSetup();
      expect(healerSlotToBuild(healer, 1).id).not.toBe(healerSlotToBuild(healer, 1).id);
    });
  });
});
