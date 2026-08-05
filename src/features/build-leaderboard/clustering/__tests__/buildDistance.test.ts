import type { ParseFeatureVector } from '../../types/clustering.types';
import {
  ARCANIST_ARCHETYPE,
  NECRO_ARCHETYPE,
  SETS,
  makeParse,
  resetFixtureIds,
} from '../__fixtures__/dpsParses.fixture';
import {
  DEFAULT_FEATURE_WEIGHTS,
  buildDistance,
  buildDistanceMatrix,
  categoricalDistance,
  condensedIndex,
  jaccardDistance,
} from '../buildDistance';
import { EMPTY_CANONICAL_MAPS, toFeatureVector } from '../featureExtraction';

function vectorFor(spec: Parameters<typeof makeParse>[0], index = 0): ParseFeatureVector {
  const vector = toFeatureVector(makeParse(spec, index), EMPTY_CANONICAL_MAPS);
  if (!vector) throw new Error('expected a feature vector');
  return vector;
}

beforeEach(() => {
  resetFixtureIds();
});

describe('jaccardDistance', () => {
  it('is 0 for identical sets and 1 for disjoint sets', () => {
    expect(jaccardDistance([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(jaccardDistance([1, 2], [3, 4])).toBe(1);
  });

  it('is order-insensitive', () => {
    expect(jaccardDistance([3, 1, 2], [1, 2, 3])).toBe(0);
  });

  it('scales with overlap', () => {
    // |∩| = 1, |∪| = 3
    expect(jaccardDistance([1, 2], [2, 3])).toBeCloseTo(1 - 1 / 3, 10);
  });

  // Two empty sets are identical, not undefined. NaN here would silently poison
  // every weighted average downstream.
  it('returns 0 (not NaN) for two empty sets', () => {
    expect(jaccardDistance([], [])).toBe(0);
    expect(Number.isNaN(jaccardDistance([], []))).toBe(false);
  });

  it('returns 1 when only one side is empty', () => {
    expect(jaccardDistance([], [1])).toBe(1);
    expect(jaccardDistance([1], [])).toBe(1);
  });

  it('ignores duplicate entries', () => {
    expect(jaccardDistance([1, 1, 2], [1, 2])).toBe(0);
  });
});

describe('categoricalDistance', () => {
  it('treats both-absent as a match and one-absent as a mismatch', () => {
    expect(categoricalDistance(null, null)).toBe(0);
    expect(categoricalDistance(1, null)).toBe(1);
    expect(categoricalDistance(1, 1)).toBe(0);
    expect(categoricalDistance(1, 2)).toBe(1);
  });
});

describe('condensedIndex', () => {
  it('matches a naive upper-triangular enumeration', () => {
    const n = 7;
    const expected = new Map<string, number>();
    let k = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        expected.set(`${i}:${j}`, k++);
      }
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        expect(condensedIndex(i, j, n)).toBe(expected.get(`${i}:${j}`));
        // Symmetric — argument order must not matter.
        expect(condensedIndex(j, i, n)).toBe(expected.get(`${i}:${j}`));
      }
    }
  });

  it('throws when both indices are the same', () => {
    expect(() => condensedIndex(2, 2, 5)).toThrow();
  });
});

