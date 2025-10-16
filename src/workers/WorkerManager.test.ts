/**
 * Tests for WorkerManager singleton
 * ESO-375: Worker Pool Implementation
 */

import { ILogger } from '../utils/logger';

// Mock the workerFactories module (required for WorkerPool import)
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

// Mock the WorkerPool
jest.mock('./WorkerPool');

import { workerManager } from './WorkerManager';
import { WorkerPool } from './WorkerPool';

describe('WorkerManager', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let mockPool: jest.Mocked<WorkerPool>;

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

    // Mock WorkerPool instance
    mockPool = {
      execute: jest.fn().mockResolvedValue({}),
      getStats: jest.fn().mockReturnValue({
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        activeWorkers: 0,
        queueSize: 0,
        averageTaskTime: 0,
      }),
      destroy: jest.fn(),
    } as unknown as jest.Mocked<WorkerPool>;

    // Make WorkerPool constructor return our mock
    (WorkerPool as jest.MockedClass<typeof WorkerPool>).mockImplementation(() => mockPool);
  });

  afterEach(() => {
    // Clean up any pools created during tests
    workerManager.destroyPool();
  });

  describe('Singleton Pattern', () => {
    it('should be a singleton instance', () => {
      // workerManager is already the singleton instance exported from WorkerManager.ts
      expect(workerManager).toBeDefined();
      expect(typeof workerManager.createPool).toBe('function');
      expect(typeof workerManager.execute).toBe('function');
    });
  });

  describe('Logger Configuration', () => {
    it('should allow setting a logger', () => {
      workerManager.setLogger(mockLogger);

      expect(mockLogger.debug).toHaveBeenCalledWith('WorkerManager logger configured');
    });
  });

  describe('Pool Management', () => {
    it('should create a new worker pool', () => {
      const pool = workerManager.createPool('test-pool', { maxWorkers: 4 });

      expect(pool).toBeDefined();
      expect(WorkerPool).toHaveBeenCalledWith(expect.objectContaining({ maxWorkers: 4 }));
    });

    it('should return existing pool if already created', () => {
      const pool1 = workerManager.createPool('test-pool');
      const pool2 = workerManager.createPool('test-pool');

      expect(pool1).toBe(pool2);
      // WorkerPool constructor should only be called once
      expect(WorkerPool).toHaveBeenCalledTimes(1);
    });

    it('should get an existing pool', () => {
      workerManager.createPool('test-pool');
      const pool = workerManager.getPool('test-pool');

      expect(pool).toBeDefined();
      expect(pool).toBe(mockPool);
    });

    it('should return undefined for non-existent pool', () => {
      const pool = workerManager.getPool('non-existent-pool');

      expect(pool).toBeUndefined();
    });

    it('should list all pool names', () => {
      workerManager.createPool('pool1');
      workerManager.createPool('pool2');
      workerManager.createPool('pool3');

      const names = workerManager.getPoolNames();

      expect(names).toContain('pool1');
      expect(names).toContain('pool2');
      expect(names).toContain('pool3');
      expect(names.length).toBe(3);
    });
  });

  describe('Task Execution', () => {
    it('should execute task on specified pool', async () => {
      workerManager.createPool('test-pool');

      await workerManager.execute('test-pool', 'calculateBuffLookup', { test: 'data' }, 5);

      expect(mockPool.execute).toHaveBeenCalledWith(
        'calculateBuffLookup',
        { test: 'data' },
        5,
        undefined,
      );
    });

    it('should throw error if pool does not exist for execute()', async () => {
      await expect(
        workerManager.execute('non-existent', 'calculateBuffLookup', {}),
      ).rejects.toThrow("Worker pool 'non-existent' not found");
    });

    it('should auto-create pool for executeTask()', async () => {
      await workerManager.executeTask(
        'calculateBuffLookup',
        { buffEvents: [] },
        undefined,
        'auto-pool',
      );

      expect(WorkerPool).toHaveBeenCalled();
      expect(mockPool.execute).toHaveBeenCalledWith(
        'calculateBuffLookup',
        { buffEvents: [] },
        0,
        undefined,
      );
    });

    it('should use default pool name for executeTask()', async () => {
      await workerManager.executeTask('calculateBuffLookup', { buffEvents: [] });

      const pool = workerManager.getPool('default');
      expect(pool).toBeDefined();
    });

    it('should pass progress callback to pool', async () => {
      workerManager.createPool('test-pool');
      const onProgress = jest.fn();

      await workerManager.execute('test-pool', 'calculateBuffLookup', {}, 0, onProgress);

      expect(mockPool.execute).toHaveBeenCalledWith('calculateBuffLookup', {}, 0, onProgress);
    });
  });

  describe('Statistics', () => {
    it('should get stats for specific pool', () => {
      workerManager.createPool('test-pool');

      const stats = workerManager.getStats('test-pool');

      expect(mockPool.getStats).toHaveBeenCalled();
      expect(stats).toEqual({
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        activeWorkers: 0,
        queueSize: 0,
        averageTaskTime: 0,
      });
    });

    it('should get stats for all pools', () => {
      workerManager.createPool('pool1');
      workerManager.createPool('pool2');

      const allStats = workerManager.getStats();

      expect(allStats).toHaveProperty('pool1');
      expect(allStats).toHaveProperty('pool2');
      expect(mockPool.getStats).toHaveBeenCalledTimes(2);
    });

    it('should throw error for non-existent pool stats', () => {
      expect(() => {
        workerManager.getStats('non-existent');
      }).toThrow("Worker pool 'non-existent' not found");
    });
  });

  describe('Pool Destruction', () => {
    it('should destroy a specific pool', () => {
      workerManager.createPool('test-pool');

      workerManager.destroyPool('test-pool');

      expect(mockPool.destroy).toHaveBeenCalled();
      expect(workerManager.getPool('test-pool')).toBeUndefined();
    });

    it('should destroy all pools when no name specified', () => {
      workerManager.createPool('pool1');
      workerManager.createPool('pool2');

      workerManager.destroyPool();

      expect(mockPool.destroy).toHaveBeenCalledTimes(2);
      expect(workerManager.getPoolNames()).toHaveLength(0);
    });

    it('should handle destroying non-existent pool gracefully', () => {
      // Should not throw
      expect(() => {
        workerManager.destroyPool('non-existent');
      }).not.toThrow();
    });
  });

  describe('Logger Integration', () => {
    it('should pass logger to created pools', () => {
      workerManager.setLogger(mockLogger);
      workerManager.createPool('test-pool');

      expect(WorkerPool).toHaveBeenCalledWith(expect.objectContaining({ logger: mockLogger }));
    });

    it('should log pool creation with logger', () => {
      workerManager.setLogger(mockLogger);
      workerManager.createPool('test-pool', { maxWorkers: 4 });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Created worker pool'),
        expect.any(Object),
      );
    });
  });
});
