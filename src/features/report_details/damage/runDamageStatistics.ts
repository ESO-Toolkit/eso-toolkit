/**
 * Runs damage statistics in a dedicated worker.
 *
 * Production must not retry this calculation on the main thread: a worker
 * failure is surfaced to the panel so it can offer recovery without freezing
 * interaction. Jest uses the synchronous implementation for deterministic
 * component tests because its worker module is intentionally lightweight.
 */

import { transfer } from 'comlink';

import type { DamageEvent } from '../../../types/combatlogEvents';
import { calculateDamageStatisticsWithActivity } from '../../../utils/activePercentageUtils';
import { workerManager } from '../../../workers';
import {
  type DamageStatisticsCalculationResult,
  type DamageStatisticsCalculationTask,
  type PackedDamagePlayerEvents,
  type PackedDamageStatisticsCalculationTask,
} from '../../../workers/calculations/CalculateDamageStatistics';

const POOL_NAME = 'damage-statistics';
const PACKED_EVENT_WIDTH = 6;
const PACKING_YIELD_INTERVAL = 2_000;

type MaybeWorkerManager = Partial<typeof workerManager>;
type SchedulerWithYield = {
  yield?: () => Promise<void>;
};

export interface RunDamageStatisticsOptions {
  signal?: AbortSignal;
}

function createAbortError(): Error {
  const error = new Error('Damage statistics calculation was cancelled.');
  error.name = 'AbortError';
  return error;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function awaitWithAbort<T>(operation: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) return operation;

  throwIfAborted(signal);

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(createAbortError());
    signal.addEventListener('abort', onAbort, { once: true });

    void operation.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        if (signal.aborted) reject(createAbortError());
        else resolve(value);
      },
      (cause: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(cause);
      },
    );
  });
}

function yieldToMainThread(): Promise<void> {
  // scheduler.yield creates a continuation task instead of repeatedly nesting
  // timers. Timers are clamped after a few yields, which made large packing
  // operations both slow and capable of monopolising a frame before an input
  // handler could run.
  const scheduler = (globalThis as typeof globalThis & { scheduler?: SchedulerWithYield })
    .scheduler;
  if (typeof scheduler?.yield === 'function') return scheduler.yield();

  // MessageChannel is the broadly available, non-timer continuation fallback.
  // It lets the browser select other pending work between packing slices without
  // relying on an increasingly clamped setTimeout(0).
  if (typeof MessageChannel !== 'undefined') {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        channel.port2.close();
        resolve();
      };
      channel.port2.postMessage(undefined);
    });
  }

  // This only serves non-browser/test hosts that implement neither scheduling
  // primitive. Supported browsers take one of the branches above.
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function packPlayerEvents(
  playerId: number,
  events: readonly DamageEvent[],
  signal: AbortSignal | undefined,
): Promise<PackedDamagePlayerEvents> {
  const values = new Float64Array(events.length * PACKED_EVENT_WIDTH);

  for (let index = 0; index < events.length; index += 1) {
    if (index > 0 && index % PACKING_YIELD_INTERVAL === 0) {
      await yieldToMainThread();
      throwIfAborted(signal);
    }

    const event = events[index];
    const offset = index * PACKED_EVENT_WIDTH;
    values[offset] = event.sourceID;
    values[offset + 1] = event.targetID;
    values[offset + 2] = event.timestamp;
    values[offset + 3] = 'amount' in event ? Number(event.amount) || 0 : 0;
    values[offset + 4] = event.hitType ?? 0;
    values[offset + 5] = event.targetIsFriendly ? 1 : 0;
  }

  return { playerId, values };
}

async function packTask(
  input: DamageStatisticsCalculationTask,
  signal: AbortSignal | undefined,
): Promise<PackedDamageStatisticsCalculationTask> {
  const playerEvents: PackedDamagePlayerEvents[] = [];

  for (const [playerId, events] of Object.entries(input.damageEventsByPlayer)) {
    playerEvents.push(await packPlayerEvents(Number(playerId), events, signal));
  }

  return { fight: input.fight, playerEvents, selectedTargetIds: input.selectedTargetIds };
}

export async function runDamageStatistics(
  input: DamageStatisticsCalculationTask,
  { signal }: RunDamageStatisticsOptions = {},
): Promise<DamageStatisticsCalculationResult> {
  throwIfAborted(signal);

  // Keep this direct path strictly test-only. Browser code, including tests of
  // production behaviour, must use the worker and expose failures to the UI.
  if (
    process.env.NODE_ENV !== 'production' &&
    (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined)
  ) {
    return calculateDamageStatisticsWithActivity(
      input.fight,
      input.damageEventsByPlayer,
      new Set(input.selectedTargetIds),
    );
  }

  const manager = workerManager as MaybeWorkerManager;

  if (typeof Worker === 'undefined') {
    throw new Error(
      'Damage statistics need a background worker, but this browser did not provide one. Reload the page or try a supported browser.',
    );
  }

  if (typeof manager.executeTask !== 'function') {
    throw new Error(
      'Damage statistics could not start its background worker. Reload the page and try again.',
    );
  }

  try {
    const packedInput = await packTask(input, signal);
    const transferableInput = transfer(
      packedInput,
      packedInput.playerEvents.map(({ values }) => values.buffer),
    );
    const result = await awaitWithAbort(
      manager.executeTask('calculateDamageStatistics', transferableInput, undefined, POOL_NAME, {
        signal,
      }),
      signal,
    );
    throwIfAborted(signal);
    return result as DamageStatisticsCalculationResult;
  } catch (cause) {
    if (signal?.aborted || (cause as Error | undefined)?.name === 'AbortError') {
      throw createAbortError();
    }

    const error = new Error(
      'Damage statistics stopped in its background worker. Retry the analysis or reload the page.',
    ) as Error & { cause?: unknown };
    error.cause = cause;
    throw error;
  }
}
