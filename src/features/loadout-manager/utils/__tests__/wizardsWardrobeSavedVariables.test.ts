import { ChampionPointAbilityId } from '@/types/champion-points';

import {
  parseLuaAssignments,
  parseWizardsWardrobeSavedVariables,
  serializeWizardsWardrobeSavedVariables,
  type WizardWardrobeSavedVariables,
} from '../wizardsWardrobeSavedVariables';

describe('wizardsWardrobeSavedVariables', () => {
  it('parses WizardsWardrobeSV tables', () => {
    const lua = `
      WizardsWardrobeSV = {
        ["Default"] = {
          ["@Account"] = {
            ["$AccountWide"] = {
              ["version"] = 1,
              ["selectedZoneTag"] = "GEN",
              ["setups"] = {},
              ["pages"] = {},
              ["cp"] = {
                [1] = 29,
              },
            },
          },
        },
      }
    `;

    const parsed = parseWizardsWardrobeSavedVariables(lua);
    const accountWide = parsed.Default?.['@Account']?.$AccountWide;

    expect(accountWide?.version).toBe(1);
    expect(accountWide?.selectedZoneTag).toBe('GEN');
    expect(accountWide?.cp?.[1]).toBe(ChampionPointAbilityId.CleansingRevival);
  });

  it('parses alternate table names via options', () => {
    const lua = `
      WizardWardrobeDataSaved = {
        ["Default"] = {
          ["@Account"] = {
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

    const parsed = parseWizardsWardrobeSavedVariables(lua, {
      tableName: 'WizardWardrobeDataSaved',
    });
    const accountWide = parsed.Default?.['@Account']?.$AccountWide;

    expect(accountWide?.selectedZoneTag).toBe('SS');
  });

  it('round-trips serialized output back to parsed data', () => {
    const input: WizardWardrobeSavedVariables = {
      Default: {
        '@Account': {
          $AccountWide: {
            version: 1,
            selectedZoneTag: 'GEN',
            setups: {
              GEN: [
                {
                  name: 'General Setup',
                  disabled: false,
                  condition: { boss: 'Trash' },
                  skills: {
                    0: { 3: 12345 },
                    1: { 3: 22222 },
                  },
                  cp: { 1: ChampionPointAbilityId.CleansingRevival },
                  food: { id: 123 },
                  gear: {},
                },
              ],
            },
            pages: {
              GEN: [{ name: 'General Page' }],
            },
          },
        },
      },
    };

    const serialized = serializeWizardsWardrobeSavedVariables(input);
    const parsed = parseWizardsWardrobeSavedVariables(serialized);

    expect(parsed.Default?.['@Account']?.$AccountWide?.selectedZoneTag).toBe('GEN');
    expect(parsed.Default?.['@Account']?.$AccountWide?.setups).toBeDefined();
  });

  it('keeps both implicit positional and explicit numeric-key entries in a mixed table', () => {
    // A Lua table that carries BOTH bare positional values AND explicit [N] = ...
    // numeric-key entries must not drop the positional ("implicit") values.
    const assignments = parseLuaAssignments(`Mixed = { "a", "b", [5] = "e", [6] = "f" }`);
    const mixed = assignments.Mixed as Record<string, unknown>;

    expect(Array.isArray(mixed)).toBe(false);
    // Implicit values take consecutive 1-based indices.
    expect(mixed['1']).toBe('a');
    expect(mixed['2']).toBe('b');
    // Explicit numeric keys are preserved.
    expect(mixed['5']).toBe('e');
    expect(mixed['6']).toBe('f');
  });

  it('does not change pure-array or pure-object tables', () => {
    const arrayCase = parseLuaAssignments(`Arr = { "a", "b", "c" }`);
    expect(arrayCase.Arr).toEqual(['a', 'b', 'c']);

    const objectCase = parseLuaAssignments(`Obj = { ["x"] = 1, ["y"] = 2 }`);
    expect(objectCase.Obj).toEqual({ x: 1, y: 2 });
  });
});
