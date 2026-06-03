import { NamePriority, NameScreenItem, resolveNameVisibility } from './resolveNameVisibility';

/**
 * resolveNameVisibility is the pure overlap-resolution core behind the 3D name-tag declutter.
 * These tests pin the contract the coordinator relies on: priority names stay full-opacity, equal
 * names disambiguate by a STABLE id tiebreak (never camera distance — that would flicker on orbit),
 * and lower-priority names that collide with a kept name fade.
 */

// A label box centered at (x, y) with default half-extents — tweak per case.
function item(
  id: number,
  x: number,
  y: number,
  priority: NameScreenItem['priority'] = NamePriority.NORMAL,
  halfW = 40,
  halfH = 10,
): NameScreenItem {
  return { id, screenX: x, screenY: y, halfW, halfH, priority };
}

describe('resolveNameVisibility', () => {
  it('returns an empty map for no items', () => {
    expect(resolveNameVisibility([]).size).toBe(0);
  });

  it('keeps every name at full opacity when none overlap', () => {
    const result = resolveNameVisibility([item(1, 0, 0), item(2, 500, 0), item(3, 0, 500)]);
    expect(result.get(1)).toBe(1);
    expect(result.get(2)).toBe(1);
    expect(result.get(3)).toBe(1);
  });

  it('fades the lower-priority loser of a normal/normal collision and keeps the stable winner', () => {
    // Two boxes at the same point — they collide. Lower id wins the stable tiebreak.
    const result = resolveNameVisibility([item(7, 100, 100), item(3, 100, 100)]);
    expect(result.get(3)).toBe(1); // lower id kept
    expect(result.get(7)).toBeLessThan(1); // higher id faded
  });

  it('uses id order, NOT input order, for the tiebreak (input reversed gives same result)', () => {
    const a = resolveNameVisibility([item(3, 0, 0), item(7, 0, 0)]);
    const b = resolveNameVisibility([item(7, 0, 0), item(3, 0, 0)]);
    expect(a.get(3)).toBe(1);
    expect(a.get(7)).toBeLessThan(1);
    expect(b.get(3)).toBe(a.get(3));
    expect(b.get(7)).toBe(a.get(7));
  });

  it('keeps the followed player at full opacity even when buried in a stack', () => {
    const stack = [
      item(1, 0, 0),
      item(2, 0, 0),
      item(3, 0, 0),
      item(9, 0, 0, NamePriority.FOLLOWED),
    ];
    const result = resolveNameVisibility(stack);
    expect(result.get(9)).toBe(1); // followed always legible
    // The followed name occupies space; normal names in the same spot fade.
    expect(result.get(2)).toBeLessThan(1);
    expect(result.get(3)).toBeLessThan(1);
  });

  it('keeps a boss at full opacity even when overlapped by players', () => {
    const result = resolveNameVisibility([
      item(1, 50, 50),
      item(2, 50, 50),
      item(5, 50, 50, NamePriority.BOSS),
    ]);
    expect(result.get(5)).toBe(1);
  });

  it('keeps BOTH a boss and the followed player legible when they overlap each other', () => {
    const result = resolveNameVisibility([
      item(5, 0, 0, NamePriority.BOSS),
      item(9, 0, 0, NamePriority.FOLLOWED),
    ]);
    expect(result.get(5)).toBe(1);
    expect(result.get(9)).toBe(1);
  });

  it('lets a normal name survive if it only overlaps a faded (not kept) name', () => {
    // Chain: A and B overlap; B and C overlap; A and C do NOT.
    // A (id 1) kept. B (id 2) overlaps A → faded, NOT placed. C (id 3) overlaps only B → C kept.
    const A = item(1, 0, 0);
    const B = item(2, 60, 0); // overlaps A (40+40=80 > 60)
    const C = item(3, 120, 0); // overlaps B but not A (dist 120 > 80)
    const result = resolveNameVisibility([A, B, C]);
    expect(result.get(1)).toBe(1);
    expect(result.get(2)).toBeLessThan(1); // faded by A
    expect(result.get(3)).toBe(1); // C only overlapped the faded B, so it survives
  });

  it('respects a custom fadedOpacity', () => {
    const result = resolveNameVisibility([item(1, 0, 0), item(2, 0, 0)], {
      fadedOpacity: 0.3,
    });
    expect(result.get(2)).toBe(0.3);
  });

  it('fades a normal name buried under multiple priority anchors', () => {
    const result = resolveNameVisibility([
      item(5, 0, 0, NamePriority.BOSS),
      item(9, 5, 0, NamePriority.FOLLOWED),
      item(1, 2, 0, NamePriority.NORMAL),
    ]);
    expect(result.get(5)).toBe(1);
    expect(result.get(9)).toBe(1);
    expect(result.get(1)).toBeLessThan(1);
  });

  it('overlapSlack requires more overlap before colliding', () => {
    // Boxes 70px apart, half-widths 40 each → sum 80 > 70 so they collide with slack 0.
    const a = item(1, 0, 0);
    const b = item(2, 70, 0);
    expect(resolveNameVisibility([a, b]).get(2)).toBeLessThan(1);
    // With slack 0.2, the collision threshold shrinks to 80*0.8 = 64 < 70 → no collision.
    expect(resolveNameVisibility([a, b], { overlapSlack: 0.2 }).get(2)).toBe(1);
  });
});
