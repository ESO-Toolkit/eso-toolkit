import { CLASS_MASTERY_LINE_NAME } from '../../../data/skill-lines/class/classMastery';
import { ClassSkillId } from '../../../features/loadout-manager/data/classSkillIds';
import {
  RED_CHAMPION_POINTS,
  BLUE_CHAMPION_POINTS,
  GREEN_CHAMPION_POINTS,
  KnownAbilities,
} from '../../../types/abilities';

import { buildChampionPointEntry, classAnalysisFromKalpaEvidence } from './PlayersPanel';

describe('Champion Points Constants', () => {
  it('should have the correct champion point ability IDs', () => {
    // Red Champion Points
    expect(RED_CHAMPION_POINTS.has(KnownAbilities.SLIPPERY)).toBe(true);
    expect(RED_CHAMPION_POINTS.has(KnownAbilities.SPRINTER)).toBe(true);

    // Blue Champion Points
    expect(BLUE_CHAMPION_POINTS.has(KnownAbilities.EXPLOITER)).toBe(true);
    expect(BLUE_CHAMPION_POINTS.has(KnownAbilities.BULWARK)).toBe(true);
    expect(BLUE_CHAMPION_POINTS.has(KnownAbilities.REAVING_BLOWS)).toBe(true);

    // Green Champion Points
    expect(GREEN_CHAMPION_POINTS.has(KnownAbilities.GILDED_FINGERS)).toBe(true);
  });

  it('should have no overlapping champion points between colors', () => {
    const redIds = Array.from(RED_CHAMPION_POINTS);
    const blueIds = Array.from(BLUE_CHAMPION_POINTS);

    // No overlap between red and blue
    expect(redIds.some((id) => BLUE_CHAMPION_POINTS.has(id))).toBe(false);

    // No overlap between red and green
    expect(redIds.some((id) => GREEN_CHAMPION_POINTS.has(id))).toBe(false);

    // No overlap between blue and green
    expect(blueIds.some((id) => GREEN_CHAMPION_POINTS.has(id))).toBe(false);
  });

  it('builds readable CP entries for Kalpa-only champion point ids', () => {
    expect(buildChampionPointEntry(KnownAbilities.GILDED_FINGERS, {})).toEqual({
      id: KnownAbilities.GILDED_FINGERS,
      name: 'Gilded Fingers',
      color: 'green',
    });
    expect(buildChampionPointEntry(999999, {})).toBeUndefined();
  });
});

describe('classAnalysisFromKalpaEvidence', () => {
  it('surfaces exact Kalpa Class Mastery picks on the dedicated Class Mastery line', () => {
    const analysis = classAnalysisFromKalpaEvidence({
      unitId: '1',
      characterName: 'Icyskin',
      accountName: '@Gowrekt',
      characterId: '1000051',
      className: 'Warden',
      classMasteryPassives: [ClassSkillId.WARDEN_TUNDRA_S_MAW, ClassSkillId.WARDEN_WILD_ADAPTATION],
      evidence: 'raw-player-info',
      confidence: 'exact',
    });

    const masteryLine = analysis?.skillLines.find(
      (line) => line.skillLine === CLASS_MASTERY_LINE_NAME,
    );
    const nativeLines = analysis?.skillLines.filter(
      (line) => line.skillLine !== CLASS_MASTERY_LINE_NAME,
    );

    expect(masteryLine).toMatchObject({
      skillLine: CLASS_MASTERY_LINE_NAME,
      className: 'Warden',
      count: 2,
    });
    expect([...(masteryLine?.skillIds ?? [])]).toEqual([
      ClassSkillId.WARDEN_TUNDRA_S_MAW,
      ClassSkillId.WARDEN_WILD_ADAPTATION,
    ]);
    expect(nativeLines).toHaveLength(3);
    nativeLines?.forEach((line) => expect(line.skillIds.size).toBe(0));
  });

  it('drops stale or foreign Class Mastery ids from Kalpa evidence', () => {
    const analysis = classAnalysisFromKalpaEvidence({
      unitId: '1',
      className: 'Warden',
      classMasteryPassives: [
        ClassSkillId.WARDEN_TUNDRA_S_MAW,
        ClassSkillId.SORCERER_FONT_OF_POWER,
        ClassSkillId.WARDEN_WILD_ADAPTATION,
        ClassSkillId.WARDEN_GLACIAL_OBSTINANCE,
      ],
      evidence: 'raw-player-info',
      confidence: 'exact',
    });

    const masteryLine = analysis?.skillLines.find(
      (line) => line.skillLine === CLASS_MASTERY_LINE_NAME,
    );

    expect([...(masteryLine?.skillIds ?? [])]).toEqual([
      ClassSkillId.WARDEN_TUNDRA_S_MAW,
      ClassSkillId.WARDEN_WILD_ADAPTATION,
    ]);
  });
});
