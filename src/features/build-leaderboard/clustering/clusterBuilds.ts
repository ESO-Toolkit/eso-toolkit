/**
 * Cluster orchestration: feature vectors in, displayable archetypes out.
 *
 * Deterministic end to end — no Math.random, no Date.now, no iteration over
 * unordered structures without an explicit sort. Two runs on the same input
 * produce deep-equal results, which is what makes the output testable and stops
 * the page reshuffling itself between reloads.
 */

import type {
  BuildCluster,
  ClusterBuildsInput,
  ClusterBuildsResult,
  ClusterOptions,
  ParseFeatureVector,
} from '../types/clustering.types';

import { agglomerate, cutDendrogram } from './agglomerative';
import {
  DEFAULT_FEATURE_WEIGHTS,
  buildDistance,
  buildDistanceMatrix,
  condensedIndex,
} from './buildDistance';
import {
  CORE_SHARE_THRESHOLD,
  FLEX_SHARE_THRESHOLD,
  dpsFiveNumber,
  labelCluster,
  traitShares,
} from './clusterSummary';
import { collapseDuplicateSignatures } from './featureExtraction';
import { weightedSilhouette } from './silhouette';

/**
 * `minK`/`maxK` bound which k may be SELECTED, not which are scored. The scan
 * below deliberately runs k=2..8 and reports every score in `silhouetteByK`,
 * so the UI can be honest about separation across the whole range even where
 * the product would not choose that k. The window is clipped at BOTH ends
 * (k=2 and k=7..8 are scored but unselectable), which is what makes it a
 * deliberate window rather than an oversight at the bottom.
 *
 * Why a floor of 3 rather than 2: silhouette structurally favours small k, so
 * an unclamped scan would return k=2 on most boards and flatten real variety
 * into "these two". A board whose data genuinely has ONE mode is not fixed by
 * lowering this floor either, since that only swaps three invented archetypes
 * for two. That case is handled downstream by `detectSolvedMeta`, which
 * changes the presentation rather than the clustering.
 *
 * The `inWindow.length > 0` fallback below matters for tiny inputs: when
 * n < minK the window is empty and the full scan is used, so k=2 stays
 * reachable there.
 */
export const DEFAULT_CLUSTER_OPTIONS: Required<ClusterOptions> = {
  weights: DEFAULT_FEATURE_WEIGHTS,
  minK: 3,
  maxK: 6,
  minClusterShare: 0.05,
  maxInputSize: 1200,
  // Bounds the O(n^3) linkage step. 400 points is ~100ms in a worker.
  maxUniqueSignatures: 400,
};

/**
 * Below this many parses, clustering is noise presented as insight — a three-way
 * split of six points tells a beginner nothing. The UI shows a plain table instead.
 */
export const MIN_PARSES_TO_CLUSTER = 10;

/** Minimum share for an archetype to be recommendable to a newcomer. */
const RECOMMEND_MIN_SHARE = 0.15;

/**
 * How close an undersized cluster must be to be absorbed by a neighbour.
 *
 * Without a ceiling, folding small clusters into their "nearest" neighbour absorbs
 * genuinely unrelated builds — a lone Sorcerer parse ends up inside a Necromancer
 * archetype, corrupting its Core/Flex shares and dragging its median toward a build
 * nobody in it runs. Beyond this distance the outlier stays its own small cluster:
 * it is still shown, just never recommended.
 */
const MAX_MERGE_DISTANCE = 0.5;

/**
 * Floor for a trait to be worth showing as a variation at all. Below this it is
 * one person's idiosyncrasy, not an alternative worth telling a newcomer about.
 */
const MIN_VARIATION_SHARE = 0.05;

const EMPTY_RESULT: ClusterBuildsResult = {
  clusters: [],
  k: 0,
  silhouette: 0,
  silhouetteByK: [],
  recommendedClusterId: null,
  totalParses: 0,
  uniqueSignatures: 0,
  droppedParses: 0,
};

