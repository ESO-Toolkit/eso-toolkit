import type { FeatureGroupKey, ParseFeatureVector } from '../../types/clustering.types';
import { traitShares } from '../clusterSummary';

function vector(overrides: Partial<ParseFeatureVector> = {}): ParseFeatureVector {
  return {
    parseId: 'p',
    amount: 100,
    esoClass: 'Arcanist',
    skillLines: [],
    fivePieceSets: [1, 2],
    frontBar: [10, 11],
    backBar: [20, 21],
    frontBarBase: [10, 11],
    backBarBase: [20, 21],
    monsterSet: 350,
    mythic: null,
    arena: null,
    cpSlottables: [],
    mundus: null,
    food: null,
    race: null,
    missing: [],
    ...overrides,
  };
}

describe('traitShares missing-group handling', () => {
  /**
   * A vector that declares a group missing has no opinion about it, so it must
   * neither contribute traits nor sit in that group's denominator. Counting it
   * would report a trait every contributing parse carries as only half-used.
   */
  it('excludes missing-group vectors from that group only', () => {
    const present = vector({ parseId: 'a' });
    const barsUnknown = vector({
      parseId: 'b',
      frontBar: [99],
      backBar: [],
      missing: ['frontBar', 'backBar'] as FeatureGroupKey[],
    });

    const traits = traitShares([present, barsUnknown], [1, 1]);
    const byKey = new Map(traits.map((t) => [`${t.group}|${t.id}`, t.share]));

    // The unknown-layout vector's ability is absent entirely...
    expect(byKey.has('frontBar|99')).toBe(false);
    // ...and the real ability is 100% of the parses that declare a layout,
    // not 50% of both.
    expect(byKey.get('frontBar|10')).toBeCloseTo(1, 6);

    // Groups it did NOT declare missing still count it: both vectors wear set 1.
    expect(byKey.get('fivePieceSets|1')).toBeCloseTo(1, 6);
  });

  it('weights by multiplicity within a group', () => {
    const a = vector({ parseId: 'a', monsterSet: 350 });
    const b = vector({ parseId: 'b', monsterSet: 270 });

    const traits = traitShares([a, b], [3, 1]);
    const byKey = new Map(traits.map((t) => [`${t.group}|${t.id}`, t.share]));

    expect(byKey.get('monsterSet|350')).toBeCloseTo(0.75, 6);
    expect(byKey.get('monsterSet|270')).toBeCloseTo(0.25, 6);
  });
});
