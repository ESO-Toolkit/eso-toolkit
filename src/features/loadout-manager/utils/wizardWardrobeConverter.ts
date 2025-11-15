/**
 * Wizard's Wardrobe Format Converter
 * Converts between Wizard's Wardrobe addon format and internal LoadoutState
 */

import type {
  ChampionPointsConfig,
  LoadoutState,
  LoadoutSetup,
  WizardWardrobeExport,
} from '../types/loadout.types';

/**
 * Convert all character data from Wizard's Wardrobe to internal LoadoutState
 * Takes a map of characterId -> WizardWardrobeExport and combines them
 */
export function convertAllCharactersToLoadoutState(
  allCharacterData: Record<string, WizardWardrobeExport>,
): LoadoutState {
  const pages: LoadoutState['pages'] = {};
  const characters: LoadoutState['characters'] = [];
  let firstCharacterId: string | null = null;

  for (const [characterKey, wizardData] of Object.entries(allCharacterData)) {
    // Generate character ID and name
    const characterName = wizardData.$LastCharacterName || `Character ${characterKey}`;
    const characterId = `${characterName.toLowerCase().replace(/\s+/g, '-')}-${characterKey}`;
    
    if (!firstCharacterId) {
      firstCharacterId = characterId;
    }

    // Create character info
    characters.push({
      id: characterId,
      name: characterName,
      role: 'DPS', // Default role, could be enhanced later
    });

    // Convert this character's pages
    const characterPages: { [trialId: string]: any[] } = {};

    for (const [trialId, trialSetups] of Object.entries(wizardData.setups)) {
      if (!Array.isArray(trialSetups)) continue;

      const trialPages: any[] = [];
      
      // Get page names from the separate pages property if it exists
      const pageNames = wizardData.pages?.[trialId];

      for (let pageIndex = 0; pageIndex < trialSetups.length; pageIndex++) {
        const pageData = trialSetups[pageIndex];
        if (!pageData || typeof pageData !== 'object') continue;

        console.log(`Processing page ${pageIndex} for trial ${trialId}:`, pageData);
        console.log('Page data keys:', Object.keys(pageData));

        const setups: LoadoutSetup[] = [];
        
        // Page names are stored 1-indexed in the pages property
        // setups[0] corresponds to pages[1], setups[1] to pages[2], etc.
        let pageName = pageNames?.[pageIndex + 1]?.name || `Page ${pageIndex + 1}`;
        console.log(`  Page name from pages[${pageIndex + 1}]: "${pageNames?.[pageIndex + 1]?.name || 'not found'}"`);

        // Extract setups from numeric keys in the setups array
        for (const [key, value] of Object.entries(pageData)) {
          console.log(`  Checking key "${key}", type: ${typeof key}, value type: ${typeof value}`);
          if (!isNaN(Number(key))) {
            const setup = normalizeSetup(value as any);
            if (setup) {
              setups.push(setup);
            }
          }
        }

        if (setups.length > 0) {
          console.log(`  Adding page "${pageName}" with ${setups.length} setups`);
          trialPages.push({
            name: pageName,
            setups,
          });
        }
      }

      if (trialPages.length > 0) {
        console.log(`Trial ${trialId} has ${trialPages.length} pages:`, trialPages.map(p => p.name));
        characterPages[trialId] = trialPages;
      }
    }

    // Add this character's pages to the main pages structure
    pages[characterId] = characterPages;
  }

  return {
    currentCharacter: firstCharacterId,
    characters,
    currentTrial: null,
    currentPage: 0,
    mode: 'basic',
    pages,
  };
}

/**
 * Convert Wizard's Wardrobe export format to internal LoadoutState
 * This function is kept for backwards compatibility but now just wraps the new function
 */
