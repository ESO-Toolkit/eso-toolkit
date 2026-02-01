/**
 * Lua Parser Utility
 * Parses ESO saved variables files (Lua format) to JavaScript objects
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Logger } from '@/utils/logger';

import type { WizardWardrobeExport } from '../types/loadout.types';
import { parseLuaAssignments } from './wizardsWardrobeSavedVariables';
import {
  parseWizardsWardrobeSavedVariables,
  type WizardWardrobeSavedVariables,
} from './wizardsWardrobeSavedVariables';

const luaParserLogger = new Logger({ contextPrefix: 'LuaParser' });

const WIZARD_WARDROBE_TABLE_NAMES = [
  'WizardsWardrobeSV',
  'WizardWardrobeDataSaved',
  'WizardWardrobeData',
  'WizardsWardrobe',
  'WizardWardrobe',
];

export function parseWizardWardrobeSavedVariablesWithFallback(luaContent: string): {
  tableName: string;
  data: WizardWardrobeSavedVariables;
} {
  const errors: string[] = [];

  for (const tableName of WIZARD_WARDROBE_TABLE_NAMES) {
    try {
      const data = parseWizardsWardrobeSavedVariables(luaContent, { tableName });
      return { tableName, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
    }
  }

  throw new Error(
    `Unable to parse Wizard's Wardrobe saved variables. Tried ${WIZARD_WARDROBE_TABLE_NAMES.join(
      ', ',
    )}. ${errors[0] ?? ''}`.trim(),
  );
}

/**
 * Parse ESO saved variables Lua file content
 * Safely converts Lua table syntax to JavaScript objects without executing code
 */
export function parseLuaSavedVariables(luaContent: string): Record<string, any> {
  try {
    const result = parseLuaAssignments(luaContent);

    // Debug log
    luaParserLogger.debug('Parsed variables', { keys: Object.keys(result) });

    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    luaParserLogger.error('Parse error', err);
    throw new Error(`Failed to parse Lua file: ${err.message}`);
  }
}

/**
 * Extract Wizard's Wardrobe data from parsed Lua saved variables
 * Navigates the ESO saved variables structure to find addon data
 *
 * Structure: WizardWardrobeDataSaved["Default"]["@AccountName"]["$AccountWide"] or ["CharacterId"]
 * Returns ALL character data, not just the first one found
 */
export function extractWizardWardrobeData(
  parsedLua: Record<string, any>,
): Record<string, WizardWardrobeExport> | null {
  try {
    luaParserLogger.debug('Available parsed keys', { keys: Object.keys(parsedLua) });

    // Look for Wizard's Wardrobe saved variable (multiple possible names)
    const data =
      parsedLua.WizardsWardrobeSV ||
      parsedLua.WizardWardrobeDataSaved ||
      parsedLua.WizardWardrobe ||
      parsedLua.WizardsWardrobe;
    if (!data) {
      luaParserLogger.info("No Wizard's Wardrobe variable found in parsed data");
      return null;
    }

    luaParserLogger.debug('Wizard Wardrobe candidate keys', { keys: Object.keys(data) });

    // Navigate through the nested structure
    const defaultData = data.Default;
    if (!defaultData) {
      luaParserLogger.warn('No "Default" key found in Wizard Wardrobe data');
      return null;
    }

    luaParserLogger.debug('Default data keys', { keys: Object.keys(defaultData) });

    // Find the first account (usually only one)
    const accountKeys = Object.keys(defaultData);
    if (accountKeys.length === 0) {
      luaParserLogger.warn('No account keys found in Wizard Wardrobe data');
      return null;
    }

    const accountKey = accountKeys[0];
    luaParserLogger.debug('Using account for extraction', { accountKey });

    const accountData = defaultData[accountKey];
    luaParserLogger.debug('Account data keys', { keys: Object.keys(accountData) });

    const allCharacterData: Record<string, WizardWardrobeExport> = {};

    // Check $AccountWide first
    if (accountData.$AccountWide && accountData.$AccountWide.setups) {
      luaParserLogger.debug('Account-wide data keys', {
        keys: Object.keys(accountData.$AccountWide),
      });
      allCharacterData['$AccountWide'] = accountData.$AccountWide as WizardWardrobeExport;
    }

    // Look through all character IDs with setups
    for (const key of Object.keys(accountData)) {
      if (key !== '$AccountWide' && accountData[key] && typeof accountData[key] === 'object') {
        if (accountData[key].setups) {
          luaParserLogger.debug('Found setups in character data', { characterKey: key });
          allCharacterData[key] = accountData[key] as WizardWardrobeExport;
        }
      }
    }

    if (Object.keys(allCharacterData).length === 0) {
      luaParserLogger.warn('No character data with setups found');
      return null;
    }

    luaParserLogger.info('Extracted Wizard Wardrobe data', {
      characterCount: Object.keys(allCharacterData).length,
    });
    return allCharacterData;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    luaParserLogger.error('Error while extracting Wizard Wardrobe data', err);
    return null;
  }
}

/**
 * Validate that the parsed data is in Wizard's Wardrobe format
 */
export function isWizardWardrobeFormat(data: any): data is WizardWardrobeExport {
  return Boolean(
    data &&
      typeof data === 'object' &&
      typeof data.setups === 'object' &&
      typeof data.pages === 'object' &&
      typeof data.version === 'number',
  );
}