export function clusterBuilds(
  input: ClusterBuildsInput,
  onProgress?: (pct: number) => void,
): ClusterBuildsResult {
  const options = { ...DEFAULT_CLUSTER_OPTIONS, ...(input.options ?? {}) };

  // Determinism anchor: API ordering is not trusted. Sort by dps desc, then by id
  // so ties are resolved the same way on every run.
  const sorted = [...input.vectors].sort(
    (a, b) => b.amount - a.amount || a.parseId.localeCompare(b.parseId),
  );
  const truncated = sorted.slice(0, options.maxInputSize);
  const droppedParses = sorted.length - truncated.length;

  if (truncated.length === 0) return { ...EMPTY_RESULT, droppedParses };

  const collapsed = collapseDuplicateSignatures(truncated);
  onProgress?.(10);

  // Keep the most-run signatures; the rest are re-attached to their nearest
  // resulting medoid afterwards so no parse is silently dropped.
  const order = collapsed.points
    .map((_, index) => index)
    .sort(
      (a, b) =>
        collapsed.multiplicity[b] - collapsed.multiplicity[a] ||
        collapsed.points[b].amount - collapsed.points[a].amount ||
        collapsed.points[a].parseId.localeCompare(collapsed.points[b].parseId),
    );

  const keptIndices = order.slice(0, options.maxUniqueSignatures);
  const overflowIndices = order.slice(options.maxUniqueSignatures);

  const points = keptIndices.map((i) => collapsed.points[i]);
  const multiplicity = keptIndices.map((i) => collapsed.multiplicity[i]);
  const members = keptIndices.map((i) => collapsed.members[i]);
  const memberAmounts = keptIndices.map((i) => collapsed.amounts[i]);

  const n = points.length;
  if (n === 1) {
    return buildSingleClusterResult(
      points,
      multiplicity,
      members,
      memberAmounts,
      collapsed,
      overflowIndices,
      droppedParses,
      truncated.length,
      options.weights,
    );
  }

  const condensed = buildDistanceMatrix(points, options.weights);
  onProgress?.(50);

  const merges = agglomerate(condensed, n, multiplicity);
  onProgress?.(80);

  // Score every candidate k against the same matrix, then choose within the
  // requested window. Scores outside the window are still reported so the UI can
  // be honest about how well-separated the data really is.
  const silhouetteByK: Array<{ k: number; score: number }> = [];
  for (let k = 2; k <= Math.min(8, n); k++) {
    const labels = cutDendrogram(merges, n, k);
    silhouetteByK.push({ k, score: weightedSilhouette(condensed, n, labels, multiplicity) });
  }

  const inWindow = silhouetteByK.filter(
    (entry) => entry.k >= options.minK && entry.k <= Math.min(options.maxK, n),
  );
  const candidates = inWindow.length > 0 ? inWindow : silhouetteByK;
  // Ties prefer the SMALLER k — fewer, broader archetypes are easier to act on.
  const best = candidates.reduce((acc, entry) => (entry.score > acc.score + 1e-9 ? entry : acc));

  let labels = cutDendrogram(merges, n, best.k);
  labels = mergeUndersizedClusters(labels, multiplicity, condensed, n, options.minClusterShare);
  onProgress?.(90);

  // silhouetteByK stays honest about the RAW dendrogram cuts, but the reported
  // silhouette must describe the clustering we actually return: merging
  // undersized clusters rewrites labels, and scoring the pre-merge cut would
  // report separation for a partition that no longer exists.
  const silhouette = weightedSilhouette(condensed, n, labels, multiplicity);

  const { clusters, rawAmounts } = buildClusters(
    points,
    multiplicity,
    members,
    memberAmounts,
    labels,
    condensed,
    n,
  );

  // Re-attach overflow signatures to their nearest medoid. Signatures beyond the
  // merge-distance ceiling stay unassigned and are counted as dropped rather
  // than silently vanishing from the accounting.
  const unattachedOverflow = attachOverflow(
    clusters,
    collapsed,
    overflowIndices,
    points,
    options.weights,
    rawAmounts,
  );

  const totalMass = clusters.reduce((acc, cluster) => acc + cluster.size, 0);
  clusters.forEach((cluster) => {
    cluster.share = totalMass === 0 ? 0 : cluster.size / totalMass;
  });

  // Largest first, then by median dps — the order the UI renders cards in.
  clusters.sort((a, b) => b.size - a.size || b.dps.median - a.dps.median);
  clusters.forEach((cluster, index) => {
    cluster.id = `c${index}`;
  });

  onProgress?.(100);

  return {
    clusters,
    k: clusters.length,
    silhouette,
    silhouetteByK,
    recommendedClusterId: pickRecommended(clusters),
    totalParses: truncated.length,
    uniqueSignatures: collapsed.points.length,
    droppedParses: droppedParses + unattachedOverflow,
  };
}

