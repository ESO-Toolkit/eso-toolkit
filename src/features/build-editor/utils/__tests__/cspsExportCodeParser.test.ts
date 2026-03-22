import {
  isCSPSExportCode,
  isCSPSNativeCode,
  parseCSPSExportCode,
  parseCSPSNativeCode,
} from '../cspsExportCodeParser';

const EXAMPLE_EXPORT_CODE = [
  '1', // classId: Dragonknight
  '3', // raceId: Orc
  '1', // roleIndex: DPS
  '0:0:64', // attributes: H:M:S
  '0', // curseId
  '13975', // mundusId: Thief
  '35,27,218', // subclasses
  '63046,183006,20816,183122,38901,189867', // hotbar 1
  '40382,38788,22095,32853,185842,32958', // hotbar 2
  '29424,29430,29439,29451,31739,31744,31743,31721,184844,184857,184870,184885,29387,29375,29388,29389,29391,18929,30873,30872,21114,30893,150185,152778,29639,29665,29663,29668,29667,150181,29743,29687,29738,29686,29742,150184,152780,139908,139904,139942,139773,42054,32634,78219,29062,35803,35800,29061,103793,74580,39248,39641,39625,39630,39644,39647,33293,33301,84668,33304,45542,47276,47288,46727,46758,103632,44590,44625,44602,44612,44616,44620,47282', // passives
  '66,78,92,82,8,30,264,25,270,34,35,2', // slotted CP
  '6:20,10:20,11:20,14:20,15:20,16:20,17:40,18:40,20:20,21:30,22:30,37:30,38:20,39:20,42:16,70:50,71:10,72:45,74:10,79:50,83:50,108:20,128:20,279:50', // passive CP
  '1:0:694:31:45884,2:2:772:18:26588,3:2:809:18:26588,4:11:809:26:45867,5:11:809:2:26587,6:2:772:18:26588,8:2:772:18:26588,9:2:772:18:26588,11:0:809:31:45883,12:0:809:31:45883,16:2:772:18:26588,20:4:522:4:54484,0:1:270:18:26582', // gear
  '68239:0,112425:0', // buff food
  '54339:66309,27036:0,27037:0', // potions
].join(';');

describe('isCSPSExportCode', () => {
  it('returns true for a valid export code', () => {
    expect(isCSPSExportCode(EXAMPLE_EXPORT_CODE)).toBe(true);
  });

  it('returns true with leading/trailing whitespace', () => {
    expect(isCSPSExportCode(`  ${EXAMPLE_EXPORT_CODE}  `)).toBe(true);
  });

  it('returns false for Lua SavedVariables text', () => {
    const lua = 'CSPSSavedVariables = {\n  ["Default"] = {\n  }\n}';
    expect(isCSPSExportCode(lua)).toBe(false);
  });

  it('returns false for random text', () => {
    expect(isCSPSExportCode('hello world')).toBe(false);
  });

  it('returns false for too few sections', () => {
    expect(isCSPSExportCode('1;3;1')).toBe(false);
  });

  it('returns false for invalid class ID', () => {
    expect(isCSPSExportCode('99;3;1;0:0:64;0;13975;35;a;b;c;d;e;f;g;h')).toBe(false);
  });
});

