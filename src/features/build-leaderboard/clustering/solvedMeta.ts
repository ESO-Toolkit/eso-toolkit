/**
 * Detects a board whose builds have genuinely converged on one answer.
 *
 * Two of the seven pooled class boards (Arcanist and Nightblade) put ~98.5% of
 * their members in a single cluster. That is not a clustering defect: the
 * silhouette score falls monotonically from k=2 (0.437) to k=8 (0.277), so the
 * data really does have one mode. At the top end of ESO raiding those classes
 * have one solved build and nearly everyone runs it.
 *
 * Forcing a higher k was considered and rejected. It manufactures distinctions
 * the data refutes and would show three "archetypes" that are the same build
 * with cosmetic differences, on a page whose whole promise is that the
 * archetypes are real.
 *
 * So the clustering is left alone and the PRESENTATION changes instead. The
 * page stops claiming "k build patterns" it cannot support and states the
 * finding, which is more useful to a player than three invented archetypes:
 * this class is solved, here is the build, here is the minority doing something
 * else.
 */

import type { BuildCluster, ClusterBuildsResult } from '../types/clustering.types';

/**
 * Share of members the top cluster must hold.
 *
 * Deliberately dominance and NOT silhouette. Silhouette measures how well
 * SEPARATED the clusters are, and a 98.5/1.5 split can be beautifully
 * separated: Arcanist scores 0.437 at its best k, which no sane "poorly
 * separated" floor would catch. Dominance measures what the reader actually
 * sees, which is one card carrying almost everyone.
 *
 * A silhouette gate would also fail the other way. Genuinely continuous
 * variation, a smear rather than modes, scores low at every k, and would get
 * labelled "solved" when the truth is the opposite.
 *
 * 90% rather than something higher: below it the runner-up holds 10%+, which at
 * realistic pool sizes is twenty to forty players making a coherent different
 * choice, and that has earned archetype treatment. It also sits far from both
 * observed regimes (98.5% degenerate, well under 70% for the healthy five), so
 * patch-to-patch drift will not flap the presentation week to week.
 */
export const SOLVED_META_MIN_SHARE = 0.9;

/**
 * Floor on pool size, so a thin board cannot proudly declare a class solved.
 *
 * Distinct from `MIN_PARSES_TO_CLUSTER` (10), which decides whether to cluster
 * at all. Clearing that bar makes archetypes meaningful; this much higher bar
 * is what it takes to make a claim ABOUT the whole class.
 *
 * Applied to CLUSTERED parses, not `result.totalParses`. Those differ whenever
 * the overflow distance cap drops a signature, and `share` is computed against
 * clustered mass (`clusterBuilds.ts`), so checking the floor against
 * `totalParses` would let the gate fire on a dominance measured over fewer
 * parses than the floor requires: 55 total, 10 dropped, 45 unanimous.
 */
export const SOLVED_META_MIN_PARSES = 50;

export interface SolvedMeta {
  /** The cluster nearly everyone is in. */
  readonly dominant: BuildCluster;
  /** Dominant share as a whole percentage, e.g. 98 — ready for display. */
  readonly sharePercent: number;
  /**
   * Parses actually placed in a cluster, which is the denominator `sharePercent`
   * is a percentage OF.
   *
   * Display copy must quote this and not `result.totalParses`. The two differ
   * by `droppedParses`, and pairing a share computed over clustered mass with
   * the larger total produces a claim that does not reconcile: 60 parses, 12
   * dropped, 48 unanimous would read "100% of the 60 top parses converge" while
   * a fifth of them are in no cluster at all.
   */
  readonly clusteredParses: number;
  /** Clusters outside the dominant one. May be empty. */
  readonly outliers: readonly BuildCluster[];
  /** Combined membership of `outliers`. */
  readonly outlierParses: number;
}

/**
 * Returns the solved-meta finding, or null when the board has real archetypes.
 *
 * Measured on the FINAL clusters, after `mergeUndersizedClusters` has folded
 * what it is going to fold. Measuring the raw dendrogram cut instead would
 * report a share the reader can never verify against the cards on screen.
 */
export function detectSolvedMeta(result: ClusterBuildsResult | null): SolvedMeta | null {
  if (!result || result.clusters.length === 0) return null;

  const clusteredParses = result.clusters.reduce((sum, cluster) => sum + cluster.size, 0);
  if (clusteredParses < SOLVED_META_MIN_PARSES) return null;

  const dominant = result.clusters.reduce((acc, cluster) =>
    cluster.size > acc.size ? cluster : acc,
  );
  if (dominant.share < SOLVED_META_MIN_SHARE) return null;

  const outliers = result.clusters.filter((cluster) => cluster.id !== dominant.id);
  return {
    dominant,
    clusteredParses,
    // Floor, not round. Rounding 89.6% up to "90% of parses" next to a card
    // list that does not add up is the kind of small dishonesty this page
    // cannot afford.
    sharePercent: Math.floor(dominant.share * 100),
    outliers,
    outlierParses: outliers.reduce((sum, cluster) => sum + cluster.size, 0),
  };
}
