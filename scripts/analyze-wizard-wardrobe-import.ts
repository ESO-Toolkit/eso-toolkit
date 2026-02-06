import fs from 'fs';
import path from 'path';

import {
  extractWizardWardrobeData,
  parseWizardWardrobeSavedVariablesWithFallback,
} from '../src/features/loadout-manager/utils/luaParser';
import { convertAllCharactersToLoadoutState } from '../src/features/loadout-manager/utils/wizardWardrobeConverter';
import {
  preloadSkillData,
  getSkillById,
} from '../src/features/loadout-manager/data/skillLineSkills';
import type { CharacterInfo, LoadoutSetup, SetupPage } from '../src/features/loadout-manager/types/loadout.types';

type MissingSkillInfo = {
  abilityName?: string;
  contexts: Set<string>;
  count: number;
};

const MAX_CONTEXTS_TO_PRINT = 10;

function loadAbilityNameMap(filePath: string): Map<number, string> {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const abilityMap = new Map<number, string>();

  if (Array.isArray(data)) {
    for (const entry of data) {
      if (entry && typeof entry === 'object' && 'id' in entry) {
        const abilityId = Number((entry as { id: number }).id);
        if (!Number.isNaN(abilityId)) {
          const abilityName = (entry as { name?: string }).name;
          abilityMap.set(abilityId, abilityName ?? 'Unknown Ability');
        }
      }
    }
    return abilityMap;
  }

  for (const [id, ability] of Object.entries(data as Record<string, { name?: string }>)) {
    const abilityId = Number(id);
    if (!Number.isNaN(abilityId)) {
      abilityMap.set(abilityId, ability?.name ?? 'Unknown Ability');
    }
  }

  return abilityMap;
}

async function main(): Promise<void> {
  const fileArg = process.argv[2] ?? 'tmp/WizardsWardrobe.lua';
  const resolvedPath = path.isAbsolute(fileArg)
    ? fileArg
    : path.join(process.cwd(), fileArg);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Could not find file at ${resolvedPath}`);
    process.exit(1);
  }

  const luaContent = fs.readFileSync(resolvedPath, 'utf8');
  console.log(`📂 Parsing ${resolvedPath} (${luaContent.length.toLocaleString()} bytes)`);

  const parsed = parseWizardWardrobeSavedVariablesWithFallback(luaContent);
  const wizardDataByCharacter = extractWizardWardrobeData({
    [parsed.tableName]: parsed.data,
  });

  if (!wizardDataByCharacter) {
    console.error('❌ No Wizard\'s Wardrobe data found in file');
    process.exit(1);
  }

  const characterKeys = Object.keys(wizardDataByCharacter);
  console.log(`✅ Extracted data for ${characterKeys.length} character(s)`);

  const abilityMap = loadAbilityNameMap(path.join(process.cwd(), 'data', 'abilities.json'));
  await preloadSkillData();

  // Suppress verbose logs from the converter
  const originalConsoleLog = console.log;
  console.log = () => {};
  const loadoutState = convertAllCharactersToLoadoutState(wizardDataByCharacter);
  console.log = originalConsoleLog;

  const trials = new Set<string>();
  let pageCount = 0;
  let setupCount = 0;
  let totalSkillSlots = 0;

  const missingSkills = new Map<number, MissingSkillInfo>();

  for (const [characterId, trialPages] of Object.entries(loadoutState.pages)) {
    const characterName =
      loadoutState.characters.find((character: CharacterInfo) => character.id === characterId)?.name ??
      characterId;

    for (const [trialId, pages] of Object.entries(trialPages ?? {})) {
      trials.add(trialId);
      pageCount += pages.length;

      pages.forEach((page: SetupPage, pageIndex: number) => {
        page.setups.forEach((setup: LoadoutSetup) => {
          setupCount += 1;

          [0, 1].forEach((barIndex) => {
            const bar = setup.skills?.[barIndex as 0 | 1];
            if (!bar) return;

            Object.entries(bar).forEach(([slot, abilityId]) => {
              if (typeof abilityId !== 'number' || abilityId <= 0 || Number.isNaN(abilityId)) {
                return;
              }

              totalSkillSlots += 1;
              if (getSkillById(abilityId)) {
                return;
              }

              const context = `${characterName} | ${trialId} | ${page.name ?? `Page ${pageIndex + 1}`} | ${
                setup.name
              } | Bar ${barIndex} Slot ${slot}`;

              const abilityName = abilityMap.get(abilityId);
              const existing = missingSkills.get(abilityId) ?? {
                abilityName,
                contexts: new Set<string>(),
                count: 0,
              };

              existing.count += 1;
              existing.contexts.add(context);
              missingSkills.set(abilityId, existing);
            });
          });
        });
      });
    }
  }

  console.log('\n=== Loadout Summary ===');
  console.log(`Characters: ${loadoutState.characters.length}`);
  console.log(`Trials: ${trials.size}`);
  console.log(`Pages: ${pageCount}`);
  console.log(`Setups: ${setupCount}`);
  console.log(`Skill slots evaluated: ${totalSkillSlots}`);

  if (missingSkills.size === 0) {
    console.log('\n🎉 No missing skills detected!');
    return;
  }

  console.log(`\n⚠️ Missing skills: ${missingSkills.size}`);

  const sortedMissing = Array.from(missingSkills.entries()).sort((a, b) => b[1].count - a[1].count);

  sortedMissing.forEach(([abilityId, info]) => {
    console.log(`\n• Ability ${abilityId} (${info.abilityName ?? 'Unknown'}): ${info.count} occurrence(s)`);
    const contexts = Array.from(info.contexts);
    contexts.slice(0, MAX_CONTEXTS_TO_PRINT).forEach((context) => {
      console.log(`   - ${context}`);
    });
    if (contexts.length > MAX_CONTEXTS_TO_PRINT) {
      console.log(`   ... (+${contexts.length - MAX_CONTEXTS_TO_PRINT} more)`);
    }
  });
}

main().catch((error) => {
  console.error('❌ Unexpected error while analyzing import');
  console.error(error);
  process.exit(1);
});
