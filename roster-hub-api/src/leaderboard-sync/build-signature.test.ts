import fixture from './__fixtures__/character-rankings-page.json';
import {
  parseCharacterRankingsPage,
  type ParsedCharacterRanking,
} from './character-rankings-parser';
import { SIGNATURE_VERSION, computeSignatureHash, extractBuildSignature } from './build-signature';

const entries = parseCharacterRankingsPage(fixture).rankings;

/** Minimal synthetic entry so individual axes can be varied in isolation. */
function makeEntry(overrides: Partial<ParsedCharacterRanking> = {}): ParsedCharacterRanking {
  return {
    amount: 100_000,
    reportCode: 'abc',
    fightId: 1,
    esoClass: 'Arcanist',
    spec: 'StaminaDPS',
    gear: [],
    talents: [],
    sets: [],
    ...overrides,
  };
}

function gearFor(setIds: number[]): ParsedCharacterRanking['gear'] {
  return setIds.map((setId, slot) => ({ slot, itemId: 1000 + slot, setId }));
}

function talentsFor(ids: number[]): ParsedCharacterRanking['talents'] {
  return ids.map((abilityId, slot) => ({ slot, abilityId }));
}

const TWELVE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('extractBuildSignature', () => {
  it('extracts a signature from every populated fixture entry', () => {
    expect(entries.length).toBeGreaterThan(0);
    entries.forEach((entry) => {
      const signature = extractBuildSignature(entry);
      expect(signature).not.toBeNull();
      // Against the constant, not a literal, so a version bump needs no test edit.
      expect(signature?.v).toBe(SIGNATURE_VERSION);
      expect(signature?.setCounts.length).toBeGreaterThan(0);
    });
  });

  it('splits the 12 talents into two bars with ultimates last', () => {
    const signature = extractBuildSignature(makeEntry({ talents: talentsFor(TWELVE) }));

    expect(signature?.bars.barOrderKnown).toBe(true);
    expect(signature?.bars.front).toEqual([1, 2, 3, 4, 5, 6]);
    expect(signature?.bars.back).toEqual([7, 8, 9, 10, 11, 12]);
    expect(signature?.bars.frontUltimate).toBe(6);
    expect(signature?.bars.backUltimate).toBe(12);
  });

  it('flags an unexpected talent count instead of inventing a split', () => {
    const signature = extractBuildSignature(makeEntry({ talents: talentsFor([1, 2, 3]) }));

    expect(signature?.bars.barOrderKnown).toBe(false);
    expect(signature?.bars.back).toEqual([]);
  });

  // categorizeGear folds DPS mythics into monsterSet; for clustering they are
  // separate axes and must come back apart.
  it('splits a mythic out of the monster slot', () => {
    // 694 = Velothi Ur-Mage's Amulet (mythic), 350 = Zaan (monster).
    const withMythic = extractBuildSignature(makeEntry({ gear: gearFor([694]) }));
    expect(withMythic?.sets.mythic).toBe(694);
    expect(withMythic?.sets.monster).toBeUndefined();

    const withMonster = extractBuildSignature(makeEntry({ gear: gearFor([350, 350]) }));
    expect(withMonster?.sets.monster).toBe(350);
    expect(withMonster?.sets.mythic).toBeUndefined();
  });

  // Regression: categorizeGear assigns a DPS mythic to monsterSet and stops, so
  // the real monster set fell into additionalSets. Against live data this left the
  // monster slot empty for 63 of 88 parses.
  it('keeps BOTH the mythic and the monster set when a build wears both', () => {
    const signature = extractBuildSignature(
      // 694 = Velothi (mythic), 350 = Zaan (monster, 2 pieces).
      makeEntry({ gear: gearFor([694, 350, 350]) }),
    );

    expect(signature?.sets.mythic).toBe(694);
    expect(signature?.sets.monster).toBe(350);
    // …and the monster set must not ALSO be left in the leftovers bucket.
    expect(signature?.sets.extra).not.toContain(350);
  });

  // Recovery is only as good as gear-categorizer's hardcoded tables. An unlisted
  // monster set stays in `extra` rather than being guessed at, and the warning is
  // how that drift becomes visible in the Worker logs after a patch.
  it('leaves an unrecognised monster set in extra and warns', () => {
    const onWarn = jest.fn();
    const signature = extractBuildSignature(
      makeEntry({ gear: gearFor([694, 999_999, 999_999]) }),
      onWarn,
    );

    expect(signature?.sets.mythic).toBe(694);
    expect(signature?.sets.monster).toBeUndefined();
    expect(signature?.sets.extra).toContain(999_999);
    expect(onWarn).toHaveBeenCalledWith(expect.stringContaining('999999'));
  });

  // Regression from live data: 3x "Perfected Slivers of the Null Arca" (772) plus
  // 2x "Slivers of the Null Arca" (767) is a five-piece the player is actually
  // wearing, but counted as 3 and 2 it registered as neither.
  it('merges perfected and non-perfected pieces of the same set', () => {
    const signature = extractBuildSignature(
      makeEntry({
        gear: gearFor([772, 772, 772, 767, 767]),
        sets: [
          { setId: 772, name: 'Perfected Slivers of the Null Arca' },
          { setId: 767, name: 'Slivers of the Null Arca' },
        ],
      }),
    );

    // Canonicalized onto the lower (non-perfected) id, and seen as a full 5 pieces.
    expect(signature?.sets.fivePiece).toEqual([767]);
    expect(signature?.setCounts).toEqual([[767, 5]]);
  });

  it('does not merge genuinely different sets', () => {
    const signature = extractBuildSignature(
      makeEntry({
        gear: gearFor([777, 777, 777, 777, 777, 456, 456, 456, 456, 456]),
        sets: [
          { setId: 777, name: 'Corpseburster' },
          { setId: 456, name: 'Azureblight Reaper' },
        ],
      }),
    );

    expect(signature?.sets.fivePiece).toEqual([456, 777]);
  });

  it('recovers the arena weapon as an ID, not a display name', () => {
    // 522 = Perfected Merciless Charge (Maelstrom).
    const signature = extractBuildSignature(makeEntry({ gear: gearFor([522, 522]) }));
    expect(signature?.sets.arena).toBe(522);
  });

  it('always records raw piece counts as the escape hatch', () => {
    const signature = extractBuildSignature(
      makeEntry({ gear: gearFor([777, 777, 777, 456, 456]) }),
    );
    expect(signature?.setCounts).toEqual([
      [456, 2],
      [777, 3],
    ]);
  });

  it('warns when a worn set matches none of the known ID tables', () => {
    const onWarn = jest.fn();
    // 999999 is in no table; worn as 3 pieces it must surface as table drift.
    extractBuildSignature(makeEntry({ gear: gearFor([999999, 999999, 999999]) }), onWarn);

    expect(onWarn).toHaveBeenCalledWith(expect.stringContaining('999999'));
  });

  it('marks the dimensions characterRankings never returns', () => {
    const signature = extractBuildSignature(makeEntry({ gear: gearFor([1]) }));
    expect(signature?.missing).toEqual(['race', 'cp', 'mundus', 'food']);
  });

  it('returns null only when there is nothing to describe', () => {
    expect(extractBuildSignature(makeEntry())).toBeNull();
    expect(extractBuildSignature(makeEntry({ gear: gearFor([1]) }))).not.toBeNull();
  });
});

