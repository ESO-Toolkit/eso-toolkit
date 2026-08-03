/**
 * Worker entry point for build clustering.
 *
 * Intentionally a thin wrapper (same shape as CalculatePlayerPanelAnalysis): the
 * jest config maps every import path containing a `workers` segment to a mock, so
 * anything living under src/workers/ is untestable. All the actual math sits in
 * src/features/build-leaderboard/clustering/, which is covered by unit tests.
 */

import { clusterBuilds } from '../../features/build-leaderboard/clustering/clusterBuilds';
import type {
  ClusterBuildsInput,
  ClusterBuildsResult,
} from '../../features/build-leaderboard/types/clustering.types';
import type { OnProgressCallback } from '../Utils';

export type { ClusterBuildsInput, ClusterBuildsResult };

export function clusterDpsBuilds(
  data: ClusterBuildsInput,
  onProgress?: OnProgressCallback,
): ClusterBuildsResult {
  onProgress?.(0);
  const result = clusterBuilds(data, (pct) => onProgress?.(pct));
  onProgress?.(100);
  return result;
}
