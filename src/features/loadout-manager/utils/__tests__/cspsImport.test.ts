/**
 * @jest-environment jsdom
 */

import {
  parseCSPSInput,
  convertCSPSCharacterToBuild,
  type CSPSCharacterOption,
} from '../../../build-editor/utils/cspsImport';
import type { CSPSCharacterData } from '../cspsConverter';

// ── Helpers ──────────────────────────────────────────────────────────

/** Build a minimal CSPS SavedVariables Lua string */
function makeCSPSLua(
  charOverrides: Partial<CSPSCharacterData> = {},
  characterName = 'Test Character',
): string {
  // comp1: "attributes#hotbar#cpPoints#cpHotbar#quickslots#role#mundus"
  const comp1 =
    charOverrides.comp1 ??
    '10;54;0#100,200,300,400,500,600;700,800,900,1000,1100,1200#91234-1;91235-1#29,92,78,82;3,25,12,8;46,48,2,51#5001#1#13';

  return `CSPSSavedVariables =
{
    ["Default"] =
    {
        ["@TestAccount"] =
        {
            ["$AccountWide"] =
            {
                ["settings"] =
                {
                    ["applyCP"] = false,
                },
                ["charData"] =
                {
                    ["12345"] =
                    {
                        ["werte"] =
                        {
                            ["prog"] =
                            {
                                ["part1"] = "100:1,200:2,300:1",
                            },
                            ["pass"] =
                            {
                                ["part1"] = "400:3,500:2",
                            },
                        },
                        ["comp1"] = "${comp1}",
                        ["comp2"] = "gearData#gearUniqueData#outfitData",
                        ["$lastCharacterName"] = "${characterName}",
                    },
                },
            },
        },
    },
}
`;
}