describe('computeSignatureHash', () => {
  const base = makeEntry({
    gear: gearFor([777, 777, 777, 777, 777, 456, 456, 456, 456, 456, 350, 350]),
    talents: talentsFor(TWELVE),
  });

  async function hashOf(entry: ParsedCharacterRanking): Promise<string> {
    const signature = extractBuildSignature(entry);
    if (!signature) throw new Error('expected a signature');
    return computeSignatureHash(signature);
  }

  it('is stable across repeated runs', async () => {
    expect(await hashOf(base)).toBe(await hashOf(base));
  });

  it('is a short hex digest', async () => {
    expect(await hashOf(base)).toMatch(/^[0-9a-f]{16}$/);
  });

  // categorizeGear orders the two 5-piece sets by piece count, which is unstable
  // when both are 5 pieces — the hash must not inherit that instability.
  it('ignores the order of the two five-piece sets', async () => {
    const swapped = makeEntry({
      gear: gearFor([456, 456, 456, 456, 456, 777, 777, 777, 777, 777, 350, 350]),
      talents: talentsFor(TWELVE),
    });
    expect(await hashOf(swapped)).toBe(await hashOf(base));
  });

  it('ignores slot order within a bar', async () => {
    const reordered = makeEntry({
      ...base,
      talents: talentsFor([3, 1, 2, 5, 4, 6, 9, 7, 8, 11, 10, 12]),
    });
    expect(await hashOf(reordered)).toBe(await hashOf(base));
  });

  // Moving a skill from the front bar to the back is a real build change.
  it('distinguishes a front/back bar swap', async () => {
    const swappedBars = makeEntry({
      ...base,
      talents: talentsFor([7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]),
    });
    expect(await hashOf(swappedBars)).not.toBe(await hashOf(base));
  });

  it('distinguishes a different monster set', async () => {
    const differentMonster = makeEntry({
      ...base,
      gear: gearFor([777, 777, 777, 777, 777, 456, 456, 456, 456, 456, 163, 163]),
    });
    expect(await hashOf(differentMonster)).not.toBe(await hashOf(base));
  });

  it('distinguishes a different class', async () => {
    const otherClass = makeEntry({ ...base, esoClass: 'Sorcerer' });
    expect(await hashOf(otherClass)).not.toBe(await hashOf(base));
  });

  it('produces one hash per distinct build across the fixture', async () => {
    const hashes = await Promise.all(entries.map((entry) => hashOf(entry)));
    hashes.forEach((hash) => expect(hash).toMatch(/^[0-9a-f]{16}$/));
    // The captured page is 8 top parses; they should not all be the same build.
    expect(new Set(hashes).size).toBeGreaterThan(1);
  });
});