/**
 * The archetype a newcomer should start with.
 *
 * Among clusters with at least RECOMMEND_MIN_SHARE, the highest MEDIAN dps; ties
 * go to the larger cluster. Median rather than max on purpose — it answers "what
 * will I get", not "what did the world-first parser manage once". Falls back to the
 * largest cluster when nothing is popular enough to clear the bar.
 */
function pickRecommended(clusters: readonly BuildCluster[]): string | null {
  if (clusters.length === 0) return null;

  const popular = clusters.filter((cluster) => cluster.share >= RECOMMEND_MIN_SHARE);
  const pool = popular.length > 0 ? popular : clusters;

  const best = pool.reduce((acc, cluster) => {
    if (cluster.dps.median > acc.dps.median) return cluster;
    if (cluster.dps.median === acc.dps.median && cluster.size > acc.size) return cluster;
    return acc;
  });

  return best.id;
}

/** Fold clusters below the minimum share into their nearest surviving neighbour. */
function mergeUndersizedClusters(
  labels: number[],
  multiplicity: readonly number[],
  condensed: Float32Array,
  n: number,
  minShare: number,
): number[] {
  const totalMass = multiplicity.reduce((acc, m) => acc + m, 0);
  if (totalMass === 0) return labels;

  const massByLabel = new Map<number, number>();
  labels.forEach((label, index) => {
    massByLabel.set(label, (massByLabel.get(label) ?? 0) + (multiplicity[index] ?? 1));
  });

  const surviving = [...massByLabel.entries()]
    .filter(([, mass]) => mass / totalMass >= minShare)
    .map(([label]) => label);

  // Everything is undersized (very flat data) — leave the split alone rather than
  // collapsing to one meaningless cluster.
  if (surviving.length === 0 || surviving.length === massByLabel.size) return labels;

  const survivingSet = new Set(surviving);
  const result = [...labels];

  for (let i = 0; i < n; i++) {
    if (survivingSet.has(result[i])) continue;

    let nearestLabel = -1;
    let nearestDistance = Infinity;
    for (let j = 0; j < n; j++) {
      if (i === j || !survivingSet.has(labels[j])) continue;
      const distance = condensed[condensedIndex(i, j, n)];
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestLabel = labels[j];
      }
    }

    // Only absorb genuinely similar outliers; otherwise leave the point in its own
    // cluster rather than contaminating an unrelated archetype.
    if (nearestLabel !== -1 && nearestDistance <= MAX_MERGE_DISTANCE) {
      result[i] = nearestLabel;
    }
  }

  return result;
}

