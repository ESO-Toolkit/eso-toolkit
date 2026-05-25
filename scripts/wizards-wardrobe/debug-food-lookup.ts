import fs from 'node:fs';
import path from 'node:path';

import { parseWizardsWardrobeSavedVariables } from '../../src/features/loadout-manager/utils/wizardsWardrobeSavedVariables';
import { extractWizardWardrobeData } from '../../src/features/loadout-manager/utils/luaParser';
import { convertAllCharactersToLoadoutState } from '../../src/features/loadout-manager/utils/wizardWardrobeConverter';

const filePath = process.argv[2] ?? 'tmp/WizardsWardrobe.lua';
const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

const luaContent = fs.readFileSync(resolvedPath, 'utf8');
const parsed = parseWizardsWardrobeSavedVariables(luaContent);
const wizardData = extractWizardWardrobeData({ WizardsWardrobeSV: parsed });

if (!wizardData) {
  console.error('No Wizard Wardrobe data found.');
  process.exit(1);
}

const characterName = 'Tzú';
const trialId = 'RG';
const pageName = 'Page 1';
const bossName = 'Oaxiltso';

const loadoutState = convertAllCharactersToLoadoutState(wizardData);

const characterEntry = loadoutState.characters.find((character) => character.name === characterName);
if (!characterEntry) {
  console.error('Character not found in loadout state.');
  process.exit(1);
}

const trialPages = loadoutState.pages[characterEntry.id]?.[trialId];
if (!trialPages || trialPages.length === 0) {
  console.error('Trial pages not found in loadout state.');
  process.exit(1);
}

const page = trialPages.find((candidate) => candidate.name === pageName);
if (!page) {
  console.error('Page not found in loadout state.');
  process.exit(1);
}

const setup = page.setups.find((candidate) => candidate.name === bossName);
if (!setup) {
  console.error('Setup not found in loadout state.');
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      character: characterEntry.name,
      trial: trialId,
      page: page.name,
      setup: setup.name,
      food: setup.food,
    },
    null,
    2,
  ),
);
