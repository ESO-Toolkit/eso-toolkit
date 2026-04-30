/**
 * Tests for rosterBuildBridge utilities
 *
 * Covers:
 * - snapshotBuildToSlot: extracts inline data from a BuildSetup
 * - createBuildFromSlot: creates a Build from a roster slot's inline data
 */

import type {
  Build,
  BuildSetup,
  BuildChampionPoints,
} from '../features/build-editor/types/build.types';
import type { SkillsConfig } from '../features/loadout-manager/types/loadout.types';
import { defaultTankSetup } from '../types/roster';

import { snapshotBuildToSlot, createBuildFromSlot } from './rosterBuildBridge';

// ─── test helpers ────────────────────────────────────────────────────────────

const makeEmptyCP = (): BuildChampionPoints => ({
  warfare: { slots: [null, null, null, null], passives: {} },
  fitness: { slots: [null, null, null, null], passives: {} },
  craft: { slots: [null, null, null, null], passives: {} },
});

const makeSetup = (overrides: Partial<BuildSetup> = {}): BuildSetup => ({
  id: 'setup-1',
  name: 'Default',
  attributes: { magicka: 0, health: 0, stamina: 0 },
  curse: 'none',
  mundusStone: '',
  gear: {},
  skills: { 0: {}, 1: {} },
  cp: makeEmptyCP(),
  consumables: { potions: [], food: {} },
  passives: [],
  screenshots: [],
  ...overrides,
});

