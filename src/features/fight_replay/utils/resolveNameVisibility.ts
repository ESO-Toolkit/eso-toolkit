/**
 * Screen-space overlap resolution for the 3D actor name tags.
 *
 * When actors stack tightly (the melee ball on a boss), their floating name tags pile up into an
 * unreadable blob. Distance-fade alone can't fix a close stack — every name in the pile sits at
 * nearly the same camera distance, so they all stay bright and overlap. This resolves overlap in
 * SCREEN space instead: project each name to the viewport, then greedily keep high-priority names
 * (the followed player and bosses) and fade the lower-priority names that would collide with an
 * already-placed one.
 *
 * Pure and three-free: it takes already-projected screen rectangles + a priority tier and returns a
 * target opacity multiplier per id. The caller (the names coordinator) does the three.js projection
 * and applies the multiplier on top of the existing dead-dim. Keeping it pure makes the
 * place-or-fade logic unit-testable without a WebGL context.
 */

/** Priority tiers. Higher wins when two names collide. */
export const NamePriority = {
  /** Ordinary players / enemies — fade first when crowded. */
  NORMAL: 0,
  /** Bosses — always kept legible. */
  BOSS: 1,
  /** The followed/locked-on player — always kept legible. */
  FOLLOWED: 2,
} as const;

export type NamePriorityValue = (typeof NamePriority)[keyof typeof NamePriority];

export interface NameScreenItem {
  /** Stable actor id — also the tiebreak key for equal-priority collisions. */
  id: number;
  /** Screen-space center, in pixels (origin top-left). Off-screen items should be omitted. */
  screenX: number;
  screenY: number;
  /** Half the on-screen label width / height, in pixels (the collision box half-extents). */
  halfW: number;
  halfH: number;
  /** Priority tier — see {@link NamePriority}. */
  priority: NamePriorityValue;
}

export interface ResolveNameVisibilityOptions {
  /**
   * Opacity a fully-overlapped lower-priority name fades to. 0 hides it entirely; a small positive
   * value keeps a faint ghost. Defaults to 0.12 — enough to hint presence without adding to the
   * blob.
   */
  fadedOpacity?: number;
  /**
   * Fraction of the collision box that must overlap (on each axis) before two names count as
   * colliding. 0 = any touch collides; larger = names must overlap more before one fades. Defaults
   * to 0 (axis-aligned box intersection) — kept as a knob for tuning density.
   */
  overlapSlack?: number;
}

const DEFAULT_FADED_OPACITY = 0.12;

/**
 * Returns a Map of actor id → target opacity multiplier in [0, 1]. Priority names (followed player,
 * bosses) are always 1. Lower-priority names that would overlap an already-kept name fade toward
 * {@link ResolveNameVisibilityOptions.fadedOpacity}.
 *
 * Algorithm: sort by priority DESC, then by id ASC (a STABLE tiebreak — never camera distance,
 * which would re-rank as the orbit camera moves and reintroduce the exact flicker the per-actor
 * renderOrder fix was built to kill). Walk the sorted list, keeping each name that does not collide
 * with any already-kept name and fading each one that does. Priority names are always kept (and
 * still occupy space, so they push lower names out), but are never themselves faded even if two
 * priority names overlap — both bosses and the followed player must stay legible.
 *
 * O(N²) in the worst case (each kept name checked against the placed set). At N ≈ 23–50 names this
 * runs once per frame in the coordinator and is far cheaper than the per-name three.js work around
 * it; a spatial grid would be premature.
 */
export function resolveNameVisibility(
  items: NameScreenItem[],
  options: ResolveNameVisibilityOptions = {},
): Map<number, number> {
  const fadedOpacity = options.fadedOpacity ?? DEFAULT_FADED_OPACITY;
  const overlapSlack = options.overlapSlack ?? 0;

  const result = new Map<number, number>();
  if (items.length === 0) return result;

  // Sort by priority DESC, then id ASC. Stable key only — no distance term.
  const ordered = [...items].sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.id - b.id;
  });

  // Names already kept this frame; later (lower-priority) names fade if they overlap any of these.
  const placed: NameScreenItem[] = [];

  for (const item of ordered) {
    const isPriority = item.priority > NamePriority.NORMAL;

    if (isPriority) {
      // Priority names always stay legible and always occupy space.
      result.set(item.id, 1);
      placed.push(item);
      continue;
    }

    const collides = placed.some((other) => overlaps(item, other, overlapSlack));
    if (collides) {
      result.set(item.id, fadedOpacity);
    } else {
      result.set(item.id, 1);
      placed.push(item);
    }
  }

  return result;
}

/**
 * Axis-aligned box intersection between two name rectangles. `slack` shrinks each box by that
 * fraction of its half-extent before testing, so names must overlap a bit more before colliding.
 */
function overlaps(a: NameScreenItem, b: NameScreenItem, slack: number): boolean {
  const dx = Math.abs(a.screenX - b.screenX);
  const dy = Math.abs(a.screenY - b.screenY);
  const shrink = 1 - slack;
  const overlapX = (a.halfW + b.halfW) * shrink;
  const overlapY = (a.halfH + b.halfH) * shrink;
  return dx < overlapX && dy < overlapY;
}