function makeCSPSCharacterOption(
  overrides: Partial<CSPSCharacterData> = {},
  name = 'Test Character',
): CSPSCharacterOption {
  return {
    compositeKey: '@TestAccount/$AccountWide/12345',
    name,
    accountName: '@TestAccount',
    profileCount: 0,
    data: {
      comp1:
        '10;54;0#100,200,300,400,500,600;700,800,900,1000,1100,1200#91234-1;91235-1#29,92,78,82;3,25,12,8;46,48,2,51#5001#1#13',
      comp2: 'gearData#gearUniqueData#outfitData',
      werte: {
        prog: { part1: '100:1,200:2' },
        pass: { part1: '400:3' },
      },
      $lastCharacterName: name,
      ...overrides,
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('cspsImport', () => {
  describe('parseCSPSInput', () => {
    it('parses valid CSPS Lua and returns characters', () => {
      const lua = makeCSPSLua();
      const result = parseCSPSInput(lua);
      expect(result.characters).toHaveLength(1);
      expect(result.characters[0].name).toBe('Test Character');
      expect(result.characters[0].accountName).toBe('@TestAccount');
    });

    it('throws for non-CSPS input', () => {
      expect(() => parseCSPSInput('not lua at all')).toThrow();
    });

    it('throws for empty CSPS data', () => {
      const lua = `CSPSSavedVariables =\n{\n    ["Default"] = {},\n}\n`;
      expect(() => parseCSPSInput(lua)).toThrow(/no characters/i);
    });
  });

  describe('convertCSPSCharacterToBuild', () => {
    it('creates a Build with skills from hotbar', () => {
      const char = makeCSPSCharacterOption();
      const build = convertCSPSCharacterToBuild(char);

      expect(build.name).toBe('Test Character');
      expect(build.shortDescription).toContain('@TestAccount');
      expect(build.setups).toHaveLength(1);

      // Front bar: 100,200,300,400,500 abilities + 600 ult
      const frontBar = build.setups[0].skills[0];
      expect(frontBar[3]).toBe(100); // slot 3 = ability 1
      expect(frontBar[4]).toBe(200);
      expect(frontBar[5]).toBe(300);
      expect(frontBar[8]).toBe(600); // slot 8 = ultimate

      // Back bar: 700,800,900,1000,1100 abilities + 1200 ult
      const backBar = build.setups[0].skills[1];
      expect(backBar[3]).toBe(700);
      expect(backBar[8]).toBe(1200);
    });

    it('maps attributes from comp1', () => {
      const char = makeCSPSCharacterOption();
      const build = convertCSPSCharacterToBuild(char);

      // Attributes string "10;54;0" → health=10, magicka=54, stamina=0
      expect(build.setups[0].attributes.health).toBe(10);
      expect(build.setups[0].attributes.magicka).toBe(54);
      expect(build.setups[0].attributes.stamina).toBe(0);
    });

    it('maps mundus stone from comp1', () => {
      // comp1 has mundus=13 at the end — that's mundus ability ID 13
      // But the test data has "13" which is not a valid mundus ability ID
      // Let's test with a valid mundus ID
      const char = makeCSPSCharacterOption({
        comp1:
          '10;54;0#100,200,300,400,500,600;700,800,900,1000,1100,1200#91234-1;91235-1#29,92,78,82;3,25,12,8;46,48,2,51#5001#1#13984',
      });
      const build = convertCSPSCharacterToBuild(char);
      expect(build.setups[0].mundusStone).toBe('shadow'); // 13984 = The Shadow
    });

    it('maps role from comp1', () => {
      // role=1 in comp1 → DPS
      const char = makeCSPSCharacterOption();
      const build = convertCSPSCharacterToBuild(char);
      expect(build.role).toBe('magicka-dps');

      // role=2 → tank
      const tankChar = makeCSPSCharacterOption({
        comp1: '10;54;0#100,200,300,400,500,600;700,800,900,1000,1100,1200####2#13940',
      });
      const tankBuild = convertCSPSCharacterToBuild(tankChar);
      expect(tankBuild.role).toBe('tank');

      // role=4 → healer
      const healChar = makeCSPSCharacterOption({
        comp1: '10;54;0#100,200,300,400,500,600;700,800,900,1000,1100,1200####4#13940',
      });
      const healBuild = convertCSPSCharacterToBuild(healChar);
      expect(healBuild.role).toBe('healer');
    });

    it('imports gear from comp2', () => {
      const char = makeCSPSCharacterOption({
        comp2: '100:1:5:5:200;50:2:3:4:300;0;0;0;0;0;0;0;0;0;0;0;0;0;0#uniqueIds#outfitData',
      });
      const build = convertCSPSCharacterToBuild(char);
      // HEAD (slot 0) from first entry
      // resolveSetIdToItemId maps CSPS set IDs → item IDs via collection data
      expect(build.setups[0].gear[0]).toBeDefined();
      expect(build.setups[0].gear[0].id).toBe(44132);
      expect(build.setups[0].gear[0].trait).toBe('5');
      expect(build.setups[0].gear[0].enchant).toBe('200');
      // SHOULDERS (slot 3) from second entry
      expect(build.setups[0].gear[3]).toBeDefined();
      expect(build.setups[0].gear[3].id).toBe(43855);
    });

    it('imports passives from werte.pass', () => {
      const char = makeCSPSCharacterOption({
        werte: {
          prog: { part1: '100:1,200:2' },
          pass: { part1: '400:3,500:2,600:1' },
        },
      });
      const build = convertCSPSCharacterToBuild(char);
      expect(build.setups[0].passives).toContain(400);
      expect(build.setups[0].passives).toContain(500);
      expect(build.setups[0].passives).toContain(600);
      expect(build.setups[0].passives).toHaveLength(3);
    });

    it('imports scribed abilities from hotbar', () => {
      // "c" prefix marks scribed abilities — e.g. c12345
      const char = makeCSPSCharacterOption({
        comp1: '10;54;0#c100,200,300,400,500,c600;700,800,900,1000,1100,1200####1#13940',
      });
      const build = convertCSPSCharacterToBuild(char);

      // Scribed abilities should still appear as numeric IDs in skills
      expect(build.setups[0].skills[0][3]).toBe(100);
      expect(build.setups[0].skills[0][8]).toBe(600); // ultimate was scribed

      // scribedAbilityIds should track which ones had the "c" prefix
      expect(build.setups[0].scribedAbilityIds).toBeDefined();
      expect(build.setups[0].scribedAbilityIds).toContain(100);
      expect(build.setups[0].scribedAbilityIds).toContain(600);
      expect(build.setups[0].scribedAbilityIds).not.toContain(200);
    });

    it('imports quickslots from comp1', () => {
      // quickslots format: "type:id,type:id,..."
      const char = makeCSPSCharacterOption({
        comp1: '10;54;0#100,200,300,400,500,600;700,800,900,1000,1100,1200###5:1234,5:5678#1#13940',
      });
      const build = convertCSPSCharacterToBuild(char);
      expect(build.setups[0].quickslots).toBeDefined();
      expect(build.setups[0].quickslots).toHaveLength(2);
      expect(build.setups[0].quickslots![0]).toEqual({ type: 5, id: 1234 });
      expect(build.setups[0].quickslots![1]).toEqual({ type: 5, id: 5678 });
    });

    it('imports skilled abilities (werte.prog) with morph data', () => {
      const char = makeCSPSCharacterOption({
        werte: {
          prog: { part1: '100:1,200:2,300:0' },
          pass: { part1: '400:3' },
        },
      });
      const build = convertCSPSCharacterToBuild(char);
      expect(build.setups[0].skilledAbilities).toBeDefined();
      expect(build.setups[0].skilledAbilities).toHaveLength(3);
      expect(build.setups[0].skilledAbilities![0]).toEqual({ abilityId: 100, morph: 1 });
      expect(build.setups[0].skilledAbilities![1]).toEqual({ abilityId: 200, morph: 2 });
      expect(build.setups[0].skilledAbilities![2]).toEqual({ abilityId: 300, morph: 0 });
    });

    it('maps champion point hotbar to tree slots', () => {
      const char = makeCSPSCharacterOption();
      const build = convertCSPSCharacterToBuild(char);
      const cp = build.setups[0].cp;

      // cpHotbar: "29,92,78,82;3,25,12,8;46,48,2,51"
      // Craft slots: 29, 92, 78, 82
      expect(cp.craft.slots).toEqual([29, 92, 78, 82]);
      // Warfare slots: 3, 25, 12, 8
      expect(cp.warfare.slots).toEqual([3, 25, 12, 8]);
      // Fitness slots: 46, 48, 2, 51
      expect(cp.fitness.slots).toEqual([46, 48, 2, 51]);
    });

    it('converts profiles into additional setups', () => {
      const char = makeCSPSCharacterOption({
        profiles: {
          1: {
            name: 'PvP Build',
            comp1: '0;64;0#10,20,30,40,50,60;70,80,90,10,11,12###5001#1#13',
            $lastCharacterName: 'Test Character',
          },
          2: {
            name: 'Tank Build',
            comp1: '64;0;0#1,2,3,4,5,6;7,8,9,10,11,12###5001#1#13',
            $lastCharacterName: 'Test Character',
          },
        },
      });

      const build = convertCSPSCharacterToBuild(char);
      expect(build.setups).toHaveLength(3);
      expect(build.setups[0].name).toBe('Active Build');
      expect(build.setups[1].name).toBe('PvP Build');
      expect(build.setups[2].name).toBe('Tank Build');
    });

    it('limits to 5 setups max', () => {
      const profiles: Record<string, unknown> = {};
      for (let i = 1; i <= 10; i++) {
        profiles[i] = {
          name: `Profile ${i}`,
          comp1: '0;0;0#1,2,3,4,5,6;7,8,9,10,11,12###5001#1#13',
        };
      }

      const char = makeCSPSCharacterOption({ profiles } as Partial<CSPSCharacterData>);
      const build = convertCSPSCharacterToBuild(char);
      expect(build.setups.length).toBeLessThanOrEqual(5);
    });

    it('produces a valid Build structure', () => {
      const char = makeCSPSCharacterOption();
      const build = convertCSPSCharacterToBuild(char);

      expect(build.id).toBeTruthy();
      expect(build.esoClass).toBeTruthy();
      expect(build.role).toBeTruthy();
      expect(build.gameMode).toBe('pve');
      expect(build.classSkillLines).toHaveLength(3);
      expect(build.settings.setupOrder).toEqual([0]);
      expect(build.createdAt).toBeTruthy();
      expect(build.updatedAt).toBeTruthy();
    });

    it('handles character with no comp1', () => {
      const char = makeCSPSCharacterOption({ comp1: undefined });
      const build = convertCSPSCharacterToBuild(char);
      expect(build.setups).toHaveLength(1);
      // Should still create a setup with empty skills
      expect(build.setups[0].skills[0]).toEqual({});
    });
  });
});
