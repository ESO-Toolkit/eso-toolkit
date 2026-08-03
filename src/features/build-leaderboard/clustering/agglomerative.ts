/**
 * Agglomerative hierarchical clustering with weighted-average (UPGMA) linkage.
 *
 * Chosen over k-means/k-modes for three reasons that matter here:
 *  - No randomness. No initial centroids, no restarts, so the same input always
 *    produces the same dendrogram. That is what makes the output testable.
 *  - k is chosen AFTER the fact. One dendrogram is built, then every candidate cut
 *    is scored against the same distance matrix — nearly free, versus re-running
 *    k-means per k.
 *  - Set-valued features (gear, skill bars) are handled natively by the distance
 *    function; there is no meaningful "mean" of a set to compute.
 *
 * Weighted linkage (Lance–Williams) lets a point stand in for the N identical
 * builds it collapsed from, so duplicate meta setups pull on merges with their
 * true mass rather than counting once.
 */

import type { DendrogramMerge } from '../types/clustering.types';

import { condensedIndex } from './buildDistance';

/**
 * Build the merge sequence.
 *
 * Returns n-1 merges. Cluster ids 0..n-1 are the original points; merge m creates
 * cluster n+m. Ties break on the lowest (i, j) index pair, which is what makes the
 * result invariant to input ordering once the points themselves are sorted.
 */
export function agglomerate(
  condensed: Float32Array,
  n: number,
  weights: readonly number[],
): DendrogramMerge[] {
  if (n <= 1) return [];

  // Working copy of the pairwise distances, indexed by active cluster id.
  const distance = new Map<string, number>();
  const key = (a: number, b: number): string => (a < b ? `${a}:${b}` : `${b}:${a}`);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      distance.set(key(i, j), condensed[condensedIndex(i, j, n)]);
    }
  }

  const active: number[] = Array.from({ length: n }, (_, i) => i);
  const mass = new Map<number, number>();
  const size = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    mass.set(i, weights[i] ?? 1);
    size.set(i, 1);
  }

  const merges: DendrogramMerge[] = [];

  for (let step = 0; step < n - 1; step++) {
    let bestA = -1;
    let bestB = -1;
    let bestDistance = Infinity;

    for (let ai = 0; ai < active.length; ai++) {
      for (let bi = ai + 1; bi < active.length; bi++) {
        const a = active[ai];
        const b = active[bi];
        const d = distance.get(key(a, b));
        if (d === undefined) continue;
        // Strictly-less keeps the FIRST minimum encountered; `active` stays sorted
        // ascending, so that is deterministically the lowest index pair.
        if (d < bestDistance) {
          bestDistance = d;
          bestA = a;
          bestB = b;
        }
      }
    }

    if (bestA === -1) break;

    const newId = n + step;
    const massA = mass.get(bestA) ?? 1;
    const massB = mass.get(bestB) ?? 1;
    const totalMass = massA + massB;

    // Lance–Williams for weighted average linkage:
    //   d(k, a∪b) = (w_a·d(k,a) + w_b·d(k,b)) / (w_a + w_b)
    for (const other of active) {
      if (other === bestA || other === bestB) continue;
      const dA = distance.get(key(other, bestA));
      const dB = distance.get(key(other, bestB));
      if (dA === undefined || dB === undefined) continue;
      distance.set(key(other, newId), (massA * dA + massB * dB) / totalMass);
    }

    merges.push({
      left: bestA,
      right: bestB,
      height: bestDistance,
      size: (size.get(bestA) ?? 1) + (size.get(bestB) ?? 1),
    });

    mass.set(newId, totalMass);
    size.set(newId, (size.get(bestA) ?? 1) + (size.get(bestB) ?? 1));

    // Replace the two merged clusters with the new one, preserving ascending order
    // so tie-breaking stays deterministic.
    const next = active.filter((id) => id !== bestA && id !== bestB);
    next.push(newId);
    active.length = 0;
    active.push(...next.sort((x, y) => x - y));
  }

  return merges;
}

/**
 * Cut the dendrogram into exactly k clusters.
 *
 * Applies the first n-k merges, then labels each original point by the root it
 * belongs to. Returns a label array parallel to the input points, with labels
 * renumbered 0..k-1 in order of first appearance so they are stable.
 */
export function cutDendrogram(merges: readonly DendrogramMerge[], n: number, k: number): number[] {
  if (n === 0) return [];
  if (k <= 1) return new Array(n).fill(0);
  if (k >= n) return Array.from({ length: n }, (_, i) => i);

  // Union-find over the first n-k merges.
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let root = x;
    while (parent.has(root)) root = parent.get(root) as number;
    return root;
  };

  const applied = Math.max(0, n - k);
  for (let i = 0; i < applied && i < merges.length; i++) {
    const merge = merges[i];
    const newId = n + i;
    parent.set(find(merge.left), newId);
    parent.set(find(merge.right), newId);
  }

  const rootToLabel = new Map<number, number>();
  const labels: number[] = [];
  for (let i = 0; i < n; i++) {
    const root = find(i);
    let label = rootToLabel.get(root);
    if (label === undefined) {
      label = rootToLabel.size;
      rootToLabel.set(root, label);
    }
    labels.push(label);
  }

  return labels;
}
