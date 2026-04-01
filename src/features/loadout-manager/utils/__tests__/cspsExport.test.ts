/**
 * @jest-environment jsdom
 */

import { convertBuildToCSPS, exportBuildToCSPSLua } from '../../../build-editor/utils/cspsExport';
import type { Build, BuildSetup } from '../../../build-editor/types/build.types';
import { parseLuaAssignments } from '../wizardsWardrobeSavedVariables';
import {
  detectCSPSData,
  extractCSPSCharacters,
  decompressComp1,
  decompressComp2,
  parseGearComp,
  parseHotbar,
  parseAttributes,
} from '../cspsConverter';

// ── Helpers ──────────────────────────────────────────────────────────

function makeSetup(overrides: Partial<BuildSetup> = {}): BuildSetup {
  return {
    id: 'setup-1',
    name: 'Test Setup',
    attributes: { magicka: 54, health: 10, stamina: 0 },
    curse: 'none',
    mundusStone: '',
    gear: {},
    skills: {
      0: { 3: 100, 4: 200, 5: 300, 6: 400, 7: 500, 8: 600 },
      1: { 3: 700, 4: 800, 5: 900, 6: 1000, 7: 1100, 8: 1200 },
    },
    cp: {
      warfare: { slots: [3, 25, 12, 8], passives: {} },
      fitness: { slots: [46, 48, 2, 51], passives: {} },
      craft: { slots: [29, 92, 78, 82], passives: {} },
    },
    consumables: { potions: [], food: {} },
    passives: [],
    screenshots: [],
    ...overrides,
  };
}

