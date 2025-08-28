/**
 * Jest Coverage Configuration - CRA Compatible
 *
 * Only includes options supported by Create React App.
 */

const coverageMode = process.env.COVERAGE_MODE || 'production';

const thresholds = {
  development: {
    global: {
      branches: 50,
      functions: 60,
      lines: 65,
      statements: 65,
    },
  },
  production: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    './src/utils/': {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90,
    },
    './src/hooks/': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85,
    },
    './src/store/': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  },
  strict: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/utils/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/hooks/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/store/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  ci: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
};

// Only CRA-supported Jest options
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.*',
    '!src/**/*.test.*',
    '!src/test/**/*',
    '!src/graphql/generated.*',
    '!src/setupTests.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
    '!src/react-app-env.d.ts',
  ],

  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],

  coverageThreshold: thresholds[coverageMode],

  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/build/',
    '/dist/',
    '\\.stories\\.',
    '/storybook-static/',
    'src/test/',
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@graphql/(.*)$': '<rootDir>/src/graphql/$1',
    '^@test/(.*)$': '<rootDir>/src/test/$1',
  },

  transformIgnorePatterns: [
    '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
};
