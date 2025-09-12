// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import { TextEncoder, TextDecoder } from 'util';

import '@testing-library/jest-dom';

// Mock environment utilities to avoid import.meta issues in Jest
jest.mock('./utils/envUtils');

// Polyfill for TextEncoder and TextDecoder (required for MUI X DataGrid and other components)

if (typeof global.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).TextDecoder = TextDecoder;
}

// Mock localStorage
// Don't use jest.fn() here because it can cause issues if the individual tests spy
const localStorageMock = {
  getItem: () => null,
  setItem: () => {
    /* Do Nothing */
  },
  removeItem: () => {
    /* Do Nothing */
  },
  clear: () => {
    /* Do Nothing */
  },
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch to prevent actual network requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        version: '0.1.0',
        buildTime: new Date().toISOString(),
        gitCommit: 'dev-commit',
        shortCommit: 'dev',
        buildId: `0.1.0-dev-${Date.now()}`,
        timestamp: Date.now(),
        cacheBuster: `v=dev${Date.now()}`,
      }),
    text: () => Promise.resolve(''),
    headers: new Headers(),
    redirected: false,
    statusText: 'OK',
    type: 'basic' as ResponseType,
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as unknown as Response),
);

// JSDOM 26+ provides a working window.location by default
// No need to mock window.location anymore

// If tests need specific location methods, they can be mocked individually:
// Object.defineProperty(window.location, 'assign', { value: jest.fn() });
// Object.defineProperty(window.location, 'replace', { value: jest.fn() });
// Object.defineProperty(window.location, 'reload', { value: jest.fn() });
