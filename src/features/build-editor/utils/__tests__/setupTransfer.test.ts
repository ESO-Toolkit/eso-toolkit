/**
 * Tests for setupTransfer pure helpers.
 */

import type { SkillsConfig } from '../../../loadout-manager/types/loadout.types';
import type { BuildSetup } from '../../types/build.types';
import { getDefaultLinesForClass } from '../../data/esoStaticData';
import {
  buildHasContent,
  buildIdentityTouched,
  clearedSetupSection,
  cloneSetup,
  copySetupSection,
  copySkillBar,
  SETUP_SECTIONS,
  swapSkillBars,
} from '../setupTransfer';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTestSetup(overrides: Partial<BuildSetup> = {}): BuildSetup {
  return {
    id: 'src-id',
    name: 'Source',
    attributes: { magicka: 10, health: 20, stamina: 30 },
    curse: 'vampire-1',
    mundusStone: 'thief',
    gear: {
      0: { id: 100, trait: 'divines', enchant: 'magicka', weight: 'light' },
      4: { id: 200, trait: 'sharpened' },
    },
    skills: {
      0: { 3: 1, 4: 2 },
      1: { 3: 3, 4: 4 },
    },
    cp: {
      warfare: { slots: [1, null, null, null], passives: { piercing: 2 } },
      fitness: { slots: [null, null, null, null], passives: {} },
      craft: { slots: [null, null, null, null], passives: {} },
    },
    consumables: {
      potions: [{ id: 5, name: 'Tri-Pot', effects: ['health'] }],
      food: { id: 9, name: 'Bewitched Sugar Skulls' },
    },
    passives: [11, 12, 13],
    screenshots: [],
    skilledAbilities: [{ abilityId: 1, morph: 2 }],
    scribedAbilityIds: [42],
    quickslots: [{ type: 1, id: 7 }],
    statOverrides: undefined,
    ...overrides,
  };
}

// ─── SETUP_SECTIONS ───────────────────────────────────────────────────────────

describe('SETUP_SECTIONS', () => {
  it('lists the six sections in order with correct labels', () => {
    expect(SETUP_SECTIONS.map((s) => s.id)).toEqual([
      'gear',
      'skills',
      'champion',
      'consumables',
      'passives',
      'character',
    ]);
    expect(SETUP_SECTIONS.map((s) => s.label)).toEqual([
      'Gear',
      'Skills',
      'Champion Points',
      'Consumables',
      'Passives',
      'Character',
    ]);
  });
});

// ─── cloneSetup ───────────────────────────────────────────────────────────────

describe('cloneSetup', () => {
  it('assigns a fresh id distinct from the source', () => {
    const src = makeTestSetup();
    const clone = cloneSetup(src);
    expect(clone.id).not.toBe(src.id);
    expect(typeof clone.id).toBe('string');
    expect(clone.id.length).toBeGreaterThan(0);
  });

  it('defaults the name to `${name} copy`', () => {
    const clone = cloneSetup(makeTestSetup({ name: 'Boss' }));
    expect(clone.name).toBe('Boss copy');
  });

  it('truncates the base name so the default copy name fits within 32 chars', () => {
    const longName = 'A'.repeat(40);
    const clone = cloneSetup(makeTestSetup({ name: longName }));
    expect(clone.name.length).toBeLessThanOrEqual(32);
    expect(clone.name.endsWith(' copy')).toBe(true);
  });

  it('respects an explicit name override', () => {
    const clone = cloneSetup(makeTestSetup(), 'Custom');
    expect(clone.name).toBe('Custom');
  });

  it('deep-clones nested cp / gear / consumables (mutating clone never affects source)', () => {
    const src = makeTestSetup();
    const clone = cloneSetup(src);

    // cp independence
    clone.cp.warfare.slots[0] = 999;
    clone.cp.warfare.passives.piercing = 99;
    expect(src.cp.warfare.slots[0]).toBe(1);
    expect(src.cp.warfare.passives.piercing).toBe(2);

    // gear independence
    clone.gear[0].trait = 'sturdy';
    expect(src.gear[0].trait).toBe('divines');

    // consumables.potions independence
    clone.consumables.potions[0].name = 'Mutated';
    clone.consumables.potions.push({ id: 99, name: 'New', effects: [] });
    expect(src.consumables.potions[0].name).toBe('Tri-Pot');
    expect(src.consumables.potions).toHaveLength(1);
  });
});

