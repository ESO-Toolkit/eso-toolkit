import type { BuildSignature } from '../../types/dpsParses.types';
import {
  NECRO_ARCHETYPE,
  SETS,
  makeParse,
  resetFixtureIds,
} from '../__fixtures__/dpsParses.fixture';
import {
  EMPTY_CANONICAL_MAPS,
  collapseDuplicateSignatures,
  extractFeatureVectors,
  toFeatureVector,
} from '../featureExtraction';

beforeEach(() => {
  resetFixtureIds();
});

describe('sets.extra promotion', () => {
  /**
   * Regression: a >=5-piece set the ingest could not slot landed in sets.extra
   * and never reached fivePieceSets, so an entire gear axis was invisible to
   * clustering for exactly the builds our hardcoded tables predate.
   */
  function parseWithExtra(extra: number[], setCounts: Array<[number, number]>) {
    const base = makeParse(NECRO_ARCHETYPE, 1);
    const build: BuildSignature = {
      ...base.build!,
      sets: { ...base.build!.sets, extra },
      setCounts,
    };
    return { ...base, build };
  }

  it('promotes an extra set with >= 5 pieces into fivePieceSets', () => {
    // 999 is deliberately not in any table — that is the whole scenario.
    const parse = parseWithExtra(
      [999],
      [
        [SETS.corpseburster, 5],
        [SETS.azureblight, 5],
        [999, 5],
      ],
    );

    const vector = toFeatureVector(parse, EMPTY_CANONICAL_MAPS);
    expect(vector?.fivePieceSets).toContain(999);
    expect(vector?.fivePieceSets).toHaveLength(3);
  });

  it('leaves an extra set below 5 pieces out of fivePieceSets', () => {
    const parse = parseWithExtra(
      [888],
      [
        [SETS.corpseburster, 5],
        [SETS.azureblight, 5],
        [888, 2],
      ],
    );

    const vector = toFeatureVector(parse, EMPTY_CANONICAL_MAPS);
    expect(vector?.fivePieceSets).not.toContain(888);
    expect(vector?.fivePieceSets).toHaveLength(2);
  });

  it('does not duplicate an id already slotted in fivePiece', () => {
    const parse = parseWithExtra(
      [SETS.azureblight],
      [
        [SETS.corpseburster, 5],
        [SETS.azureblight, 5],
      ],
    );

    const vector = toFeatureVector(parse, EMPTY_CANONICAL_MAPS);
    expect(vector?.fivePieceSets.filter((id) => id === SETS.azureblight)).toHaveLength(1);
  });

  it('treats a promoted set as part of the build signature', () => {
    const without = extractFeatureVectors(
      [
        parseWithExtra(
          [],
          [
            [SETS.corpseburster, 5],
            [SETS.azureblight, 5],
          ],
        ),
      ],
      EMPTY_CANONICAL_MAPS,
    );
    const withPromoted = extractFeatureVectors(
      [
        parseWithExtra(
          [666],
          [
            [SETS.corpseburster, 5],
            [SETS.azureblight, 5],
            [666, 5],
          ],
        ),
      ],
      EMPTY_CANONICAL_MAPS,
    );

    // A promoted five-piece changes the build; collapsing must not merge them.
    expect(collapseDuplicateSignatures([...without, ...withPromoted]).points).toHaveLength(2);
  });
});

describe('collapseDuplicateSignatures per-member amounts', () => {
  /**
   * Regression companion: cluster dps summaries expand from these real amounts.
   * The representative keeps only the max-dps VECTOR, so if amounts were not
   * carried per member there would be no way to recover the true spread.
   */
  it('carries every member amount, not just the representative’s', () => {
    const duplicates = [120_000, 340_000, 250_000].map((amount) =>
      makeParse(NECRO_ARCHETYPE, 1, { amount }),
    );
    const vectors = extractFeatureVectors(duplicates, EMPTY_CANONICAL_MAPS);

    expect(vectors).toHaveLength(3);
    const collapsed = collapseDuplicateSignatures(vectors);

    expect(collapsed.points).toHaveLength(1);
    expect(collapsed.multiplicity[0]).toBe(3);
    // The representative is the highest-dps member…
    expect(collapsed.points[0].amount).toBe(340_000);
    // …but ALL real amounts survive alongside it, unordered members kept.
    expect([...collapsed.amounts[0]].sort((a, b) => a - b)).toEqual([120_000, 250_000, 340_000]);
    expect(collapsed.members[0]).toHaveLength(3);
  });
});