const makeBuild = (overrides: Partial<Build> = {}): Build => ({
  id: 'build-1',
  name: 'Test Build',
  shortDescription: '',
  esoClass: 'any-class',
  classSkillLines: [null, null, null],
  role: 'magicka-dps',
  gameMode: 'pve',
  races: [],
  setups: [makeSetup()],
  guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
  settings: { visibility: 'public', dlc: 'Base Game', setupOrder: [0] },
  addonImportString: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

// ============================================================
// snapshotBuildToSlot
// ============================================================

describe('snapshotBuildToSlot', () => {
  it('extracts skills, cpPoints, food, and passives from the specified setup', () => {
    const skills: SkillsConfig = { 0: { 0: 10 }, 1: { 0: 20 } };
    const cpPoints = makeEmptyCP();
    cpPoints.warfare.slots[0] = 42;
    const build = makeBuild({
      setups: [
        makeSetup({
          skills,
          cp: cpPoints,
          consumables: { potions: [], food: { id: 5, name: 'Jewels of Misrule' } },
          passives: [100, 200],
        }),
      ],
    });

    const result = snapshotBuildToSlot(build, 0);
    expect(result.skills).toBe(skills);
    expect(result.cpPoints).toBe(cpPoints);
    expect(result.food).toEqual({ id: 5, name: 'Jewels of Misrule' });
    expect(result.passives).toEqual([100, 200]);
  });

  it('returns {} for an out-of-range setupIndex', () => {
    const build = makeBuild({ setups: [makeSetup()] });
    expect(snapshotBuildToSlot(build, 5)).toEqual({});
  });

  it('omits passives when the array is empty', () => {
    const build = makeBuild({ setups: [makeSetup({ passives: [] })] });
    expect(snapshotBuildToSlot(build, 0).passives).toBeUndefined();
  });

  it('omits food when id and name are both absent', () => {
    const build = makeBuild({ setups: [makeSetup({ consumables: { potions: [], food: {} } })] });
    expect(snapshotBuildToSlot(build, 0).food).toBeUndefined();
  });

  it('includes food when only id is present', () => {
    const build = makeBuild({
      setups: [makeSetup({ consumables: { potions: [], food: { id: 99 } } })],
    });
    expect(snapshotBuildToSlot(build, 0).food).toEqual({ id: 99 });
  });

  it('includes food when only name is present', () => {
    const build = makeBuild({
      setups: [makeSetup({ consumables: { potions: [], food: { name: 'Bowl of Lorkhan' } } })],
    });
    expect(snapshotBuildToSlot(build, 0).food).toEqual({ name: 'Bowl of Lorkhan' });
  });

  it('picks the correct setup when multiple setups exist', () => {
    const skills0: SkillsConfig = { 0: { 0: 1 }, 1: {} };
    const skills1: SkillsConfig = { 0: { 0: 2 }, 1: {} };
    const build = makeBuild({
      setups: [makeSetup({ skills: skills0 }), makeSetup({ id: 'setup-2', skills: skills1 })],
    });
    expect(snapshotBuildToSlot(build, 0).skills).toBe(skills0);
    expect(snapshotBuildToSlot(build, 1).skills).toBe(skills1);
  });
});

// ============================================================
// createBuildFromSlot
// ============================================================

describe('createBuildFromSlot', () => {
  describe('naming', () => {
    it('names the build using playerName from the slot', () => {
      const slot = { ...defaultTankSetup(), playerName: 'Alice' };
      expect(createBuildFromSlot(slot).name).toBe('Alice (from roster)');
    });

    it('uses default name when slot has no playerName', () => {
      expect(createBuildFromSlot(defaultTankSetup()).name).toBe('Build from roster');
    });
  });

  describe('class and role', () => {
    it('uses the provided esoClass', () => {
      expect(createBuildFromSlot(defaultTankSetup(), 'dragonknight').esoClass).toBe('dragonknight');
    });

    it('defaults esoClass to any-class', () => {
      expect(createBuildFromSlot(defaultTankSetup()).esoClass).toBe('any-class');
    });

    it('uses the provided role', () => {
      expect(createBuildFromSlot(defaultTankSetup(), 'any-class', 'tank').role).toBe('tank');
    });

    it('defaults role to magicka-dps', () => {
      expect(createBuildFromSlot(defaultTankSetup()).role).toBe('magicka-dps');
    });
  });

  describe('inline data transfer', () => {
    it('transfers skills from slot to the first setup', () => {
      const skills: SkillsConfig = { 0: { 0: 77 }, 1: { 0: 88 } };
      const slot = { ...defaultTankSetup(), skills };
      expect(createBuildFromSlot(slot).setups[0].skills).toBe(skills);
    });

    it('transfers cpPoints from slot to the first setup', () => {
      const cpPoints = makeEmptyCP();
      cpPoints.warfare.slots[0] = 7;
      const slot = { ...defaultTankSetup(), cpPoints };
      expect(createBuildFromSlot(slot).setups[0].cp).toBe(cpPoints);
    });

    it('transfers passives from slot to the first setup', () => {
      const slot = { ...defaultTankSetup(), passives: [300, 400] };
      expect(createBuildFromSlot(slot).setups[0].passives).toEqual([300, 400]);
    });

    it('transfers food from slot to the first setup', () => {
      const slot = { ...defaultTankSetup(), food: { id: 12, name: 'Solitude Salmon Millet' } };
      expect(createBuildFromSlot(slot).setups[0].consumables.food).toEqual({
        id: 12,
        name: 'Solitude Salmon Millet',
      });
    });

    it('falls back to empty skills when slot has none', () => {
      expect(createBuildFromSlot(defaultTankSetup()).setups[0].skills).toEqual({ 0: {}, 1: {} });
    });

    it('falls back to empty CP when slot has none', () => {
      expect(createBuildFromSlot(defaultTankSetup()).setups[0].cp).toEqual(makeEmptyCP());
    });

    it('falls back to empty passives when slot has none', () => {
      expect(createBuildFromSlot(defaultTankSetup()).setups[0].passives).toEqual([]);
    });
  });

  describe('build metadata', () => {
    it('sets visibility to public', () => {
      // createBuildFromSlot produces public builds (unlike rosterSlotToBuild which uses private)
      expect(createBuildFromSlot(defaultTankSetup()).settings.visibility).toBe('public');
    });

    it('sets gameMode to pve', () => {
      expect(createBuildFromSlot(defaultTankSetup()).gameMode).toBe('pve');
    });

    it('generates unique IDs on each call', () => {
      const slot = defaultTankSetup();
      expect(createBuildFromSlot(slot).id).not.toBe(createBuildFromSlot(slot).id);
    });

    it('has exactly one setup', () => {
      expect(createBuildFromSlot(defaultTankSetup()).setups).toHaveLength(1);
    });

    it('shortDescription is empty (no gear inference in this utility)', () => {
      expect(createBuildFromSlot(defaultTankSetup()).shortDescription).toBe('');
    });

    it('classSkillLines are all null (no class inference in this utility)', () => {
      expect(createBuildFromSlot(defaultTankSetup()).classSkillLines).toEqual([null, null, null]);
    });
  });
});
