/**
 * Mock for entire workers module to avoid import.meta.url issues in Jest
 */

// Mock worker pool
const WorkerPool = jest.fn().mockImplementation(() => ({
  execute: jest.fn().mockResolvedValue({}),
  terminate: jest.fn(),
  getStats: jest.fn().mockReturnValue({})
}));

// Mock worker manager
const WorkerManager = jest.fn().mockImplementation(() => ({
  createPool: jest.fn().mockReturnValue(new WorkerPool()),
  terminate: jest.fn()
}));

// Mock shared worker
function createSharedWorker() {
  return {
    terminate: jest.fn(),
    postMessage: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
}

// Mock for workerManager instance
const workerManager = {
  createPool: jest.fn().mockReturnValue(new WorkerPool()),
  terminate: jest.fn()
};

// CommonJS exports
module.exports = {
  WorkerPool,
  WorkerManager,
  createSharedWorker,
  workerManager,
};