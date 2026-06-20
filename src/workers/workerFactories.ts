/**
 * Shared worker factory functions to avoid code duplication
 */

import { wrap, Remote } from 'comlink';

import { SharedComputationWorker } from './SharedWorker';
import { registerRawWorker } from './workerRegistry';

/**
 * Creates a new instance of the buff calculation worker
 */
export function createSharedWorker(): Remote<SharedComputationWorker> {
  const worker = new Worker(new URL('./SharedWorker.ts', import.meta.url), {
    type: 'module',
  });

  const proxy = wrap<SharedComputationWorker>(worker);
  // Remember the raw worker so the pool can terminate the thread on cleanup
  // (releaseProxy alone never stops a Worker endpoint).
  registerRawWorker(proxy, worker);
  return proxy;
}
