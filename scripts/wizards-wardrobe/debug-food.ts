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

let rawFoodWithLink = 0;
let rawFoodWithId = 0;
let rawFoodTotal = 0;

const entries = Object.values(wizardData);
for (const entry of entries) {
  const setups = entry.setups ?? {};
  for (const trial of Object.values(setups)) {
    if (!Array.isArray(trial)) {
      continue;
    }
    for (const page of trial) {
      if (!page || typeof page !== 'object') {
        continue;
      }
      for (const setup of Object.values(page)) {
        if (!setup || typeof setup !== 'object') {
          continue;
        }
        const food = (setup as { food?: unknown }).food;
        if (!food || typeof food !== 'object') {
          continue;
        }
        rawFoodTotal += 1;
        const foodObj = food as Record<string, unknown>;
        if (typeof foodObj.link === 'string' && foodObj.link.trim().length > 0) {
          rawFoodWithLink += 1;
        }
        if (typeof foodObj.id === 'number' && Number.isFinite(foodObj.id)) {
          rawFoodWithId += 1;
        }
      }
    }
  }
}

const loadoutState = convertAllCharactersToLoadoutState(wizardData);
let convertedFoodWithLink = 0;
let convertedFoodWithId = 0;
let convertedSetups = 0;

for (const pagesByTrial of Object.values(loadoutState.pages)) {
  for (const trialPages of Object.values(pagesByTrial ?? {})) {
    for (const page of trialPages ?? []) {
      for (const setup of page.setups ?? []) {
        convertedSetups += 1;
        if (setup.food?.link) {
          convertedFoodWithLink += 1;
        }
        if (typeof setup.food?.id === 'number') {
          convertedFoodWithId += 1;
        }
      }
    }
  }
}

console.log(
  JSON.stringify(
    {
      rawFoodEntries: rawFoodTotal,
      rawFoodWithLink,
      rawFoodWithId,
      convertedSetups,
      convertedFoodWithLink,
      convertedFoodWithId,
    },
    null,
    2,
  ),
);