// ─── copySetupSection ─────────────────────────────────────────────────────────

describe('copySetupSection', () => {
  const baseTarget = (): BuildSetup =>
    makeTestSetup({
      id: 'tgt-id',
      name: 'Target',
      attributes: { magicka: 0, health: 0, stamina: 0 },
      curse: 'none',
      mundusStone: '',
      gear: { 0: { id: 1 } },
      passives: [],
      cp: {
        warfare: { slots: [null, null, null, null], passives: {} },
        fitness: { slots: [null, null, null, null], passives: {} },
        craft: { slots: [null, null, null, null], passives: {} },
      },
      consumables: { potions: [], food: {} },
      skills: { 0: {}, 1: {} },
      skilledAbilities: undefined,
      scribedAbilityIds: undefined,
      quickslots: undefined,
    });

  it('copies only gear and preserves target id/name + other fields', () => {
    const target = baseTarget();
    const source = makeTestSetup();
    const result = copySetupSection(target, source, 'gear');

    expect(result.id).toBe('tgt-id');
    expect(result.name).toBe('Target');
    expect(result.gear).toEqual(source.gear);
    // unrelated fields stay from target
    expect(result.passives).toEqual([]);
    expect(result.curse).toBe('none');

    // deep-cloned: mutating result.gear does not affect source
    result.gear[0].trait = 'sturdy';
    expect(source.gear[0].trait).toBe('divines');
  });

  it('skills section copies skills + skilledAbilities + scribedAbilityIds + quickslots', () => {
    const target = baseTarget();
    const source = makeTestSetup();
    const result = copySetupSection(target, source, 'skills');

    expect(result.skills).toEqual(source.skills);
    expect(result.skilledAbilities).toEqual(source.skilledAbilities);
    expect(result.scribedAbilityIds).toEqual(source.scribedAbilityIds);
    expect(result.quickslots).toEqual(source.quickslots);

    // independence
    result.skills[0][3] = 999;
    expect(source.skills[0][3]).toBe(1);
    result.skilledAbilities![0].morph = 0;
    expect(source.skilledAbilities![0].morph).toBe(2);
  });

  it('copies the skills section from a blank setup (undefined optional fields) without throwing', () => {
    const target = makeTestSetup();
    // A freshly-added setup has no skilledAbilities / scribedAbilityIds / quickslots.
    const blankSource = makeTestSetup({
      skills: { 0: {}, 1: {} },
      skilledAbilities: undefined,
      scribedAbilityIds: undefined,
      quickslots: undefined,
    });
    let result: BuildSetup | undefined;
    expect(() => {
      result = copySetupSection(target, blankSource, 'skills');
    }).not.toThrow();
    expect(result?.skills).toEqual({ 0: {}, 1: {} });
    expect(result?.skilledAbilities).toBeUndefined();
    expect(result?.scribedAbilityIds).toBeUndefined();
    expect(result?.quickslots).toBeUndefined();
  });

  it('champion section copies cp only and deep-clones', () => {
    const target = baseTarget();
    const source = makeTestSetup();
    const result = copySetupSection(target, source, 'champion');

    expect(result.cp).toEqual(source.cp);
    expect(result.gear).toEqual(target.gear);

    result.cp.warfare.passives.piercing = 99;
    expect(source.cp.warfare.passives.piercing).toBe(2);
  });

  it('consumables section copies consumables only and deep-clones', () => {
    const target = baseTarget();
    const source = makeTestSetup();
    const result = copySetupSection(target, source, 'consumables');

    expect(result.consumables).toEqual(source.consumables);
    result.consumables.potions[0].name = 'Mutated';
    expect(source.consumables.potions[0].name).toBe('Tri-Pot');
  });

  it('passives section copies passives only and deep-clones', () => {
    const target = baseTarget();
    const source = makeTestSetup();
    const result = copySetupSection(target, source, 'passives');

    expect(result.passives).toEqual([11, 12, 13]);
    result.passives.push(99);
    expect(source.passives).toEqual([11, 12, 13]);
  });

  it('character section copies attributes + curse + mundusStone only', () => {
    const target = baseTarget();
    const source = makeTestSetup();
    const result = copySetupSection(target, source, 'character');

    expect(result.attributes).toEqual(source.attributes);
    expect(result.curse).toBe('vampire-1');
    expect(result.mundusStone).toBe('thief');
    // gear untouched
    expect(result.gear).toEqual(target.gear);

    result.attributes.magicka = 999;
    expect(source.attributes.magicka).toBe(10);
  });

  it('does not mutate the original target object', () => {
    const target = baseTarget();
    const source = makeTestSetup();
    const snapshot = JSON.parse(JSON.stringify(target));
    copySetupSection(target, source, 'gear');
    expect(target).toEqual(snapshot);
  });
});

