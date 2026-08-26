/**
 * Turns API parse rows into clustering feature vectors.
 *
 * Pure and worker-safe: no React, no MUI, and crucially no imports of the app's
 * skill/set registries. Canonicalization maps (perfected sets, ability morphs) are
 * computed on the MAIN thread and passed in — `skillLineSkills.ts` eagerly imports
 * several megabytes of JSON, and `getSetDisplayName` reports unknown ids to
 * Rollbar. Neither belongs in a worker.
 */

import type {
  CollapsedPoints,
  FeatureGroupKey,
  ParseFeatureVector,
} from '../types/clustering.types';
import type { DpsParse } from '../types/dpsParses.types';

/** Canonical-id lookups, built on the main thread. Plain objects for structured clone. */
export interface CanonicalMaps {
  /** Perfected set id → base set id. */
  sets: Record<number, number>;
  /** Morph ability id → base skill id. */
  abilities: Record<number, number>;
}

export const EMPTY_CANONICAL_MAPS: CanonicalMaps = { sets: {}, abilities: {} };

const canonicalSet = (id: number, maps: CanonicalMaps): number => maps.sets[id] ?? id;
const canonicalAbility = (id: number, maps: CanonicalMaps): number => maps.abilities[id] ?? id;

const ascending = (values: number[]): number[] => [...new Set(values)].sort((a, b) => a - b);

/** Piece count at which a set contributes its 5-piece bonus. */
export const FIVE_PIECE_THRESHOLD = 5;

/**
 * Which groups this parse cannot speak to.
 *
 * `build.missing` already lists what the ingest could not populate; this adds the
 * groups that are structurally empty for this particular row so the distance
 * function skips them instead of scoring absence as agreement.
 */
function missingGroups(parse: DpsParse): FeatureGroupKey[] {
  const missing = new Set<FeatureGroupKey>();

  const declared = parse.build?.missing ?? [];
  if (declared.includes('race')) missing.add('race');
  if (declared.includes('cp')) missing.add('cpSlottables');
  if (declared.includes('mundus')) missing.add('mundus');
  if (declared.includes('food')) missing.add('food');

  if (!parse.build?.skillLines) missing.add('skillLines');
  if (!parse.eso_class) missing.add('esoClass');
  // An unknown bar layout cannot be compared front-to-front.
  if (parse.build && !parse.build.bars.barOrderKnown) {
    missing.add('frontBar');
    missing.add('backBar');
  }

  return [...missing];
}

/**
 * Build one feature vector, or null when the parse carries no usable build.
 *
 * A parse with neither gear nor abilities would sit at maximum distance from
 * everything and drag a cluster around without describing anything.
 */
export function toFeatureVector(parse: DpsParse, maps: CanonicalMaps): ParseFeatureVector | null {
  const build = parse.build;
  if (!build) return null;

  // Sets the ingest could not slot still carry their piece count in setCounts.
  // A >=5-piece set stranded in `extra` is a real five-piece bonus and belongs
  // with the slotted ones — otherwise a whole gear axis silently vanishes from
  // the distance function for exactly the builds our tables predate.
  const counts = new Map<number, number>(build.setCounts);
  const slotted = new Set(build.sets.fivePiece);
  const promoted = (build.sets.extra ?? []).filter(
    (id) => !slotted.has(id) && (counts.get(id) ?? 0) >= FIVE_PIECE_THRESHOLD,
  );

  // ascending dedupes, so a promoted id that canonicalizes onto an
  // already-slotted base set collapses rather than counting twice.
  const fivePiece = ascending(
    [...build.sets.fivePiece, ...promoted].map((id) => canonicalSet(id, maps)),
  );
  const front = build.bars.front.map((id) => canonicalAbility(id, maps));
  const back = build.bars.back.map((id) => canonicalAbility(id, maps));

  if (fivePiece.length === 0 && front.length === 0 && back.length === 0) return null;

  const skillLines = [build.skillLines?.l1, build.skillLines?.l2, build.skillLines?.l3].filter(
    (line): line is number => typeof line === 'number',
  );

  return {
    parseId: parse.parse_id,
    amount: parse.amount,
    esoClass: parse.eso_class,
    skillLines: ascending(skillLines),
    fivePieceSets: fivePiece,
    // Exact ids keep slot order; the base-id lists give morph siblings partial
    // credit in the distance function.
    frontBar: build.bars.front,
    backBar: build.bars.back,
    frontBarBase: front,
    backBarBase: back,
    monsterSet: build.sets.monster != null ? canonicalSet(build.sets.monster, maps) : null,
    mythic: build.sets.mythic != null ? canonicalSet(build.sets.mythic, maps) : null,
    arena: build.sets.arena != null ? canonicalSet(build.sets.arena, maps) : null,
    cpSlottables: [],
    mundus: parse.mundus_id,
    food: parse.food_ability_id,
    race: parse.race,
    missing: missingGroups(parse),
  };
}

export function extractFeatureVectors(
  parses: readonly DpsParse[],
  maps: CanonicalMaps,
): ParseFeatureVector[] {
  return parses
    .map((parse) => toFeatureVector(parse, maps))
    .filter((vector): vector is ParseFeatureVector => vector !== null);
}

/**
 * Identity of a build for exact-duplicate collapsing.
 *
 * Bars are sorted WITHIN each bar (slot order is cosmetic) but kept separate — a
 * front/back swap is a genuinely different build.
 */
export function signatureKey(vector: ParseFeatureVector): string {
  return JSON.stringify([
    vector.esoClass,
    vector.skillLines,
    vector.fivePieceSets,
    ascending(vector.frontBar),
    ascending(vector.backBar),
    vector.monsterSet ?? 0,
    vector.mythic ?? 0,
    vector.arena ?? 0,
    ascending(vector.cpSlottables),
    vector.mundus ?? 0,
    vector.food ?? 0,
    vector.race ?? '',
  ]);
}

/**
 * Collapse identical builds to weighted points.
 *
 * Top parses repeat heavily — without this, 30 copies of the current meta setup
 * would drag every merge decision toward themselves. The representative keeps the
 * HIGHEST-dps member so a cluster medoid is a build someone actually excelled with.
 */
export function collapseDuplicateSignatures(
  vectors: readonly ParseFeatureVector[],
): CollapsedPoints {
  const byKey = new Map<
    string,
    {
      vector: ParseFeatureVector;
      members: string[];
      amounts: number[];
    }
  >();

  for (const vector of vectors) {
    const key = signatureKey(vector);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { vector, members: [vector.parseId], amounts: [vector.amount] });
      continue;
    }
    existing.members.push(vector.parseId);
    existing.amounts.push(vector.amount);
    if (vector.amount > existing.vector.amount) existing.vector = vector;
  }

  const points: ParseFeatureVector[] = [];
  const multiplicity: number[] = [];
  const members: string[][] = [];
  const amounts: number[][] = [];

  for (const entry of byKey.values()) {
    points.push(entry.vector);
    multiplicity.push(entry.members.length);
    members.push(entry.members);
    amounts.push(entry.amounts);
  }

  return { points, multiplicity, members, amounts };
}
