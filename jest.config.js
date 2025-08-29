const { pathsToModuleNameMapper } = require('ts-jest');

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Module resolution
  moduleNameMapper: {
    // Path mappings
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@graphql/(.*)$': '<rootDir>/src/graphql/$1',
    // Asset mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      'jest-transform-stub',
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
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    './src/utils/**/*.{ts,tsx}': {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90,
    },
    './src/hooks/**/*.{ts,tsx}': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  },

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/build/'],

  // Watch plugins
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],

  // Reset mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