function makeBuild(overrides: Partial<Build> = {}): Build {
  return {
    id: 'build-1',
    name: 'Test Build',
    shortDescription: 'A test build',
    esoClass: 'dragonknight',
    classSkillLines: [null, null, null],
    role: 'magicka-dps',
    gameMode: 'pve',
    races: [],
    setups: [makeSetup()],
    guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
    settings: { visibility: 'public', dlc: 'Base Game', setupOrder: [0] },
    addonImportString: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('cspsExport', () => {
  describe('convertBuildToCSPS', () => {
    it('creates valid CSPS saved variables structure', () => {
      const build = makeBuild();
      const csps = convertBuildToCSPS(build);

      expect(csps.Default).toBeDefined();
      const accountData = csps.Default!['@ESOToolkit'];
      expect(accountData).toBeDefined();
      expect(accountData.$AccountWide).toBeDefined();
      expect(accountData.$AccountWide.charData).toBeDefined();
    });

    it('exports skills to hotbar in comp1', () => {
      const build = makeBuild();
      const csps = convertBuildToCSPS(build);
      const charData = csps.Default!['@ESOToolkit'].$AccountWide.charData!['1'];

      const comp1 = decompressComp1(charData.comp1);
      expect(comp1).not.toBeNull();

      const hotbar = parseHotbar(comp1!.hotbar);
      // Front bar: slots 3-7 → CSPS 0-4, slot 8 → CSPS 5
      expect(hotbar.frontBar).toEqual([100, 200, 300, 400, 500, 600]);
      expect(hotbar.backBar).toEqual([700, 800, 900, 1000, 1100, 1200]);
    });

    it('exports attributes to comp1', () => {
      const build = makeBuild();
      const csps = convertBuildToCSPS(build);
      const charData = csps.Default!['@ESOToolkit'].$AccountWide.charData!['1'];

      const comp1 = decompressComp1(charData.comp1);
      const attrs = parseAttributes(comp1!.attributes);
      expect(attrs.health).toBe(10);
      expect(attrs.magicka).toBe(54);
      expect(attrs.stamina).toBe(0);
    });

    it('exports CP hotbar slots to comp1', () => {
      const build = makeBuild();
      const csps = convertBuildToCSPS(build);
      const charData = csps.Default!['@ESOToolkit'].$AccountWide.charData!['1'];

      const comp1 = decompressComp1(charData.comp1);
      // cpHotbar: craft;warfare;fitness
      const groups = comp1!.cpHotbar.split(';');
      expect(groups).toHaveLength(3);
      // Craft: 29,92,78,82
      expect(groups[0]).toBe('29,92,78,82');
      // Warfare: 3,25,12,8
      expect(groups[1]).toBe('3,25,12,8');
      // Fitness: 46,48,2,51
      expect(groups[2]).toBe('46,48,2,51');
    });

    it('exports mundus stone to comp1', () => {
      const build = makeBuild({
        setups: [makeSetup({ mundusStone: 'shadow' })],
      });
      const csps = convertBuildToCSPS(build);
      const charData = csps.Default!['@ESOToolkit'].$AccountWide.charData!['1'];
      const comp1 = decompressComp1(charData.comp1);
      expect(comp1!.mundus).toBe('13984'); // The Shadow
    });

    it('exports role to comp1', () => {
      const build = makeBuild({ role: 'tank' });
      const csps = convertBuildToCSPS(build);
      const charData = csps.Default!['@ESOToolkit'].$AccountWide.charData!['1'];
      const comp1 = decompressComp1(charData.comp1);
      expect(comp1!.role).toBe('2'); // Tank = LFG_ROLE_TANK
    });

    it('exports gear to comp2', () => {
      const build = makeBuild({
        setups: [
          makeSetup({
            gear: {
              0: { id: 100, trait: '5', enchant: '200' },
              4: { id: 50, trait: '3', enchant: '100' },
            },
          }),
        ],
      });
      const csps = convertBuildToCSPS(build);
      const charData = csps.Default!['@ESOToolkit'].$AccountWide.charData!['1'];
      const comp2 = decompressComp2(charData.comp2);
      expect(comp2).not.toBeNull();
      const gear = parseGearComp(comp2!.gearComp);
      expect(gear[0]?.setId).toBe(100);
      expect(gear[0]?.trait).toBe(5);
      expect(gear[4]?.setId).toBe(50);
    });

    it('exports passives to werte.pass', () => {
      const build = makeBuild({
        setups: [makeSetup({ passives: [400, 500, 600] })],
      });
      const csps = convertBuildToCSPS(build);
      const charData = csps.Default!['@ESOToolkit'].$AccountWide.charData!['1'];
      expect(charData.werte).toBeDefined();
      expect(charData.werte!.pass).toBeDefined();
      expect(charData.werte!.pass!.part1).toContain('400:1');
      expect(charData.werte!.pass!.part1).toContain('500:1');
    });

    it('exports scribed abilities with c prefix in hotbar', () => {
      const build = makeBuild({
        setups: [
          makeSetup({
            scribedAbilityIds: [100, 600],
          }),
        ],
      });
      const csps = convertBuildToCSPS(build);
      const charData = csps.Default!['@ESOToolkit'].$AccountWide.charData!['1'];
      const comp1 = decompressComp1(charData.comp1);
      // Front bar slot 0 (ability 100) should have "c" prefix
      expect(comp1!.hotbar).toContain('c100');
      // Ability 600 (front bar ultimate) should also have "c" prefix
      expect(comp1!.hotbar).toContain('c600');
      // Ability 200 should NOT have "c" prefix
      expect(comp1!.hotbar).not.toContain('c200');
    });

    it('exports quickslots to comp1', () => {
      const build = makeBuild({
        setups: [
          makeSetup({
            quickslots: [
              { type: 5, id: 1234 },
              { type: 5, id: 5678 },
            ],
          }),
        ],
      });
      const csps = convertBuildToCSPS(build);
      const charData = csps.Default!['@ESOToolkit'].$AccountWide.charData!['1'];
      const comp1 = decompressComp1(charData.comp1);
      expect(comp1!.quickslots).toBe('5:1234,5:5678');
    });

    it('exports skilled abilities to werte.prog', () => {
      const build = makeBuild({
        setups: [
          makeSetup({
            skilledAbilities: [
              { abilityId: 100, morph: 1 },
              { abilityId: 200, morph: 2 },
              { abilityId: 300, morph: 0 },
            ],
          }),
        ],
      });
      const csps = convertBuildToCSPS(build);
      const charData = csps.Default!['@ESOToolkit'].$AccountWide.charData!['1'];
      expect(charData.werte).toBeDefined();
      expect(charData.werte!.prog).toBeDefined();
      expect(charData.werte!.prog!.part1).toContain('100:1');
      expect(charData.werte!.prog!.part1).toContain('200:2');
      expect(charData.werte!.prog!.part1).toContain('300:0');
    });

    it('exports multiple setups as profiles', () => {
      const build = makeBuild({
        setups: [
          makeSetup({ name: 'Main' }),
          makeSetup({ id: 'setup-2', name: 'PvP' }),
          makeSetup({ id: 'setup-3', name: 'Tank' }),
        ],
      });

      const csps = convertBuildToCSPS(build);
      const charData = csps.Default!['@ESOToolkit'].$AccountWide.charData!['1'];

      expect(charData.profiles).toBeDefined();
      expect(Object.keys(charData.profiles!)).toHaveLength(2);
      expect((charData.profiles![1] as { name: string }).name).toBe('PvP');
      expect((charData.profiles![2] as { name: string }).name).toBe('Tank');
    });

    it('uses build name as character name', () => {
      const build = makeBuild({ name: 'My DK Tank' });
      const csps = convertBuildToCSPS(build);
      const charData = csps.Default!['@ESOToolkit'].$AccountWide.charData!['1'];
      expect(charData.$lastCharacterName).toBe('My DK Tank');
    });
  });

  describe('exportBuildToCSPSLua', () => {
    it('produces valid Lua that can be re-parsed', () => {
      const build = makeBuild();
      const lua = exportBuildToCSPSLua(build);

      expect(lua).toContain('CSPSSavedVariables');
      expect(lua).toContain('Default');
      expect(lua).toContain('@ESOToolkit');

      // Round-trip: parse the generated Lua back
      const parsed = parseLuaAssignments(lua);
      const detected = detectCSPSData(parsed);
      expect(detected).not.toBeNull();

      const characters = extractCSPSCharacters(detected!.data);
      expect(Object.keys(characters)).toHaveLength(1);

      const charEntry = Object.values(characters)[0];
      expect(charEntry.name).toBe('Test Build');
    });

    it('round-trips skills through export → parse → import', () => {
      const build = makeBuild();
      const lua = exportBuildToCSPSLua(build);

      const parsed = parseLuaAssignments(lua);
      const detected = detectCSPSData(parsed);
      const characters = extractCSPSCharacters(detected!.data);
      const charEntry = Object.values(characters)[0];

      const comp1 = decompressComp1(charEntry.data.comp1);
      const hotbar = parseHotbar(comp1!.hotbar);

      // Verify round-trip preserves skills
      expect(hotbar.frontBar).toEqual([100, 200, 300, 400, 500, 600]);
      expect(hotbar.backBar).toEqual([700, 800, 900, 1000, 1100, 1200]);
    });
  });
});
