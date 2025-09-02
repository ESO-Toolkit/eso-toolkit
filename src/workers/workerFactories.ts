/**
 * Shared worker factory functions to avoid code duplication
 */

import { wrap, Remote } from 'comlink';

import { SharedComputationWorker } from './SharedWorker';

/**
 * Creates a new instance of the buff calculation worker
 */
export function createSharedWorker(): Remote<SharedComputationWorker> {
  const worker = new Worker(new URL('./SharedWorker.ts', import.meta.url), {
    type: 'module',
  });

  return wrap<SharedComputationWorker>(worker);
}
