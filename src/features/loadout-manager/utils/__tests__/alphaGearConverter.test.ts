/**
 * @jest-environment jsdom
 */

import {
  convertAlphaGearToLoadoutState,
  convertLoadoutStateToAlphaGear,
  serializeAlphaGearToLua,
  detectAlphaGearData,
  extractAlphaGearCharacters,
  type AlphaGearCharacterData,
  type AlphaGearSavedVariables,
} from '../alphaGearConverter';

describe('alphaGearConverter', () => {
  // ── detectAlphaGearData ──────────────────────────────────────────────

  describe('detectAlphaGearData', () => {
    it('detects AGX2_Character table', () => {
      const parsed = {
        AGX2_Character: {
          Default: {
            '@TestAccount': {
              TestChar: { setamount: 2 },
            },
          },
        },
      };
      const result = detectAlphaGearData(parsed);
      expect(result).not.toBeNull();
      expect(result!.tableName).toBe('AGX2_Character');
    });

    it('returns null when no AlphaGear table is found', () => {
      const parsed = {
        WizardsWardrobeSV: { Default: {} },
      };
      expect(detectAlphaGearData(parsed)).toBeNull();
    });

    it('returns null when table lacks Default key', () => {
      const parsed = {
        AGX2_Character: { version: 1 },
      };
      expect(detectAlphaGearData(parsed)).toBeNull();
    });
  });

  // ── extractAlphaGearCharacters ──────────────────────────────────────

  describe('extractAlphaGearCharacters', () => {
    it('extracts characters from saved variables', () => {
      const data: AlphaGearSavedVariables = {
        Default: {
          '@TestAccount': {
            'My Character': {
              setamount: 2,
              1: {
                Skill: { 1: 100, 2: 200, 3: 300, 4: 400, 5: 500, 6: 600 },
                Gear: {},
                Set: { text: { 1: 'Set A', 2: 0, 3: 0 } },
              },
            },
          },
        },
      };

      const characters = extractAlphaGearCharacters(data);
      expect(Object.keys(characters)).toEqual(['My Character']);
      expect(characters['My Character'].setamount).toBe(2);
    });

    it('skips $AccountWide entries', () => {
      const data: AlphaGearSavedVariables = {
        Default: {
          '@TestAccount': {
            $AccountWide: { version: 2 } as unknown as AlphaGearCharacterData,
            'Real Char': { setamount: 1 },
          },
        },
      };

      const characters = extractAlphaGearCharacters(data);
      expect(Object.keys(characters)).toEqual(['Real Char']);
    });

    it('returns empty object when no Default key exists', () => {
      const data: AlphaGearSavedVariables = {};
      expect(extractAlphaGearCharacters(data)).toEqual({});
    });
  });

  // ── convertAlphaGearToLoadoutState ──────────────────────────────────

  describe('convertAlphaGearToLoadoutState', () => {
    it('converts a character with top-level sets', () => {
      const characters: Record<string, AlphaGearCharacterData> = {
        'Test Hero': {
          setamount: 2,
          1: {
            Skill: { 1: 1001, 2: 1002, 3: 1003, 4: 1004, 5: 1005, 6: 9001 },
            Gear: {
              1: {
                link: '|H0:item:12345:363:50:0:0:0:0:0:0:0:0:0:0:0:1:0:0:1:0:0:0|h|h',
                id: '111',
              },
              5: {
                link: '|H0:item:67890:363:50:0:0:0:0:0:0:0:0:0:0:0:1:0:0:1:0:0:0|h|h',
                id: '222',
              },
              16: {
                link: 0,
                id: 0,
              },
            },
            Set: {
              text: { 1: 'Boss Setup', 2: 0, 3: 0 },
            },
          },
          2: {
            Skill: { 1: 2001, 2: 2002, 3: 0, 4: 0, 5: 0, 6: 0 },
            Gear: {
              3: {
                link: '|H0:item:11111:363:50:0:0:0:0:0:0:0:0:0:0:0:1:0:0:1:0:0:0|h|h',
                id: '333',
              },
            },
            Set: {
              text: { 1: 'Trash Setup', 2: 0, 3: 0 },
            },
          },
        },
      };

      const state = convertAlphaGearToLoadoutState(characters);

      // Character
      expect(state.characters).toHaveLength(1);
      expect(state.characters[0].name).toBe('Test Hero');
      expect(state.characters[0].id).toBe('test-hero');
      expect(state.currentCharacter).toBe('test-hero');

      // Pages under GEN trial
      expect(state.currentTrial).toBe('GEN');
      const genPages = state.pages['test-hero']?.GEN;
      expect(genPages).toBeDefined();
      expect(genPages!.length).toBeGreaterThanOrEqual(1);

      // First page should be "Gear Sets" with top-level sets
      const gearPage = genPages![0];
      expect(gearPage.name).toBe('Gear Sets');
      expect(gearPage.setups.length).toBe(2);

      // First setup
      const setup1 = gearPage.setups[0];
      expect(setup1.name).toBe('Boss Setup');
      expect(setup1.skills[0][3]).toBe(1001); // AG slot 1 → internal slot 3
      expect(setup1.skills[0][7]).toBe(1005); // AG slot 5 → internal slot 7
      expect(setup1.skills[0][8]).toBe(9001); // AG slot 6 (ult) → internal slot 8

      // Gear mapping: AG slot 1 → internal 4 (Main Hand), AG slot 5 → internal 0 (Head)
      expect(setup1.gear[4]?.link).toContain('item:12345');
      expect(setup1.gear[0]?.link).toContain('item:67890');
      // Empty slot 16 (Backup Poison) maps to null → filtered out
      expect(setup1.gear[16]).toBeUndefined();

      // Second setup
      const setup2 = gearPage.setups[1];
      expect(setup2.name).toBe('Trash Setup');
    });

    it('merges front/back bar pairs based on Set.skill metadata', () => {
      const characters: Record<string, AlphaGearCharacterData> = {
        PairedChar: {
          setamount: 2,
          1: {
            Skill: { 1: 100, 2: 200, 3: 300, 4: 400, 5: 500, 6: 600 },
            Gear: {
              1: {
                // AG slot 1 = Main Hand → internal 4
                link: '|H0:item:11111:363:50:0:0:0:0:0:0:0:0:0:0:0:1:0:0:1:0:0:0|h|h',
                id: '100',
              },
            },
            Set: {
              text: { 1: 'Dual Bar', 2: 0, 3: 0 },
              skill: { 1: 1, 2: 2 }, // Front=set1, Back=set2
              gear: 1,
            },
          },
          2: {
            Skill: { 1: 700, 2: 800, 3: 900, 4: 1000, 5: 1100, 6: 1200 },
            Gear: {
              3: {
                // AG slot 3 = Backup Main Hand → internal 20
                link: '|H0:item:22222:363:50:0:0:0:0:0:0:0:0:0:0:0:1:0:0:1:0:0:0|h|h',
                id: '200',
              },
            },
            Set: {
              text: { 1: 'Back Bar', 2: 0, 3: 0 },
            },
          },
        },
      };

      const state = convertAlphaGearToLoadoutState(characters);
      const genPages = state.pages['pairedchar']?.GEN;
      expect(genPages).toBeDefined();

      const gearPage = genPages![0];
      // Should have merged into 1 setup instead of 2
      expect(gearPage.setups.length).toBe(1);

      const merged = gearPage.setups[0];
      expect(merged.name).toBe('Dual Bar');

      // Front bar skills
      expect(merged.skills[0][3]).toBe(100);
      expect(merged.skills[0][8]).toBe(600);

      // Back bar skills (from set 2)
      expect(merged.skills[1][3]).toBe(700);
      expect(merged.skills[1][8]).toBe(1200);

      // Gear merged: main hand from set 1 (AG 1→4), back bar main from set 2 (AG 3→20)
      expect(merged.gear[4]?.link).toContain('item:11111');
      expect(merged.gear[20]?.link).toContain('item:22222');
    });

    it('converts profile data into separate pages', () => {
      const characters: Record<string, AlphaGearCharacterData> = {
        ProfileChar: {
          setamount: 1,
          1: {
            Skill: { 1: 100, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            Gear: {},
            Set: { text: { 1: 'Quick Set', 2: 0, 3: 0 } },
          },
          profiles: {
            1: {
              name: 'DPS',
              currentBuild: 1,
              setdata: {
                lastset: 1,
                1: {
                  Skill: { 1: 500, 2: 600, 3: 700, 4: 800, 5: 900, 6: 950 },
                  Gear: {
                    1: {
                      link: '|H0:item:99999:363:50:0:0:0:0:0:0:0:0:0:0:0:1:0:0:1:0:0:0|h|h',
                      id: '999',
                    },
                  },
                  Set: { text: { 1: 'Profile Build 1', 2: 0, 3: 0 } },
                },
              },
            },
            2: {
              name: 'Healer',
              currentBuild: 1,
            },
          },
        },
      };

      const state = convertAlphaGearToLoadoutState(characters);
      const genPages = state.pages['profilechar']?.GEN;
      expect(genPages).toBeDefined();

      // Should have: "Gear Sets" (top-level) + "DPS" profile
      // "Healer" profile has no setdata so it's skipped
      expect(genPages!.length).toBe(2);
      expect(genPages![0].name).toBe('Gear Sets');
      expect(genPages![1].name).toBe('DPS');

      // DPS profile setup
      const dpsSetup = genPages![1].setups[0];
      expect(dpsSetup.name).toBe('Profile Build 1');
      expect(dpsSetup.skills[0][3]).toBe(500);
      // AG slot 1 = Main Hand → internal 4
      expect(dpsSetup.gear[4]?.link).toContain('item:99999');
    });

    it('skips completely empty sets', () => {
      const characters: Record<string, AlphaGearCharacterData> = {
        EmptyChar: {
          setamount: 3,
          1: {
            Skill: { 1: 100, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            Gear: {},
            Set: { text: { 1: 'Has Skill', 2: 0, 3: 0 } },
          },
          2: {
            Skill: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            Gear: {},
            Set: { text: { 1: 0, 2: 0, 3: 0 } },
          },
          3: {
            Skill: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            Gear: {
              1: {
                link: '|H0:item:55555:363:50:0:0:0:0:0:0:0:0:0:0:0:1:0:0:1:0:0:0|h|h',
                id: '555',
              },
            },
            Set: { text: { 1: 'Has Gear', 2: 0, 3: 0 } },
          },
        },
      };

      const state = convertAlphaGearToLoadoutState(characters);
      const setups = state.pages['emptychar']?.GEN?.[0]?.setups;
      expect(setups).toBeDefined();
      // Set 2 is completely empty → should be skipped
      expect(setups!.length).toBe(2);
      expect(setups![0].name).toBe('Has Skill');
      expect(setups![1].name).toBe('Has Gear');
    });

    it('handles multiple characters', () => {
      const characters: Record<string, AlphaGearCharacterData> = {
        'Char One': {
          setamount: 1,
          1: {
            Skill: { 1: 100, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            Gear: {},
            Set: { text: { 1: 'One', 2: 0, 3: 0 } },
          },
        },
        'Char Two': {
          setamount: 1,
          1: {
            Skill: { 1: 200, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            Gear: {},
            Set: { text: { 1: 'Two', 2: 0, 3: 0 } },
          },
        },
      };

      const state = convertAlphaGearToLoadoutState(characters);
      expect(state.characters).toHaveLength(2);
      expect(state.pages['char-one']).toBeDefined();
      expect(state.pages['char-two']).toBeDefined();
    });

    it('maps all AlphaGear gear slots to correct internal slots', () => {
      const makeGear = (slot: number) => ({
        link: `|H0:item:${slot}0000:363:50:0:0:0:0:0:0:0:0:0:0:0:1:0:0:1:0:0:0|h|h`,
        id: `${slot}00`,
      });
      const emptyGear = { link: 0 as number | string, id: 0 as number | string };

      const characters: Record<string, AlphaGearCharacterData> = {
        SlotTest: {
          setamount: 1,
          1: {
            Skill: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            Gear: {
              // AlphaGear SLOTS array order (verified from source code):
              1: makeGear(1), // Main Hand → 4
              2: makeGear(2), // Off Hand → 5
              3: makeGear(3), // Backup Main → 20
              4: makeGear(4), // Backup Off → 21
              5: makeGear(5), // Head → 0
              6: makeGear(6), // Chest → 2
              7: makeGear(7), // Legs → 8
              8: makeGear(8), // Shoulders → 3
              9: makeGear(9), // Feet → 9
              10: makeGear(10), // Waist → 6
              11: makeGear(11), // Hands → 16
              12: makeGear(12), // Neck → 1
              13: makeGear(13), // Ring 1 → 11
              14: makeGear(14), // Ring 2 → 12
              15: emptyGear, // Poison → null (not tracked)
              16: emptyGear, // Backup Poison → null (not tracked)
            },
            Set: { text: { 1: 'Full Gear', 2: 0, 3: 0 } },
          },
        },
      };

      const state = convertAlphaGearToLoadoutState(characters);
      const gear = state.pages['slottest']?.GEN?.[0]?.setups?.[0]?.gear;
      expect(gear).toBeDefined();

      // Verify each mapping (AG slot → internal slot)
      expect(gear![4]?.link).toContain('item:10000'); // AG 1: Main Hand → 4
      expect(gear![5]?.link).toContain('item:20000'); // AG 2: Off Hand → 5
      expect(gear![20]?.link).toContain('item:30000'); // AG 3: Backup Main → 20
      expect(gear![21]?.link).toContain('item:40000'); // AG 4: Backup Off → 21
      expect(gear![0]?.link).toContain('item:50000'); // AG 5: Head → 0
      expect(gear![2]?.link).toContain('item:60000'); // AG 6: Chest → 2
      expect(gear![8]?.link).toContain('item:70000'); // AG 7: Legs → 8
      expect(gear![3]?.link).toContain('item:80000'); // AG 8: Shoulders → 3
      expect(gear![9]?.link).toContain('item:90000'); // AG 9: Feet → 9
      expect(gear![6]?.link).toContain('item:100000'); // AG 10: Waist → 6
      expect(gear![16]?.link).toContain('item:110000'); // AG 11: Hands → 16
      expect(gear![1]?.link).toContain('item:120000'); // AG 12: Neck → 1
      expect(gear![11]?.link).toContain('item:130000'); // AG 13: Ring 1 → 11
      expect(gear![12]?.link).toContain('item:140000'); // AG 14: Ring 2 → 12

      // Poison and Backup Poison slots should not be present (mapped to null, and empty)
      expect(gear![7]).toBeUndefined(); // ESO slot 7 (Poison) not used
      expect(gear![22]).toBeUndefined(); // ESO slot 22 (Backup Poison) not used
    });

    it('preserves default structure when character has no sets', () => {
      const characters: Record<string, AlphaGearCharacterData> = {
        NoSets: {
          setamount: 0,
          version: 1,
        },
      };

      const state = convertAlphaGearToLoadoutState(characters);
      expect(state.characters).toHaveLength(1);
      expect(state.characters[0].name).toBe('NoSets');
      // No pages since there are no sets
      expect(state.pages['nosets']).toBeUndefined();
    });

    it('uses fallback names for unnamed sets', () => {
      const characters: Record<string, AlphaGearCharacterData> = {
        NameTest: {
          setamount: 2,
          1: {
            Skill: { 1: 100, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            Gear: {},
            Set: { text: { 1: 0, 2: 0, 3: 0 } }, // No name text
          },
          2: {
            Skill: { 1: 200, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            Gear: {},
            // No Set metadata at all
          },
        },
      };

      const state = convertAlphaGearToLoadoutState(characters);
      const setups = state.pages['nametest']?.GEN?.[0]?.setups;
      expect(setups![0].name).toBe('Set 1'); // Fallback for numeric text
      expect(setups![1].name).toBe('Set 2'); // Fallback for missing Set
    });
  });

  // ── convertLoadoutStateToAlphaGear (reverse converter) ──────────────

  describe('convertLoadoutStateToAlphaGear', () => {
    it('converts a basic LoadoutState to AlphaGear format', () => {
      const characters: Record<string, AlphaGearCharacterData> = {
        TestChar: {
          setamount: 1,
          1: {
            Skill: { 1: 1000, 2: 2000, 3: 3000, 4: 4000, 5: 5000, 6: 9000 },
            Gear: {
              1: { link: '|H0:item:111:1:50:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h|h', id: 'A' },
              5: { link: '|H0:item:222:1:50:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h|h', id: 'B' },
            },
            Set: { text: { 1: 'MyBuild', 2: 0, 3: 0 } },
          },
        },
      };

      const state = convertAlphaGearToLoadoutState(characters);
      const agData = convertLoadoutStateToAlphaGear(state);

      // Structure check
      expect(agData.Default).toBeDefined();
      const accounts = Object.keys(agData.Default!);
      expect(accounts.length).toBe(1);

      const charEntries = agData.Default![accounts[0]];
      expect(charEntries['TestChar']).toBeDefined();

      const charData = charEntries['TestChar'];
      expect(charData.setamount).toBeGreaterThan(0);

      // First set should have skills and gear
      const set1 = charData[1];
      expect(set1).toBeDefined();
      expect(set1.Skill).toBeDefined();
      expect(set1.Gear).toBeDefined();
      expect(set1.Set?.text?.[1]).toBe('MyBuild');
    });

    it('produces valid gear slot indices (1-16)', () => {
      const characters: Record<string, AlphaGearCharacterData> = {
        SlotTest: {
          setamount: 1,
          1: {
            Skill: { 1: 100, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            Gear: {
              1: { link: '|H0:item:11:1:50:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h|h', id: '1' },
              5: { link: '|H0:item:22:1:50:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h|h', id: '2' },
              6: { link: '|H0:item:33:1:50:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h|h', id: '3' },
              12: { link: '|H0:item:44:1:50:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h|h', id: '4' },
            },
            Set: { text: { 1: 'SlotCheck', 2: 0, 3: 0 } },
          },
        },
      };

      const state = convertAlphaGearToLoadoutState(characters);
      const agData = convertLoadoutStateToAlphaGear(state);
      const charData = Object.values(agData.Default!)[0]['SlotTest'];
      const gear = charData[1]?.Gear;

      expect(gear).toBeDefined();
      // Every gear slot key should be between 1 and 16
      for (const key of Object.keys(gear!)) {
        const n = Number(key);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(16);
      }

      // All 16 slots should be present (filled or { link: 0, id: 0 })
      expect(Object.keys(gear!).length).toBe(16);
    });

    it('maps skill slots correctly (internal 3-8 → AG 1-6)', () => {
      const characters: Record<string, AlphaGearCharacterData> = {
        SkillTest: {
          setamount: 1,
          1: {
            Skill: { 1: 100, 2: 200, 3: 300, 4: 400, 5: 500, 6: 999 },
            Gear: {},
            Set: { text: { 1: 'SkillMap', 2: 0, 3: 0 } },
          },
        },
      };

      const state = convertAlphaGearToLoadoutState(characters);
      const agData = convertLoadoutStateToAlphaGear(state);
      const charData = Object.values(agData.Default!)[0]['SkillTest'];
      const skills = charData[1]?.Skill;

      expect(skills).toBeDefined();
      // Abilities
      expect(skills![1]).toBe(100); // internal slot 3 → AG 1
      expect(skills![2]).toBe(200); // internal slot 4 → AG 2
      expect(skills![3]).toBe(300); // internal slot 5 → AG 3
      expect(skills![4]).toBe(400); // internal slot 6 → AG 4
      expect(skills![5]).toBe(500); // internal slot 7 → AG 5
      // Ultimate
      expect(skills![6]).toBe(999); // internal slot 8 → AG 6
    });

    it('splits paired setups into two AG set entries', () => {
      const characters: Record<string, AlphaGearCharacterData> = {
        PairTest: {
          setamount: 2,
          1: {
            Skill: { 1: 100, 2: 200, 3: 300, 4: 400, 5: 500, 6: 601 },
            Gear: {},
            Set: {
              text: { 1: 'Paired', 2: 0, 3: 0 },
              skill: { 1: 1, 2: 2 },
              gear: 1,
            },
          },
          2: {
            Skill: { 1: 110, 2: 210, 3: 310, 4: 410, 5: 510, 6: 602 },
            Gear: {},
            Set: { text: { 1: 0, 2: 0, 3: 0 } },
          },
        },
      };

      const state = convertAlphaGearToLoadoutState(characters);

      // The forward pass should merge into one setup with both bars
      const pairedSetup = state.pages['pairtest']!.GEN![0].setups.find((s) => s.name === 'Paired');
      expect(pairedSetup).toBeDefined();
      expect(Object.keys(pairedSetup!.skills[1]).length).toBeGreaterThan(0);

      // Reverse: should produce two AG entries
      const agData = convertLoadoutStateToAlphaGear(state);
      const charData = Object.values(agData.Default!)[0]['PairTest'];

      expect(charData.setamount).toBe(2); // Front + back = 2 entries
      expect(charData[1]).toBeDefined();
      expect(charData[2]).toBeDefined();

      // Front entry should have the pairing reference
      expect(charData[1].Set?.skill?.[1]).toBe(1);
      expect(charData[1].Set?.skill?.[2]).toBe(2);

      // Back entry should have back bar skills
      expect(charData[2].Skill?.[1]).toBe(110);
    });

    it('uses provided account name', () => {
      const characters: Record<string, AlphaGearCharacterData> = {
        Char: { setamount: 1, 1: { Skill: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, Gear: {} } },
      };

      const state = convertAlphaGearToLoadoutState(characters);
      const agData = convertLoadoutStateToAlphaGear(state, '@MyAccount');
      expect(agData.Default!['@MyAccount']).toBeDefined();
    });
  });

  // ── serializeAlphaGearToLua ────────────────────────────────────────

  describe('serializeAlphaGearToLua', () => {
    it('produces valid Lua with the correct table name', () => {
      const agData: AlphaGearSavedVariables = {
        Default: {
          '@Test': {
            TestChar: {
              setamount: 1,
              1: {
                Skill: { 1: 42, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
                Gear: {
                  1: { link: '|H0:item:999:1:50:0|h|h', id: 'X' },
                },
                Set: { text: { 1: 'TestBuild', 2: 0, 3: 0 } },
              },
            },
          },
        },
      };

      const lua = serializeAlphaGearToLua(agData);
      expect(lua).toContain('AGX2_Character');
      expect(lua).toContain('["Default"]');
      expect(lua).toContain('"@Test"');
      expect(lua).toContain('["TestChar"]');
      expect(lua).toContain('["Skill"]');
      expect(lua).toContain('42');
      expect(lua).toContain('|H0:item:999:1:50:0|h|h');
    });

    it('uses custom table name when provided', () => {
      const agData: AlphaGearSavedVariables = { Default: {} };
      const lua = serializeAlphaGearToLua(agData, 'AlphaGear2_Data');
      expect(lua).toMatch(/^AlphaGear2_Data/);
    });

    it('round-trips a minimal character through serialize → reparse', () => {
      const characters: Record<string, AlphaGearCharacterData> = {
        RoundTrip: {
          setamount: 1,
          1: {
            Skill: { 1: 500, 2: 600, 3: 700, 4: 800, 5: 900, 6: 999 },
            Gear: {
              1: {
                link: '|H0:item:12345:363:50:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h|h',
                id: 'RT1',
              },
              5: {
                link: '|H0:item:67890:363:50:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h|h',
                id: 'RT2',
              },
            },
            Set: { text: { 1: 'RTBuild', 2: 0, 3: 0 } },
          },
        },
      };

      // Forward: characters → LoadoutState
      const state = convertAlphaGearToLoadoutState(characters);

      // Reverse: LoadoutState → AlphaGear → Lua string
      const agData = convertLoadoutStateToAlphaGear(state);
      const lua = serializeAlphaGearToLua(agData);

      // Reparse the Lua
      const { parseLuaAssignments } = require('../wizardsWardrobeSavedVariables');
      const reparsed = parseLuaAssignments(lua);
      expect(reparsed['AGX2_Character']).toBeDefined();

      // Re-detect and convert
      const detected = detectAlphaGearData(reparsed);
      expect(detected).not.toBeNull();

      const reExtracted = extractAlphaGearCharacters(detected!.data);
      expect(reExtracted['RoundTrip']).toBeDefined();

      const reState = convertAlphaGearToLoadoutState(reExtracted);
      const rtSetups = reState.pages['roundtrip']?.GEN?.[0]?.setups;
      expect(rtSetups).toBeDefined();

      const rtBuild = rtSetups!.find((s) => s.name === 'RTBuild');
      expect(rtBuild).toBeDefined();

      // Skills preserved
      expect(rtBuild!.skills[0][3]).toBe(500);
      expect(rtBuild!.skills[0][8]).toBe(999);

      // Gear preserved
      expect(rtBuild!.gear[4]?.link).toContain('item:12345');
      expect(rtBuild!.gear[0]?.link).toContain('item:67890');
    });
  });
});
