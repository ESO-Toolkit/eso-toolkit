/**
 * Mock for workerFactories.ts to avoid import.meta.url issues in Jest
 */

// Mock worker that implements the SharedComputationWorker interface
const mockWorker = {
  // Add any methods that might be called on the worker
  terminate: jest.fn(),
  postMessage: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export function createSharedWorker() {
  return mockWorker;
}