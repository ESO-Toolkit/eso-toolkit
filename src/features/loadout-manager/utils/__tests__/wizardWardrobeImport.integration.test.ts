import fs from 'node:fs';
import path from 'node:path';

import {
  convertAllCharactersToLoadoutState,
  convertLoadoutStateToWizardWardrobe,
} from '../wizardWardrobeConverter';
import {
  extractWizardWardrobeData,
  parseWizardWardrobeSavedVariablesWithFallback,
} from '../luaParser';
import {
  parseWizardsWardrobeSavedVariables,
  serializeWizardsWardrobeSavedVariables,
  type WizardWardrobeSavedVariables,
} from '../wizardsWardrobeSavedVariables';

describe('Wizard Wardrobe import integration', () => {
  it('parses the sample SavedVariables file and builds loadout state', () => {
    const samplePath = path.join(
      process.cwd(),
      'tests',
      'fixtures',
      'wizards-wardrobe-sample.lua',
    );
    const luaContent = fs.readFileSync(samplePath, 'utf8');

    const parsed = parseWizardWardrobeSavedVariablesWithFallback(luaContent);
    const wizardData = extractWizardWardrobeData({ [parsed.tableName]: parsed.data });

    expect(wizardData).toBeDefined();

    const loadoutState = convertAllCharactersToLoadoutState(wizardData!);
    expect(loadoutState.characters.length).toBeGreaterThan(0);
    expect(Object.keys(loadoutState.pages)).toHaveLength(loadoutState.characters.length);

    const firstCharacterId = loadoutState.characters[0]?.id;
    const firstCharacterPages = firstCharacterId ? loadoutState.pages[firstCharacterId] : undefined;
    expect(firstCharacterPages).toBeDefined();

    const generalPages = firstCharacterPages?.GEN;
    expect(generalPages?.length).toBeGreaterThan(0);
    expect(generalPages?.[0]?.setups?.length).toBeGreaterThan(0);
  });

  it('round-trips the sample file through JSON and back to Lua', () => {
    const samplePath = path.join(
      process.cwd(),
      'tests',
      'fixtures',
      'wizards-wardrobe-sample.lua',
    );
    const luaContent = fs.readFileSync(samplePath, 'utf8');

    const parsed = parseWizardsWardrobeSavedVariables(luaContent);
    expect(parsed).toMatchSnapshot('wizard-wardrobe-sample-json');

    const serialized = serializeWizardsWardrobeSavedVariables(parsed);
    const reparsed = parseWizardsWardrobeSavedVariables(serialized);

    expect(reparsed).toEqual(parsed);
  });

  it('exports loadouts to lua and re-imports with food', () => {
    const samplePath = path.join(
      process.cwd(),
      'tests',
      'fixtures',
      'wizards-wardrobe-sample.lua',
    );
    const luaContent = fs.readFileSync(samplePath, 'utf8');

    const parsed = parseWizardsWardrobeSavedVariables(luaContent);
    const defaultData = parsed.Default ?? {};
    const accountKey = Object.keys(defaultData)[0];
    const accountData = accountKey ? defaultData[accountKey] : undefined;

    if (!accountKey || !accountData) {
      throw new Error('Sample saved variables missing account data.');
    }

    const characterKey = Object.keys(accountData).find((key) => key === '$AccountWide') ??
      Object.keys(accountData)[0];

    if (!characterKey) {
      throw new Error('Sample saved variables missing character entry.');
    }

    const wizardData = extractWizardWardrobeData({ WizardsWardrobeSV: parsed });
    if (!wizardData) {
      throw new Error('Failed to extract Wizard Wardrobe data.');
    }

    const loadoutState = convertAllCharactersToLoadoutState(wizardData);
    const exportState = {
      ...loadoutState,
      currentCharacter: loadoutState.characters[0]?.id ?? null,
      currentTrial: 'GEN',
    };

    const exported = convertLoadoutStateToWizardWardrobe(
      exportState,
      loadoutState.characters[0]?.name,
    );
    const exportWrapper: WizardWardrobeSavedVariables = {
      Default: {
        [accountKey]: {
          [characterKey]: exported,
        },
      },
    };

    const serialized = serializeWizardsWardrobeSavedVariables(exportWrapper);
    const reparsed = parseWizardsWardrobeSavedVariables(serialized);
    const roundTripData = extractWizardWardrobeData({ WizardsWardrobeSV: reparsed });

    if (!roundTripData) {
      throw new Error('Round-trip extraction failed.');
    }

    const roundTripState = convertAllCharactersToLoadoutState(roundTripData);
    const roundTripCharacter = roundTripState.characters[0];

    if (!roundTripCharacter) {
      throw new Error('Round-trip state missing character data.');
    }

    const pages = roundTripState.pages[roundTripCharacter.id]?.GEN;
    const page = pages?.[0];
    const setup = page?.setups[0];

    expect(setup?.food?.id).toBe(123);
    expect(setup?.food?.link).toContain('item:123');
  });
});
