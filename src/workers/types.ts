/**
 * Types for the shared worker pool system
 */

import { Remote } from 'comlink';

import { ILogger } from '../utils/logger';

import { SharedComputationWorker, SharedComputationWorkerTaskType } from './SharedWorker';
import { OnProgressCallback } from './Utils';

export interface WorkerTask<T = unknown, R = unknown> {
  id: string;
  type: SharedComputationWorkerTaskType;
  data: T;
  priority?: number;
  resolve: (value: R) => void;
  reject: (reason?: Error) => void;
  createdAt: number;
  onProgress?: OnProgressCallback;
  /** Timeout ID for task timeout — must be cleared on task completion */
  timeoutId?: ReturnType<typeof setTimeout>;
}

export interface WorkerPoolConfig {
  maxWorkers?: number;
  idleTimeout?: number; // milliseconds after which idle workers are terminated
  taskTimeout?: number; // milliseconds after which tasks time out
  retryAttempts?: number;
  enableLogging?: boolean;
  logger?: ILogger; // Optional logger instance
}

export interface WorkerStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  activeWorkers: number;
  queueSize: number;
  averageTaskTime: number;
}

export interface WorkerInfo {
  id: string;
  worker: Remote<SharedComputationWorker>;
  busy: boolean;
  lastUsed: number;
  tasksCompleted: number;
  currentTaskId?: string;
}
