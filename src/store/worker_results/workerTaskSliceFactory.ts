import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../storeWithHistory';

import { workerManager } from '@/workers';
import {
  SharedComputationWorkerTaskType,
  SharedWorkerInputType,
  SharedWorkerResultType,
} from '@/workers/SharedWorker';

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
}

export interface WorkerTaskProgressPayload {
  progress: number;
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
});

// Define the return type separately to avoid circular reference
type WorkerTaskSliceReturn<T extends SharedComputationWorkerTaskType> = {
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
export const createWorkerTaskSlice = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
  createInputHash: (input: SharedWorkerInputType<T>) => string,
): WorkerTaskSliceReturn<T> => {
  type ResultType = SharedWorkerResultType<T>;
  type InputType = SharedWorkerInputType<T>;

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
    async (input: InputType, { rejectWithValue }) => {
      try {
        const result = await workerManager.executeTask(
          taskName,
          input,
          // Progress callback will be handled by the slice's updateProgress action
          () => {
            // Progress updates are handled separately
          },
        );
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

        // Prevent execution if already loading
        if (taskState.isLoading) {
          return false;
        }

        // Check if we have cached results for the same input
        const inputHash = createInputHash(input);
        const isSameInput = taskState.cacheMetadata.lastInputHash === inputHash;

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
        if (state.isLoading) {
          state.progress = action.payload.progress;
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
        const cacheMetadata = state.cacheMetadata;
        const latestRequestId = state.latestRequestId;
        Object.assign(state, createInitialTaskState<ResultType>());
        state.lastUpdated = lastUpdated;
        state.cacheMetadata = cacheMetadata;
        state.latestRequestId = latestRequestId;
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
          }
          // If this is not the latest request, ignore the result to prevent stale data overwrites
        })
        .addCase(executeTask.rejected, (state, action) => {
          // Only update error state if this is the latest request
          if (action.meta.requestId === state.latestRequestId) {
            state.isLoading = false;
            state.progress = null;
            state.error = action.payload || action.error.message || 'Unknown error';
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