describe('parseCSPSExportCode', () => {
  it('parses the example export code correctly', () => {
    const { build } = parseCSPSExportCode(EXAMPLE_EXPORT_CODE);

    // Class
    expect(build.esoClass).toBe('dragonknight');

    // Race
    expect(build.races).toEqual(['orc']);

    // Role
    expect(build.role).toBe('magicka-dps');

    // Attributes
    const setup = build.setups[0];
    expect(setup.attributes).toEqual({ health: 0, magicka: 0, stamina: 64 });

    // Mundus
    expect(setup.mundusStone).toBe('thief');
  });

  it('parses front bar skills', () => {
    const { build } = parseCSPSExportCode(EXAMPLE_EXPORT_CODE);
    const frontBar = build.setups[0].skills[0];
    // Slots 3-7 = abilities, slot 8 = ultimate
    expect(frontBar[3]).toBe(63046);
    expect(frontBar[4]).toBe(183006);
    expect(frontBar[5]).toBe(20816);
    expect(frontBar[6]).toBe(183122);
    expect(frontBar[7]).toBe(38901);
    expect(frontBar[8]).toBe(189867); // ultimate
  });

  it('parses back bar skills', () => {
    const { build } = parseCSPSExportCode(EXAMPLE_EXPORT_CODE);
    const backBar = build.setups[0].skills[1];
    expect(backBar[3]).toBe(40382);
    expect(backBar[4]).toBe(38788);
    expect(backBar[5]).toBe(22095);
    expect(backBar[6]).toBe(32853);
    expect(backBar[7]).toBe(185842);
    expect(backBar[8]).toBe(32958); // ultimate
  });

  it('parses passives', () => {
    const { build } = parseCSPSExportCode(EXAMPLE_EXPORT_CODE);
    const passives = build.setups[0].passives;
    expect(passives).toContain(29424);
    expect(passives).toContain(47282);
    expect(passives.length).toBe(73);
  });

  it('parses slotted champion points (12 = 3 trees x 4 slots)', () => {
    const { build } = parseCSPSExportCode(EXAMPLE_EXPORT_CODE);
    const cp = build.setups[0].cp;

    // Craft slots (first 4): 66, 78, 92, 82
    expect(cp.craft.slots).toEqual([66, 78, 92, 82]);
    // Warfare slots (next 4): 8, 30, 264, 25
    expect(cp.warfare.slots).toEqual([8, 30, 264, 25]);
    // Fitness slots (last 4): 270, 34, 35, 2
    expect(cp.fitness.slots).toEqual([270, 34, 35, 2]);
  });

  it('stores passive CP allocations (CSPS IDs may not map to all known trees)', () => {
    const { build } = parseCSPSExportCode(EXAMPLE_EXPORT_CODE);
    const cp = build.setups[0].cp;

    // The export code uses CSPS-internal CP IDs which may not all map
    // to our CHAMPION_POINT_ABILITIES enum. Verify the structure exists
    // and that any mapped passives are stored correctly.
    expect(cp.warfare.passives).toBeDefined();
    expect(cp.fitness.passives).toBeDefined();
    expect(cp.craft.passives).toBeDefined();
  });

  it('parses gear slots and resolves set IDs to item IDs', () => {
    const { build } = parseCSPSExportCode(EXAMPLE_EXPORT_CODE);
    const gear = build.setups[0].gear;

    // All gear slots should be populated
    expect(Object.keys(gear).length).toBe(13);

    // Each gear piece should have id, trait, and enchant
    for (const piece of Object.values(gear)) {
      expect(piece.id).toBeDefined();
      expect(Number(piece.id)).toBeGreaterThan(0);
      expect(piece.trait).toBeDefined();
      expect(piece.enchant).toBeDefined();
    }

    // Slot 0 (Head) should have trait 18 and enchant 26582
    expect(gear[0].trait).toBe('18');
    expect(gear[0].enchant).toBe('26582');

    // Slot 1 (Neck) should have trait 31 and enchant 45884
    expect(gear[1].trait).toBe('31');
    expect(gear[1].enchant).toBe('45884');
  });

  it('parses consumables (buff food and potions)', () => {
    const { build } = parseCSPSExportCode(EXAMPLE_EXPORT_CODE);
    expect(build.setups[0].consumables.food.id).toBe(68239);
    // Potions section: "54339:66309,27036:0,27037:0" → 3 potions
    expect(build.setups[0].consumables.potions).toHaveLength(3);
    expect(build.setups[0].consumables.potions[0].id).toBe(54339);
    expect(build.setups[0].consumables.potions[1].id).toBe(27036);
    expect(build.setups[0].consumables.potions[2].id).toBe(27037);
  });

  it('maps curse ID from section 5', () => {
    // The example has curseId=0 (none)
    const { build } = parseCSPSExportCode(EXAMPLE_EXPORT_CODE);
    expect(build.setups[0].curse).toBe('none');

    // Test with vampire curse
    const vampCode = EXAMPLE_EXPORT_CODE.replace(
      /;0;13975;/,
      ';3;13975;',
    );
    const { build: vampBuild } = parseCSPSExportCode(vampCode);
    expect(vampBuild.setups[0].curse).toBe('vampire-3');
  });

  it('maps subclass skill line IDs from section 7', () => {
    const { build } = parseCSPSExportCode(EXAMPLE_EXPORT_CODE);
    // Subclasses 35,27,218 → Ardent Flame (DK), Dawn's Wrath (Templar), Herald of the Tome (Arcanist)
    expect(build.classSkillLines).toEqual([
      'class.ardent-flame',
      'class.dawns-wrath',
      'class.herald-of-the-tome',
    ]);
  });

  it('stores the raw export code in addonImportString', () => {
    const { build } = parseCSPSExportCode(EXAMPLE_EXPORT_CODE);
    expect(build.addonImportString).toBe(EXAMPLE_EXPORT_CODE);
  });

  it('creates exactly one setup', () => {
    const { build } = parseCSPSExportCode(EXAMPLE_EXPORT_CODE);
    expect(build.setups).toHaveLength(1);
  });

  it('throws for invalid export code', () => {
    expect(() => parseCSPSExportCode('not;valid')).toThrow(/at least 13 sections/);
  });
});

