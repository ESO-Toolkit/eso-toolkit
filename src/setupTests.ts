// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Mock environment utilities to avoid import.meta issues in Jest
jest.mock('./utils/envUtils');

// Mock Logger to suppress console output during tests
jest.mock('./utils/logger', () => {
  const actual = jest.requireActual('./utils/logger');
  const { MockLogger } = jest.requireActual('./test/__mocks__/loggerMock');

  return {
    ...actual,
    Logger: MockLogger,
  };
});
// Polyfill for TextEncoder and TextDecoder (required for MUI X DataGrid and other components)
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  // @ts-expect-error - type mismatch between Node util and global
  global.TextDecoder = TextDecoder;
}

// Polyfill for ResizeObserver (required for Three.js Canvas and react-use-measure)
if (typeof global.ResizeObserver === 'undefined') {
  class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (global as typeof globalThis & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver =
    ResizeObserver;
}

// Mock localStorage with a functional implementation
const createLocalStorageMock = (): Storage => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
};

Object.defineProperty(window, 'localStorage', {
  value: createLocalStorageMock(),
  writable: true,
});
