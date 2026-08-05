import { proxy, releaseProxy } from 'comlink';

import { ILogger } from '../utils/logger';

import { SharedComputationWorkerTaskType } from './SharedWorker';
import type { WorkerPoolConfig, WorkerTask, WorkerInfo, WorkerStats } from './types';
import { OnProgressCallback } from './Utils';
import { createSharedWorker } from './workerFactories';
import { releaseAndTerminate } from './workerRegistry';

/**
 * WorkerPool manages a pool of web workers for executing computationally intensive tasks
 */
export class WorkerPool {
  private workers: Map<string, WorkerInfo> = new Map();
  private taskQueue: WorkerTask<unknown, unknown>[] = [];
  private pendingTasks: Map<string, WorkerTask<unknown, unknown>> = new Map();
  private logger: ILogger | null = null;
  private stats: WorkerStats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    activeWorkers: 0,
    queueSize: 0,
    averageTaskTime: 0,
  };

  private taskTimes: number[] = [];
  private cleanupInterval?: number;
  private nextWorkerId = 1;

  constructor(private config: WorkerPoolConfig = {}) {
    this.config = {
      maxWorkers: 4,
      idleTimeout: 300000, // 5 minutes
      taskTimeout: 30000, // 30 seconds
      retryAttempts: 2,
      enableLogging: process.env.NODE_ENV === 'development',
      ...config,
    };

    // Set the logger from config if provided
    this.logger = config.logger || null;

    // Log initialization
    if (this.logger) {
      this.logger.info('WorkerPool initialized', {
        maxWorkers: this.config.maxWorkers,
        idleTimeout: this.config.idleTimeout,
        taskTimeout: this.config.taskTimeout,
      });
    }

    // Set up periodic cleanup of idle workers
    this.cleanupInterval = window.setInterval(
      this.cleanupIdleWorkers.bind(this),
      60000, // Check every minute
    );
  }

  /**
   * Execute a task on an available worker
   */
  async execute<T = unknown, R = unknown>(
    taskType: SharedComputationWorkerTaskType,
    data: T,
    priority = 0,
    onProgress?: OnProgressCallback,
  ): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const taskId = this.generateTaskId();
      const task: WorkerTask<unknown, unknown> = {
        id: taskId,
        type: taskType,
        data,
        priority,
        resolve: resolve as (value: unknown) => void,
        reject,
        createdAt: Date.now(),
        onProgress,
      };

      this.stats.totalTasks++;
      this.taskQueue.push(task);
      this.updateStats();

      if (this.config.enableLogging && this.logger) {
        this.logger.debug(`Queued task ${taskId} (${taskType})`, { taskId, taskType, priority });
      }

      // The task timeout is armed when the task actually starts on a worker
      // (see executeTaskOnWorker), not here — arming at enqueue would charge
      // queue-wait time against the run budget.
      this.processNextTask();
    });
  }

  /**
   * Get current worker pool statistics
   */
  getStats(): WorkerStats {
    return { ...this.stats };
  }

  /**
   * Shut down the worker pool and terminate all workers
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Terminate all workers (release the proxy AND stop the thread)
    for (const workerInfo of this.workers.values()) {
      releaseAndTerminate(workerInfo.worker);
    }

    // Reject all pending (running) tasks and clear their timeout timers
    for (const task of this.pendingTasks.values()) {
      this.cleanupTask(task);
      task.reject(new Error('WorkerPool destroyed'));
    }

    // Reject queued tasks too — callers awaiting them would otherwise hang
    // forever (destroy runs from beforeunload and mid-flight in tests).
    for (const task of this.taskQueue) {
      this.cleanupTask(task);
      task.reject(new Error('WorkerPool destroyed'));
    }

    this.workers.clear();
    this.taskQueue.length = 0;
    this.pendingTasks.clear();

    if (this.config.enableLogging && this.logger) {
      this.logger.info('Worker pool destroyed');
    }
  }

  /**
   * Process the next task in the queue
   */
  private processNextTask(): void {
    if (this.taskQueue.length === 0) {
      return;
    }

    // Sort by priority (higher priority first)
    this.taskQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const task = this.taskQueue.shift();
    if (!task) return;

    const worker = this.getAvailableWorker();
    if (!worker) {
      // Put task back if no workers available
      this.taskQueue.unshift(task);
      return;
    }

    this.executeTaskOnWorker(worker, task);
  }

  /**
   * Get an available worker or create a new one
   */
  private getAvailableWorker(): WorkerInfo | null {
    // Find idle worker
    for (const workerInfo of this.workers.values()) {
      if (!workerInfo.busy) {
        return workerInfo;
      }
    }

    // Create new worker if under limit
    if (this.workers.size < (this.config.maxWorkers || 4)) {
      return this.createWorker();
    }

    return null;
  }

  /**
   * Create a new worker
   */
  private createWorker(): WorkerInfo {
    const worker = createSharedWorker();

    const workerId = `worker-${this.nextWorkerId++}`;

    const workerInfo: WorkerInfo = {
      id: workerId,
      worker,
      busy: false,
      lastUsed: Date.now(),
      tasksCompleted: 0,
    };

    this.workers.set(workerId, workerInfo);
    this.stats.activeWorkers = this.workers.size;

    if (this.config.enableLogging && this.logger) {
      this.logger.debug(`Created worker ${workerId}`, {
        workerId,
        totalWorkers: this.workers.size,
      });
    }

    return workerInfo;
  }

  /**
   * Execute a task on a specific worker
   */
  private async executeTaskOnWorker(
    workerInfo: WorkerInfo,
    task: WorkerTask<unknown, unknown>,
  ): Promise<void> {
    workerInfo.busy = true;
    workerInfo.currentTaskId = task.id;
    workerInfo.lastUsed = Date.now();

    this.pendingTasks.set(task.id, task);

    // Arm the task timeout on the queued→running transition (cleared in
    // cleanupTask). Measuring from start gives every task its full run budget
    // regardless of how long it waited in the queue, and never leaves a task
    // that outwaited its timer running with no timeout at all.
    if (this.config.taskTimeout) {
      task.timeoutId = setTimeout(() => {
        if (this.pendingTasks.has(task.id)) {
          this.handleTaskTimeout(task.id, task.type);
        }
      }, this.config.taskTimeout);
    }

    let result: unknown;

    const onProgress = proxy((progress: number) => {
      this.handleTaskProgress(task.id, progress);
    });

    if (this.config.enableLogging && this.logger) {
      this.logger.debug(`Started task ${task.id} (${task.type}) on ${workerInfo.id}`, {
        taskId: task.id,
        taskType: task.type,
        workerId: workerInfo.id,
      });
    }

    try {
      // Dynamic dispatch: invoke the worker method matching the task type
      const workerMethod = workerInfo.worker[task.type];
      if (!workerMethod) {
        throw new Error(`Unknown task type: ${task.type}`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await (workerMethod as any).call(workerInfo.worker, task.data, onProgress);

      this.handleTaskComplete(task.id, result);
    } catch (err) {
      this.handleTaskError(task.id, err as Error);
    } finally {
      // Release the per-task progress proxy so its MessagePort doesn't leak.
      // comlink only auto-releases proxied callbacks via non-deterministic GC.
      try {
        (onProgress as unknown as { [releaseProxy]?: () => void })[releaseProxy]?.();
      } catch {
        /* already released */
      }
    }

    // If this task already timed out, its worker was torn down and recovered by
    // handleTaskTimeout; don't resurrect the detached worker's bookkeeping.
    if (!this.workers.has(workerInfo.id)) {
      return;
    }

    // Mark worker as available
    workerInfo.busy = false;
    workerInfo.currentTaskId = undefined;
    workerInfo.tasksCompleted++;
    workerInfo.lastUsed = Date.now();

    // Process next task
    this.processNextTask();
  }

  /**
   * Handle successful task completion
   */
  private handleTaskComplete(taskId: string, result: unknown): void {
    const task = this.pendingTasks.get(taskId);
    if (!task) return;

    this.cleanupTask(task);

    const executionTime = Date.now() - task.createdAt;
    this.taskTimes.push(executionTime);

    // Keep only recent task times for average calculation
    if (this.taskTimes.length > 100) {
      this.taskTimes = this.taskTimes.slice(-50);
    }

    this.stats.completedTasks++;
    this.pendingTasks.delete(taskId);
    this.updateStats();

    task.resolve(result);

    if (this.config.enableLogging && this.logger) {
      this.logger.info(`Task ${task.type} completed in ${executionTime}ms`, {
        taskId,
        taskType: task.type,
        executionTime,
      });
    }
  }

  /**
   * Handle task errors
   */
  private handleTaskError(taskId: string, error: Error): void {
    const task = this.pendingTasks.get(taskId);
    if (!task) return;

    this.cleanupTask(task);

    this.stats.failedTasks++;
    this.pendingTasks.delete(taskId);
    this.updateStats();

    task.reject(error);

    if (this.config.enableLogging && this.logger) {
      this.logger.error(`Task ${taskId} (${task.type}) failed`, error, {
        taskId,
        taskType: task.type,
      });
    }
  }

  /**
   * Handle a task that exceeded its timeout. The worker may be hung (the very
   * scenario the timeout defends against), in which case its `busy` flag would
   * otherwise stay true forever and permanently strand the pool slot. So we
   * tear the worker down, reject the caller, and re-run the queue on a fresh
   * worker.
   */
  private handleTaskTimeout(taskId: string, taskType: string): void {
    for (const [workerId, workerInfo] of this.workers.entries()) {
      if (workerInfo.currentTaskId === taskId) {
        releaseAndTerminate(workerInfo.worker);
        this.workers.delete(workerId);
        this.stats.activeWorkers = this.workers.size;
        break;
      }
    }

    this.handleTaskError(
      taskId,
      new Error(`Task timeout after ${this.config.taskTimeout}ms: ${taskType}`),
    );

    // A pool slot just freed up — let any queued work proceed.
    this.processNextTask();
  }

  /**
   * Clean up task resources (timeout timer)
   */
  private cleanupTask(task: WorkerTask<unknown, unknown>): void {
    if (task.timeoutId !== undefined) {
      clearTimeout(task.timeoutId);
      task.timeoutId = undefined;
    }
  }

  /**
   * Handle task progress updates
   */
  private handleTaskProgress(taskId: string, progress: number): void {
    const task = this.pendingTasks.get(taskId);
    if (!task?.onProgress) return;

    task.onProgress(progress);
  }

  /**
   * Clean up idle workers
   */
  private cleanupIdleWorkers(): void {
    const now = Date.now();
    const idleTimeout = this.config.idleTimeout || 300000;

    for (const [workerId, workerInfo] of this.workers.entries()) {
      if (!workerInfo.busy && now - workerInfo.lastUsed > idleTimeout) {
        releaseAndTerminate(workerInfo.worker);
        this.workers.delete(workerId);

        if (this.config.enableLogging && this.logger) {
          this.logger.debug(`Cleaned up idle worker ${workerId}`, {
            workerId,
            idleTime: now - workerInfo.lastUsed,
            remainingWorkers: this.workers.size - 1,
          });
        }
      }
    }

    this.stats.activeWorkers = this.workers.size;
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.queueSize = this.taskQueue.length;
    this.stats.averageTaskTime =
      this.taskTimes.length > 0
        ? this.taskTimes.reduce((sum, time) => sum + time, 0) / this.taskTimes.length
        : 0;
  }

  /**
   * Generate a unique task ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
