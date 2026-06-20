import { releaseProxy, type Remote } from 'comlink';

import type { SharedComputationWorker } from './SharedWorker';

/**
 * Maps a comlink `Remote` proxy back to the raw `Worker` that backs it.
 *
 * comlink's `releaseProxy()` only closes `MessagePort` endpoints — it is a
 * no-op for a `Worker` endpoint — so releasing a wrapped worker proxy never
 * terminates the underlying OS thread. The pool therefore needs the raw worker
 * to actually `terminate()` it; we stash it here keyed by the proxy so the
 * factory's return type stays unchanged for all existing callers.
 */
const rawWorkerByProxy = new WeakMap<object, Worker>();

/** Associate a wrapped proxy with its raw worker so it can be terminated later. */
export function registerRawWorker(proxy: Remote<SharedComputationWorker>, worker: Worker): void {
  rawWorkerByProxy.set(proxy as object, worker);
}

/**
 * Release the comlink proxy AND terminate the underlying worker thread.
 * Safe to call with a proxy that has no registered raw worker (e.g. test mocks)
 * — it simply releases the proxy and skips termination.
 */
export function releaseAndTerminate(proxy: Remote<SharedComputationWorker>): void {
  try {
    (proxy as unknown as { [releaseProxy]?: () => void })[releaseProxy]?.();
  } catch {
    /* proxy may already be released */
  }
  const worker = rawWorkerByProxy.get(proxy as object);
  if (worker) {
    worker.terminate();
    rawWorkerByProxy.delete(proxy as object);
  }
}
