/**
 * Weighted mean silhouette — how well separated a clustering is.
 *
 * For each point: a = mean distance to its own cluster, b = mean distance to the
 * nearest other cluster, s = (b - a) / max(a, b), in [-1, 1]. This is what picks k
 * after the dendrogram is built, and it is also reported to the user (bucketed,
 * never as a raw float) so a weak grouping can be labelled as such rather than
 * presented with false confidence.
 *
 * Weighted because points here are collapsed duplicate builds: a signature that 30
 * players run should count 30 times, not once.
 */

import { condensedIndex } from './buildDistance';

export function weightedSilhouette(
  condensed: Float32Array,
  n: number,
  labels: readonly number[],
  weights: readonly number[],
): number {
  if (n < 2) return 0;

  const clusterIds = [...new Set(labels)];
  // A single cluster has no "nearest other cluster", so silhouette is undefined;
  // 0 is the conventional neutral value.
  if (clusterIds.length < 2) return 0;

  const membersByCluster = new Map<number, number[]>();
  clusterIds.forEach((id) => membersByCluster.set(id, []));
  labels.forEach((label, index) => membersByCluster.get(label)?.push(index));

  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < n; i++) {
    const own = membersByCluster.get(labels[i]) ?? [];
    const weight = weights[i] ?? 1;

    // A singleton cluster scores 0 by convention — there is no within-cluster
    // distance to compare against.
    if (own.length <= 1) {
      totalWeight += weight;
      continue;
    }

    const meanTo = (members: readonly number[], excludeSelf: boolean): number => {
      let sum = 0;
      let mass = 0;
      for (const j of members) {
        if (excludeSelf && j === i) continue;
        const w = weights[j] ?? 1;
        sum += w * condensed[condensedIndex(i, j, n)];
        mass += w;
      }
      return mass === 0 ? 0 : sum / mass;
    };

    const a = meanTo(own, true);

    let b = Infinity;
    for (const clusterId of clusterIds) {
      if (clusterId === labels[i]) continue;
      const others = membersByCluster.get(clusterId);
      if (!others?.length) continue;
      b = Math.min(b, meanTo(others, false));
    }

    if (!Number.isFinite(b)) {
      totalWeight += weight;
      continue;
    }

    const denominator = Math.max(a, b);
    const score = denominator === 0 ? 0 : (b - a) / denominator;

    weightedSum += weight * score;
    totalWeight += weight;
  }

  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}
