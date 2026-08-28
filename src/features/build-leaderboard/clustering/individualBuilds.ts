/**
 * Fallback for parse sets too thin to cluster.
 *
 * Below MIN_PARSES_TO_CLUSTER a three-way split of six points is noise dressed
 * as insight, so we do not cluster — but refusing to render anything is worse.
 * A player who picked a class and a boss wants to see the builds that ARE
 * recorded there, even if there are five of them. This lists each distinct build
 * on its own instead, in the same shape the workspace already renders, so the
 * inspector, "open in Build Editor" and the source-log link all keep working.
 *
 * Identical signatures still collapse together: two players running the exact
 * same build is one entry that says "2 parses", not two cards a reader has to
 * diff by eye.
 */

import type {
  BuildCluster,
  ClusterBuildsResult,
  ParseFeatureVector,
} from '../types/clustering.types';

import {
  CORE_SHARE_THRESHOLD,
  FLEX_SHARE_THRESHOLD,
  dpsFiveNumber,
  labelCluster,
  traitShares,
} from './clusterSummary';
import { collapseDuplicateSignatures } from './featureExtraction';

/**
 * One entry per distinct build, ordered by best parse first.
 *
 * `recommendedClusterId` is deliberately null: recommending one of five parses
 * would claim a consensus the data cannot support, and the UI keys its
 * "Recommended" badge off exactly this field.
 */
export function buildIndividualClusters(
  vectors: readonly ParseFeatureVector[],
): ClusterBuildsResult {
  const collapsed = collapseDuplicateSignatures(
    [...vectors].sort((a, b) => b.amount - a.amount || a.parseId.localeCompare(b.parseId)),
  );

  const clusters: BuildCluster[] = collapsed.points.map((point, index) => {
    // A single signature carries every trait at share 1, so the Core/Flex split
    // below is a formality — kept anyway so these cards obey the same
    // thresholds as clustered ones rather than a parallel set of rules.
    const traits = traitShares([point], [collapsed.multiplicity[index]]);
    const core = traits.filter((trait) => trait.share >= CORE_SHARE_THRESHOLD);
    const flex = traits.filter(
      (trait) => trait.share >= FLEX_SHARE_THRESHOLD && trait.share < CORE_SHARE_THRESHOLD,
    );
    const variations = traits.filter((trait) => trait.share < FLEX_SHARE_THRESHOLD);
    const amounts = collapsed.amounts[index] ?? [];

    return {
      id: `s${index}`,
      label: labelCluster(core, flex, point.esoClass),
      esoClass: point.esoClass,
      size: collapsed.multiplicity[index],
      share: vectors.length === 0 ? 0 : collapsed.multiplicity[index] / vectors.length,
      memberParseIds: collapsed.members[index] ?? [],
      medoidParseId: point.parseId,
      dps: dpsFiveNumber(amounts),
      core,
      flex,
      variations,
      // One build has no spread to measure. Zero reads as "perfectly tight",
      // which is true of a single point by definition.
      cohesion: 0,
    };
  });

  clusters.sort((a, b) => b.dps.max - a.dps.max || a.medoidParseId.localeCompare(b.medoidParseId));
  clusters.forEach((cluster, index) => {
    cluster.id = `s${index}`;
  });

  return {
    clusters,
    k: clusters.length,
    // Separation is undefined for singletons; reporting 0 keeps the UI's
    // confidence copy honest ("Limited") rather than inventing a score.
    silhouette: 0,
    silhouetteByK: [],
    recommendedClusterId: null,
    totalParses: vectors.length,
    uniqueSignatures: collapsed.points.length,
    droppedParses: 0,
  };
}
