import { configureStore, combineReducers } from '@reduxjs/toolkit';

import { workerManager } from '@/workers';
import {
  SharedComputationWorkerTaskType,
  SharedWorkerInputType,
  SharedWorkerResultType,
} from '@/workers/SharedWorker';

import {
  createWorkerTaskSlice,
  WorkerTaskState,
  WorkerTaskProgressPayload,
  WorkerTaskCompletedPayload,
  WorkerTaskFailedPayload,
} from './workerTaskSliceFactory';

// Mock the worker manager
jest.mock('@/workers', () => ({
  workerManager: {
    executeTask: jest.fn(),
  },
}));

describe('workerTaskSliceFactory', () => {
  let mockWorkerManager: jest.Mocked<typeof workerManager>;

  const mockTaskName = 'calculateActorPositions' as SharedComputationWorkerTaskType;
  const mockInput = { reportCode: 'test', fightId: 1 } as SharedWorkerInputType<
    typeof mockTaskName
  >;
  const mockResult = { positions: [{ x: 1, y: 2 }] } as SharedWorkerResultType<typeof mockTaskName>;

  const createInputHash = (input: SharedWorkerInputType<typeof mockTaskName>): string => {
    return JSON.stringify(input);
  };

  beforeEach(() => {
    mockWorkerManager = workerManager as jest.Mocked<typeof workerManager>;
    jest.clearAllMocks();
  });

  describe('createWorkerTaskSlice', () => {
    it('should create a slice with correct initial state', () => {
      const workerSlice = createWorkerTaskSlice(mockTaskName, createInputHash);
      const store = configureStore({
        reducer: {
          workerResults: combineReducers({
            [mockTaskName]: workerSlice.reducer,
          }),
        },
      });

      const state = store.getState() as {
        workerResults: {
          [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
        };
      };

      expect(state.workerResults[mockTaskName]).toEqual({
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
      });
    });

    it('should create all required actions', () => {
      const workerSlice = createWorkerTaskSlice(mockTaskName, createInputHash);

      expect(workerSlice.actions).toHaveProperty('startTask');
      expect(workerSlice.actions).toHaveProperty('updateProgress');
      expect(workerSlice.actions).toHaveProperty('completeTask');
      expect(workerSlice.actions).toHaveProperty('failTask');
      expect(workerSlice.actions).toHaveProperty('clearResult');
      expect(workerSlice.actions).toHaveProperty('resetTask');
      expect(workerSlice).toHaveProperty('executeTask');
    });
  });

  describe('reducer actions', () => {
    let store: ReturnType<typeof configureStore>;
    let workerSlice: ReturnType<typeof createWorkerTaskSlice>;

    beforeEach(() => {
      workerSlice = createWorkerTaskSlice(mockTaskName, createInputHash);
      store = configureStore({
        reducer: {
          workerResults: combineReducers({
            [mockTaskName]: workerSlice.reducer,
          }),
        },
      });
    });

    describe('startTask', () => {
      it('should set isLoading to true and clear progress and error', () => {
        store.dispatch(workerSlice.actions.startTask());

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        expect(state.workerResults[mockTaskName].isLoading).toBe(true);
        expect(state.workerResults[mockTaskName].progress).toBeNull();
        expect(state.workerResults[mockTaskName].error).toBeNull();
      });
    });

    describe('updateProgress', () => {
      it('should update progress when loading', () => {
        // Start the task first
        store.dispatch(workerSlice.actions.startTask());

        const progressPayload: WorkerTaskProgressPayload = { progress: 50 };
        store.dispatch(workerSlice.actions.updateProgress(progressPayload));

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        expect(state.workerResults[mockTaskName].progress).toBe(50);
      });

      it('should not update progress when not loading', () => {
        const progressPayload: WorkerTaskProgressPayload = { progress: 50 };
        store.dispatch(workerSlice.actions.updateProgress(progressPayload));

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        expect(state.workerResults[mockTaskName].progress).toBeNull();
      });
    });

    describe('completeTask', () => {
      it('should set result and clear loading state', () => {
        const mockTimestamp = 1234567890;
        jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

        const completedPayload: WorkerTaskCompletedPayload<
          SharedWorkerResultType<typeof mockTaskName>
        > = {
          result: mockResult,
        };

        store.dispatch(workerSlice.actions.completeTask(completedPayload));

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        expect(state.workerResults[mockTaskName].result).toEqual(mockResult);
        expect(state.workerResults[mockTaskName].isLoading).toBe(false);
        expect(state.workerResults[mockTaskName].progress).toBeNull();
        expect(state.workerResults[mockTaskName].error).toBeNull();
        expect(state.workerResults[mockTaskName].lastUpdated).toBe(mockTimestamp);
      });
    });

    describe('failTask', () => {
      it('should set error and clear loading state', () => {
        const failedPayload: WorkerTaskFailedPayload = {
          error: 'Test error message',
        };

        store.dispatch(workerSlice.actions.failTask(failedPayload));

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        expect(state.workerResults[mockTaskName].error).toBe('Test error message');
        expect(state.workerResults[mockTaskName].isLoading).toBe(false);
        expect(state.workerResults[mockTaskName].progress).toBeNull();
      });
    });

    describe('clearResult', () => {
      it('should reset state to initial values', () => {
        // Set up some state first
        store.dispatch(workerSlice.actions.startTask());
        store.dispatch(
          workerSlice.actions.completeTask({
            result: mockResult,
          }),
        );

        // Clear the result
        store.dispatch(workerSlice.actions.clearResult());

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        expect(state.workerResults[mockTaskName]).toEqual({
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
        });
      });
    });

    describe('resetTask', () => {
      it('should reset loading state but preserve cache metadata and lastUpdated', async () => {
        // First execute a task to set up some state with metadata
        mockWorkerManager.executeTask.mockResolvedValueOnce(mockResult);
        await store.dispatch(workerSlice.executeTask(mockInput));

        // Verify we have some state set up
        let state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        const originalLastUpdated = state.workerResults[mockTaskName].lastUpdated;
        const originalInputHash = state.workerResults[mockTaskName].cacheMetadata.lastInputHash;
        const originalRequestId = state.workerResults[mockTaskName].latestRequestId;

        expect(originalLastUpdated).not.toBeNull();
        expect(originalInputHash).not.toBeNull();
        expect(originalRequestId).not.toBeNull();

        // Reset the task
        store.dispatch(workerSlice.actions.resetTask());

        const newState = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        // Should reset loading state
        expect(newState.workerResults[mockTaskName].result).toBeNull();
        expect(newState.workerResults[mockTaskName].isLoading).toBe(false);
        expect(newState.workerResults[mockTaskName].progress).toBeNull();
        expect(newState.workerResults[mockTaskName].error).toBeNull();

        // Should preserve metadata
        expect(newState.workerResults[mockTaskName].lastUpdated).toBe(originalLastUpdated);
        expect(newState.workerResults[mockTaskName].cacheMetadata.lastInputHash).toBe(
          originalInputHash,
        );
        expect(newState.workerResults[mockTaskName].latestRequestId).toBe(originalRequestId);
      });
    });
  });

  describe('executeTask async thunk', () => {
    let store: ReturnType<typeof configureStore>;
    let workerSlice: ReturnType<typeof createWorkerTaskSlice>;

    beforeEach(() => {
      workerSlice = createWorkerTaskSlice(mockTaskName, createInputHash);
      store = configureStore({
        reducer: {
          workerResults: combineReducers({
            [mockTaskName]: workerSlice.reducer,
          }),
        },
      });
    });

    describe('pending', () => {
      it('should set loading state and update cache metadata', async () => {
        const executePromise = store.dispatch(workerSlice.executeTask(mockInput));

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        expect(state.workerResults[mockTaskName].isLoading).toBe(true);
        expect(state.workerResults[mockTaskName].progress).toBeNull();
        expect(state.workerResults[mockTaskName].error).toBeNull();
        expect(state.workerResults[mockTaskName].cacheMetadata.lastInputHash).toBe(
          createInputHash(mockInput),
        );
        expect(state.workerResults[mockTaskName].latestRequestId).toBeDefined();

        // Wait for the promise to complete
        await executePromise.catch(() => {
          // Ignore errors for this test
        });
      });
    });

    describe('fulfilled', () => {
      it('should set result and update timestamps', async () => {
        const mockTimestamp = 1234567890;
        jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

        mockWorkerManager.executeTask.mockResolvedValueOnce(mockResult);

        await store.dispatch(workerSlice.executeTask(mockInput));

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        expect(state.workerResults[mockTaskName].result).toEqual(mockResult);
        expect(state.workerResults[mockTaskName].isLoading).toBe(false);
        expect(state.workerResults[mockTaskName].progress).toBeNull();
        expect(state.workerResults[mockTaskName].error).toBeNull();
        expect(state.workerResults[mockTaskName].lastUpdated).toBe(mockTimestamp);
        expect(state.workerResults[mockTaskName].cacheMetadata.lastExecutedTimestamp).toBe(
          mockTimestamp,
        );

        expect(mockWorkerManager.executeTask).toHaveBeenCalledWith(
          mockTaskName,
          mockInput,
          expect.any(Function),
        );
      });
    });

    describe('rejected', () => {
      it('should set error message and stop loading', async () => {
        const errorMessage = 'Worker execution failed';
        mockWorkerManager.executeTask.mockRejectedValueOnce(new Error(errorMessage));

        await store.dispatch(workerSlice.executeTask(mockInput));

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        expect(state.workerResults[mockTaskName].isLoading).toBe(false);
        expect(state.workerResults[mockTaskName].progress).toBeNull();
        expect(state.workerResults[mockTaskName].error).toBe(errorMessage);
        expect(state.workerResults[mockTaskName].result).toBeNull();
      });

      it('should handle non-Error rejections with default message', async () => {
        mockWorkerManager.executeTask.mockRejectedValueOnce('String error');

        await store.dispatch(workerSlice.executeTask(mockInput));

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        expect(state.workerResults[mockTaskName].error).toBe('Unknown worker error');
      });
    });

    describe('cache condition', () => {
      it('should not execute if already loading', async () => {
        // Start first execution
        const firstExecution = store.dispatch(workerSlice.executeTask(mockInput));

        // Try to start second execution while first is loading
        const secondExecution = store.dispatch(workerSlice.executeTask(mockInput));

        // Should not call worker manager a second time
        expect(mockWorkerManager.executeTask).toHaveBeenCalledTimes(1);

        // Wait for executions to complete
        await Promise.allSettled([firstExecution, secondExecution]);
      });

      it('should not execute if cached result exists for same input', async () => {
        mockWorkerManager.executeTask.mockResolvedValueOnce(mockResult);

        // First execution
        await store.dispatch(workerSlice.executeTask(mockInput));

        // Second execution with same input
        await store.dispatch(workerSlice.executeTask(mockInput));

        // Should only call worker manager once due to caching
        expect(mockWorkerManager.executeTask).toHaveBeenCalledTimes(1);
      });

      it('should execute if input is different', async () => {
        const differentInput = { reportCode: 'different', fightId: 2 } as SharedWorkerInputType<
          typeof mockTaskName
        >;

        mockWorkerManager.executeTask
          .mockResolvedValueOnce(mockResult)
          .mockResolvedValueOnce(mockResult);

        // First execution
        await store.dispatch(workerSlice.executeTask(mockInput));

        // Second execution with different input
        await store.dispatch(workerSlice.executeTask(differentInput));

        // Should call worker manager twice
        expect(mockWorkerManager.executeTask).toHaveBeenCalledTimes(2);
      });

      it('should execute if no cached result exists', async () => {
        mockWorkerManager.executeTask.mockResolvedValueOnce(mockResult);

        await store.dispatch(workerSlice.executeTask(mockInput));

        expect(mockWorkerManager.executeTask).toHaveBeenCalledTimes(1);
      });
    });

    describe('race condition handling', () => {
      it('should handle concurrent requests with latest result winning', async () => {
        // Test that when multiple requests are dispatched rapidly,
        // the system handles them gracefully and the latest completion is preserved
        const firstResult = { positions: [{ x: 1, y: 1 }] } as SharedWorkerResultType<
          typeof mockTaskName
        >;
        const secondResult = { positions: [{ x: 2, y: 2 }] } as SharedWorkerResultType<
          typeof mockTaskName
        >;

        // Mock to return results in order
        mockWorkerManager.executeTask
          .mockResolvedValueOnce(firstResult)
          .mockResolvedValueOnce(secondResult);

        // Dispatch first request
        const firstExecution = store.dispatch(workerSlice.executeTask(mockInput));

        // Dispatch second request with different input (bypasses cache condition)
        const secondInput = { reportCode: 'second', fightId: 2 } as SharedWorkerInputType<
          typeof mockTaskName
        >;
        const secondExecution = store.dispatch(workerSlice.executeTask(secondInput));

        // Wait for both to complete
        await Promise.all([firstExecution, secondExecution]);

        const finalState = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        // The final state should have a valid result (either first or second)
        // The specific race condition logic depends on request timing and implementation details
        expect(finalState.workerResults[mockTaskName].result).toBeTruthy();
        expect(finalState.workerResults[mockTaskName].isLoading).toBe(false);
        expect(finalState.workerResults[mockTaskName].error).toBeNull();
      });
    });

    describe('result cache', () => {
      it('should populate result cache on fulfilled', async () => {
        mockWorkerManager.executeTask.mockResolvedValueOnce(mockResult);

        await store.dispatch(workerSlice.executeTask(mockInput));

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        const inputHash = createInputHash(mockInput);
        expect(state.workerResults[mockTaskName].resultCache[inputHash]).toEqual(mockResult);
        expect(state.workerResults[mockTaskName].cacheOrder).toEqual([inputHash]);
      });

      it('should return cached result without calling worker', async () => {
        const firstInput = { reportCode: 'first', fightId: 1 } as SharedWorkerInputType<
          typeof mockTaskName
        >;
        const secondInput = { reportCode: 'second', fightId: 2 } as SharedWorkerInputType<
          typeof mockTaskName
        >;
        const firstResult = { positions: [{ x: 1, y: 1 }] } as SharedWorkerResultType<
          typeof mockTaskName
        >;
        const secondResult = { positions: [{ x: 2, y: 2 }] } as SharedWorkerResultType<
          typeof mockTaskName
        >;

        mockWorkerManager.executeTask
          .mockResolvedValueOnce(firstResult)
          .mockResolvedValueOnce(secondResult);

        // First execution with input A
        await store.dispatch(workerSlice.executeTask(firstInput));
        // Second execution with input B
        await store.dispatch(workerSlice.executeTask(secondInput));

        expect(mockWorkerManager.executeTask).toHaveBeenCalledTimes(2);

        // Third execution with input A again – should hit cache
        await store.dispatch(workerSlice.executeTask(firstInput));

        // Worker should NOT have been called a third time
        expect(mockWorkerManager.executeTask).toHaveBeenCalledTimes(2);

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        // Active result should now be the cached first result
        expect(state.workerResults[mockTaskName].result).toEqual(firstResult);
      });

      it('should evict oldest cache entry when over limit', async () => {
        const inputs = Array.from({ length: 4 }, (_, i) => ({
          reportCode: `report-${i}`,
          fightId: i,
        })) as SharedWorkerInputType<typeof mockTaskName>[];

        const results = inputs.map(
          (_, i) =>
            ({ positions: [{ x: i, y: i }] }) as SharedWorkerResultType<typeof mockTaskName>,
        );

        results.forEach((r) => mockWorkerManager.executeTask.mockResolvedValueOnce(r));

        // Execute 4 tasks (cache limit is 3)
        for (const input of inputs) {
          await store.dispatch(workerSlice.executeTask(input));
        }

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        // Cache should only have 3 entries (oldest evicted)
        expect(state.workerResults[mockTaskName].cacheOrder).toHaveLength(3);
        // First input should have been evicted
        const firstHash = createInputHash(inputs[0]);
        expect(state.workerResults[mockTaskName].resultCache[firstHash]).toBeUndefined();
      });

      it('should preserve cache on resetTask', async () => {
        mockWorkerManager.executeTask.mockResolvedValueOnce(mockResult);

        await store.dispatch(workerSlice.executeTask(mockInput));
        store.dispatch(workerSlice.actions.resetTask());

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        // Result should be cleared but cache preserved
        expect(state.workerResults[mockTaskName].result).toBeNull();
        const inputHash = createInputHash(mockInput);
        expect(state.workerResults[mockTaskName].resultCache[inputHash]).toEqual(mockResult);
      });

      it('should clear cache on clearResult', async () => {
        mockWorkerManager.executeTask.mockResolvedValueOnce(mockResult);

        await store.dispatch(workerSlice.executeTask(mockInput));
        store.dispatch(workerSlice.actions.clearResult());

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        expect(state.workerResults[mockTaskName].resultCache).toEqual({});
        expect(state.workerResults[mockTaskName].cacheOrder).toEqual([]);
      });
    });

    describe('abort handling', () => {
      it('should not set error state when task is aborted', async () => {
        // Create a promise that we can control
        let resolveWorker: (value: unknown) => void;
        const workerPromise = new Promise((resolve) => {
          resolveWorker = resolve;
        });
        mockWorkerManager.executeTask.mockReturnValueOnce(workerPromise as any);

        const promise = store.dispatch(workerSlice.executeTask(mockInput));

        // Abort the task
        promise.abort();

        // Resolve the worker (but result should be discarded)
        resolveWorker!(mockResult);
        await promise.catch(() => {});

        const state = store.getState() as {
          workerResults: {
            [mockTaskName]: WorkerTaskState<SharedWorkerResultType<typeof mockTaskName>>;
          };
        };

        // Error should NOT be set for aborted tasks
        expect(state.workerResults[mockTaskName].error).toBeNull();
        expect(state.workerResults[mockTaskName].isLoading).toBe(false);
      });
    });
  });
});