// ─── buildHasContent ──────────────────────────────────────────────────────────

describe('buildHasContent', () => {
  // A truly blank setup — every user-entered field at its default.
  const blankSetup = (): BuildSetup =>
    makeTestSetup({
      gear: {},
      skills: { 0: {}, 1: {} },
      passives: [],
      mundusStone: '',
      curse: 'none',
      attributes: { magicka: 0, health: 0, stamina: 0 },
      consumables: { potions: [], food: {} },
      cp: {
        warfare: { slots: [null, null, null, null], passives: {} },
        fitness: { slots: [null, null, null, null], passives: {} },
        craft: { slots: [null, null, null, null], passives: {} },
      },
      skilledAbilities: undefined,
      scribedAbilityIds: undefined,
      quickslots: undefined,
    });

  it('is false for a fully blank build', () => {
    expect(buildHasContent([blankSetup()])).toBe(false);
  });

  it('is true for gear, slotted skills, or passives', () => {
    expect(buildHasContent([{ ...blankSetup(), gear: { 0: { id: 1 } } }])).toBe(true);
    expect(buildHasContent([{ ...blankSetup(), skills: { 0: { 3: 99 }, 1: {} } }])).toBe(true);
    expect(buildHasContent([{ ...blankSetup(), passives: [42] }])).toBe(true);
  });

  it('is true for non-gear content: attributes, mundus, curse, consumables', () => {
    expect(
      buildHasContent([{ ...blankSetup(), attributes: { magicka: 64, health: 0, stamina: 0 } }]),
    ).toBe(true);
    expect(buildHasContent([{ ...blankSetup(), mundusStone: 'thief' }])).toBe(true);
    expect(buildHasContent([{ ...blankSetup(), curse: 'vampire-1' }])).toBe(true);
    expect(
      buildHasContent([
        { ...blankSetup(), consumables: { potions: [], food: { id: 9, name: 'Food' } } },
      ]),
    ).toBe(true);
  });

  it('is true for champion perks or passive stars', () => {
    const withSlot = blankSetup();
    withSlot.cp.warfare.slots[0] = 264;
    expect(buildHasContent([withSlot])).toBe(true);

    const withStars = blankSetup();
    withStars.cp.fitness.passives = { piercing: 5 };
    expect(buildHasContent([withStars])).toBe(true);
  });
});

// ─── buildIdentityTouched ─────────────────────────────────────────────────────

describe('buildIdentityTouched', () => {
  const dkLines = getDefaultLinesForClass('dragonknight');

  it('is false for a factory-fresh build (DK, default lines, no races)', () => {
    expect(buildIdentityTouched('dragonknight', dkLines, [])).toBe(false);
  });

  it('is true when the class changed', () => {
    expect(buildIdentityTouched('sorcerer', getDefaultLinesForClass('sorcerer'), [])).toBe(true);
  });

  it('is true when races are set', () => {
    expect(buildIdentityTouched('dragonknight', dkLines, ['nord'])).toBe(true);
  });

  it('is true when a subclass skill line differs from the class default', () => {
    const subclassed = [...dkLines];
    subclassed[2] = 'class.storm-calling'; // a Sorcerer line on a DK build
    expect(buildIdentityTouched('dragonknight', subclassed as typeof dkLines, [])).toBe(true);
  });
});

