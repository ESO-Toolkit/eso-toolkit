/**
 * @jest-environment jsdom
 */

import {
  detectCSPSData,
  extractCSPSCharacters,
  convertCSPSToLoadoutState,
  mergeLoadoutStateIntoCSPS,
  serializeCSPSToLua,
  decompressSkillParts,
  compressSkillEntries,
  decompressComp1,
  compressComp1,
  decompressComp2,
  compressComp2,
  parseGearComp,
  serializeGearComp,
  parseHotbar,
  serializeHotbar,
  parseAttributes,
  serializeAttributes,
  parseChampionPoints,
  serializeChampionPoints,
  type CSPSSavedVariables,
  type CSPSCharacterData,
  type CSPSComp1,
} from '../cspsConverter';

// ── Helper to build minimal CSPS saved variables ─────────────────────

function makeCSPSData(
  charOverrides: Partial<CSPSCharacterData> = {},
  characterName = 'Test Character',
): CSPSSavedVariables {
  const charId = '12345';
  return {
    Default: {
      '@TestAccount': {
        $AccountWide: {
          settings: { applyCP: false },
          charData: {
            [charId]: {
              werte: {
                prog: {
                  part1: '100:1,200:2,300:1',
                },
                pass: {
                  part1: '400:3,500:2',
                },
              },
              comp1:
                '10;54;0#100,200,300,400,500,600;700,800,900,1000,1100,1200#91234-1;91235-1#91234,91235;91236,91237#5001,5002#1#13',
              comp2: 'gearData#gearUniqueData#outfitData',
              $lastCharacterName: characterName,
              ...charOverrides,
            },
          },
        },
      },
    },
  };
}

// ── detectCSPSData ───────────────────────────────────────────────────

