import fs from 'node:fs';
import path from 'node:path';

import type { LoadoutSetup } from '../../types/loadout.types';
import { traitIdToTraitType } from '../../data/esoEquipmentEnums';
import { convertAllCharactersToLoadoutState } from '../wizardWardrobeConverter';
import {
  extractWizardWardrobeData,
  parseWizardWardrobeSavedVariablesWithFallback,
} from '../luaParser';

import {
  loadoutSetupToWWTransfer,
  WW_TRANSFER_CHAR_LIMIT,
  type WWGearTuple,
} from '../wizardWardrobeTransfer';

function makeSetup(overrides: Partial<LoadoutSetup> = {}): LoadoutSetup {
  return {
    name: 'Test Setup',
    disabled: false,
    condition: {},
    skills: { 0: {}, 1: {} },
    cp: {},
    food: {},
    gear: {},
    ...overrides,
  };
}

describe('traitIdToTraitType', () => {
  it('maps category-specific armor / weapon / jewelry trait ids', () => {
    expect(traitIdToTraitType('armor', 'divines')).toBe(18);
    expect(traitIdToTraitType('armor', 'infused')).toBe(16);
    expect(traitIdToTraitType('weapon', 'sharpened')).toBe(7);
    expect(traitIdToTraitType('weapon', 'infused')).toBe(4); // different int than armor
    expect(traitIdToTraitType('jewelry', 'bloodthirsty')).toBe(31);
    expect(traitIdToTraitType('jewelry', 'infused')).toBe(33);
  });

  it('returns 0 (any) for unknown or missing traits — a SOFT field for WW', () => {
    expect(traitIdToTraitType('armor', 'invigorating')).toBe(0); // no confirmed constant
    expect(traitIdToTraitType('armor', undefined)).toBe(0);
    expect(traitIdToTraitType('weapon', 'not-a-trait')).toBe(0);
  });
});

describe('loadoutSetupToWWTransfer — non-gear fields', () => {
  it('copies skill bars (slots 3-8 only) keyed by bar then slot', () => {
    const result = loadoutSetupToWWTransfer(
      makeSetup({
        skills: {
          0: { 3: 111, 4: 222, 8: 999, 2: 1 /* out of range, dropped */ },
          1: { 3: 333 },
        },
      }),
    );
    expect(result.data.skills['0']).toEqual({ 3: 111, 4: 222, 8: 999 });
    expect(result.data.skills['1']).toEqual({ 3: 333 });
  });

  it('copies champion points (slots 1-12) and food item id', () => {
    const result = loadoutSetupToWWTransfer(
      makeSetup({
        cp: { 1: 1001, 12: 1012, 13: 9 /* out of range, dropped */ },
        food: { id: 84720 },
      }),
    );
    expect(result.data.cp).toEqual({ 1: 1001, 12: 1012 });
    expect(result.data.food).toBe(84720);
  });

  it('omits the food key when no food is set', () => {
    const result = loadoutSetupToWWTransfer(makeSetup());
    expect(result.data.food).toBeUndefined();
    expect(JSON.parse(result.json)).not.toHaveProperty('food');
  });

  it('flags being over the 1000-char in-game paste limit', () => {
    const small = loadoutSetupToWWTransfer(makeSetup());
    expect(small.overCharLimit).toBe(false);
    expect(small.charCount).toBe(small.json.length);

    const huge = loadoutSetupToWWTransfer(
      makeSetup({ name: 'x'.repeat(WW_TRANSFER_CHAR_LIMIT + 50) }),
    );
    expect(huge.overCharLimit).toBe(true);
  });
});

describe('loadoutSetupToWWTransfer — gear safety (never emit a wrong tuple)', () => {
  it('omits weapon slots and reports them as unresolved', () => {
    const result = loadoutSetupToWWTransfer(
      makeSetup({ gear: { 4: { link: '|H0:item:54321:0:0:0|h|h' }, 20: { id: 12345 } } }),
    );
    expect(result.data.gear['4']).toBeUndefined();
    expect(result.data.gear['20']).toBeUndefined();
    expect(result.unresolvedSlots.map((u) => u.slot).sort((a, b) => a - b)).toEqual([4, 20]);
  });

  it('omits armor slots whose set cannot be identified (rather than guessing)', () => {
    // A 14-digit value is an item uniqueId, not an itemId → cannot resolve a set.
    const result = loadoutSetupToWWTransfer(
      makeSetup({ gear: { 0: { id: '99999999999999', trait: 'divines' } } }),
    );
    expect(result.data.gear['0']).toBeUndefined();
    expect(result.unresolvedSlots.some((u) => u.slot === 0)).toBe(true);
  });

  it('silently skips excluded slots (costume / poison) with no warning', () => {
    const result = loadoutSetupToWWTransfer(makeSetup({ gear: { 10: { id: 5 }, 13: { id: 6 } } }));
    expect(result.data.gear['10']).toBeUndefined();
    expect(result.data.gear['13']).toBeUndefined();
    expect(result.unresolvedSlots).toHaveLength(0);
  });
});

describe("loadoutSetupToWWTransfer — real Wizard's Wardrobe fixture (end-to-end)", () => {
  function firstSetup(): LoadoutSetup | undefined {
    const samplePath = path.join(process.cwd(), 'tests', 'fixtures', 'wizards-wardrobe-sample.lua');
    const luaContent = fs.readFileSync(samplePath, 'utf8');
    const parsed = parseWizardWardrobeSavedVariablesWithFallback(luaContent);
    const wizardData = extractWizardWardrobeData({ [parsed.tableName]: parsed.data });
    if (!wizardData) return undefined;
    const state = convertAllCharactersToLoadoutState(wizardData);
    for (const trials of Object.values(state.pages)) {
      for (const pages of Object.values(trials)) {
        for (const page of pages) {
          if (page.setups?.length) return page.setups[0];
        }
      }
    }
    return undefined;
  }

  it('encodes a real imported setup into valid WW Transfer JSON', () => {
    const setup = firstSetup();
    expect(setup).toBeDefined();

    const result = loadoutSetupToWWTransfer(setup!);

    // Structure
    expect(typeof result.data.name).toBe('string');
    expect(result.data.skills).toHaveProperty('0');
    expect(result.data.skills).toHaveProperty('1');
    expect(Array.isArray(result.unresolvedSlots)).toBe(true);

    // Every emitted gear tuple is a hard-valid [equipType>0, setId>0, traitType>=0].
    for (const [slot, tuple] of Object.entries(result.data.gear)) {
      const t = tuple as WWGearTuple;
      expect(t).toHaveLength(3);
      expect(t[0]).toBeGreaterThan(0); // equipType
      expect(t[1]).toBeGreaterThan(0); // setId
      expect(t[2]).toBeGreaterThanOrEqual(0); // traitType (0 = any)
      expect(Number(slot)).toBeGreaterThanOrEqual(0);
    }

    // JSON is the canonical serialization of `data`.
    expect(JSON.parse(result.json)).toEqual(result.data);
    expect(result.charCount).toBe(result.json.length);
  });
});
