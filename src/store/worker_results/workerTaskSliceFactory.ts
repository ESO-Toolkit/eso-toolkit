import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { workerManager } from '@/workers';
import {
  ReduxBackedWorkerTaskType,
  SharedWorkerInputType,
  SharedWorkerResultType,
} from '@/workers/SharedWorker';
import type { WorkerPoolConfig } from '@/workers/types';

import { RootState } from '../storeWithHistory';

/** Maximum number of results to keep in the per-task LRU cache. */
const DEFAULT_MAX_RESULT_CACHE_SIZE = 3;

export interface WorkerTaskSliceOptions {
  /**
   * Per-slice LRU bound (default 3). Memory-constrained devices pass 1 so consecutive fights
   * can't accumulate multiple large result sets in the store.
   */
  maxCacheSize?: number;
  /**
   * Worker pool for this task (default 'default'). Latency-sensitive tasks (replay) use an
   * isolated pool so a long compute can't queue behind — or block — unrelated analytics work.
   */
  poolName?: string;
  /** Pool config applied when the named pool is first created (ignored if it exists). */
  poolConfig?: WorkerPoolConfig;
  /** Queue priority for this task (default 0, higher first). */
  priority?: number;
}

export interface WorkerTaskState<T> {
  result: T | null;
  isLoading: boolean;
  progress: number | null;
  error: string | null;
  lastUpdated: number | null;
  // Cache metadata for preventing duplicate executions
  cacheMetadata: {
    lastInputHash: string | null;
    lastExecutedTimestamp: number | null;
  };
  // Track the latest request ID to prevent race conditions
  latestRequestId: string | null;
  /** LRU result cache – keeps the last N results keyed by input hash
   *  so that navigating between fights doesn't re-run expensive workers. */
  resultCache: Record<string, T>;
  /** Insertion order for LRU eviction (most-recent first). */
  cacheOrder: string[];
  /** Creation timestamp per cache entry (parallel to resultCache/cacheOrder). */
  resultCacheMeta: Record<string, number>;
}

export interface WorkerTaskProgressPayload {
  progress: number;
  /**
   * Owning thunk request ID. The thunk always sends it; plain action creators
   * (tests, legacy callers) may omit it, in which case the update applies to
   * whatever is currently loading. Lets a stale worker's progress reports land
   * on a newer request instead of driving its progress bar.
   */
  requestId?: string;
}

export interface WorkerTaskCompletedPayload<T> {
  result: T;
}

export interface WorkerTaskFailedPayload {
  error: string;
}

const createInitialTaskState = <T>(): WorkerTaskState<T> => ({
  result: null,
  isLoading: false,
  progress: null,
  error: null,
  lastUpdated: null,
  cacheMetadata: {
    lastInputHash: null,
    lastExecutedTimestamp: null,
  },
  latestRequestId: null,
  resultCache: {},
  cacheOrder: [],
  resultCacheMeta: {},
});

// Define the return type separately to avoid circular reference
type WorkerTaskSliceReturn<T extends ReduxBackedWorkerTaskType> = {
  actions: {
    startTask: () => PayloadAction<void>;
    updateProgress: (
      payload: WorkerTaskProgressPayload,
    ) => PayloadAction<WorkerTaskProgressPayload>;
    completeTask: (
      payload: WorkerTaskCompletedPayload<SharedWorkerResultType<T>>,
    ) => PayloadAction<WorkerTaskCompletedPayload<SharedWorkerResultType<T>>>;
    failTask: (payload: WorkerTaskFailedPayload) => PayloadAction<WorkerTaskFailedPayload>;
    clearResult: () => PayloadAction<void>;
    resetTask: () => PayloadAction<void>;
  };
  reducer: (
    state: WorkerTaskState<SharedWorkerResultType<T>> | undefined,
    action: { type: string; payload?: unknown },
  ) => WorkerTaskState<SharedWorkerResultType<T>>;
  executeTask: ReturnType<
    typeof createAsyncThunk<
      SharedWorkerResultType<T>,
      SharedWorkerInputType<T>,
      { state: RootState; rejectValue: string }
    >
  >;
};