function buildClusters(
  points: readonly ParseFeatureVector[],
  multiplicity: readonly number[],
  members: readonly string[][],
  memberAmounts: readonly number[][],
  labels: readonly number[],
  condensed: Float32Array,
  n: number,
): { clusters: BuildCluster[]; rawAmounts: WeakMap<BuildCluster, number[]> } {
  const byLabel = new Map<number, number[]>();
  labels.forEach((label, index) => {
    const list = byLabel.get(label);
    if (list) list.push(index);
    else byLabel.set(label, [index]);
  });

  const clusters: BuildCluster[] = [];
  // Raw per-member amounts per cluster, so overflow attachment can extend a
  // cluster's dps summary instead of leaving size and dps out of sync.
  const rawAmounts = new WeakMap<BuildCluster, number[]>();

  for (const indices of [...byLabel.values()].sort((a, b) => a[0] - b[0])) {
    const clusterPoints = indices.map((i) => points[i]);
    const clusterMass = indices.map((i) => multiplicity[i]);
    const memberIds = indices.flatMap((i) => members[i]);

    // Medoid: minimizes mass-weighted distance to the rest of the cluster, so the
    // representative is a real observed build rather than a synthetic centroid.
    let medoidIndex = indices[0];
    let bestCost = Infinity;
    for (const i of indices) {
      let cost = 0;
      for (const j of indices) {
        if (i === j) continue;
        cost += (multiplicity[j] ?? 1) * condensed[condensedIndex(i, j, n)];
      }
      if (cost < bestCost) {
        bestCost = cost;
        medoidIndex = i;
      }
    }

    // Mean pairwise distance inside the cluster — how tight the archetype is.
    // Weighted by the pair's combined mass so a signature 30 players run counts
    // 30 times, matching how medoid, silhouette and dps treat multiplicity.
    let cohesionSum = 0;
    let cohesionMass = 0;
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        const weight = (multiplicity[indices[a]] ?? 1) * (multiplicity[indices[b]] ?? 1);
        cohesionSum += weight * condensed[condensedIndex(indices[a], indices[b], n)];
        cohesionMass += weight;
      }
    }

    const traits = traitShares(clusterPoints, clusterMass);
    const core = traits.filter((trait) => trait.share >= CORE_SHARE_THRESHOLD);
    const flex = traits.filter(
      (trait) => trait.share >= FLEX_SHARE_THRESHOLD && trait.share < CORE_SHARE_THRESHOLD,
    );
    // Minority picks, for the UI's "Show variations" disclosure. Floored at
    // MIN_VARIATION_SHARE so one-off oddities don't become a wall of chips.
    const variations = traits.filter(
      (trait) => trait.share >= MIN_VARIATION_SHARE && trait.share < FLEX_SHARE_THRESHOLD,
    );

    // Every collapsed parse contributes its OWN dps from the collapse step —
    // replicating the max-dps representative's amount across the multiplicity
    // would inflate medians and p90 for exactly the most popular builds.
    const amounts = indices.flatMap((i) => memberAmounts[i] ?? []);

    const cluster: BuildCluster = {
      id: '',
      label: labelCluster(core, flex, points[medoidIndex].esoClass),
      esoClass: points[medoidIndex].esoClass,
      size: clusterMass.reduce((acc, m) => acc + m, 0),
      share: 0,
      memberParseIds: memberIds,
      medoidParseId: points[medoidIndex].parseId,
      dps: dpsFiveNumber(amounts),
      core,
      flex,
      variations,
      cohesion: cohesionMass === 0 ? 0 : cohesionSum / cohesionMass,
    };
    rawAmounts.set(cluster, amounts);
    clusters.push(cluster);
  }

  return { clusters, rawAmounts };
}

/**
 * Assign signatures cut by the uniqueness cap to their nearest resulting cluster.
 *
 * The same MAX_MERGE_DISTANCE ceiling as undersized-cluster merging applies: an
 * overflow signature beyond it is unrelated to every archetype, and attaching it
 * anyway would corrupt that cluster's shares and size. Unattached signatures stay
 * dropped; the return value is their parse mass so droppedParses keeps the
 * accounting complete.
 */
