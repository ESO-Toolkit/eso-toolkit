import { ClassSkillId } from '../features/loadout-manager/data/classSkillIds';
import {
  ArmorType,
  GearSlot,
  GearTrait,
  WeaponType,
  type PlayerGear,
  type PlayerTalent,
} from '../types/playerDetails';

import type { ClassAnalysisResult } from './classDetectionUtils';
import { ItemQuality } from './gearUtilities';
import { convertSkills, playerToBuild } from './playerToBuild';

const talentFor = (guid: number): PlayerTalent => ({
  guid,
  name: `Talent ${guid}`,
  type: 0,
  abilityIcon: '',
  flags: 0,
});

const gearPiece = (
  slot: number,
  type: WeaponType | ArmorType,
  setName: string,
  id: number,
): PlayerGear => ({
  id,
  slot,
  quality: ItemQuality.LEGENDARY,
  icon: '',
  championPoints: 160,
  trait: GearTrait.REINFORCED,
  enchantType: 0,
  enchantQuality: 0,
  setID: 0,
  type,
  setName,
});

const emptySkillBars = (): PlayerTalent[] => Array.from({ length: 12 }, () => talentFor(0));

const sorcererClassAnalysis: ClassAnalysisResult = {
  primary: 'Dark Magic',
  skillLines: [
    {
      skillLine: 'Dark Magic',
      className: 'Sorcerer',
      count: 1,
      skillIds: new Set([ClassSkillId.SORCERER_CRYSTAL_SHARD]),
    },
    {
      skillLine: 'Daedric Summoning',
      className: 'Sorcerer',
      count: 0,
      skillIds: new Set(),
    },
    {
      skillLine: 'Storm Calling',
      className: 'Sorcerer',
      count: 0,
      skillIds: new Set(),
    },
  ],
};

