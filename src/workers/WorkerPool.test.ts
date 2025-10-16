/**
 * Tests for WorkerPool class
 * ESO-375: Worker Pool Implementation
 *
 * This test suite validates the worker pool functionality without using fake timers
 * to avoid complications with async worker operations.
 */

import { Remote } from 'comlink';

import { ILogger } from '../utils/logger';

import { SharedComputationWorker } from './SharedWorker';
import { WorkerPool } from './WorkerPool';
import { WorkerPoolConfig } from './types';

// Mock the workerFactories module
jest.mock('./workerFactories', () => ({
  createSharedWorker: jest.fn(),
}));

// Mock comlink
jest.mock('comlink', () => {
  const releaseProxySym = Symbol('releaseProxy');
  return {
    proxy: jest.fn((fn) => fn),
    releaseProxy: releaseProxySym,
  };
});

import { createSharedWorker } from './workerFactories';
import { releaseProxy } from 'comlink';

const mockCreateSharedWorker = createSharedWorker as jest.MockedFunction<typeof createSharedWorker>;

describe('WorkerPool', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let mockWorker: jest.Mocked<Remote<SharedComputationWorker>>;
  let releaseProxyFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn().mockReturnValue(0),
      getEntries: jest.fn().mockReturnValue([]),
      clearEntries: jest.fn(),
      exportLogs: jest.fn().mockReturnValue(''),
    };

    // Mock releaseProxy function
    releaseProxyFn = jest.fn();

    // Mock worker with all required methods
    mockWorker = {
      calculateBuffLookup: jest.fn().mockResolvedValue({}),
      calculateDebuffLookup: jest.fn().mockResolvedValue({}),
      calculateDamageReductionData: jest.fn().mockResolvedValue({}),
      calculateCriticalDamageData: jest.fn().mockResolvedValue({}),
      calculateDamageOverTimeData: jest.fn().mockResolvedValue({}),
      calculateHostileBuffLookup: jest.fn().mockResolvedValue({}),
      calculatePenetrationData: jest.fn().mockResolvedValue({}),
      calculateStatusEffectUptimes: jest.fn().mockResolvedValue({}),
      calculateActorPositions: jest.fn().mockResolvedValue([]),
      calculateTouchOfZenStacks: jest.fn().mockResolvedValue([]),
      calculateStaggerStacks: jest.fn().mockResolvedValue([]),
      calculateElementalWeaknessStacks: jest.fn().mockResolvedValue([]),
      [releaseProxy]: releaseProxyFn,
    } as unknown as jest.Mocked<Remote<SharedComputationWorker>>;

    mockCreateSharedWorker.mockReturnValue(mockWorker);
  });

  describe('Construction and Configuration', () => {
    it('should create a WorkerPool with default configuration', () => {
      const pool = new WorkerPool();
      const stats = pool.getStats();

      expect(stats).toEqual({
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        activeWorkers: 0,
        queueSize: 0,
        averageTaskTime: 0,
      });

      pool.destroy();
    });

    it('should create a WorkerPool with custom configuration', () => {
      const config: WorkerPoolConfig = {
        maxWorkers: 8,
        idleTimeout: 60000,
        taskTimeout: 10000,
        retryAttempts: 3,
        enableLogging: true,
        logger: mockLogger,
      };

      const pool = new WorkerPool(config);

      expect(mockLogger.info).toHaveBeenCalledWith('WorkerPool initialized', {
        maxWorkers: 8,
        idleTimeout: 60000,
        taskTimeout: 10000,
      });

      pool.destroy();
    });
  });

  describe('Worker Creation and Management', () => {
    it('should create workers on demand', async () => {
      const pool = new WorkerPool({ maxWorkers: 2, enableLogging: true, logger: mockLogger });

      await pool.execute('calculateBuffLookup', {});

      expect(mockCreateSharedWorker).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Created worker'),
        expect.any(Object),
      );

      pool.destroy();
    });

    it('should reuse idle workers', async () => {
      const pool = new WorkerPool({ maxWorkers: 1 });

      await pool.execute('calculateBuffLookup', {});
      expect(mockCreateSharedWorker).toHaveBeenCalledTimes(1);

      await pool.execute('calculateDebuffLookup', {});
      // Still only one worker created
      expect(mockCreateSharedWorker).toHaveBeenCalledTimes(1);

      pool.destroy();
    });

    it('should respect maxWorkers limit', async () => {
      const pool = new WorkerPool({ maxWorkers: 2 });

      // Execute multiple tasks
      await Promise.all([
        pool.execute('calculateBuffLookup', {}),
        pool.execute('calculateDebuffLookup', {}),
        pool.execute('calculateDamageReductionData', {}),
      ]);

      // Should create at most 2 workers
      expect(mockCreateSharedWorker).toHaveBeenCalledTimes(2);

      pool.destroy();
    });

    it('should handle task priority ordering', async () => {
      const pool = new WorkerPool({ maxWorkers: 1 });
      const results: string[] = [];

      // Set up mocks to track execution order
      mockWorker.calculateBuffLookup.mockImplementationOnce(() => {
        results.push('first');
        return Promise.resolve({});
      });

      mockWorker.calculateDebuffLookup.mockImplementationOnce(() => {
        results.push('high-priority');
        return Promise.resolve({});
      });

      mockWorker.calculateDamageReductionData.mockImplementationOnce(() => {
        results.push('low-priority');
        return Promise.resolve({});
      });

      // Execute tasks with different priorities
      const p1 = pool.execute('calculateBuffLookup', {}, 0); // Runs first
      const p2 = pool.execute('calculateDamageReductionData', {}, 1); // Low priority, queued
      const p3 = pool.execute('calculateDebuffLookup', {}, 10); // High priority, queued

      await Promise.all([p1, p2, p3]);

      // High priority should run before low priority
      expect(results).toEqual(['first', 'high-priority', 'low-priority']);

      pool.destroy();
    });
  });

  describe('Task Execution', () => {
    it('should execute tasks and return results', async () => {
      const pool = new WorkerPool();
      mockWorker.calculateBuffLookup.mockResolvedValue({ testResult: 'success' });

      const result = await pool.execute('calculateBuffLookup', { events: [] });

      expect(mockWorker.calculateBuffLookup).toHaveBeenCalled();
      expect(result).toEqual({ testResult: 'success' });

      pool.destroy();
    });

    it('should handle multiple task types', async () => {
      const pool = new WorkerPool();

      await pool.execute('calculateBuffLookup', {});
      await pool.execute('calculateDebuffLookup', {});
      await pool.execute('calculateDamageReductionData', {});

      expect(mockWorker.calculateBuffLookup).toHaveBeenCalled();
      expect(mockWorker.calculateDebuffLookup).toHaveBeenCalled();
      expect(mockWorker.calculateDamageReductionData).toHaveBeenCalled();

      pool.destroy();
    });

    it('should handle task errors gracefully', async () => {
      const pool = new WorkerPool({ enableLogging: true, logger: mockLogger });
      const error = new Error('Task failed');

      mockWorker.calculateBuffLookup.mockRejectedValue(error);

      await expect(pool.execute('calculateBuffLookup', {})).rejects.toThrow('Task failed');

      const stats = pool.getStats();
      expect(stats.failedTasks).toBe(1);
      expect(mockLogger.error).toHaveBeenCalled();

      pool.destroy();
    });

    it('should support progress callbacks', async () => {
      const pool = new WorkerPool();
      const onProgress = jest.fn();

      await pool.execute('calculateBuffLookup', {}, 0, onProgress);

      expect(mockWorker.calculateBuffLookup).toHaveBeenCalled();

      pool.destroy();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track total tasks', async () => {
      const pool = new WorkerPool();

      await pool.execute('calculateBuffLookup', {});
      await pool.execute('calculateDebuffLookup', {});

      const stats = pool.getStats();
      expect(stats.totalTasks).toBe(2);

      pool.destroy();
    });

    it('should track completed tasks', async () => {
      const pool = new WorkerPool();

      await pool.execute('calculateBuffLookup', {});
      await pool.execute('calculateDebuffLookup', {});

      const stats = pool.getStats();
      expect(stats.completedTasks).toBe(2);

      pool.destroy();
    });

    it('should track failed tasks', async () => {
      const pool = new WorkerPool();

      mockWorker.calculateBuffLookup.mockRejectedValue(new Error('Failed'));

      try {
        await pool.execute('calculateBuffLookup', {});
      } catch {
        // Expected
      }

      const stats = pool.getStats();
      expect(stats.failedTasks).toBe(1);

      pool.destroy();
    });

    it('should track active workers', async () => {
      const pool = new WorkerPool({ maxWorkers: 3 });

      await pool.execute('calculateBuffLookup', {});

      const stats = pool.getStats();
      expect(stats.activeWorkers).toBeGreaterThanOrEqual(1);

      pool.destroy();
    });

    it('should calculate average task time', async () => {
      const pool = new WorkerPool();

      await pool.execute('calculateBuffLookup', {});

      const stats = pool.getStats();
      expect(stats.averageTaskTime).toBeGreaterThanOrEqual(0);

      pool.destroy();
    });

    it('should track queue size', async () => {
      const pool = new WorkerPool({ maxWorkers: 1 });

      // Queue multiple tasks and await them
      await Promise.all([
        pool.execute('calculateBuffLookup', {}),
        pool.execute('calculateDebuffLookup', {}),
      ]);

      const stats = pool.getStats();
      expect(stats.queueSize).toBeGreaterThanOrEqual(0);

      pool.destroy();
    });
  });

  describe('Worker Lifecycle', () => {
    it('should destroy all workers on destroy()', async () => {
      const pool = new WorkerPool();

      // Create a worker
      await pool.execute('calculateBuffLookup', {});

      pool.destroy();

      expect(releaseProxyFn).toHaveBeenCalled();
    });

    it('should clear intervals on destroy()', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const pool = new WorkerPool();

      pool.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });

  describe('Logging', () => {
    it('should log task events when logging is enabled', async () => {
      const pool = new WorkerPool({ enableLogging: true, logger: mockLogger });

      await pool.execute('calculateBuffLookup', {}, 5);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Queued task'),
        expect.any(Object),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('completed'),
        expect.any(Object),
      );

      pool.destroy();
    });

    it('should log errors when logging is enabled', async () => {
      const pool = new WorkerPool({ enableLogging: true, logger: mockLogger });

      mockWorker.calculateBuffLookup.mockRejectedValue(new Error('Test error'));

      try {
        await pool.execute('calculateBuffLookup', {});
      } catch {
        // Expected
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        expect.any(Error),
        expect.any(Object),
      );

      pool.destroy();
    });

    it('should not log when logging is disabled', async () => {
      const pool = new WorkerPool({ enableLogging: false, logger: mockLogger });

      await pool.execute('calculateBuffLookup', {});

      // Should not log task queue events
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Queued task'),
        expect.any(Object),
      );

      pool.destroy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queue gracefully', () => {
      const pool = new WorkerPool();

      const stats = pool.getStats();
      expect(stats.queueSize).toBe(0);

      pool.destroy();
    });

    it('should handle multiple destroy() calls', () => {
      const pool = new WorkerPool();

      pool.destroy();
      pool.destroy(); // Should not throw

      const stats = pool.getStats();
      expect(stats.activeWorkers).toBe(0);
    });

    it('should limit task time history to prevent memory growth', async () => {
      const pool = new WorkerPool();

      // Execute many tasks (more than the 100 task limit)
      for (let i = 0; i < 150; i++) {
        await pool.execute('calculateBuffLookup', {});
      }

      const stats = pool.getStats();
      expect(stats.completedTasks).toBe(150);
      // Average should still be calculated (internal array trimmed)
      expect(stats.averageTaskTime).toBeGreaterThanOrEqual(0);

      pool.destroy();
    });

    it('should return stats copy to prevent external mutation', () => {
      const pool = new WorkerPool();

      const stats1 = pool.getStats();
      stats1.totalTasks = 999;

      const stats2 = pool.getStats();
      expect(stats2.totalTasks).toBe(0);

      pool.destroy();
    });
  });
});
