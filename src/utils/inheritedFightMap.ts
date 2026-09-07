import { FightFragment } from '../graphql/gql/graphql';

/**
 * Borrowing a floor map from a sibling fight in the SAME report.
 *
 * ESO Logs only attaches `maps` to fights it recognises as an ENCOUNTER. Every trash pull
 * (`encounterID === 0`) comes back with `maps: null`, even inside a trial instance where the boss
 * fights immediately before and after it all report the very same map file — so the replay of a
 * trash pull showed a blank tactical plane while the boss pull beside it showed the citadel floor.
 *
 * Inheriting is coordinate-safe by construction: actor positions are NOT derived from the map. They
 * go through `convertCoordinatesWithBottomLeft` (raw world coords / 100), a fixed transform onto the
 * 0-100 arena that is identical for every fight in the report. The map plane is likewise a fixed
 * 100x100 quad. So a map borrowed from a sibling fight lands actors exactly where that sibling's own
 * replay would — no re-registration, no scaling change, nothing else in the pipeline moves.
 *
 * The one thing that CAN be wrong is which map we borrow when a zone ships several (Kyne's Aegis
 * floors, Sanity's Edge sections): a floor-2 trash pull could inherit the floor-1 art. That is why
 * candidates are ranked by how much of the fight's own bounding box the sibling's covers, and only
 * fall back to temporal proximity (the pull just before/after a boss is on that boss's approach)
 * when no box overlaps. The failure mode is plausible-but-wrong background art rather than
 * mispositioned actors, and it only arises in the multi-map zones.
 *
 * Fights whose report lists NO map anywhere (Cyrodiil/PvP, overland) inherit nothing and keep the
 * deliberate mapless floor — see `generateMaplessFloorTexture`.
 */

type FightMaps = NonNullable<FightFragment['maps']>;
type FightBoundingBox = NonNullable<FightFragment['boundingBox']>;

/**
 * Instance maps span roughly 0-10000 world units, and pulls routinely poke a little past the
 * published edge. Anything wildly outside is ESO Logs' known garbage bounding box (a stray event at
 * ~1.4e6 stretches the box across the galaxy), which would otherwise "overlap" every candidate and
 * win the ranking outright. Such a box is treated as unusable, dropping that fight to the temporal
 * tie-break.
 */
const SANE_COORD_MIN = -5000;
const SANE_COORD_MAX = 15000;

function isUsableBoundingBox(box: FightBoundingBox | null | undefined): box is FightBoundingBox {
  if (!box) return false;
  const values = [box.minX, box.maxX, box.minY, box.maxY];
  if (values.some((v) => !Number.isFinite(v) || v < SANE_COORD_MIN || v > SANE_COORD_MAX)) {
    return false;
  }
  return box.maxX > box.minX && box.maxY > box.minY;
}

/** Fraction of `target`'s area that `candidate` covers (0 when either box is unusable). */
function boundingBoxOverlapFraction(
  target: FightBoundingBox | null | undefined,
  candidate: FightBoundingBox | null | undefined,
): number {
  if (!isUsableBoundingBox(target) || !isUsableBoundingBox(candidate)) {
    return 0;
  }
  const overlapX = Math.min(target.maxX, candidate.maxX) - Math.max(target.minX, candidate.minX);
  const overlapY = Math.min(target.maxY, candidate.maxY) - Math.max(target.minY, candidate.minY);
  if (overlapX <= 0 || overlapY <= 0) {
    return 0;
  }
  const targetArea = (target.maxX - target.minX) * (target.maxY - target.minY);
  return (overlapX * overlapY) / targetArea;
}

/** Milliseconds between two fights' time ranges; 0 when they touch or overlap. */
function temporalGap(
  a: Pick<FightFragment, 'startTime' | 'endTime'>,
  b: Pick<FightFragment, 'startTime' | 'endTime'>,
): number {
  if (a.startTime <= b.endTime && b.startTime <= a.endTime) {
    return 0;
  }
  return a.startTime > b.endTime ? a.startTime - b.endTime : b.startTime - a.endTime;
}

function nonEmptyMaps(fight: FightFragment): FightMaps | null {
  const maps = fight.maps?.filter((map): map is NonNullable<FightMaps[number]> => map != null);
  return maps && maps.length > 0 ? maps : null;
}

/**
 * Returns the maps a mapless fight should borrow from its siblings, or `null` when it already has
 * maps or nothing in the report can supply them.
 *
 * @param fight - the fight being replayed
 * @param reportFights - every fight in the same report (mapped and unmapped alike)
 */
export function resolveInheritedFightMaps(
  fight: FightFragment | null | undefined,
  reportFights: ReadonlyArray<FightFragment | null> | null | undefined,
): FightMaps | null {
  if (!fight || nonEmptyMaps(fight)) {
    return null;
  }
  const zoneId = fight.gameZone?.id;
  if (zoneId == null || !reportFights) {
    return null;
  }

  let best: { maps: FightMaps; overlap: number; gap: number } | null = null;

  for (const candidate of reportFights) {
    if (!candidate || candidate.id === fight.id || candidate.gameZone?.id !== zoneId) {
      continue;
    }
    const maps = nonEmptyMaps(candidate);
    if (!maps) {
      continue;
    }
    const overlap = boundingBoxOverlapFraction(fight.boundingBox, candidate.boundingBox);
    const gap = temporalGap(fight, candidate);
    if (
      !best ||
      overlap > best.overlap ||
      // Same spatial evidence (commonly: a single-map zone, where every candidate scores the
      // same) — prefer the pull nearest in time.
      (overlap === best.overlap && gap < best.gap)
    ) {
      best = { maps, overlap, gap };
    }
  }

  return best?.maps ?? null;
}

/**
 * The fight as the map pipeline should see it: unchanged when ESO Logs gave it maps, otherwise a
 * shallow copy carrying the inherited ones. Returning the SAME object reference in the common case
 * keeps `useMemo` consumers (and the texture cache keyed off `mapFile`) from churning.
 */
export function withInheritedFightMaps(
  fight: FightFragment | null,
  reportFights: ReadonlyArray<FightFragment | null> | null | undefined,
): FightFragment | null {
  const inherited = resolveInheritedFightMaps(fight, reportFights);
  if (!fight || !inherited) {
    return fight;
  }
  return { ...fight, maps: inherited };
}
