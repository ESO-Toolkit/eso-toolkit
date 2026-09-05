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
      // Retries are opt-in per pool: re-running a deterministically failing compute just burns
      // another slot, so only pools with flaky-worker risk (replay) enable a fresh-worker retry.
      retryAttempts: 0,
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
   * Execute a task on an available worker. `signal` aborts a still-queued task immediately and
   * tears down the worker running it, so superseded work (rapid fight switches) stops burning
   * pool slots instead of running to completion for a discarded result.
   */
  async execute<T = unknown, R = unknown>(
    taskType: SharedComputationWorkerTaskType,
    data: T,
    priority = 0,
    onProgress?: OnProgressCallback,
    signal?: AbortSignal,
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
        attempts: 0,
      };

      if (signal?.aborted) {
        reject(new Error('Task cancelled before it started'));
        return;
      }

      if (signal) {
        const onAbort = (): void => {
          this.cancelTask(taskId, new Error('Task cancelled'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
        // cleanupTask detaches this on every settle path, so a late abort can never touch a
        // recycled task id.
        task.abortSignal = signal;
        task.abortListener = onAbort;
      }

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
   * Cancel a task by id. A queued task is dropped; a running task's worker is torn down and
   * replaced (same recovery path as timeouts) so the slot is freed immediately. Never retried.
   * Returns true when a task was actually cancelled.
   */
  cancelTask(taskId: string, reason = new Error('Task cancelled')): boolean {
    const queuedIndex = this.taskQueue.findIndex((t) => t.id === taskId);
    if (queuedIndex >= 0) {
      const [task] = this.taskQueue.splice(queuedIndex, 1);
      task.cancelled = true;
      this.cleanupTask(task);
      this.updateStats();
      task.reject(reason);
      return true;
    }

    const running = this.pendingTasks.get(taskId);
    if (running) {
      running.cancelled = true;
      this.teardownWorkerForTask(taskId);
      this.cleanupTask(running);
      this.pendingTasks.delete(taskId);
      this.updateStats();
      running.reject(reason);
      // A pool slot just freed up — let any queued work proceed.
      this.processNextTask();
      return true;
    }

    return false;
  }

  /**
   * Tear down the worker running the given task (if any) and forget it, so a hung, timed-out,
   * or cancelled compute can never strand its pool slot. Callers re-run the queue afterwards.
   */
  private teardownWorkerForTask(taskId: string): void {
    for (const [workerId, workerInfo] of this.workers.entries()) {
      if (workerInfo.currentTaskId === taskId) {
        releaseAndTerminate(workerInfo.worker);
        this.workers.delete(workerId);
        this.stats.activeWorkers = this.workers.size;
        break;
      }
    }
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
   * Handle task errors. A failed task is retried on a FRESH worker up to `retryAttempts`
   * (transient worker-state failures do happen); timeouts and cancellations are never retried —
   * re-running a compute that already exhausted its budget (or was explicitly superseded)
   * would just burn another slot.
   */
  private handleTaskError(taskId: string, error: Error): void {
    const task = this.pendingTasks.get(taskId);
    if (!task) return;

    const maxAttempts = this.config.retryAttempts ?? 0;
    const attemptsUsed = task.attempts ?? 0;
    if (!task.cancelled && !task.timedOut && attemptsUsed < maxAttempts) {
      // Retire the worker that produced the error (it may be poisoned) and requeue.
      // A retry is NOT a settle path: the task keeps its id and stays live, so only the run
      // timeout is cleared. Using cleanupTask here would detach the abort listener and leave
      // the requeued task un-cancellable — a superseded compute would then hold a pool slot
      // to completion instead of freeing it on abort.
      this.teardownWorkerForTask(taskId);
      this.clearTaskTimeout(task);
      this.pendingTasks.delete(taskId);
      task.attempts = attemptsUsed + 1;
      this.taskQueue.unshift(task);
      this.updateStats();

      if (this.config.enableLogging && this.logger) {
        this.logger.info(`Retrying task ${task.type} (attempt ${task.attempts + 1})`, {
          taskId,
          taskType: task.type,
        });
      }

      this.processNextTask();
      return;
    }

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
    const task = this.pendingTasks.get(taskId);
    // Never retried: a compute that already exhausted its full budget gets no second budget.
    if (task) task.timedOut = true;
    this.teardownWorkerForTask(taskId);

    this.handleTaskError(
      taskId,
      new Error(`Task timeout after ${this.config.taskTimeout}ms: ${taskType}`),
    );

    // A pool slot just freed up — let any queued work proceed.
    this.processNextTask();
  }

  /**
   * Clean up task resources (timeout timer, abort listener)
   */
  private clearTaskTimeout(task: WorkerTask<unknown, unknown>): void {
    if (task.timeoutId !== undefined) {
      clearTimeout(task.timeoutId);
      task.timeoutId = undefined;
    }
  }

  private cleanupTask(task: WorkerTask<unknown, unknown>): void {
    this.clearTaskTimeout(task);
    if (task.abortSignal && task.abortListener) {
      task.abortSignal.removeEventListener('abort', task.abortListener);
      task.abortSignal = undefined;
      task.abortListener = undefined;
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
