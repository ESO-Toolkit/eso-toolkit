import { ILogger } from '../utils/logger';

import {
  SharedComputationWorkerTaskType,
  SharedWorkerInputType,
  SharedWorkerResultType,
} from './SharedWorker';
import type { WorkerPoolConfig, WorkerStats } from './types';
import { OnProgressCallback } from './Utils';
import { WorkerPool } from './WorkerPool';

/**
 * Centralized worker pool manager for the application
 * This provides a singleton interface to manage different types of workers
 */
class WorkerManager {
  private pools: Map<string, WorkerPool> = new Map();
  private static instance?: WorkerManager;
  private logger: ILogger | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  /**
   * Set the logger for the worker manager and all future worker pools
   */
  setLogger(logger: ILogger): void {
    this.logger = logger;
    logger.debug('WorkerManager logger configured');
  }

  /**
   * Create or get a worker pool for a specific worker type
   */
  createPool(poolName: string, config?: WorkerPoolConfig): WorkerPool {
    const existingPool = this.pools.get(poolName);
    if (existingPool) {
      return existingPool;
    }

    const poolConfig: WorkerPoolConfig = {
      ...config,
      logger: this.logger || undefined,
    };

    const pool = new WorkerPool(poolConfig);
    this.pools.set(poolName, pool);

    if (this.logger) {
      this.logger.debug(`Created worker pool: ${poolName}`, { poolName, config: poolConfig });
    }

    return pool;
  }

  /**
   * Get an existing worker pool
   */
  getPool(poolName: string): WorkerPool | undefined {
    return this.pools.get(poolName);
  }

  /**
   * Execute a task on a specific worker pool
   */
  async execute<T = unknown, R = unknown>(
    poolName: string,
    taskType: SharedComputationWorkerTaskType,
    data: T,
    priority = 0,
    onProgress?: (progress: unknown) => void,
  ): Promise<R> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Worker pool '${poolName}' not found`);
    }
    return pool.execute<T, R>(taskType, data, priority, onProgress);
  }

  /**
   * Execute a task with automatic pool creation and management
   */
  async executeTask<T extends SharedComputationWorkerTaskType>(
    taskType: T,
    data: SharedWorkerInputType<T>,
    onProgress?: OnProgressCallback,
    poolName = 'default',
  ): Promise<SharedWorkerResultType<T>> {
    // Create pool if it doesn't exist
    if (!this.pools.has(poolName)) {
      this.createPool(poolName);
    }

    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Worker pool '${poolName}' not found and no workerFactory provided`);
    }

    return pool.execute(taskType, data, 0, onProgress);
  }

  /**
   * Get statistics for all pools or a specific pool
   */
  getStats(poolName?: string): Record<string, WorkerStats> | WorkerStats {
    if (poolName) {
      const pool = this.pools.get(poolName);
      if (!pool) {
        throw new Error(`Worker pool '${poolName}' not found`);
      }
      return pool.getStats();
    }

    const allStats: Record<string, WorkerStats> = {};
    for (const [name, pool] of this.pools) {
      allStats[name] = pool.getStats();
    }
    return allStats;
  }

  /**
   * Destroy a specific pool or all pools
   */
  destroyPool(poolName?: string): void {
    if (poolName) {
      const pool = this.pools.get(poolName);
      if (pool) {
        pool.destroy();
        this.pools.delete(poolName);
      }
    } else {
      // Destroy all pools
      for (const pool of this.pools.values()) {
        pool.destroy();
      }
      this.pools.clear();
    }
  }

  /**
   * Get list of available pools
   */
  getPoolNames(): string[] {
    return Array.from(this.pools.keys());
  }
}

// Export singleton instance
export const workerManager = WorkerManager.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    workerManager.destroyPool();
  });
}