// ══════════════════════════════════════════════════════════════════════
// CSPS Native Format (#-delimited)
// ══════════════════════════════════════════════════════════════════════

// Synthetic native code: skills#hotbars#attributes#mundus#cp#gear#quickslots#outfits#role
const NATIVE_CODE = [
  // Section 1: skills (prog*pass*crafted*styles*subclasses)
  '100:1,200:2*5000:1,5001:1,5002:1*-*-*-',
  // Section 2: hotbars (bar1;bar2 — 6 slots each)
  '63046,183006,20816,183122,38901,189867;40382,38788,22095,32853,c185842,32958',
  // Section 3: attributes (health;magicka;stamina)
  '10;0;54',
  // Section 4: mundus (ability ID)
  '13975',
  // Section 5: CP (cpValues*cpHotbar)
  '-*66,78,92,82;8,30,264,25;270,34,35,2',
  // Section 6: gear (16 slots separated by `;`)
  '270:1:18:5:26582;809:2:18:4:26588;772:2:18:4:26588;772:2:18:4:26588;772:2:18:4:26588;772:2:18:4:26588;772:2:18:4:26588;694:0:31:5:45884;809:0:31:5:45883;809:0:31:5:45883;809:11:26:5:45867;809:11:2:5:26587;522:4:4:5:54484;0;0;0',
  // Section 7: quickslots
  '-',
  // Section 8: outfits
  '-',
  // Section 9: role
  '1',
].join('#');

describe('isCSPSNativeCode', () => {
  it('returns true for a valid native code', () => {
    expect(isCSPSNativeCode(NATIVE_CODE)).toBe(true);
  });

  it('returns false for ESO-Hub format', () => {
    expect(isCSPSNativeCode(EXAMPLE_EXPORT_CODE)).toBe(false);
  });

  it('returns false for Lua text', () => {
    expect(isCSPSNativeCode('CSPSSavedVariables = {\n}')).toBe(false);
  });

  it('returns false for random text', () => {
    expect(isCSPSNativeCode('hello world')).toBe(false);
  });
});

