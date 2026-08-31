/**
 * Dispatches clustering to a dedicated worker pool.
 *
 * Clustering is intentionally never retried on the browser's main thread: the
 * linkage step is cubic in the number of unique signatures, so a worker outage
 * must become a recoverable UI error rather than a frozen page. Jest keeps one
 * explicit synchronous path because its worker module is a lightweight mock and
 * component tests still need deterministic, real clustering output.
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
  // Jest's worker module is intentionally a lightweight mock. Keep synchronous
  // execution explicit and test-only; browser clustering must never fall back to
  // this cubic algorithm on the main thread.
  // Jest exposes JEST_WORKER_ID even when callers intentionally override
  // NODE_ENV (for example, to reproduce a development-only browser failure).
  // Keep this escape hatch scoped to non-production Jest runs; real browser
  // builds and production-path tests still always use the dedicated worker.
  if (
    process.env.NODE_ENV !== 'production' &&
    (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined)
  ) {
    return clusterBuilds(input, onProgress);
  }

  const manager = workerManager as MaybeWorkerManager;

  if (typeof Worker === 'undefined') {
    throw new Error(
      'Build analysis needs a background worker, but this browser did not provide one. Reload the page or try a supported browser.',
    );
  }

  if (typeof manager.executeTask !== 'function') {
    throw new Error(
      'Build analysis could not start its background worker. Reload the page and try again.',
    );
  }

  try {
    return (await manager.executeTask(
      'clusterDpsBuilds',
      input,
      onProgress,
      POOL_NAME,
    )) as ClusterBuildsResult;
  } catch (cause) {
    const error = new Error(
      'Build analysis stopped in its background worker. Retry the analysis or reload the page.',
    ) as Error & { cause?: unknown };
    error.cause = cause;
    throw error;
  }
}
