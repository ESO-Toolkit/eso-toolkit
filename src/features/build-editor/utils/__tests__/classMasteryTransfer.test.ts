import type { Build } from '../../types/build.types';
import {
  classFromMasteryIds,
  classOfClassMasteryId,
  migrateLeakedClassMasteryPicks,
  partitionClassMasteryPicks,
  sanitizeClassMasteryPicks,
  stripClassMasteryIds,
} from '../classMasteryTransfer';

/** A minimal build-shaped object for the migration helper. */
function leakyBuild(
  classMasteryPassives: number[],
  passivesPerSetup: number[][],
): Pick<Build, 'esoClass' | 'classMasteryPassives' | 'setups'> {
  return {
    esoClass: 'dragonknight',
    classMasteryPassives,
    setups: passivesPerSetup.map((passives) => ({ passives })) as Build['setups'],
  };
}

describe('classMasteryTransfer', () => {
  describe('classOfClassMasteryId', () => {
    it('maps a Class Mastery passive id to its owning class', () => {
      expect(classOfClassMasteryId(238232)).toBe('dragonknight'); // Inexorable Descent
      expect(classOfClassMasteryId(263519)).toBe('warden'); // Tundra's Maw
      expect(classOfClassMasteryId(263605)).toBe('nightblade'); // Above and Beyond
    });

    it('returns undefined for a non-Class-Mastery id', () => {
      expect(classOfClassMasteryId(400)).toBeUndefined();
    });
  });

  describe('sanitizeClassMasteryPicks', () => {
    it('keeps only the class own ids, deduped and capped at the 2-pick max', () => {
      expect(
        sanitizeClassMasteryPicks([238232, 238232, 240268, 259224, 263519], 'dragonknight'),
      ).toEqual([238232, 240268]);
    });

    it('returns [] for a class with no Class Mastery line or empty input', () => {
      expect(sanitizeClassMasteryPicks([238232], 'any-class')).toEqual([]);
      expect(sanitizeClassMasteryPicks(undefined, 'dragonknight')).toEqual([]);
    });
  });

  describe('classFromMasteryIds', () => {
    it('returns the class owning the most Class Mastery ids', () => {
      expect(classFromMasteryIds([263519, 263520, 238232])).toBe('warden');
    });

    it('ignores non-Class-Mastery ids and returns undefined when none are present', () => {
      expect(classFromMasteryIds([400, 500])).toBeUndefined();
    });

    it('returns undefined on an ambiguous cross-class tie (stale/corrupt data)', () => {
      // 1 Dragonknight + 1 Warden CM id — impossible for a real character, so it
      // is treated as inconclusive rather than letting a stale id pick the class.
      expect(classFromMasteryIds([238232, 263519])).toBeUndefined();
    });
  });

  describe('stripClassMasteryIds', () => {
    it('removes every Class Mastery id, keeping the regular passives in order', () => {
      expect(stripClassMasteryIds([400, 238232, 500, 263519])).toEqual([400, 500]);
    });

    it('is a no-op when there are no Class Mastery ids', () => {
      expect(stripClassMasteryIds([400, 500])).toEqual([400, 500]);
    });
  });

  describe('partitionClassMasteryPicks', () => {
    it('splits Class Mastery ids out from the regular passives', () => {
      const { passives, classMasteryPassives } = partitionClassMasteryPicks(
        [400, 238232, 500, 240268],
        'dragonknight',
      );
      expect(passives).toEqual([400, 500]);
      expect(classMasteryPassives).toEqual([238232, 240268]);
    });

    it('strips foreign-class CM ids from passives without keeping them as picks', () => {
      const { passives, classMasteryPassives } = partitionClassMasteryPicks(
        [400, 263519], // 263519 = Warden CM id, build is dragonknight
        'dragonknight',
      );
      expect(passives).toEqual([400]); // CM id removed regardless of class
      expect(classMasteryPassives).toEqual([]); // not a valid DK pick
    });
  });

  describe('migrateLeakedClassMasteryPicks', () => {
    it('lifts leaked CM ids from setup.passives into the empty build-level field', () => {
      const build = leakyBuild([], [[400, 238232, 240268]]);
      migrateLeakedClassMasteryPicks(build);
      expect(build.classMasteryPassives).toEqual([238232, 240268]);
      expect(build.setups[0].passives).toEqual([400]);
    });

    it('keeps existing build-level picks but still strips leaked ids from passives', () => {
      const build = leakyBuild([238232], [[400, 240268]]);
      migrateLeakedClassMasteryPicks(build);
      expect(build.classMasteryPassives).toEqual([238232]); // not overwritten
      expect(build.setups[0].passives).toEqual([400]); // 240268 stripped
    });

    it('is a no-op for a clean build with no leaked ids', () => {
      const build = leakyBuild([], [[400, 500]]);
      migrateLeakedClassMasteryPicks(build);
      expect(build.classMasteryPassives).toEqual([]);
      expect(build.setups[0].passives).toEqual([400, 500]);
    });
  });
});
