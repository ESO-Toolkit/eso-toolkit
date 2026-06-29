import { ClassSkillId } from '../features/loadout-manager/data/classSkillIds';
import type { PlayerTalent } from '../types/playerDetails';

import type { ClassAnalysisResult } from './classDetectionUtils';
import { convertSkills, playerToBuild } from './playerToBuild';

const talentFor = (guid: number): PlayerTalent => ({
  guid,
  name: `Talent ${guid}`,
  type: 0,
  abilityIcon: '',
  flags: 0,
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
});
