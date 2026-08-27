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

describe('traitShares skillLines visibility', () => {
  /**
   * Regression: skillLines is weighted 2.0 in the distance function but was
   * never emitted as a trait — a hidden clustering axis the UI could not show.
   */
  it('emits skillLines as traits with CLASS_SKILL_LINES labels', () => {
    // Indices 15/16 are Necromancer's Grave Lord / Bone Tyrant.
    const a = vector({ parseId: 'a', skillLines: [15, 16] });
    const b = vector({ parseId: 'b', skillLines: [15, 17] });
    const traits = traitShares([a, b], [1, 1]);
    const byKey = new Map(traits.map((t) => [`${t.group}|${t.id}`, t]));

    expect(byKey.get('skillLines|15')?.share).toBeCloseTo(1, 6);
    expect(byKey.get('skillLines|16')?.share).toBeCloseTo(0.5, 6);
    expect(byKey.get('skillLines|17')?.share).toBeCloseTo(0.5, 6);

    // Human labels resolved from the static table, worker-safe.
    expect(byKey.get('skillLines|15')?.label).toBe('Grave Lord');
    expect(byKey.get('skillLines|16')?.label).toBe('Bone Tyrant');
    expect(byKey.get('skillLines|17')?.label).toBe('Living Death');
  });

  it('respects the missing-group declaration for skillLines', () => {
    const declared = vector({ parseId: 'a', skillLines: [15] });
    const undeclared = vector({
      parseId: 'b',
      skillLines: [],
      missing: ['skillLines'] as FeatureGroupKey[],
    });

    const traits = traitShares([declared, undeclared], [1, 1]);
    const line = traits.find((t) => t.group === 'skillLines');

    // The undeclared vector has no opinion, so the one carrier is at 100%.
    expect(line?.share).toBeCloseTo(1, 6);
  });

  // Codex P2 review pin: the generic `add` sentinel treats id 0 as empty, but
  // skillLines ids INDEX CLASS_SKILL_LINES — index 0 is Ardent Flame, a real
  // trait. Dragonknight clusters must be able to surface it.
  it('treats skill line index zero (Ardent Flame) as a valid trait', () => {
    const dk = vector({ parseId: 'a', esoClass: 'Dragonknight', skillLines: [0, 1] });
    const traits = traitShares([dk], [1]);
    const flame = traits.find((t) => t.group === 'skillLines' && t.id === 0);

    expect(flame).toBeDefined();
    expect(flame?.share).toBeCloseTo(1, 6);
    expect(flame?.label).toBe('Ardent Flame');
  });

  it('leaves non-skillLines labels blank for main-thread hydration', () => {
    const a = vector({ parseId: 'a' });
    const traits = traitShares([a], [1]);
    const setTrait = traits.find((t) => t.group === 'fivePieceSets');
    expect(setTrait?.label).toBe('');
  });
});
