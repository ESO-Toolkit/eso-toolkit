/**
 * Turning a cluster into something a new player can act on.
 *
 * The Core/Flex split is the real payoff of the feature. A beginner's question is
 * not "what is the highest parse" but "which of these twelve things do I actually
 * need?" — and trait shares answer that from data rather than opinion.
 */

import type {
  ClusterTrait,
  DpsSummary,
  FeatureGroupKey,
  ParseFeatureVector,
} from '../types/clustering.types';

/** At or above this share, a trait is effectively mandatory for the archetype. */
export const CORE_SHARE_THRESHOLD = 0.8;
/** Below this, a trait is a minority variation and is hidden by default. */
export const FLEX_SHARE_THRESHOLD = 0.35;

/** Linear-interpolated percentile over a sorted array. */
function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const rank = (sorted.length - 1) * p;
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (rank - lower) * (sorted[upper] - sorted[lower]);
}

/**
 * Five-number summary plus p90 and mean.
 *
 * Median is what the UI leads with: it answers "what will I get", where the max
 * only says what one exceptional player managed once.
 */
export function dpsFiveNumber(values: readonly number[]): DpsSummary {
  if (values.length === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, p90: 0, max: 0, mean: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);

  return {
    min: sorted[0],
    q1: percentile(sorted, 0.25),
    median: percentile(sorted, 0.5),
    q3: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
    max: sorted[sorted.length - 1],
    mean: sum / sorted.length,
    count: sorted.length,
  };
}

/** Every trait present in a cluster with the share of parses running it. */
export function traitShares(
  members: readonly ParseFeatureVector[],
  multiplicity: readonly number[],
): ClusterTrait[] {
  const totalMass = multiplicity.reduce((acc, m) => acc + m, 0);
  if (totalMass === 0) return [];

  // group|id → mass of parses carrying it
  const counts = new Map<string, { group: FeatureGroupKey; id: number | string; mass: number }>();
  // Denominator PER GROUP, not one global total.
  //
  // A vector that declares a group missing has no opinion about it, so it must
  // neither contribute traits nor dilute the share of those that do. The distance
  // function already skips missing groups; counting them here made the two
  // disagree — most visibly when barOrderKnown is false, where splitBars puts all
  // twelve abilities in `front`, which would have surfaced as twelve "Front bar"
  // chips for a layout we explicitly do not know.
  const groupMass = new Map<FeatureGroupKey, number>();

  const add = (group: FeatureGroupKey, id: number | string | null, mass: number): void => {
    if (id === null || id === '' || id === 0) return;
    const key = `${group}|${id}`;
    const existing = counts.get(key);
    if (existing) existing.mass += mass;
    else counts.set(key, { group, id, mass });
  };

  members.forEach((vector, index) => {
    const mass = multiplicity[index] ?? 1;
    const missing = new Set(vector.missing);

    const forGroup = (group: FeatureGroupKey, apply: () => void): void => {
      if (missing.has(group)) return;
      groupMass.set(group, (groupMass.get(group) ?? 0) + mass);
      apply();
    };

    forGroup('fivePieceSets', () =>
      vector.fivePieceSets.forEach((id) => add('fivePieceSets', id, mass)),
    );
    forGroup('monsterSet', () => add('monsterSet', vector.monsterSet, mass));
    forGroup('mythic', () => add('mythic', vector.mythic, mass));
    forGroup('arena', () => add('arena', vector.arena, mass));
    forGroup('frontBar', () => vector.frontBar.forEach((id) => add('frontBar', id, mass)));
    forGroup('backBar', () => vector.backBar.forEach((id) => add('backBar', id, mass)));
    forGroup('mundus', () => add('mundus', vector.mundus, mass));
    forGroup('food', () => add('food', vector.food, mass));
    forGroup('race', () => add('race', vector.race, mass));
  });

  return [...counts.values()]
    .map(({ group, id, mass }) => ({
      group,
      id,
      label: '',
      share: mass / (groupMass.get(group) || totalMass),
    }))
    .sort((a, b) => b.share - a.share || String(a.id).localeCompare(String(b.id)));
}

/**
 * A short human label for the archetype.
 *
 * Set names are resolved on the main thread afterwards; the worker only decides
 * WHICH traits are worth naming. Two five-piece sets plus the class is what people
 * actually call a build ("Deadly Strike + Coral Riptide Arcanist").
 */
export function labelCluster(
  core: readonly ClusterTrait[],
  flex: readonly ClusterTrait[],
  esoClass: string,
): string {
  const sets = [...core, ...flex]
    .filter((trait) => trait.group === 'fivePieceSets')
    .slice(0, 2)
    .map((trait) => trait.label || `Set ${trait.id}`);

  if (sets.length === 0) return esoClass || 'Unnamed build';
  return `${sets.join(' + ')}${esoClass ? ` ${esoClass}` : ''}`;
}
