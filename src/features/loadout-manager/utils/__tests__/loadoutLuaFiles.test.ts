import type { LoadoutSetup, LoadoutState } from '../../types/loadout.types';
import { detectAlphaGearData } from '../alphaGearConverter';
import { extractWizardWardrobeData } from '../luaParser';
import {
  generateAlphaGearLua,
  generateBlankAlphaGearLua,
  generateBlankWizardWardrobeLua,
  generateLoadoutLuaFile,
  generateWizardWardrobeLua,
  normalizeAccountName,
} from '../loadoutLuaFiles';
import {
  parseLuaAssignments,
  parseWizardsWardrobeSavedVariables,
} from '../wizardsWardrobeSavedVariables';

function makeSetup(name: string): LoadoutSetup {
  return {
    name,
    disabled: false,
    condition: { boss: 'Yandir the Butcher' },
    skills: { 0: { 3: 28800, 4: 38901 }, 1: { 3: 61907 } },
    cp: { 1: 1, 2: 2 },
    food: { id: 64711, link: '|H0:item:64711:|h|h' },
    gear: {
      0: { id: '123456', link: '|H0:item:94779:364:|h|h' },
      4: { id: '654321', link: '|H0:item:166198:6:|h|h' },
    },
    code: '',
  };
}

function makeState(): LoadoutState {
  const setup = makeSetup('Boss A');
  return {
    currentCharacter: 'Hero',
    characters: [{ id: 'Hero', name: 'Hero' }],
    currentTrial: 'DSR',
    currentPage: 0,
    mode: 'basic',
    pages: {
      Hero: {
        DSR: [{ name: 'Main', setups: [setup] }],
      },
    },
  };
}

describe('normalizeAccountName', () => {
  it('adds the @ prefix when missing', () => {
    expect(normalizeAccountName('Brayden')).toBe('@Brayden');
  });
  it('keeps an existing @ prefix', () => {
    expect(normalizeAccountName('@Brayden')).toBe('@Brayden');
  });
  it('falls back to a placeholder when empty', () => {
    expect(normalizeAccountName('')).toBe('@YourAccount');
    expect(normalizeAccountName(undefined)).toBe('@YourAccount');
    expect(normalizeAccountName('   ')).toBe('@YourAccount');
  });
});

describe('Wizard’s Wardrobe .lua generation', () => {
  it('produces a parseable, account-keyed file containing the loadouts', () => {
    const { filename, contents } = generateWizardWardrobeLua(makeState(), 'Brayden', 'Hero');
    expect(filename).toBe('WizardsWardrobe.lua');

    // Round-trip: the produced file must parse back with the addon's own parser.
    const sv = parseWizardsWardrobeSavedVariables(contents);
    const account = sv.Default?.['@Brayden'];
    expect(account).toBeDefined();
    // Setups live directly on the account-wide record (as the real WW file does).
    const accountWide = account?.['$AccountWide'] as Record<string, unknown>;
    expect(accountWide).toBeDefined();
    const setups = accountWide.setups as Record<string, unknown>;
    expect(setups.DSR).toBeDefined();
  });

  it('round-trips back through the app’s own Wizard’s Wardrobe importer', () => {
    // The export is worthless if the app can't re-import it: the importer reads
    // $AccountWide.setups directly, so the generated file must store setups there.
    const { contents } = generateWizardWardrobeLua(makeState(), 'Brayden', 'Hero');
    const extracted = extractWizardWardrobeData(parseLuaAssignments(contents));
    expect(extracted).not.toBeNull();
    expect(extracted?.['$AccountWide']?.setups?.DSR).toBeDefined();
  });

  it('blank starter is valid and empty but keyed to the account', () => {
    const { contents } = generateBlankWizardWardrobeLua('@Brayden');
    const sv = parseWizardsWardrobeSavedVariables(contents);
    const accountWide = sv.Default?.['@Brayden']?.['$AccountWide'] as Record<string, unknown>;
    expect(accountWide).toBeDefined();
    // Empty setups serialize to an empty Lua table → parses to {} (or []).
    const setups = accountWide.setups as Record<string, unknown>;
    expect(Object.keys(setups)).toHaveLength(0);
  });

  it('normalizes a bare account name into the file', () => {
    const { contents } = generateBlankWizardWardrobeLua('Brayden');
    expect(contents).toContain('["@Brayden"]');
  });
});

describe('AlphaGear .lua generation', () => {
  it('produces a parseable AlphaGear file with the account', () => {
    const { filename, contents } = generateAlphaGearLua(makeState(), 'Brayden');
    expect(filename).toBe('AlphaGear.lua');
    const parsed = parseLuaAssignments(contents);
    const detected = detectAlphaGearData(parsed);
    expect(detected).not.toBeNull();
    expect(detected?.data.Default?.['@Brayden']).toBeDefined();
  });

  it('blank AlphaGear starter parses and is account-keyed', () => {
    const { contents } = generateBlankAlphaGearLua('@Brayden');
    const parsed = parseLuaAssignments(contents);
    const detected = detectAlphaGearData(parsed);
    expect(detected).not.toBeNull();
    expect(detected?.data.Default?.['@Brayden']).toBeDefined();
  });
});

describe('generateLoadoutLuaFile dispatch', () => {
  it('routes to the right addon + blank/full combination', () => {
    const state = makeState();
    expect(
      generateLoadoutLuaFile({
        format: 'wizards-wardrobe',
        blank: false,
        state,
        accountName: 'Brayden',
        characterName: 'Hero',
      }).filename,
    ).toBe('WizardsWardrobe.lua');
    expect(
      generateLoadoutLuaFile({ format: 'alphagear', blank: true, state, accountName: 'Brayden' })
        .filename,
    ).toBe('AlphaGear.lua');
  });
});
