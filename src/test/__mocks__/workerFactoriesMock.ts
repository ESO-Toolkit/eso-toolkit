/**
 * Mock for workerFactories.ts to avoid import.meta.url issues in Jest
 */

// Mock worker that implements the SharedComputationWorker interface
interface MockWorker {
  terminate: jest.MockedFunction<() => void>;
  postMessage: jest.MockedFunction<(message: unknown) => void>;
  addEventListener: jest.MockedFunction<(type: string, listener: EventListener) => void>;
  removeEventListener: jest.MockedFunction<(type: string, listener: EventListener) => void>;
}

const mockWorker: MockWorker = {
  // Add any methods that might be called on the worker
  terminate: jest.fn(),
  postMessage: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export function createSharedWorker(): MockWorker {
  return mockWorker;
}
