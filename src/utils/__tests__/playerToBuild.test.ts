// The encoder uses `CompressionStream`, which jsdom does not expose — polyfill
// from Node before importing buildEncoding (mirrors buildEncoding.visibility.test.ts).
import {
  CompressionStream as NodeCompressionStream,
  DecompressionStream as NodeDecompressionStream,
} from 'node:stream/web';

if (typeof (globalThis as { CompressionStream?: unknown }).CompressionStream === 'undefined') {
  (globalThis as { CompressionStream?: unknown }).CompressionStream = NodeCompressionStream;
}
if (typeof (globalThis as { DecompressionStream?: unknown }).DecompressionStream === 'undefined') {
  (globalThis as { DecompressionStream?: unknown }).DecompressionStream = NodeDecompressionStream;
}

import {
  CLASS_MASTERY_LINE_NAME,
  getClassMasteryLine,
} from '@/data/skill-lines/class/classMastery';
import { migrateLeakedClassMasteryPicks } from '@/features/build-editor/utils/classMasteryTransfer';
import { decodeBuildFromURL, encodeBuildToURL } from '@/utils/buildEncoding';
import type { ClassAnalysisResult } from '@/utils/classDetectionUtils';
import { convertGear, playerToBuild } from '@/utils/playerToBuild';

import { ArmorType, WeaponType, type PlayerGear } from '../../types/playerDetails';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gearPiece(overrides: Partial<PlayerGear>): PlayerGear {
  return {
    id: 100,
    slot: 0,
    quality: 5,
    icon: '',
    name: '',
    championPoints: 160,
    trait: 0 as PlayerGear['trait'],
    enchantType: 0,
    enchantQuality: 0,
    setID: 1,
    type: ArmorType.LIGHT,
    ...overrides,
  };
}

const dkAnalysis = (cmIds: number[]): ClassAnalysisResult => ({
  primary: 'Ardent Flame',
  skillLines: [
    {
      skillLine: 'Ardent Flame',
      className: 'Dragonknight',
      count: 5,
      skillIds: new Set([1, 2, 3]),
    },
    {
      skillLine: CLASS_MASTERY_LINE_NAME,
      className: 'Dragonknight',
      count: cmIds.length,
      skillIds: new Set(cmIds),
    },
  ],
});

// ─── convertGear: traits + enchants ──────────────────────────────────────────

describe('convertGear — traits & enchants', () => {
  it('carries trait + enchant across, mapped to the editor IDs per category', () => {
    const gear: PlayerGear[] = [
      // Head (armor): Divines (40) + Increase Magicka (22)
      gearPiece({ slot: 0, type: ArmorType.LIGHT, trait: 40 as PlayerGear['trait'], enchantType: 22 }),
      // Ring 1 (jewelry, slot 8): Bloodthirsty (53) + Spell Damage (47)
      gearPiece({ slot: 8, type: ArmorType.JEWELRY, trait: 53 as PlayerGear['trait'], enchantType: 47 }),
      // Main hand (weapon, slot 10): Sharpened (32) + Weapon Damage (27)
      gearPiece({ slot: 10, type: WeaponType.INFERNO_STAFF, trait: 32 as PlayerGear['trait'], enchantType: 27 }),
    ];

    const config = convertGear(gear);

    // Head → equip slot 0
    expect(config[0]).toMatchObject({ trait: 'divines', enchant: 'magicka', weight: 'light' });
    // Ring 1 → equip slot 11
    expect(config[11]).toMatchObject({ trait: 'bloodthirsty', enchant: 'increase-spell-damage' });
    expect(config[11].weight).toBeUndefined(); // jewelry has no weight
    // Main hand → equip slot 4
    expect(config[4]).toMatchObject({ trait: 'sharpened', enchant: 'weapon-damage' });
  });

  it('keys off item.slot, not array order', () => {
    // Deliberately out-of-order array: weapon first, head second.
    const gear: PlayerGear[] = [
      gearPiece({ slot: 10, type: WeaponType.INFERNO_STAFF, trait: 32 as PlayerGear['trait'] }),
      gearPiece({ slot: 0, type: ArmorType.HEAVY, trait: 40 as PlayerGear['trait'] }),
    ];
    const config = convertGear(gear);
    expect(config[4]).toMatchObject({ trait: 'sharpened' }); // main hand
    expect(config[0]).toMatchObject({ trait: 'divines', weight: 'heavy' }); // head
  });

  it('omits trait/enchant that cannot be mapped (no wrong values)', () => {
    const gear: PlayerGear[] = [
      // Ornate (43) is crafting-only; enchantType 0 = none
      gearPiece({ slot: 0, type: ArmorType.LIGHT, trait: 43 as PlayerGear['trait'], enchantType: 0 }),
    ];
    const config = convertGear(gear);
    expect(config[0].id).toBe(100);
    expect(config[0].trait).toBeUndefined();
    expect(config[0].enchant).toBeUndefined();
  });
});

// ─── playerToBuild: Class Mastery transfer ───────────────────────────────────

