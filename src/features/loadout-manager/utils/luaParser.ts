/**
 * Lua Parser Utility
 * Parses ESO saved variables files (Lua format) to JavaScript objects
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as luaparse from 'luaparse';

import { Logger } from '@/utils/logger';

import type { WizardWardrobeExport } from '../types/loadout.types';

const luaParserLogger = new Logger({ contextPrefix: 'LuaParser' });

/**
 * Parse ESO saved variables Lua file content
 * Safely converts Lua table syntax to JavaScript objects without executing code
 */
export function parseLuaSavedVariables(luaContent: string): Record<string, any> {
  try {
    // Parse the Lua content into an Abstract Syntax Tree (AST)
    const ast = luaparse.parse(luaContent, {
      comments: false,
      scope: false,
      locations: false,
      ranges: false,
      luaVersion: '5.1', // ESO uses Lua 5.1
    });

    // Convert AST to JavaScript object
    const result = evaluateLuaAST(ast);

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
 * Recursively evaluate Lua AST nodes to JavaScript values
 * Handles tables (objects/arrays), strings, numbers, booleans, and nil
 */
function evaluateLuaAST(node: any): any {
  if (!node) return null;

  switch (node.type) {
    case 'Chunk': {
      // Process all statements and collect assignments into an object
      const result: Record<string, any> = {};
      for (const statement of node.body) {
        if (statement.type === 'AssignmentStatement') {
          for (let i = 0; i < statement.variables.length; i++) {
            const varNode = statement.variables[i];
            const valueNode = statement.init[i];
            const varName = evaluateLuaAST(varNode);
            const value = evaluateLuaAST(valueNode);

            // Handle both simple identifiers and member expressions
            if (typeof varName === 'string') {
              result[varName] = value;
            }
          }
        }
      }
      return result;
    }

    case 'TableConstructorExpression': {
      // Lua tables can be arrays or objects - determine which
      const obj: Record<string, any> = {};
      const arr: any[] = [];
      let hasStringKeys = false;
      let hasImplicitValues = false;
      const numericKeys: number[] = [];

      for (const field of node.fields) {
        if (field.type === 'TableKeyString') {
          // String key: ["key"] or key
          hasStringKeys = true;
          const key = field.key.name || field.key.value;
          obj[key] = evaluateLuaAST(field.value);
        } else if (field.type === 'TableKey') {
          // Bracket key: [expression]
          const key = evaluateLuaAST(field.key);
          const value = evaluateLuaAST(field.value);

          // Check if key is a string (e.g., ["name"]) or numeric (e.g., [1])
          if (typeof key === 'string') {
            hasStringKeys = true;
          } else if (typeof key === 'number' && Number.isInteger(key)) {
            numericKeys.push(key);
          }
          obj[key] = value;
        } else if (field.type === 'TableValue') {
          // Implicit array value (no key specified)
          hasImplicitValues = true;
          arr.push(evaluateLuaAST(field.value));
        }
      }

      // Return as array if we have implicit values and NO explicit keys
      if (hasImplicitValues && !hasStringKeys && numericKeys.length === 0) {
        return arr;
      }

      // Check if this should be treated as an array (consecutive 1-based indices, no string keys)
      if (!hasStringKeys && numericKeys.length > 0 && !hasImplicitValues) {
        const sortedKeys = [...numericKeys].sort((a, b) => a - b);
        const isConsecutiveFromOne =
          sortedKeys[0] === 1 && sortedKeys.every((key, idx) => key === idx + 1);

        if (isConsecutiveFromOne) {
          // Convert to 0-indexed array
          const result: any[] = [];
          for (const key of numericKeys) {
            result[key - 1] = obj[key];
          }
          return result;
        }
      }

      // Otherwise return as object (preserves numeric keys like skill slots 0, 3-8)
      return obj;
    }

    case 'StringLiteral': {
      // luaparse stores string value in 'raw' with quotes, extract the actual string
      if (node.value !== null) {
        return node.value;
      }
      // Fallback: strip quotes from raw
      return node.raw ? node.raw.replace(/^["']|["']$/g, '') : '';
    }

    case 'NumericLiteral':
      return node.value;

    case 'BooleanLiteral':
      return node.value;

    case 'NilLiteral':
      return null;

    case 'Identifier':
      return node.name;

    case 'MemberExpression': {
      // Handle chained member access: table.subtable.value
      const base = evaluateLuaAST(node.base);
      const identifier = node.identifier.name;
      // For AST traversal, we return a string representation
      return typeof base === 'string' ? `${base}.${identifier}` : identifier;
    }

    case 'IndexExpression': {
      // Handle bracket notation: table["key"] or table[1]
      const indexBase = evaluateLuaAST(node.base);
      const index = evaluateLuaAST(node.index);
      return typeof indexBase === 'string' ? `${indexBase}[${index}]` : index;
    }

    default:
      // Unhandled node type - return null silently for unknown nodes
      return null;
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
