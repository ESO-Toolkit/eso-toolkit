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

const loadoutState = convertAllCharactersToLoadoutState(wizardData);
const results: Array<{
  character: string;
  trial: string;
  page: string;
  setup: string;
  food: { id?: number; link?: string };
}> = [];

for (const character of loadoutState.characters) {
  const pagesByTrial = loadoutState.pages[character.id];
  if (!pagesByTrial) {
    continue;
  }
  for (const [trialId, pages] of Object.entries(pagesByTrial)) {
    for (const page of pages ?? []) {
      for (const setup of page.setups ?? []) {
        if (setup.food?.link || typeof setup.food?.id === 'number') {
          results.push({
            character: character.name,
            trial: trialId,
            page: page.name,
            setup: setup.name,
            food: setup.food,
          });
        }
      }
    }
  }
}

console.log(JSON.stringify(results.slice(0, 5), null, 2));