// ─── swapSkillBars ────────────────────────────────────────────────────────────

describe('swapSkillBars', () => {
  it('swaps front and back bars', () => {
    const skills: SkillsConfig = { 0: { 3: 1 }, 1: { 3: 2 } };
    const result = swapSkillBars(skills);
    expect(result[0]).toEqual({ 3: 2 });
    expect(result[1]).toEqual({ 3: 1 });
  });

  it('returns a new immutable config (does not mutate input)', () => {
    const skills: SkillsConfig = { 0: { 3: 1 }, 1: { 3: 2 } };
    const result = swapSkillBars(skills);
    result[0][3] = 999;
    expect(skills[1][3]).toBe(2);
    expect(skills[0][3]).toBe(1);
    expect(result).not.toBe(skills);
  });
});

// ─── copySkillBar ─────────────────────────────────────────────────────────────

describe('copySkillBar', () => {
  it('copies the from bar onto the to bar', () => {
    const skills: SkillsConfig = { 0: { 3: 1, 4: 2 }, 1: { 3: 9 } };
    const result = copySkillBar(skills, 0, 1);
    expect(result[1]).toEqual({ 3: 1, 4: 2 });
    expect(result[0]).toEqual({ 3: 1, 4: 2 });
  });

  it('deep-clones so mutating result never affects input or the other bar', () => {
    const skills: SkillsConfig = { 0: { 3: 1 }, 1: { 3: 9 } };
    const result = copySkillBar(skills, 0, 1);
    result[1][3] = 999;
    expect(result[0][3]).toBe(1);
    expect(skills[0][3]).toBe(1);
    expect(skills[1][3]).toBe(9);
  });

  it('copying a bar onto itself returns an equal, independent config', () => {
    const skills: SkillsConfig = { 0: { 3: 1 }, 1: { 3: 9 } };
    const result = copySkillBar(skills, 0, 0);
    expect(result[0]).toEqual({ 3: 1 });
    expect(result[1]).toEqual({ 3: 9 });
    result[0][3] = 5;
    expect(skills[0][3]).toBe(1);
  });
});

// ─── clearedSetupSection ──────────────────────────────────────────────────────

describe('clearedSetupSection', () => {
  it('clears only the targeted section and leaves the original untouched', () => {
    const setup = makeTestSetup();
    const snapshot = JSON.parse(JSON.stringify(setup));

    const gearCleared = clearedSetupSection(setup, 'gear');
    expect(gearCleared.gear).toEqual({});
    expect(gearCleared.skills).toEqual(setup.skills); // unrelated section kept
    expect(setup).toEqual(snapshot); // original not mutated
  });

  it('skills clear also drops skilledAbilities / scribedAbilityIds / quickslots', () => {
    const cleared = clearedSetupSection(makeTestSetup(), 'skills');
    expect(cleared.skills).toEqual({ 0: {}, 1: {} });
    expect(cleared.skilledAbilities).toBeUndefined();
    expect(cleared.scribedAbilityIds).toBeUndefined();
    expect(cleared.quickslots).toBeUndefined();
  });

  it('champion clear resets all three trees to empty', () => {
    const cleared = clearedSetupSection(makeTestSetup(), 'champion');
    expect(cleared.cp.warfare).toEqual({ slots: [null, null, null, null], passives: {} });
    expect(cleared.cp.fitness.slots.every((s) => s === null)).toBe(true);
  });

  it('character clear resets attributes, curse and mundus', () => {
    const cleared = clearedSetupSection(makeTestSetup(), 'character');
    expect(cleared.attributes).toEqual({ magicka: 0, health: 0, stamina: 0 });
    expect(cleared.curse).toBe('none');
    expect(cleared.mundusStone).toBe('');
  });

  it('consumables and passives clear to empty', () => {
    const c = clearedSetupSection(makeTestSetup(), 'consumables');
    expect(c.consumables).toEqual({ potions: [], food: {} });
    const p = clearedSetupSection(makeTestSetup(), 'passives');
    expect(p.passives).toEqual([]);
  });
});
