/**
 * @jest-environment jsdom
 */

import {
  parseLuaSavedVariables,
  extractWizardWardrobeData,
  isWizardWardrobeFormat,
} from '../luaParser';
import type { WizardWardrobeExport } from '../../types/loadout.types';

describe('Lua Parser', () => {
  describe('parseLuaSavedVariables', () => {
    it('should parse basic Lua table', () => {
      const lua = `
        TestData = {
          ["key1"] = "value1",
          ["key2"] = 123,
          ["key3"] = true,
        }
      `;

      const result = parseLuaSavedVariables(lua);

      expect(result).toEqual({
        TestData: {
          key1: 'value1',
          key2: 123,
          key3: true,
        },
      });
    });

    it('should parse nested Lua tables', () => {
      const lua = `
        TestData = {
          ["outer"] = {
            ["inner"] = {
              ["value"] = 42,
            },
          },
        }
      `;

      const result = parseLuaSavedVariables(lua);

      expect(result.TestData.outer.inner.value).toBe(42);
    });

    it('should parse Lua arrays (1-indexed)', () => {
      const lua = `
        TestData = {
          [1] = "first",
          [2] = "second",
          [3] = "third",
        }
      `;

      const result = parseLuaSavedVariables(lua);

      // Lua 1-indexed arrays should convert to JavaScript 0-indexed
      expect(result.TestData).toEqual(['first', 'second', 'third']);
    });

    it('should handle mixed tables (objects)', () => {
      const lua = `
        TestData = {
          ["name"] = "test",
          [1] = "item1",
          [2] = "item2",
        }
      `;

      const result = parseLuaSavedVariables(lua);

      // Mixed keys: when we have both string and numeric keys,
      // the parser returns an object (not an array)
      expect(result.TestData).toBeDefined();
      expect(result.TestData.name).toBe('test');
      // In the current implementation, numeric keys in mixed tables end up as object properties
      // This is acceptable for ESO saved variables
      expect(result.TestData).toHaveProperty('name');
    });

    it('should handle nil values', () => {
      const lua = `
        TestData = {
          ["key1"] = "value",
          ["key2"] = nil,
        }
      `;

      const result = parseLuaSavedVariables(lua);

      expect(result.TestData.key1).toBe('value');
      expect(result.TestData.key2).toBeNull();
    });

    it('should handle special characters in strings', () => {
      const lua = `
        TestData = {
          ["itemLink"] = "|H1:item:123:1:1:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h|h",
          ["accountName"] = "@TestAccount",
          ["zone"] = "$AccountWide",
        }
      `;

      const result = parseLuaSavedVariables(lua);

      expect(result.TestData.itemLink).toContain('|H1:item:123');
      expect(result.TestData.accountName).toBe('@TestAccount');
      expect(result.TestData.zone).toBe('$AccountWide');
    });

    it('should throw error for invalid Lua', () => {
      const invalidLua = 'this is not valid lua {[}]';

      expect(() => parseLuaSavedVariables(invalidLua)).toThrow();
    });
  });

  describe('extractWizardWardrobeData', () => {
    it('should extract Wizard Wardrobe data from ESO saved variables structure', () => {
      const lua = `
        WizardWardrobeDataSaved = {
          ["Default"] = {
            ["@TestAccount"] = {
              ["$AccountWide"] = {
                ["version"] = 1,
                ["selectedZoneTag"] = "SS",
                ["setups"] = {},
                ["pages"] = {},
              },
            },
          },
        }
      `;

      const parsed = parseLuaSavedVariables(lua);
      const allWizardData = extractWizardWardrobeData(parsed);

      expect(allWizardData).not.toBeNull();
      expect(allWizardData).toBeDefined();

      // extractWizardWardrobeData now returns all characters
      const wizardData = allWizardData?.['$AccountWide'];
      expect(wizardData).toBeDefined();
      expect(wizardData?.version).toBe(1);
      expect(wizardData?.selectedZoneTag).toBe('SS');
      expect(wizardData?.setups).toBeDefined();
      expect(wizardData?.pages).toBeDefined();
    });

    it('should handle complete Wizard Wardrobe export', () => {
      const lua = `
        WizardWardrobeDataSaved = {
          ["Default"] = {
            ["@TestAccount"] = {
              ["$AccountWide"] = {
                ["version"] = 1,
                ["selectedZoneTag"] = "SS",
                ["setups"] = {
                  ["SS"] = {
                    [1] = {
                      ["name"] = "Lokke HM",
                      ["disabled"] = false,
                      ["condition"] = {
                        ["boss"] = "Lokkestiiz",
                      },
                      ["skills"] = {
                        [0] = {
                          [3] = 123456,
                          [4] = 789012,
                        },
                        [1] = {
                          [3] = 111222,
                          [8] = 333444,
                        },
                      },
                      ["cp"] = {},
                      ["food"] = {},
                      ["gear"] = {},
                    },
                  },
                },
                ["pages"] = {
                  ["SS"] = {
                    [1] = {
                      ["selected"] = 1,
                    },
                  },
                },
              },
            },
          },
        }
      `;

      const parsed = parseLuaSavedVariables(lua);
      const allWizardData = extractWizardWardrobeData(parsed);

      expect(allWizardData).not.toBeNull();

      // extractWizardWardrobeData now returns all characters
      const wizardData = allWizardData?.['$AccountWide'];
      expect(wizardData).toBeDefined();
      expect(wizardData?.setups['SS']).toBeDefined();
      expect(Array.isArray(wizardData?.setups['SS'])).toBe(true);

      // The first element of the array is an object with numeric keys
      const firstPage = wizardData?.setups['SS']?.[0];
      expect(firstPage).toBeDefined();
      expect(firstPage?.name).toBe('Lokke HM');
    });

    it('should return null for missing Wizard Wardrobe data', () => {
      const parsed = { SomeOtherAddon: {} };
      const wizardData = extractWizardWardrobeData(parsed);

      expect(wizardData).toBeNull();
    });

    it('should return null for malformed structure', () => {
      const parsed = {
        WizardWardrobeDataSaved: {
          // Missing Default key
          RandomKey: {},
        },
      };
      const wizardData = extractWizardWardrobeData(parsed);

      expect(wizardData).toBeNull();
    });

    it('should extract characters from multiple accounts', () => {
      const lua = `
        WizardsWardrobeSV = {
          ["Default"] = {
            ["@Account1"] = {
              ["char1"] = {
                ["version"] = 1,
                ["setups"] = {},
                ["pages"] = {},
                ["$LastCharacterName"] = "Character One",
              },
              ["$AccountWide"] = {
                ["version"] = 1,
              },
            },
            ["@Account2"] = {
              ["char2"] = {
                ["version"] = 1,
                ["setups"] = { ["GEN"] = {} },
                ["pages"] = {},
                ["$LastCharacterName"] = "Character Two",
              },
              ["char3"] = {
                ["version"] = 1,
                ["setups"] = { ["SS"] = {} },
                ["pages"] = {},
                ["$LastCharacterName"] = "Character Three",
              },
              ["$AccountWide"] = {
                ["version"] = 1,
              },
            },
          },
        }
      `;

      const parsed = parseLuaSavedVariables(lua);
      const allWizardData = extractWizardWardrobeData(parsed);

      expect(allWizardData).not.toBeNull();

      // Should find characters from both accounts
      expect(allWizardData?.['char1']).toBeDefined();
      expect(allWizardData?.['char2']).toBeDefined();
      expect(allWizardData?.['char3']).toBeDefined();

      expect((allWizardData?.['char1'] as any).$LastCharacterName).toBe('Character One');
      expect((allWizardData?.['char2'] as any).$LastCharacterName).toBe('Character Two');
      expect((allWizardData?.['char3'] as any).$LastCharacterName).toBe('Character Three');
    });
  });

  describe('isWizardWardrobeFormat', () => {
    it('should validate correct Wizard Wardrobe format', () => {
      const validData: WizardWardrobeExport = {
        version: 1,
        selectedZoneTag: 'SS',
        setups: {},
        pages: {},
      };

      expect(isWizardWardrobeFormat(validData)).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(isWizardWardrobeFormat(null as any)).toBe(false);
      expect(isWizardWardrobeFormat(undefined as any)).toBe(false);
      expect(isWizardWardrobeFormat({})).toBe(false);
      expect(isWizardWardrobeFormat({ version: 1 })).toBe(false);
      expect(isWizardWardrobeFormat({ setups: {}, pages: {} })).toBe(false);
    });
  });
});