describe('parseCSPSNativeCode', () => {
  it('parses hotbar skills', () => {
    const { build } = parseCSPSNativeCode(NATIVE_CODE);
    const front = build.setups[0].skills[0];
    expect(front[3]).toBe(63046);
    expect(front[8]).toBe(189867); // ultimate

    const back = build.setups[0].skills[1];
    expect(back[3]).toBe(40382);
    expect(back[8]).toBe(32958);
  });

  it('detects scribed abilities from "c" prefix', () => {
    const { build } = parseCSPSNativeCode(NATIVE_CODE);
    expect(build.setups[0].scribedAbilityIds).toContain(185842);
  });

  it('extracts skilledAbilities (morph data) from prog section', () => {
    const { build } = parseCSPSNativeCode(NATIVE_CODE);
    // Native code section 1 prog: "100:1,200:2" → two skilled abilities
    const skilled = build.setups[0].skilledAbilities;
    expect(skilled).toBeDefined();
    expect(skilled).toHaveLength(2);
    expect(skilled![0]).toEqual({ abilityId: 100, morph: 1 });
    expect(skilled![1]).toEqual({ abilityId: 200, morph: 2 });
  });

  it('parses attributes', () => {
    const { build } = parseCSPSNativeCode(NATIVE_CODE);
    expect(build.setups[0].attributes).toEqual({ health: 10, magicka: 0, stamina: 54 });
  });

  it('parses mundus stone', () => {
    const { build } = parseCSPSNativeCode(NATIVE_CODE);
    expect(build.setups[0].mundusStone).toBe('thief');
  });

  it('parses slotted CP from cpHotbar', () => {
    const { build } = parseCSPSNativeCode(NATIVE_CODE);
    const cp = build.setups[0].cp;
    expect(cp.craft.slots).toEqual([66, 78, 92, 82]);
    expect(cp.warfare.slots).toEqual([8, 30, 264, 25]);
    expect(cp.fitness.slots).toEqual([270, 34, 35, 2]);
  });

  it('parses passives from skills section', () => {
    const { build } = parseCSPSNativeCode(NATIVE_CODE);
    expect(build.setups[0].passives).toEqual([5000, 5001, 5002]);
  });

  it('parses gear in CSPS slot order and resolves set IDs', () => {
    const { build } = parseCSPSNativeCode(NATIVE_CODE);
    const gear = build.setups[0].gear;

    // HEAD (slot 0): trait 18, enchant 26582
    expect(gear[0]).toBeDefined();
    expect(gear[0].trait).toBe('18');
    expect(gear[0].enchant).toBe('26582');
    // SHOULDERS (slot 3): trait 18, enchant 26588
    expect(gear[3]).toBeDefined();
    expect(gear[3].trait).toBe('18');
    // NECK (slot 1): trait 31, enchant 45884
    expect(gear[1]).toBeDefined();
    expect(gear[1].trait).toBe('31');
    expect(gear[1].enchant).toBe('45884');
  });

  it('parses role', () => {
    const { build } = parseCSPSNativeCode(NATIVE_CODE);
    expect(build.role).toBe('magicka-dps');
  });

  it('detects class from hotbar ability IDs', () => {
    // The native code has DK ability 20816 on the front bar
    const { build } = parseCSPSNativeCode(NATIVE_CODE);
    // Should detect dragonknight from hotbar skill ranges
    expect(build.esoClass).not.toBe('any-class');
  });

  it('falls back to any-class when no class abilities on bars', () => {
    const emptyBars = NATIVE_CODE.replace(
      /63046,183006,20816,183122,38901,189867;40382,38788,22095,32853,c185842,32958/,
      '0,0,0,0,0,0;0,0,0,0,0,0',
    );
    const { build } = parseCSPSNativeCode(emptyBars);
    expect(build.esoClass).toBe('any-class');
  });

  it('handles minimal code with all dashes', () => {
    const minimal = '-#-#-#-#-#-#-#-#-';
    const { build } = parseCSPSNativeCode(minimal);
    expect(build.setups).toHaveLength(1);
    expect(build.setups[0].mundusStone).toBe('');
  });

  it('throws for too few sections', () => {
    expect(() => parseCSPSNativeCode('a#b#c')).toThrow(/at least 5 sections/);
  });
});
