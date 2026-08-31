import type { BuildCluster } from '../types/clustering.types';

/**
 * Keeps the recommendation at the front of every representation of a board.
 * The source cluster order is already meaningful, so alternatives retain that
 * order instead of being re-sorted by a display-only metric.
 */
export function orderBuildClusters(
  clusters: readonly BuildCluster[],
  recommendedClusterId: string | null | undefined,
): BuildCluster[] {
  if (!recommendedClusterId) return [...clusters];

  const recommended = clusters.find((cluster) => cluster.id === recommendedClusterId);
  if (!recommended) return [...clusters];

  return [recommended, ...clusters.filter((cluster) => cluster.id !== recommended.id)];
}
