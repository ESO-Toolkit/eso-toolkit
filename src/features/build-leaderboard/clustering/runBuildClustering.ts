/**
 * Dispatches clustering to the shared worker pool, falling back to the main
 * thread.
 *
 * The fallback is not just defensive. Jest maps `@/workers` to a mock whose
 * `workerManager` has no `executeTask`, so the guard below makes component tests
 * run the REAL clustering synchronously — deterministic output, no mocking.
 * In the browser it also means a worker failure degrades to a slower page rather
 * than an error state.
 */

import { workerManager } from '../../../workers';
import type { ClusterBuildsInput, ClusterBuildsResult } from '../types/clustering.types';

import { clusterBuilds } from './clusterBuilds';

/** Own pool: clustering must not queue behind report-analysis tasks. */
const POOL_NAME = 'build-leaderboard';

type MaybeWorkerManager = Partial<typeof workerManager>;

export async function runBuildClustering(
  input: ClusterBuildsInput,
  onProgress?: (pct: number) => void,
): Promise<ClusterBuildsResult> {
  const manager = workerManager as MaybeWorkerManager;

  if (typeof manager.executeTask === 'function' && typeof Worker !== 'undefined') {
    try {
      return (await manager.executeTask(
        'clusterDpsBuilds',
        input,
        onProgress,
        POOL_NAME,
      )) as ClusterBuildsResult;
    } catch {
      // A clustered leaderboard on the main thread beats an error page.
    }
  }

  return clusterBuilds(input, onProgress);
}