// Generic function to create a worker task slice
export const createWorkerTaskSlice = <T extends ReduxBackedWorkerTaskType>(
  taskName: T,
  createInputHash: (input: SharedWorkerInputType<T>) => string,
  options?: WorkerTaskSliceOptions,
): WorkerTaskSliceReturn<T> => {
  type ResultType = SharedWorkerResultType<T>;
  type InputType = SharedWorkerInputType<T>;
  const maxCacheSize = options?.maxCacheSize ?? DEFAULT_MAX_RESULT_CACHE_SIZE;
  const poolName = options?.poolName ?? 'default';
  const taskPriority = options?.priority ?? 0;

  // Create the async thunk for executing the worker task
  const executeTask = createAsyncThunk<
    ResultType,
    InputType,
    {
      state: RootState;
      rejectValue: string;
    }
  >(
    `${taskName}/executeTask`,
    async (input: InputType, { getState, dispatch, signal, rejectWithValue, requestId }) => {
      try {
        // Check result cache before spawning a worker
        const inputHash = createInputHash(input);
        const state = getState() as RootState;
        const taskState = state.workerResults[taskName] as WorkerTaskState<ResultType>;

        if (taskState?.resultCache?.[inputHash]) {
          return taskState.resultCache[inputHash];
        }

        // If the request was already aborted before we got a chance to start the
        // worker, bail out early so we don't kick off work that's already been
        // cancelled. (Note: this only avoids *starting* already-cancelled work;
        // a worker that's already running is still not terminated mid-flight.)
        if (signal.aborted) {
          return rejectWithValue('Task was aborted');
        }

        const result = await workerManager.executeTask(
          taskName,
          input,
          (progress: number) => {
            // Only dispatch progress updates if the task hasn't been aborted, and tag them with
            // this thunk's request ID so a superseded worker can't drive a newer request's bar.
            if (!signal.aborted) {
              dispatch({
                type: `${taskName}/updateProgress`,
                payload: { progress, requestId },
              });
            }
          },
          poolName,
          { poolConfig: options?.poolConfig, priority: taskPriority, signal },
        );

        // If the task was aborted while the worker was running, discard result
        if (signal.aborted) {
          return rejectWithValue('Task was aborted');
        }

        return result as ResultType;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown worker error';
        return rejectWithValue(errorMessage);
      }
    },
    {
      condition: (input: InputType, { getState }) => {
        const state = getState() as RootState;
        const taskState = state.workerResults[taskName] as WorkerTaskState<ResultType>;

        if (!taskState) {
          return true; // Allow execution if state doesn't exist yet
        }

        // Check if we have cached results for the same input
        const inputHash = createInputHash(input);
        const isSameInput = taskState.cacheMetadata.lastInputHash === inputHash;

        // Prevent execution only if a task for the SAME input is already loading.
        // Hooks abort the in-flight thunk in effect cleanup and dispatch a
        // replacement in the same synchronous flush, but RTK delivers abort's
        // `rejected` (which clears isLoading) on a microtask — so a plain
        // `isLoading` gate here would drop the replacement whenever the desired
        // input changed (e.g. back-and-forth fight nav). Allowing a differing
        // input to proceed lets the newer request run; the stale request's
        // result is discarded by the latestRequestId guard in extraReducers.
        if (taskState.isLoading && isSameInput) {
          return false;
        }

        // Optional: Add cache timeout (uncomment if needed)
        // const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
        // const isFresh = taskState.cacheMetadata.lastExecutedTimestamp &&
        //   (Date.now() - taskState.cacheMetadata.lastExecutedTimestamp) < CACHE_TIMEOUT;

        if (isSameInput && taskState.result !== null) {
          return false; // Prevent execution if we have cached results for same input
        }

        return true; // Allow execution
      },
    },
  );

  const slice = createSlice({
    name: taskName as string,
    initialState: createInitialTaskState<ResultType>(),
    reducers: {
      startTask(state) {
        state.isLoading = true;
        state.progress = null;
        state.error = null;
      },

      updateProgress(state, action: PayloadAction<WorkerTaskProgressPayload>) {
        // Scoped to the owning request when tagged; untagged updates (plain action creators,
        // legacy callers) apply to whatever is loading, preserving previous behavior.
        if (state.isLoading) {
          const owner = action.payload.requestId;
          if (owner === undefined || owner === state.latestRequestId) {
            state.progress = action.payload.progress;
          }
        }
      },

      completeTask(state, action: PayloadAction<WorkerTaskCompletedPayload<ResultType>>) {
        state.result = action.payload.result as typeof state.result;
        state.isLoading = false;
        state.progress = null;
        state.error = null;
        state.lastUpdated = Date.now();
      },

      failTask(state, action: PayloadAction<WorkerTaskFailedPayload>) {
        state.isLoading = false;
        state.progress = null;
        state.error = action.payload.error;
      },

      clearResult(state) {
        Object.assign(state, createInitialTaskState<ResultType>());
      },

      resetTask(state) {
        const lastUpdated = state.lastUpdated;
        const resultCache = state.resultCache;
        const cacheOrder = [...state.cacheOrder];
        const resultCacheMeta = { ...state.resultCacheMeta };
        Object.assign(state, createInitialTaskState<ResultType>());
        state.lastUpdated = lastUpdated;
        state.resultCache = resultCache;
        state.cacheOrder = cacheOrder;
        state.resultCacheMeta = resultCacheMeta;
        // Deliberately NOT preserved: latestRequestId + lastInputHash. A reset is an
        // invalidation barrier (fight switch) — any pre-reset in-flight fulfillment must NOT
        // match the post-reset slot. RTK requestIds are unique, so nulling is sufficient: a
        // stale result can never equal null, and the replacement's own pending sets the new id.
      },
    },
    extraReducers: (builder) => {
      builder
        .addCase(executeTask.pending, (state, action) => {
          state.isLoading = true;
          state.progress = null;
          state.error = null;
          // Track this as the latest request to handle race conditions
          state.latestRequestId = action.meta.requestId;
          // Update cache metadata with input hash
          state.cacheMetadata.lastInputHash = createInputHash(action.meta.arg);
        })
        .addCase(executeTask.fulfilled, (state, action) => {
          // Only update state if this is the latest request (prevent race conditions)
          if (action.meta.requestId === state.latestRequestId) {
            state.result = action.payload as typeof state.result;
            state.isLoading = false;
            state.progress = null;
            state.error = null;
            state.lastUpdated = Date.now();
            state.cacheMetadata.lastExecutedTimestamp = Date.now();

            // Store in LRU result cache
            const inputHash = createInputHash(action.meta.arg);
            state.resultCache[inputHash] = action.payload as (typeof state.resultCache)[string];
            state.resultCacheMeta[inputHash] = Date.now();

            // Move to front of cache order
            state.cacheOrder = [inputHash, ...state.cacheOrder.filter((h) => h !== inputHash)];

            // Evict oldest entries if over limit
            while (state.cacheOrder.length > maxCacheSize) {
              const evicted = state.cacheOrder.pop()!;
              delete state.resultCache[evicted];
              delete state.resultCacheMeta[evicted];
            }
          }
          // If this is not the latest request, ignore the result to prevent stale data overwrites
        })
        .addCase(executeTask.rejected, (state, action) => {
          // Only update error state if this is the latest request
          if (action.meta.requestId === state.latestRequestId) {
            state.isLoading = false;
            state.progress = null;
            // Don't set error state for intentionally aborted tasks
            if (!action.meta.aborted) {
              state.error = action.payload || action.error.message || 'Unknown error';
            }
            // Don't clear cache metadata on error - might want to retry with same input
          }
        });
    },
  });

  return {
    ...slice,
    executeTask, // Export the thunk action
  };
};