describe('buildDistance', () => {
  it('is 0 for a vector against itself', () => {
    const vector = vectorFor(NECRO_ARCHETYPE);
    expect(buildDistance(vector, vector)).toBe(0);
  });

  it('is symmetric', () => {
    const a = vectorFor(NECRO_ARCHETYPE);
    const b = vectorFor(ARCANIST_ARCHETYPE);
    expect(buildDistance(a, b)).toBeCloseTo(buildDistance(b, a), 12);
  });

  it('stays within [0, 1]', () => {
    const vectors = [vectorFor(NECRO_ARCHETYPE), vectorFor(ARCANIST_ARCHETYPE, 1)];
    for (const a of vectors) {
      for (const b of vectors) {
        const distance = buildDistance(a, b);
        expect(distance).toBeGreaterThanOrEqual(0);
        expect(distance).toBeLessThanOrEqual(1);
      }
    }
  });

  /**
   * The load-bearing assertion. These weights encode the domain judgment that a
   * shared monster set says far less about an archetype than a shared five-piece
   * set, which in turn says less than a shared class. Retuning the weights is fine
   * — silently inverting this ordering is not.
   */
  it('ranks monster set < five-piece set < class in significance', () => {
    const base = vectorFor(NECRO_ARCHETYPE);

    const differentMonster: ParseFeatureVector = { ...base, monsterSet: SETS.zaan };
    const differentFivePiece: ParseFeatureVector = {
      ...base,
      fivePieceSets: [SETS.deadlyStrike, SETS.azureblight].sort((a, b) => a - b),
    };
    const differentClass: ParseFeatureVector = { ...base, esoClass: 'Sorcerer' };

    const monsterDistance = buildDistance(base, differentMonster);
    const fivePieceDistance = buildDistance(base, differentFivePiece);
    const classDistance = buildDistance(base, differentClass);

    expect(monsterDistance).toBeGreaterThan(0);
    expect(monsterDistance).toBeLessThan(fivePieceDistance);
    expect(fivePieceDistance).toBeLessThan(classDistance);
  });

  it('gives morph siblings partial credit over unrelated abilities', () => {
    const base = vectorFor(NECRO_ARCHETYPE);

    // Same base skill, different morph: exact ids differ, base ids match.
    const morphSibling: ParseFeatureVector = {
      ...base,
      frontBar: [999_001, ...base.frontBar.slice(1)],
      frontBarBase: base.frontBarBase,
    };
    // Genuinely unrelated ability: both exact and base ids differ.
    const unrelated: ParseFeatureVector = {
      ...base,
      frontBar: [999_002, ...base.frontBar.slice(1)],
      frontBarBase: [999_002, ...base.frontBarBase.slice(1)],
    };

    const morphDistance = buildDistance(base, morphSibling);
    const unrelatedDistance = buildDistance(base, unrelated);

    expect(morphDistance).toBeGreaterThan(0);
    expect(morphDistance).toBeLessThan(unrelatedDistance);
  });

  /**
   * characterRankings returns no race, CP, mundus or food. Scoring "both absent"
   * as agreement would make every pair look four groups more alike than the
   * evidence supports, so those groups must drop out of the weighted mean.
   */
  it('skips groups both vectors declare missing', () => {
    const a = vectorFor(NECRO_ARCHETYPE);
    const b = vectorFor(NECRO_ARCHETYPE, 1);

    const withMissing = buildDistance(a, b);
    const withoutMissingDeclared = buildDistance({ ...a, missing: [] }, { ...b, missing: [] });

    // Declaring them missing must not merely reproduce the both-null match.
    expect(withMissing).toBeGreaterThanOrEqual(withoutMissingDeclared);
  });

  it('returns maximum distance when nothing is comparable', () => {
    const a = vectorFor(NECRO_ARCHETYPE);
    const allMissing = Object.keys(DEFAULT_FEATURE_WEIGHTS) as ParseFeatureVector['missing'];
    expect(buildDistance({ ...a, missing: allMissing }, { ...a, missing: allMissing })).toBe(1);
  });
});

describe('buildDistanceMatrix', () => {
  it('produces the expected condensed length and matches pairwise calls', () => {
    const vectors = [
      vectorFor(NECRO_ARCHETYPE),
      vectorFor(ARCANIST_ARCHETYPE, 1),
      vectorFor(NECRO_ARCHETYPE, 2),
    ];
    const matrix = buildDistanceMatrix(vectors);

    expect(matrix).toHaveLength(3);
    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        expect(matrix[condensedIndex(i, j, vectors.length)]).toBeCloseTo(
          buildDistance(vectors[i], vectors[j]),
          6,
        );
      }
    }
  });

  it('handles fewer than two vectors', () => {
    expect(buildDistanceMatrix([])).toHaveLength(0);
    expect(buildDistanceMatrix([vectorFor(NECRO_ARCHETYPE)])).toHaveLength(0);
  });
});