describe('cspsConverter', () => {
  describe('detectCSPSData', () => {
    it('detects CSPSSavedVariables table', () => {
      const parsed = {
        CSPSSavedVariables: {
          Default: {
            '@TestAccount': {},
          },
        },
      };
      const result = detectCSPSData(parsed);
      expect(result).not.toBeNull();
      expect(result!.tableName).toBe('CSPSSavedVariables');
    });

    it('returns null when no CSPS table is found', () => {
      const parsed = {
        AGX2_Character: { Default: {} },
      };
      expect(detectCSPSData(parsed)).toBeNull();
    });

    it('returns null when table lacks Default key', () => {
      const parsed = {
        CSPSSavedVariables: { version: 1 },
      };
      expect(detectCSPSData(parsed)).toBeNull();
    });

    it('detects alternative table names', () => {
      const parsed = {
        CarosSkillPointSaver: {
          Default: {},
        },
      };
      const result = detectCSPSData(parsed);
      expect(result).not.toBeNull();
      expect(result!.tableName).toBe('CarosSkillPointSaver');
    });
  });

  // ── String decompression/compression ─────────────────────────────────

  describe('decompressSkillParts', () => {
    it('parses comma-separated abilityId:value pairs from parts', () => {
      const parts = {
        part1: '100:1,200:2,300:0',
      };
      const entries = decompressSkillParts(parts);
      expect(entries).toEqual([
        { abilityId: 100, value: 1 },
        { abilityId: 200, value: 2 },
        { abilityId: 300, value: 0 },
      ]);
    });

    it('handles multiple parts in order', () => {
      const parts = {
        part1: '100:1,200:2',
        part2: '300:0,400:3',
      };
      const entries = decompressSkillParts(parts);
      expect(entries).toHaveLength(4);
      expect(entries[0].abilityId).toBe(100);
      expect(entries[2].abilityId).toBe(300);
    });

    it('returns empty array for undefined input', () => {
      expect(decompressSkillParts(undefined)).toEqual([]);
    });

    it('skips empty strings and invalid entries', () => {
      const parts = {
        part1: '100:1,,invalid,200:2',
      };
      const entries = decompressSkillParts(parts);
      expect(entries).toEqual([
        { abilityId: 100, value: 1 },
        { abilityId: 200, value: 2 },
      ]);
    });
  });

  describe('compressSkillEntries', () => {
    it('creates part strings from entries', () => {
      const entries = [
        { abilityId: 100, value: 1 },
        { abilityId: 200, value: 2 },
      ];
      const parts = compressSkillEntries(entries);
      expect(parts).toEqual({ part1: '100:1,200:2' });
    });

    it('chunks entries into parts of 100', () => {
      const entries = Array.from({ length: 150 }, (_, i) => ({
        abilityId: i + 1,
        value: 0,
      }));
      const parts = compressSkillEntries(entries);
      expect(Object.keys(parts)).toEqual(['part1', 'part2']);
      expect(parts.part1.split(',').length).toBe(100);
      expect(parts.part2.split(',').length).toBe(50);
    });

    it('round-trips with decompressSkillParts', () => {
      const original = [
        { abilityId: 100, value: 1 },
        { abilityId: 200, value: 2 },
        { abilityId: 300, value: 0 },
      ];
      const compressed = compressSkillEntries(original);
      const decompressed = decompressSkillParts(compressed);
      expect(decompressed).toEqual(original);
    });
  });

  // ── comp1 decompress/compress ──────────────────────────────────────

  describe('decompressComp1', () => {
    it('parses comp1 into its 7 fields', () => {
      const comp1 = 'attrs#hotbar#cp#cpHb#qs#role#mundus';
      const result = decompressComp1(comp1);
      expect(result).toEqual({
        attributes: 'attrs',
        hotbar: 'hotbar',
        cpPoints: 'cp',
        cpHotbar: 'cpHb',
        quickslots: 'qs',
        role: 'role',
        mundus: 'mundus',
      });
    });

    it('returns null for undefined input', () => {
      expect(decompressComp1(undefined)).toBeNull();
    });

    it('handles missing trailing fields', () => {
      const comp1 = 'attrs#hotbar#cp';
      const result = decompressComp1(comp1);
      expect(result!.attributes).toBe('attrs');
      expect(result!.quickslots).toBe('');
    });
  });

  describe('compressComp1', () => {
    it('round-trips with decompressComp1', () => {
      const original = 'attrs#hotbar#cp#cpHb#qs#role#mundus';
      const decomp = decompressComp1(original)!;
      const recomp = compressComp1(decomp);
      expect(recomp).toBe(original);
    });
  });

  // ── comp2 decompress/compress ──────────────────────────────────────

  describe('decompressComp2', () => {
    it('parses comp2 into its 3 fields', () => {
      const comp2 = 'gearData#uniqueData#outfitData';
      const result = decompressComp2(comp2);
      expect(result).toEqual({
        gearComp: 'gearData',
        gearCompUnique: 'uniqueData',
        outfitComp: 'outfitData',
      });
    });

    it('returns null for undefined input', () => {
      expect(decompressComp2(undefined)).toBeNull();
    });
  });

  describe('compressComp2', () => {
    it('round-trips with decompressComp2', () => {
      const original = 'gearData#uniqueData#outfitData';
      const decomp = decompressComp2(original)!;
      const recomp = compressComp2(decomp);
      expect(recomp).toBe(original);
    });
  });

  // ── Gear parsing ──────────────────────────────────────────────────

  describe('parseGearComp', () => {
    it('parses gear entries with setId:type:trait:quality:enchant', () => {
      // HEAD=slot0, SHOULDERS=slot3
      const gear = '100:1:5:5:200;50:2:3:4:300;0;0;0;0;0;0;0;0;0;0;0;0;0;0';
      const result = parseGearComp(gear);
      expect(result[0]).toEqual({ setId: 100, type: 1, trait: 5, quality: 5, enchant: 200 });
      expect(result[3]).toEqual({ setId: 50, type: 2, trait: 3, quality: 4, enchant: 300 });
      expect(result[2]).toBeUndefined(); // CHEST was "0"
    });

    it('skips empty/dash entries', () => {
      const gear = '0;-;0;0;0;0;0;0;0;0;0;0;0;0;0;0';
      const result = parseGearComp(gear);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('returns empty for empty string', () => {
      expect(parseGearComp('')).toEqual({});
    });
  });

  describe('serializeGearComp', () => {
    it('produces semicolon-separated entries with poison slots', () => {
      const gear = { 0: { setId: 100, type: 1, trait: 5, quality: 5, enchant: 200 } };
      const result = serializeGearComp(gear);
      const parts = result.split(';');
      expect(parts[0]).toBe('100:1:5:5:200'); // HEAD
      expect(parts[1]).toBe('0'); // SHOULDERS (empty)
      expect(parts).toHaveLength(16); // 14 gear + 2 poison
    });

    it('round-trips with parseGearComp', () => {
      const original = { 0: { setId: 100, type: 1, trait: 5, quality: 5, enchant: 200 } };
      const serialized = serializeGearComp(original);
      const parsed = parseGearComp(serialized);
      expect(parsed[0]).toEqual(original[0]);
    });
  });

  // ── Hotbar parsing ─────────────────────────────────────────────────

  describe('parseHotbar', () => {
    it('parses front and back bar ability IDs', () => {
      const result = parseHotbar('100,200,300,400,500,600;700,800,900,1000,1100,1200');
      expect(result.frontBar).toEqual([100, 200, 300, 400, 500, 600]);
      expect(result.backBar).toEqual([700, 800, 900, 1000, 1100, 1200]);
    });

    it('pads short bars to 6 slots', () => {
      const result = parseHotbar('100,200;300');
      expect(result.frontBar).toHaveLength(6);
      expect(result.frontBar[0]).toBe(100);
      expect(result.frontBar[2]).toBe(0);
      expect(result.backBar[0]).toBe(300);
      expect(result.backBar[1]).toBe(0);
    });

    it('handles empty hotbar string', () => {
      const result = parseHotbar('');
      expect(result.frontBar).toEqual([0, 0, 0, 0, 0, 0]);
      expect(result.backBar).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it('parses scribed abilities with "c" prefix', () => {
      const result = parseHotbar('c100,200,c300,400,500,600;700,c800,900,1000,1100,1200');
      expect(result.frontBar).toEqual([100, 200, 300, 400, 500, 600]);
      expect(result.backBar).toEqual([700, 800, 900, 1000, 1100, 1200]);
      expect(result.scribedIds).toBeDefined();
      expect(result.scribedIds!.has(100)).toBe(true);
      expect(result.scribedIds!.has(300)).toBe(true);
      expect(result.scribedIds!.has(800)).toBe(true);
      expect(result.scribedIds!.has(200)).toBe(false);
    });

    it('handles dash entries as empty', () => {
      const result = parseHotbar('-,200,-,400,500,600;700,800,900,1000,1100,1200');
      expect(result.frontBar[0]).toBe(0);
      expect(result.frontBar[1]).toBe(200);
      expect(result.frontBar[2]).toBe(0);
    });
  });

  describe('serializeHotbar', () => {
    it('round-trips with parseHotbar', () => {
      const original = '100,200,300,400,500,600;700,800,900,1000,1100,1200';
      const parsed = parseHotbar(original);
      const serialized = serializeHotbar(parsed);
      expect(serialized).toBe(original);
    });

    it('round-trips scribed abilities with "c" prefix', () => {
      const original = 'c100,200,c300,400,500,600;700,c800,900,1000,1100,1200';
      const parsed = parseHotbar(original);
      const serialized = serializeHotbar(parsed);
      expect(serialized).toBe(original);
    });
  });

  // ── Attributes parsing ─────────────────────────────────────────────

  describe('parseAttributes', () => {
    it('parses health;magicka;stamina', () => {
      const result = parseAttributes('10;54;0');
      expect(result).toEqual({ health: 10, magicka: 54, stamina: 0 });
    });

    it('defaults to 0 for missing values', () => {
      const result = parseAttributes('');
      expect(result).toEqual({ health: 0, magicka: 0, stamina: 0 });
    });
  });

  describe('serializeAttributes', () => {
    it('round-trips with parseAttributes', () => {
      const original = '10;54;0';
      const parsed = parseAttributes(original);
      const serialized = serializeAttributes(parsed);
      expect(serialized).toBe(original);
    });
  });

  // ── Champion Points parsing ────────────────────────────────────────

  describe('parseChampionPoints', () => {
    it('parses skillId-value pairs', () => {
      const result = parseChampionPoints('91234-1;91235-1');
      expect(result).toEqual([
        { skillId: 91234, value: 1 },
        { skillId: 91235, value: 1 },
      ]);
    });

    it('returns empty for empty string', () => {
      expect(parseChampionPoints('')).toEqual([]);
    });

    it('skips invalid entries', () => {
      const result = parseChampionPoints('91234-1;invalid;91235-2');
      expect(result).toHaveLength(2);
    });
  });

  describe('serializeChampionPoints', () => {
    it('round-trips with parseChampionPoints', () => {
      const original = '91234-1;91235-2';
      const parsed = parseChampionPoints(original);
      const serialized = serializeChampionPoints(parsed);
      expect(serialized).toBe(original);
    });
  });

  // ── extractCSPSCharacters ──────────────────────────────────────────

  describe('extractCSPSCharacters', () => {
    it('extracts characters from CSPS saved variables', () => {
      const data = makeCSPSData();
      const characters = extractCSPSCharacters(data);
      const keys = Object.keys(characters);
      expect(keys.length).toBe(1);

      const char = characters[keys[0]];
      expect(char.name).toBe('Test Character');
      expect(char.accountName).toBe('@TestAccount');
      expect(char.data.werte).toBeDefined();
      expect(char.data.comp1).toBeDefined();
    });

    it('returns empty object when no Default key exists', () => {
      const data: CSPSSavedVariables = {};
      expect(extractCSPSCharacters(data)).toEqual({});
    });

    it('extracts multiple characters', () => {
      const data: CSPSSavedVariables = {
        Default: {
          '@TestAccount': {
            $AccountWide: {
              charData: {
                '111': {
                  comp1: '0;0;0#1,2,3,4,5,6;7,8,9,10,11,12#####',
                  $lastCharacterName: 'Char One',
                },
                '222': {
                  comp1: '0;0;0#1,2,3,4,5,6;7,8,9,10,11,12#####',
                  $lastCharacterName: 'Char Two',
                },
              },
            },
          },
        },
      };

      const characters = extractCSPSCharacters(data);
      const names = Object.values(characters).map((c) => c.name);
      expect(names).toContain('Char One');
      expect(names).toContain('Char Two');
    });

    it('uses character ID as name when $lastCharacterName is missing', () => {
      const data: CSPSSavedVariables = {
        Default: {
          '@TestAccount': {
            $AccountWide: {
              charData: {
                '99999': {
                  comp1: '0;0;0#1,2,3,4,5,6;7,8,9,10,11,12#####',
                },
              },
            },
          },
        },
      };

      const characters = extractCSPSCharacters(data);
      const char = Object.values(characters)[0];
      expect(char.name).toBe('Character 99999');
    });
  });

  // ── convertCSPSToLoadoutState ──────────────────────────────────────

  describe('convertCSPSToLoadoutState', () => {
    it('converts a character with hotbar skills', () => {
      const data = makeCSPSData();
      const characters = extractCSPSCharacters(data);
      const state = convertCSPSToLoadoutState(characters);

      // Character
      expect(state.characters).toHaveLength(1);
      expect(state.characters[0].name).toBe('Test Character');
      expect(state.currentTrial).toBe('GEN');

      // Pages
      const charId = state.characters[0].id;
      const genPages = state.pages[charId]?.GEN;
      expect(genPages).toBeDefined();
      expect(genPages!.length).toBeGreaterThanOrEqual(1);

      // Active Build page
      const activePage = genPages![0];
      expect(activePage.name).toBe('Active Build');
      expect(activePage.setups.length).toBe(1);

      // Skills from hotbar
      const setup = activePage.setups[0];
      // Front bar: 100,200,300,400,500,600 → slots 3-7 abilities, slot 8 ultimate
      expect(setup.skills[0][3]).toBe(100);
      expect(setup.skills[0][4]).toBe(200);
      expect(setup.skills[0][5]).toBe(300);
      expect(setup.skills[0][6]).toBe(400);
      expect(setup.skills[0][7]).toBe(500);
      expect(setup.skills[0][8]).toBe(600); // Ultimate

      // Back bar: 700,800,900,1000,1100,1200
      expect(setup.skills[1][3]).toBe(700);
      expect(setup.skills[1][8]).toBe(1200); // Ultimate
    });

    it('extracts champion points from comp1', () => {
      const data = makeCSPSData();
      const characters = extractCSPSCharacters(data);
      const state = convertCSPSToLoadoutState(characters);

      const charId = state.characters[0].id;
      const setup = state.pages[charId]?.GEN?.[0]?.setups?.[0];
      expect(setup).toBeDefined();
      expect(setup!.cp[1]).toBe(91234);
      expect(setup!.cp[2]).toBe(91235);
    });

    it('handles character with no comp1 or werte', () => {
      const data: CSPSSavedVariables = {
        Default: {
          '@TestAccount': {
            $AccountWide: {
              charData: {
                '111': {
                  $lastCharacterName: 'Empty Char',
                },
              },
            },
          },
        },
      };

      const characters = extractCSPSCharacters(data);
      const state = convertCSPSToLoadoutState(characters);
      expect(state.characters).toHaveLength(1);
      // No pages since there's no data
      const charId = state.characters[0].id;
      expect(state.pages[charId]).toBeUndefined();
    });

    it('converts profiles into separate pages', () => {
      const data = makeCSPSData({
        profiles: {
          1: {
            name: 'DPS Build',
            comp1: '0;0;64#2000,2001,2002,2003,2004,2005;3000,3001,3002,3003,3004,3005#####',
          },
          2: {
            name: 'Tank Build',
            comp1: '64;0;0#4000,4001,4002,4003,4004,4005;5000,5001,5002,5003,5004,5005#####',
          },
        },
      });

      const characters = extractCSPSCharacters(data);
      const state = convertCSPSToLoadoutState(characters);

      const charId = state.characters[0].id;
      const genPages = state.pages[charId]?.GEN;
      expect(genPages).toBeDefined();

      // Should have: Active Build + DPS Build + Tank Build = 3 pages
      expect(genPages!.length).toBe(3);
      expect(genPages![0].name).toBe('Active Build');
      expect(genPages![1].name).toBe('DPS Build');
      expect(genPages![2].name).toBe('Tank Build');

      // DPS Build front bar
      const dpsSetup = genPages![1].setups[0];
      expect(dpsSetup.skills[0][3]).toBe(2000);
      expect(dpsSetup.skills[0][8]).toBe(2005);

      // Tank Build front bar
      const tankSetup = genPages![2].setups[0];
      expect(tankSetup.skills[0][3]).toBe(4000);
    });
  });

  // ── mergeLoadoutStateIntoCSPS (round-trip) ─────────────────────────

  describe('mergeLoadoutStateIntoCSPS', () => {
    it('updates hotbar skills while preserving other fields', () => {
      const originalData = makeCSPSData();
      const characters = extractCSPSCharacters(originalData);
      const state = convertCSPSToLoadoutState(characters);

      // Modify the front bar skills
      const charId = state.characters[0].id;
      const setup = state.pages[charId]!.GEN![0].setups[0];
      setup.skills[0][3] = 9999; // Change first front bar ability

      const merged = mergeLoadoutStateIntoCSPS(originalData, state);

      // Verify the hotbar was updated
      const mergedChar = Object.values(
        (
          merged.Default!['@TestAccount']['$AccountWide'] as CSPSSavedVariables &
            Record<string, unknown>
        )['charData'] as Record<string, CSPSCharacterData>,
      )[0];
      const mergedComp1 = decompressComp1(mergedChar.comp1);
      expect(mergedComp1).not.toBeNull();
      const mergedHotbar = parseHotbar(mergedComp1!.hotbar);
      expect(mergedHotbar.frontBar[0]).toBe(9999);

      // Verify non-hotbar fields were preserved
      expect(mergedComp1!.role).toBe('1');
      expect(mergedComp1!.mundus).toBe('13');
      expect(mergedComp1!.quickslots).toBe('5001,5002');
      expect(mergedChar.comp2).toBe('gearData#gearUniqueData#outfitData');
      expect(mergedChar.werte).toBeDefined();
      expect(mergedChar.werte!.prog!.part1).toBe('100:1,200:2,300:1');
    });

    it('does not mutate the original data', () => {
      const originalData = makeCSPSData();
      const originalComp1 =
        (
          originalData.Default!['@TestAccount']['$AccountWide'] as CSPSSavedVariables &
            Record<string, unknown>
        )['charData'] &&
        Object.values(
          (originalData.Default!['@TestAccount']['$AccountWide'] as Record<string, unknown>)[
            'charData'
          ] as Record<string, CSPSCharacterData>,
        )[0].comp1;

      const characters = extractCSPSCharacters(originalData);
      const state = convertCSPSToLoadoutState(characters);

      // Modify something
      const charId = state.characters[0].id;
      state.pages[charId]!.GEN![0].setups[0].skills[0][3] = 8888;

      mergeLoadoutStateIntoCSPS(originalData, state);

      // Original should be untouched
      const currentComp1 = Object.values(
        (originalData.Default!['@TestAccount']['$AccountWide'] as Record<string, unknown>)[
          'charData'
        ] as Record<string, CSPSCharacterData>,
      )[0].comp1;
      expect(currentComp1).toBe(originalComp1);
    });
  });

  // ── serializeCSPSToLua ─────────────────────────────────────────────

  describe('serializeCSPSToLua', () => {
    it('produces valid Lua with the correct table name', () => {
      const data = makeCSPSData();
      const lua = serializeCSPSToLua(data);
      expect(lua).toContain('CSPSSavedVariables');
      expect(lua).toContain('["Default"]');
      expect(lua).toContain('"@TestAccount"');
      expect(lua).toContain('["charData"]');
      expect(lua).toContain('Test Character');
    });

    it('uses custom table name when provided', () => {
      const data: CSPSSavedVariables = { Default: {} };
      const lua = serializeCSPSToLua(data, 'CarosSkillPointSaver');
      expect(lua).toMatch(/^CarosSkillPointSaver/);
    });

    it('preserves string fields containing delimiters', () => {
      const data = makeCSPSData();
      const lua = serializeCSPSToLua(data);

      // comp1 and comp2 should be serialized as single strings with # delimiters
      expect(lua).toContain('#');
      expect(lua).toContain('gearData#gearUniqueData#outfitData');
    });

    it('round-trips a minimal character through serialize -> reparse', () => {
      const data = makeCSPSData();

      // Serialize to Lua
      const lua = serializeCSPSToLua(data);

      // Reparse
      const { parseLuaAssignments } = require('../wizardsWardrobeSavedVariables');
      const reparsed = parseLuaAssignments(lua);
      expect(reparsed['CSPSSavedVariables']).toBeDefined();

      // Re-detect
      const detected = detectCSPSData(reparsed);
      expect(detected).not.toBeNull();

      // Re-extract characters
      const characters = extractCSPSCharacters(detected!.data);
      expect(Object.keys(characters).length).toBe(1);

      const char = Object.values(characters)[0];
      expect(char.name).toBe('Test Character');

      // Convert and verify skills preserved
      const state = convertCSPSToLoadoutState(characters);
      const charId = state.characters[0].id;
      const setup = state.pages[charId]?.GEN?.[0]?.setups?.[0];
      expect(setup).toBeDefined();

      // Front bar abilities
      expect(setup!.skills[0][3]).toBe(100);
      expect(setup!.skills[0][8]).toBe(600);
      // Back bar abilities
      expect(setup!.skills[1][3]).toBe(700);
      expect(setup!.skills[1][8]).toBe(1200);
    });
  });

  // ── Full round-trip ────────────────────────────────────────────────

  describe('full round-trip', () => {
    it('upload -> modify -> export preserves unmodified data', () => {
      // 1. Start with CSPS data
      const originalData = makeCSPSData();

      // 2. Parse and convert
      const characters = extractCSPSCharacters(originalData);
      const state = convertCSPSToLoadoutState(characters);

      // 3. Modify one skill
      const charId = state.characters[0].id;
      state.pages[charId]!.GEN![0].setups[0].skills[0][3] = 42000;

      // 4. Merge back
      const merged = mergeLoadoutStateIntoCSPS(originalData, state);

      // 5. Serialize
      const lua = serializeCSPSToLua(merged);

      // 6. Reparse and verify
      const { parseLuaAssignments } = require('../wizardsWardrobeSavedVariables');
      const reparsed = parseLuaAssignments(lua);
      const detected = detectCSPSData(reparsed);
      const reExtracted = extractCSPSCharacters(detected!.data);
      const reState = convertCSPSToLoadoutState(reExtracted);

      const reCharId = reState.characters[0].id;
      const reSetup = reState.pages[reCharId]?.GEN?.[0]?.setups?.[0];

      // The modified skill should be there
      expect(reSetup!.skills[0][3]).toBe(42000);

      // Other skills should be preserved
      expect(reSetup!.skills[0][4]).toBe(200);
      expect(reSetup!.skills[1][3]).toBe(700);

      // Non-skill data should be preserved
      const reChar = Object.values(reExtracted)[0].data;
      expect(reChar.werte!.prog!.part1).toBe('100:1,200:2,300:1');
      expect(reChar.comp2).toBe('gearData#gearUniqueData#outfitData');
    });

    it('no-op round-trip produces functionally equivalent data', () => {
      // Upload -> no changes -> download should preserve everything
      const originalData = makeCSPSData();
      const characters = extractCSPSCharacters(originalData);
      const state = convertCSPSToLoadoutState(characters);

      // Merge with no changes
      const merged = mergeLoadoutStateIntoCSPS(originalData, state);

      // Verify comp1 hotbar is functionally equivalent
      const originalChar = Object.values(
        (originalData.Default!['@TestAccount']['$AccountWide'] as Record<string, unknown>)[
          'charData'
        ] as Record<string, CSPSCharacterData>,
      )[0];
      const mergedChar = Object.values(
        (merged.Default!['@TestAccount']['$AccountWide'] as Record<string, unknown>)[
          'charData'
        ] as Record<string, CSPSCharacterData>,
      )[0];

      const originalComp1 = decompressComp1(originalChar.comp1);
      const mergedComp1 = decompressComp1(mergedChar.comp1);

      // Hotbar should be equivalent
      const originalHotbar = parseHotbar(originalComp1!.hotbar);
      const mergedHotbar = parseHotbar(mergedComp1!.hotbar);
      expect(mergedHotbar).toEqual(originalHotbar);

      // Other comp1 fields should be identical
      expect(mergedComp1!.attributes).toBe(originalComp1!.attributes);
      expect(mergedComp1!.role).toBe(originalComp1!.role);
      expect(mergedComp1!.mundus).toBe(originalComp1!.mundus);
      expect(mergedComp1!.quickslots).toBe(originalComp1!.quickslots);

      // werte and comp2 should be identical
      expect(mergedChar.werte).toEqual(originalChar.werte);
      expect(mergedChar.comp2).toBe(originalChar.comp2);
    });
  });
});