function attachOverflow(
  clusters: BuildCluster[],
  collapsed: {
    points: ParseFeatureVector[];
    multiplicity: number[];
    members: string[][];
    amounts: number[][];
  },
  overflowIndices: readonly number[],
  points: readonly ParseFeatureVector[],
  weights: typeof DEFAULT_FEATURE_WEIGHTS,
  rawAmounts: WeakMap<BuildCluster, number[]>,
): number {
  if (overflowIndices.length === 0 || clusters.length === 0) return 0;

  // Resolve each cluster's medoid vector once rather than per overflow point.
  const byParseId = new Map(points.map((point) => [point.parseId, point]));
  const medoids = clusters
    .map((cluster) => ({ cluster, vector: byParseId.get(cluster.medoidParseId) }))
    .filter(
      (entry): entry is { cluster: BuildCluster; vector: ParseFeatureVector } =>
        entry.vector !== undefined,
    );

  let unassignedMass = 0;

  for (const index of overflowIndices) {
    const vector = collapsed.points[index];
    let nearest: BuildCluster | null = null;
    let nearestDistance = Infinity;

    for (const { cluster, vector: medoid } of medoids) {
      const distance = buildDistance(vector, medoid, weights);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = cluster;
      }
    }

    // Beyond the ceiling there is no honest nearest archetype — leave it out.
    if (!nearest || nearestDistance > MAX_MERGE_DISTANCE) {
      unassignedMass += collapsed.multiplicity[index] ?? 1;
      continue;
    }
    nearest.memberParseIds.push(...collapsed.members[index]);
    nearest.size += collapsed.multiplicity[index];
    // Keep the dps summary in sync with the grown membership — otherwise the
    // card would count overflow parses in its size/share but not its spread.
    const amounts = rawAmounts.get(nearest);
    if (amounts) {
      amounts.push(...(collapsed.amounts[index] ?? []));
      nearest.dps = dpsFiveNumber(amounts);
    }
  }

  return unassignedMass;
}

function buildSingleClusterResult(
  points: readonly ParseFeatureVector[],
  multiplicity: readonly number[],
  members: readonly string[][],
  memberAmounts: readonly number[][],
  collapsed: {
    points: ParseFeatureVector[];
    multiplicity: number[];
    members: string[][];
    amounts: number[][];
  },
  overflowIndices: readonly number[],
  droppedParses: number,
  totalParses: number,
  weights: typeof DEFAULT_FEATURE_WEIGHTS,
): ClusterBuildsResult {
  const traits = traitShares(points, multiplicity);
  const core = traits.filter((trait) => trait.share >= CORE_SHARE_THRESHOLD);
  const flex = traits.filter(
    (trait) => trait.share >= FLEX_SHARE_THRESHOLD && trait.share < CORE_SHARE_THRESHOLD,
  );
  const variations = traits.filter(
    (trait) => trait.share >= MIN_VARIATION_SHARE && trait.share < FLEX_SHARE_THRESHOLD,
  );

  // The single cluster's medoid is points[0]; overflow beyond the merge-distance
  // ceiling is unrelated to even this one archetype and counts as dropped.
  const attachedIds: string[] = [];
  const attachedAmounts: number[] = [];
  let unattachedMass = 0;

  for (const index of overflowIndices) {
    if (buildDistance(collapsed.points[index], points[0], weights) > MAX_MERGE_DISTANCE) {
      unattachedMass += collapsed.multiplicity[index] ?? 1;
      continue;
    }
    attachedIds.push(...collapsed.members[index]);
    attachedAmounts.push(...(collapsed.amounts[index] ?? []));
  }

  const memberIds = [...members.flat(), ...attachedIds];
  const size = memberIds.length;

  return {
    clusters: [
      {
        id: 'c0',
        label: labelCluster(core, flex, points[0].esoClass),
        esoClass: points[0].esoClass,
        size,
        share: 1,
        memberParseIds: memberIds,
        medoidParseId: points[0].parseId,
        // Real per-parse amounts — never a fill of the representative's value.
        dps: dpsFiveNumber([...memberAmounts.flat(), ...attachedAmounts]),
        core,
        flex,
        variations,
        cohesion: 0,
      },
    ],
    k: 1,
    silhouette: 0,
    silhouetteByK: [],
    recommendedClusterId: 'c0',
    totalParses,
    uniqueSignatures: collapsed.points.length,
    droppedParses: droppedParses + unattachedMass,
  };
}