export function convertWizardWardrobeToLoadoutState(wizardData: WizardWardrobeExport): LoadoutState {
  const pages: LoadoutState['pages'] = {};

  // Create a default character for imported data
  const defaultCharacterId = 'imported-character';
  const characterPages: { [trialId: string]: LoadoutState['pages'][string][string] } = {};

  // Process each trial's setups
  for (const [trialId, trialSetups] of Object.entries(wizardData.setups)) {
    if (!Array.isArray(trialSetups)) continue;

    // Each trial can have multiple pages
    const trialPages: any[] = [];
    
    // Get page names from the separate pages property if it exists
    const pageNames = wizardData.pages?.[trialId];

    // Wizard's Wardrobe stores setups as an array of objects with numeric keys
    // [{ 1: setup1, 2: setup2 }]
    for (let pageIndex = 0; pageIndex < trialSetups.length; pageIndex++) {
      const pageData = trialSetups[pageIndex];
      if (!pageData || typeof pageData !== 'object') continue;

      const setups: LoadoutSetup[] = [];
      
      // Page names are stored 1-indexed in the pages property
      // setups[0] corresponds to pages[1], setups[1] to pages[2], etc.
      let pageName = pageNames?.[pageIndex + 1]?.name || `Page ${pageIndex + 1}`;

      // Extract setups from numeric keys
      for (const [key, value] of Object.entries(pageData)) {
        if (!isNaN(Number(key))) {
          // Numeric key = setup
          const setup = normalizeSetup(value as any);
          if (setup) {
            setups.push(setup);
          }
        }
      }

      if (setups.length > 0) {
        trialPages.push({
          name: pageName,
          setups,
        });
      }
    }

    if (trialPages.length > 0) {
      characterPages[trialId] = trialPages;
    }
  }

  // Nest pages under default character
  pages[defaultCharacterId] = characterPages;

  return {
    currentCharacter: defaultCharacterId,
    characters: [
      {
        id: defaultCharacterId,
        name: 'Imported Character',
        role: 'DPS',
      },
    ],
    currentTrial: wizardData.selectedZoneTag || null,
    currentPage: 0,
    mode: 'basic',
    pages,
  };
}

/**
 * Normalize a setup from Wizard's Wardrobe format to internal format
 * Handles variations and missing fields
 */
