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

  const n = points.length;
  if (n === 1) {
    return buildSingleClusterResult(
      points,
      multiplicity,
      members,
      collapsed,
      overflowIndices,
      droppedParses,
      truncated.length,
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

  const clusters = buildClusters(points, multiplicity, members, labels, condensed, n);

  // Re-attach overflow signatures to their nearest medoid.
  attachOverflow(clusters, collapsed, overflowIndices, points, options.weights);

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
    silhouette: best.score,
    silhouetteByK,
    recommendedClusterId: pickRecommended(clusters),
    totalParses: truncated.length,
    uniqueSignatures: collapsed.points.length,
    droppedParses,
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
  labels: readonly number[],
  condensed: Float32Array,
  n: number,
): BuildCluster[] {
  const byLabel = new Map<number, number[]>();
  labels.forEach((label, index) => {
    const list = byLabel.get(label);
    if (list) list.push(index);
    else byLabel.set(label, [index]);
  });

  const clusters: BuildCluster[] = [];

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
    let cohesionSum = 0;
    let cohesionPairs = 0;
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        cohesionSum += condensed[condensedIndex(indices[a], indices[b], n)];
        cohesionPairs++;
      }
    }

    const traits = traitShares(clusterPoints, clusterMass);
    const core = traits.filter((trait) => trait.share >= CORE_SHARE_THRESHOLD);
    const flex = traits.filter(
      (trait) => trait.share >= FLEX_SHARE_THRESHOLD && trait.share < CORE_SHARE_THRESHOLD,
    );

    // Every collapsed parse contributes its own dps, so the spread is real.
    const amounts = indices.flatMap(
      (i) => new Array(multiplicity[i] ?? 1).fill(points[i].amount) as number[],
    );

    clusters.push({
      id: '',
      label: labelCluster(core, flex, points[medoidIndex].esoClass),
      size: clusterMass.reduce((acc, m) => acc + m, 0),
      share: 0,
      memberParseIds: memberIds,
      medoidParseId: points[medoidIndex].parseId,
      dps: dpsFiveNumber(amounts),
      core,
      flex,
      cohesion: cohesionPairs === 0 ? 0 : cohesionSum / cohesionPairs,
    });
  }

  return clusters;
}

/** Assign signatures cut by the uniqueness cap to their nearest resulting cluster. */
function attachOverflow(
  clusters: BuildCluster[],
  collapsed: { points: ParseFeatureVector[]; multiplicity: number[]; members: string[][] },
  overflowIndices: readonly number[],
  points: readonly ParseFeatureVector[],
  weights: typeof DEFAULT_FEATURE_WEIGHTS,
): void {
  if (overflowIndices.length === 0 || clusters.length === 0) return;

  // Resolve each cluster's medoid vector once rather than per overflow point.
  const byParseId = new Map(points.map((point) => [point.parseId, point]));
  const medoids = clusters
    .map((cluster) => ({ cluster, vector: byParseId.get(cluster.medoidParseId) }))
    .filter(
      (entry): entry is { cluster: BuildCluster; vector: ParseFeatureVector } =>
        entry.vector !== undefined,
    );

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

    if (!nearest) continue;
    nearest.memberParseIds.push(...collapsed.members[index]);
    nearest.size += collapsed.multiplicity[index];
  }
}

function buildSingleClusterResult(
  points: readonly ParseFeatureVector[],
  multiplicity: readonly number[],
  members: readonly string[][],
  collapsed: { points: ParseFeatureVector[]; multiplicity: number[]; members: string[][] },
  overflowIndices: readonly number[],
  droppedParses: number,
  totalParses: number,
): ClusterBuildsResult {
  const traits = traitShares(points, multiplicity);
  const core = traits.filter((trait) => trait.share >= CORE_SHARE_THRESHOLD);
  const flex = traits.filter(
    (trait) => trait.share >= FLEX_SHARE_THRESHOLD && trait.share < CORE_SHARE_THRESHOLD,
  );

  const memberIds = [...members.flat(), ...overflowIndices.flatMap((i) => collapsed.members[i])];
  const size = memberIds.length;

  return {
    clusters: [
      {
        id: 'c0',
        label: labelCluster(core, flex, points[0].esoClass),
        size,
        share: 1,
        memberParseIds: memberIds,
        medoidParseId: points[0].parseId,
        dps: dpsFiveNumber(new Array(size).fill(points[0].amount) as number[]),
        core,
        flex,
        cohesion: 0,
      },
    ],
    k: 1,
    silhouette: 0,
    silhouetteByK: [],
    recommendedClusterId: 'c0',
    totalParses,
    uniqueSignatures: collapsed.points.length,
    droppedParses,
  };
}