describe('playerToBuild Class Mastery extraction', () => {
  it('keeps Class Mastery picks out of generic setup passives', () => {
    const result = convertSkills([
      ...emptySkillBars(),
      talentFor(ClassSkillId.SORCERER_CONSERVATION_OF_ENERGY),
      talentFor(ClassSkillId.SORCERER_BLOOD_MAGIC),
    ]);

    expect(result.passives).toEqual([ClassSkillId.SORCERER_BLOOD_MAGIC]);
  });

  it('populates build-level Class Mastery picks from player-card talents', () => {
    const build = playerToBuild({
      playerName: 'Arc Spark',
      role: 'dps',
      gear: [],
      talents: [
        ...emptySkillBars(),
        talentFor(ClassSkillId.SORCERER_CONSERVATION_OF_ENERGY),
        talentFor(ClassSkillId.SORCERER_FONT_OF_POWER),
        talentFor(ClassSkillId.SORCERER_BLOOD_MAGIC),
      ],
      mundusBuffs: [],
      championPoints: [],
      classAnalysis: sorcererClassAnalysis,
    });

    expect(build.esoClass).toBe('sorcerer');
    expect(build.classMasteryPassives).toEqual([
      ClassSkillId.SORCERER_CONSERVATION_OF_ENERGY,
      ClassSkillId.SORCERER_FONT_OF_POWER,
    ]);
    expect(build.setups[0].passives).toEqual([ClassSkillId.SORCERER_BLOOD_MAGIC]);
  });

  it('prefers exact Kalpa native Class Mastery evidence when talents are incomplete', () => {
    const build = playerToBuild({
      playerName: 'Arc Spark',
      role: 'dps',
      gear: [],
      talents: [...emptySkillBars(), talentFor(ClassSkillId.SORCERER_BLOOD_MAGIC)],
      mundusBuffs: [],
      championPoints: [],
      classAnalysis: undefined,
      kalpaBuildEvidence: {
        unitId: '1',
        characterName: 'Arc Spark',
        accountName: '@tester',
        classId: 2,
        className: 'Sorcerer',
        classMasteryPassives: [
          ClassSkillId.SORCERER_CONSERVATION_OF_ENERGY,
          ClassSkillId.SORCERER_FONT_OF_POWER,
        ],
        evidence: 'raw-player-info',
        confidence: 'exact',
      },
    });

    expect(build.esoClass).toBe('sorcerer');
    expect(build.classSkillLines).toEqual([
      'class.dark-magic',
      'class.daedric-summoning',
      'class.storm-calling',
    ]);
    expect(build.classMasteryPassives).toEqual([
      ClassSkillId.SORCERER_CONSERVATION_OF_ENERGY,
      ClassSkillId.SORCERER_FONT_OF_POWER,
    ]);
    expect(build.setups[0].passives).toEqual([ClassSkillId.SORCERER_BLOOD_MAGIC]);
  });

  it('ignores Kalpa Class Mastery ids that do not belong to the resolved class', () => {
    const build = playerToBuild({
      playerName: 'Arc Spark',
      role: 'dps',
      gear: [],
      talents: [...emptySkillBars()],
      mundusBuffs: [],
      championPoints: [],
      classAnalysis: sorcererClassAnalysis,
      kalpaBuildEvidence: {
        unitId: '1',
        className: 'Sorcerer',
        classMasteryPassives: [ClassSkillId.ARCANIST_ABYSSAL_EMERGENCE],
        evidence: 'raw-player-info',
        confidence: 'exact',
      },
    });

    expect(build.esoClass).toBe('sorcerer');
    expect(build.classMasteryPassives).toEqual([]);
  });

  it('carries exact Kalpa race and food evidence into extracted builds', () => {
    const build = playerToBuild({
      playerName: 'Arc Spark',
      role: 'dps',
      gear: [],
      talents: [...emptySkillBars()],
      mundusBuffs: [],
      championPoints: [],
      classAnalysis: sorcererClassAnalysis,
      kalpaBuildEvidence: {
        unitId: '1',
        className: 'Sorcerer',
        raceId: 9,
        classMasteryPassives: [],
        food: { abilityId: 68411, name: 'Increase All Primary Stats' },
        evidence: 'raw-player-info',
        confidence: 'exact',
      },
    });

    expect(build.races).toEqual(['khajiit']);
    expect(build.setups[0].consumables.food).toEqual({ name: 'Increase All Primary Stats' });
  });
});

describe('playerToBuild gear description — two-handed weapon counting', () => {
  const baseArgs = {
    playerName: 'Desc Tester',
    role: 'dps' as const,
    talents: [] as PlayerTalent[],
    mundusBuffs: [],
    championPoints: [],
  };

  it('counts a 2H staff as 2 pieces and jewelry as 1 in the {n}pc summary', () => {
    // 2 body + 1 staff (2H, +2) + 1 necklace (jewelry, +1) = 5 pieces.
    const build = playerToBuild({
      ...baseArgs,
      gear: [
        gearPiece(GearSlot.HEAD, ArmorType.LIGHT, "Ansuul's Torment", 1),
        gearPiece(GearSlot.CHEST, ArmorType.LIGHT, "Ansuul's Torment", 2),
        gearPiece(GearSlot.NECK, ArmorType.JEWELRY, "Ansuul's Torment", 3),
        gearPiece(GearSlot.MAIN_HAND, WeaponType.LIGHTNING_STAFF, "Ansuul's Torment", 4),
      ],
    });

    expect(build.shortDescription).toBe("5pc Ansuul's Torment");
  });

  it('counts a 1H weapon as a single piece', () => {
    const build = playerToBuild({
      ...baseArgs,
      gear: [
        gearPiece(GearSlot.HEAD, ArmorType.MEDIUM, 'Order of Diagna', 1),
        gearPiece(GearSlot.MAIN_HAND, WeaponType.DAGGER, 'Order of Diagna', 2),
      ],
    });

    expect(build.shortDescription).toBe('2pc Order of Diagna');
  });
});
