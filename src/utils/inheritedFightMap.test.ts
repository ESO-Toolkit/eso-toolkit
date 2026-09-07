import { FightFragment } from '../graphql/gql/graphql';

import { resolveInheritedFightMaps, withInheritedFightMaps } from './inheritedFightMap';

const LUCENT_MAP = { id: 2552, file: 'deadlands/u42tri_lucentcitmap001', name: 'Lucent Citadel' };
const OTHER_MAP = { id: 3001, file: 'skyrim/kynesaegisboss3floor003', name: 'Roof' };

function makeFight(overrides: Partial<FightFragment>): FightFragment {
  return {
    id: 1,
    name: 'Fight',
    startTime: 0,
    endTime: 1000,
    encounterID: 0,
    gameZone: { id: 1478, name: 'Lucent Citadel' },
    boundingBox: { minX: 0, maxX: 10000, minY: 0, maxY: 10000 },
    ...overrides,
  } as FightFragment;
}

describe('resolveInheritedFightMaps', () => {
  it('returns null when the fight already has its own maps', () => {
    const fight = makeFight({ id: 5, encounterID: 58, maps: [LUCENT_MAP] });
    const sibling = makeFight({ id: 9, encounterID: 60, maps: [OTHER_MAP] });

    expect(resolveInheritedFightMaps(fight, [fight, sibling])).toBeNull();
  });

  it('borrows the map from a boss fight in the same zone', () => {
    const trash = makeFight({ id: 33, startTime: 2607264, endTime: 2904243 });
    const boss = makeFight({
      id: 34,
      encounterID: 60,
      startTime: 2904334,
      endTime: 3025078,
      maps: [LUCENT_MAP],
    });

    expect(resolveInheritedFightMaps(trash, [trash, boss])).toEqual([LUCENT_MAP]);
  });

  it('ignores fights from a different zone', () => {
    const trash = makeFight({ id: 33 });
    const otherZone = makeFight({
      id: 40,
      gameZone: { id: 1344, name: 'Kyne’s Aegis' },
      maps: [OTHER_MAP],
    });

    expect(resolveInheritedFightMaps(trash, [trash, otherZone])).toBeNull();
  });

  it('returns null when no fight in the report has a map (Cyrodiil/overland)', () => {
    const trash = makeFight({ id: 2 });
    const alsoTrash = makeFight({ id: 3 });

    expect(resolveInheritedFightMaps(trash, [trash, alsoTrash])).toBeNull();
  });

  it('prefers the candidate whose bounding box covers more of the fight', () => {
    const trash = makeFight({
      id: 33,
      boundingBox: { minX: 7000, maxX: 8000, minY: 8000, maxY: 9000 },
      startTime: 5000,
      endTime: 6000,
    });
    // Temporally nearer, but spatially elsewhere.
    const wrongFloor = makeFight({
      id: 34,
      maps: [OTHER_MAP],
      boundingBox: { minX: 0, maxX: 1000, minY: 0, maxY: 1000 },
      startTime: 6100,
      endTime: 7000,
    });
    const sameArea = makeFight({
      id: 30,
      maps: [LUCENT_MAP],
      boundingBox: { minX: 6900, maxX: 8100, minY: 7900, maxY: 9100 },
      startTime: 100,
      endTime: 900,
    });

    expect(resolveInheritedFightMaps(trash, [trash, wrongFloor, sameArea])).toEqual([LUCENT_MAP]);
  });

  it('falls back to the temporally nearest fight when no bounding box overlaps', () => {
    const trash = makeFight({
      id: 33,
      boundingBox: { minX: 5000, maxX: 5500, minY: 5000, maxY: 5500 },
      startTime: 5000,
      endTime: 6000,
    });
    const far = makeFight({
      id: 10,
      maps: [OTHER_MAP],
      boundingBox: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
      startTime: 0,
      endTime: 100,
    });
    const near = makeFight({
      id: 34,
      maps: [LUCENT_MAP],
      boundingBox: { minX: 1000, maxX: 1100, minY: 1000, maxY: 1100 },
      startTime: 6100,
      endTime: 7000,
    });

    expect(resolveInheritedFightMaps(trash, [trash, far, near])).toEqual([LUCENT_MAP]);
  });

  it('ignores a garbage bounding box so it cannot "overlap" everything', () => {
    // ESO Logs occasionally reports a box stretched by a stray event (seen: minX -2051470).
    const trash = makeFight({
      id: 14,
      boundingBox: { minX: -2051470, maxX: 10180, minY: 907, maxY: 1383508 },
      startTime: 861675,
      endTime: 1167040,
    });
    const far = makeFight({
      id: 5,
      maps: [OTHER_MAP],
      boundingBox: { minX: 3780, maxX: 5905, minY: 3673, maxY: 5560 },
      startTime: 303044,
      endTime: 369318,
    });
    const near = makeFight({
      id: 15,
      maps: [LUCENT_MAP],
      boundingBox: { minX: 6652, maxX: 7108, minY: 1106, maxY: 2591 },
      startTime: 1168004,
      endTime: 1319789,
    });

    // Neither candidate can score a spatial match, so the nearest pull in time wins.
    expect(resolveInheritedFightMaps(trash, [trash, far, near])).toEqual([LUCENT_MAP]);
  });

  it('handles a missing fight, missing zone or missing report fights', () => {
    expect(resolveInheritedFightMaps(null, [])).toBeNull();
    expect(resolveInheritedFightMaps(makeFight({ gameZone: null }), [])).toBeNull();
    expect(resolveInheritedFightMaps(makeFight({}), null)).toBeNull();
  });
});

describe('withInheritedFightMaps', () => {
  it('returns the same object reference when nothing is inherited', () => {
    const fight = makeFight({ id: 5, maps: [LUCENT_MAP] });
    expect(withInheritedFightMaps(fight, [fight])).toBe(fight);
  });

  it('returns a copy carrying the inherited maps', () => {
    const trash = makeFight({ id: 33 });
    const boss = makeFight({ id: 34, maps: [LUCENT_MAP] });

    const result = withInheritedFightMaps(trash, [trash, boss]);
    expect(result).not.toBe(trash);
    expect(result?.maps).toEqual([LUCENT_MAP]);
    expect(trash.maps).toBeUndefined();
  });
});