describe('playerToBuild — Class Mastery', () => {
  it('lifts detected Class Mastery picks onto build.classMasteryPassives', () => {
    const dkLine = getClassMasteryLine('dragonknight')!;
    const cmIds = dkLine.skills.slice(0, 2).map((s) => s.id);

    const build = playerToBuild({
      playerName: 'Tester',
      role: 'dps',
      gear: [],
      talents: [],
      mundusBuffs: [],
      championPoints: [],
      classAnalysis: dkAnalysis(cmIds),
    });

    expect(build.esoClass).toBe('dragonknight');
    expect(build.classMasteryPassives).toBeDefined();
    expect([...build.classMasteryPassives!].sort()).toEqual([...cmIds].sort());
  });

  it('caps Class Mastery at the 2-pick max and drops foreign-class ids', () => {
    const dkLine = getClassMasteryLine('dragonknight')!;
    const sorcLine = getClassMasteryLine('sorcerer')!;
    const dkIds = dkLine.skills.slice(0, 3).map((s) => s.id); // 3 → must cap to 2
    const foreign = sorcLine.skills[0].id; // wrong class → dropped

    const build = playerToBuild({
      playerName: 'Tester',
      role: 'dps',
      gear: [],
      talents: [],
      mundusBuffs: [],
      championPoints: [],
      classAnalysis: dkAnalysis([...dkIds, foreign]),
    });

    expect(build.classMasteryPassives!.length).toBe(2);
    expect(build.classMasteryPassives).not.toContain(foreign);
    build.classMasteryPassives!.forEach((id) => expect(dkIds).toContain(id));
  });

  it('does not leak Class Mastery ids into setup.passives', () => {
    const dkLine = getClassMasteryLine('dragonknight')!;
    const cmIds = dkLine.skills.slice(0, 2).map((s) => s.id);

    // Talents include the CM passive ids as trailing passives (defensive path).
    const talents = [
      ...Array.from({ length: 12 }, (_, i) => ({
        name: `bar-${i}`,
        guid: 1000 + i,
        type: 1,
        abilityIcon: '',
        flags: 0,
      })),
      ...cmIds.map((id) => ({ name: 'cm', guid: id, type: 1, abilityIcon: '', flags: 0 })),
    ];

    const build = playerToBuild({
      playerName: 'Tester',
      role: 'dps',
      gear: [],
      talents,
      mundusBuffs: [],
      championPoints: [],
      classAnalysis: dkAnalysis(cmIds),
    });

    expect([...build.classMasteryPassives!].sort()).toEqual([...cmIds].sort());
    for (const setup of build.setups) {
      cmIds.forEach((id) => expect(setup.passives).not.toContain(id));
    }
  });

  it('yields no Class Mastery picks when class is unknown', () => {
    const build = playerToBuild({
      playerName: 'Tester',
      role: 'dps',
      gear: [],
      talents: [],
      mundusBuffs: [],
      championPoints: [],
      classAnalysis: undefined,
    });
    expect(build.esoClass).toBe('any-class');
    expect(build.classMasteryPassives).toEqual([]);
  });
});

// ─── Full production round-trip ──────────────────────────────────────────────
// playerToBuild → encodeBuildToURL (?b=) → decodeBuildFromURL → loadBuild migrate.
// Proves traits, enchants AND Class Mastery survive the exact path the
// "Extract Build" button drives.

describe('extract → encode → decode round-trip', () => {
  it('preserves gear traits/enchants and Class Mastery across the ?b= pipeline', async () => {
    const dkLine = getClassMasteryLine('dragonknight')!;
    const cmIds = dkLine.skills.slice(0, 2).map((s) => s.id);

    const gear: PlayerGear[] = [
      gearPiece({ slot: 0, type: ArmorType.LIGHT, trait: 40 as PlayerGear['trait'], enchantType: 22 }), // Divines + Increase Magicka
      gearPiece({ slot: 8, type: ArmorType.JEWELRY, trait: 53 as PlayerGear['trait'], enchantType: 47 }), // Bloodthirsty + Spell Damage
      gearPiece({ slot: 10, type: WeaponType.INFERNO_STAFF, trait: 32 as PlayerGear['trait'], enchantType: 27 }), // Sharpened + Weapon Damage
    ];

    const original = playerToBuild({
      playerName: 'Round Trip',
      role: 'dps',
      gear,
      talents: [],
      mundusBuffs: [],
      championPoints: [],
      classAnalysis: dkAnalysis(cmIds),
    });

    const encoded = await encodeBuildToURL(original);
    expect(encoded).toBeTruthy();

    const decoded = await decodeBuildFromURL(encoded);
    expect(decoded).not.toBeNull();
    // loadBuild runs this migration; run it here to mirror production exactly.
    migrateLeakedClassMasteryPicks(decoded!);

    // Class Mastery survives
    expect([...decoded!.classMasteryPassives!].sort()).toEqual([...cmIds].sort());

    // Gear traits + enchants survive (equip slots: head=0, ring1=11, main-hand=4)
    const dGear = decoded!.setups[0].gear;
    expect(dGear[0]).toMatchObject({ trait: 'divines', enchant: 'magicka' });
    expect(dGear[11]).toMatchObject({ trait: 'bloodthirsty', enchant: 'increase-spell-damage' });
    expect(dGear[4]).toMatchObject({ trait: 'sharpened', enchant: 'weapon-damage' });

    // CM ids must not have leaked into regular passives
    for (const setup of decoded!.setups) {
      cmIds.forEach((id) => expect(setup.passives).not.toContain(id));
    }
  });
});