function normalizeSetup(setup: any): LoadoutSetup | null {
  if (!setup || typeof setup !== 'object') return null;

  try {
    return {
      name: setup.name || 'Unnamed Setup',
      disabled: setup.disabled ?? false,
      condition: normalizeCondition(setup.condition),
      skills: normalizeSkills(setup.skills),
      cp: normalizeChampionPoints(setup.cp),
      food: normalizeFood(setup.food),
      gear: setup.gear || {},
      code: setup.code || '',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Normalize condition (handles both object and simple values)
 */
function normalizeCondition(condition: any): LoadoutSetup['condition'] {
  if (!condition || typeof condition !== 'object') {
    return {
      boss: 'Unknown',
    };
  }

  // Handle both boss and trash conditions
  if (condition.trash !== undefined) {
    return {
      trash: Number(condition.trash),
    };
  }

  return {
    boss: condition.boss || 'Unknown',
  };
}

/**
 * Normalize skills (handles Lua arrays that may be sparse or have gaps)
 */
function normalizeSkills(skills: any): LoadoutSetup['skills'] {
  if (!skills || typeof skills !== 'object') {
    console.log('normalizeSkills: No skills or not an object', skills);
    return { 0: {}, 1: {} };
  }

  console.log('normalizeSkills input:', JSON.stringify(skills, null, 2));

  const normalized: LoadoutSetup['skills'] = { 0: {}, 1: {} };

  // Handle bar 0 (front bar) and bar 1 (back bar)
  for (const barIndex of [0, 1] as const) {
    const bar = skills[barIndex];
    console.log(`normalizeSkills bar ${barIndex}:`, bar);
    if (bar && typeof bar === 'object') {
      // Clean up the bar data - remove nulls and ensure valid slot numbers
      const cleanBar: Record<number, number> = {};
      for (const [slotStr, abilityId] of Object.entries(bar)) {
        const slot = Number(slotStr);
        if (!isNaN(slot) && abilityId && typeof abilityId === 'number') {
          cleanBar[slot] = abilityId;
          console.log(`  Slot ${slot} = Ability ${abilityId}`);
        }
      }
      normalized[barIndex] = cleanBar;
    }
  }

  console.log('normalizeSkills output:', JSON.stringify(normalized, null, 2));
  return normalized;
}

/**
 * Normalize champion points configuration ensuring slot indices remain 1-based
 */
function normalizeChampionPoints(cp: any): ChampionPointsConfig {
  if (cp == null) {
    return {};
  }

  const normalized: ChampionPointsConfig = {};
  const assignedSlots = new Set<number>();

  const assignSlot = (slotIndex: number, value: unknown) => {
    if (
      slotIndex >= 1 &&
      slotIndex <= 12 &&
      !assignedSlots.has(slotIndex) &&
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value > 0
    ) {
      normalized[slotIndex] = value;
      assignedSlots.add(slotIndex);
    }
  };

  const processTreeCollection = (collection: unknown, baseOffset: number) => {
    if (!collection) {
      return;
    }

    if (Array.isArray(collection)) {
      collection.forEach((value, index) => {
        if (index < 4) {
          assignSlot(baseOffset + index + 1, value);
        }
      });
      return;
    }

    if (typeof collection === 'object') {
      const numericEntries = Object.entries(collection as Record<string, unknown>)
        .filter(([key, value]) => !Number.isNaN(Number(key)) && typeof value === 'number')
        .sort((a, b) => Number(a[0]) - Number(b[0]));

      numericEntries.forEach(([, value], index) => {
        if (index < 4) {
          assignSlot(baseOffset + index + 1, value);
        }
      });
    }
  };

  if (typeof cp === 'object' && !Array.isArray(cp)) {
    const treeMappings: Array<{ keys: string[]; offset: number }> = [
      { keys: ['craft', 'green'], offset: 0 },
      { keys: ['warfare', 'blue'], offset: 4 },
      { keys: ['fitness', 'red'], offset: 8 },
    ];

    for (const { keys, offset } of treeMappings) {
      const treeKey = keys.find((key) => key in (cp as Record<string, unknown>));
      if (treeKey) {
        processTreeCollection((cp as Record<string, unknown>)[treeKey], offset);
      }
    }
  }

  if (Array.isArray(cp)) {
    cp.forEach((value, index) => {
      assignSlot(index + 1, value);
    });
  } else if (typeof cp === 'object' && cp !== null) {
    for (const [slotKey, value] of Object.entries(cp)) {
      const slotIndex = Number(slotKey);
      if (!Number.isNaN(slotIndex)) {
        assignSlot(slotIndex, value);
      }
    }
  }

  return normalized;
}

function normalizeFood(food: any): LoadoutSetup['food'] {
  if (!food || typeof food !== 'object') {
    return {};
  }

  const result: LoadoutSetup['food'] = {};

  if (typeof food.id === 'number' && Number.isFinite(food.id)) {
    result.id = food.id;
  }

  if (typeof food.link === 'string' && food.link.trim().length > 0) {
    result.link = food.link.trim();
  }

  return result;
}

/**
 * Convert internal LoadoutState to Wizard's Wardrobe export format
 */
export function convertLoadoutStateToWizardWardrobe(
  state: LoadoutState,
  characterName?: string,
): WizardWardrobeExport {
  const wizardSetups: WizardWardrobeExport['setups'] = {};
  const wizardPages: WizardWardrobeExport['pages'] = {};

  // Get the current character's pages, or use the first character if no current character
  const characterId = state.currentCharacter || Object.keys(state.pages)[0];
  const characterPages = characterId ? state.pages[characterId] : {};

  if (!characterPages) {
    return {
      setups: {},
      pages: {},
      selectedZoneTag: state.currentTrial || '',
      version: 1,
    };
  }

  // Convert each trial's pages
  for (const [trialId, trialPages] of Object.entries(characterPages)) {
    const trialSetupsArray: any[] = [];

    for (const page of trialPages) {
      const pageSetups: Record<number, LoadoutSetup> = {};

      // Convert setups array to numeric-keyed object (Lua 1-indexed)
      page.setups.forEach((setup: LoadoutSetup, index: number) => {
        pageSetups[index + 1] = setup;
      });

      trialSetupsArray.push({
        ...pageSetups,
        name: page.name,
      });
    }

    wizardSetups[trialId] = trialSetupsArray;

    // Create pages metadata
    wizardPages[trialId] = [{ selected: 1 }];
  }

  return {
    version: 1,
    selectedZoneTag: state.currentTrial || '',
    setups: wizardSetups,
    pages: wizardPages,
    $LastCharacterName: characterName,
    autoEquipSetups: false,
    prebuffs: {},
  };
}
