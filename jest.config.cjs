const { pathsToModuleNameMapper } = require('ts-jest');

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Module resolution
  moduleNameMapper: {
    // Asset mocks - Must come before path mappings to catch resolved paths
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/test/__mocks__/fileMock.js',
    // Worker mocks - Mock web workers that use import.meta.url
    '^.*/workers$': '<rootDir>/src/test/__mocks__/workersMock.ts',
    '^.*/workers/(.*)$': '<rootDir>/src/test/__mocks__/workerFactoriesMock.ts',
    // Path mappings - After asset mocks
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@graphql/(.*)$': '<rootDir>/src/graphql/$1',
  },

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}',
  ],

  // Module file extensions
  moduleFileExtensions: [
    'web.js',
    'js',
    'web.ts',
    'ts',
    'web.tsx',
    'tsx',
    'json',
    'web.jsx',
    'jsx',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/test/**/*',
    '!src/setupTests.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
    '!src/graphql/generated.ts',
    '!src/**/generated.ts',
    '!src/**/*.generated.ts',
  ],

  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],

  coverageThreshold: {
    global: {
      branches: 2, // Current actual: 2.38%, set to 2% for buffer
      functions: 5, // Current actual: 5.47%, set to 5% for buffer
      lines: 13, // Current actual: 13.75%, set to 13% for buffer
      statements: 13, // Current actual: 13.49%, set to 13% for buffer
    },
    './src/utils/**/*.{ts,tsx}': {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    './src/hooks/**/*.{ts,tsx}': {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@?react-three-fiber|three))',
  ],

  // Watch plugins
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],

  // Reset mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Timeout configuration
  testTimeout: process.env.CI ? 30000 : 10000, // 30s in CI, 10s locally
  
  // Handle async operations better
  detectOpenHandles: true,
};
