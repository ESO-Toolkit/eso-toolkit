import {
  parseWizardsWardrobeSavedVariables,
  serializeWizardsWardrobeSavedVariables,
  type WizardWardrobeSavedVariables,
} from '../wizardsWardrobeSavedVariables';

import { ChampionPointAbilityId } from '@/types/champion-points';

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
});
