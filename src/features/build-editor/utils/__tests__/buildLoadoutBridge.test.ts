import type { BuildSetup } from '../../types/build.types';
import {
  buildChampionPointsToFlat,
  buildSetupToLoadoutSetup,
  buildSetupToWWTransfer,
} from '../buildLoadoutBridge';

function makeBuildSetup(overrides: Partial<BuildSetup> = {}): BuildSetup {
  return {
    id: 's1',
    name: 'My DPS',
    attributes: { magicka: 64, health: 0, stamina: 0 },
    curse: 'none',
    mundusStone: '',
    gear: {},
    skills: { 0: {}, 1: {} },
    cp: {
      warfare: { slots: [], passives: {} },
      fitness: { slots: [], passives: {} },
      craft: { slots: [], passives: {} },
    },
    consumables: { potions: [], food: {} },
    passives: [],
    screenshots: [],
    ...overrides,
  };
}

describe('buildChampionPointsToFlat', () => {
  it('flattens the three trees into slots 1-12 (craft 1-4, warfare 5-8, fitness 9-12)', () => {
    const flat = buildChampionPointsToFlat({
      craft: { slots: [1001, 1002], passives: {} },
      warfare: { slots: [2001], passives: {} },
      fitness: { slots: [null, 3001], passives: {} },
    });
    expect(flat).toEqual({ 1: 1001, 2: 1002, 5: 2001, 10: 3001 });
  });

  it('skips null/zero perks and ignores anything past the 4th slot in a tree', () => {
    const flat = buildChampionPointsToFlat({
      craft: { slots: [0, null, 1003, 1004, 9999 /* 5th, ignored */], passives: {} },
      warfare: { slots: [], passives: {} },
      fitness: { slots: [], passives: {} },
    });
    expect(flat).toEqual({ 3: 1003, 4: 1004 });
  });
});

describe('buildSetupToLoadoutSetup', () => {
  it('copies shared gear/skills, flattens CP, reduces food, drops editor-only fields', () => {
    const loadout = buildSetupToLoadoutSetup(
      makeBuildSetup({
        name: '  Stamblade  ',
        skills: { 0: { 3: 111, 8: 999 }, 1: { 3: 222 } },
        gear: { 0: { id: 'x', trait: 'divines' }, 2: { id: 'y' } },
        cp: {
          craft: { slots: [1001], passives: {} },
          warfare: { slots: [2001, 2002], passives: {} },
          fitness: { slots: [], passives: {} },
        },
        consumables: { potions: [], food: { id: 84720, name: 'Dubious' } },
      }),
    );

    expect(loadout.name).toBe('Stamblade');
    expect(loadout.disabled).toBe(false);
    expect(loadout.condition).toEqual({});
    expect(loadout.skills).toEqual({ 0: { 3: 111, 8: 999 }, 1: { 3: 222 } });
    expect(loadout.gear).toEqual({ 0: { id: 'x', trait: 'divines' }, 2: { id: 'y' } });
    expect(loadout.cp).toEqual({ 1: 1001, 5: 2001, 6: 2002 });
    expect(loadout.food).toEqual({ id: 84720 });
    // Editor-only concepts have no representation on the loadout.
    expect(loadout).not.toHaveProperty('attributes');
    expect(loadout).not.toHaveProperty('mundusStone');
  });

  it('falls back to a default name and empty food', () => {
    const loadout = buildSetupToLoadoutSetup(makeBuildSetup({ name: '   ' }));
    expect(loadout.name).toBe('Build');
    expect(loadout.food).toEqual({});
  });
});

describe('buildSetupToWWTransfer (end-to-end: build → loadout → WW code)', () => {
  it('carries skills/CP/food through and applies the same gear-safety omission', () => {
    const result = buildSetupToWWTransfer(
      makeBuildSetup({
        name: 'Trial DPS',
        skills: { 0: { 3: 111, 4: 222, 8: 999 }, 1: { 3: 333 } },
        cp: {
          craft: { slots: [1001], passives: {} },
          warfare: { slots: [2001], passives: {} },
          fitness: { slots: [3001], passives: {} },
        },
        consumables: { potions: [], food: { id: 84720 } },
        // A weapon slot (omitted) and an unidentifiable armor slot (omitted).
        gear: { 4: { link: '|H0:item:54321:0:0:0|h|h' }, 0: { id: 'not-an-id' } },
      }),
    );

    expect(result.data.name).toBe('Trial DPS');
    expect(result.data.skills['0']).toEqual({ 3: 111, 4: 222, 8: 999 });
    expect(result.data.skills['1']).toEqual({ 3: 333 });
    expect(result.data.cp).toEqual({ 1: 1001, 5: 2001, 9: 3001 });
    expect(result.data.food).toBe(84720);

    // Gear that can't be safely encoded is omitted, never guessed.
    expect(Object.keys(result.data.gear)).toHaveLength(0);
    expect(result.unresolvedSlots.map((u) => u.slot).sort((a, b) => a - b)).toEqual([0, 4]);

    // Produces parseable JSON for the in-game paste box.
    expect(JSON.parse(result.json)).toEqual(result.data);
  });
});
