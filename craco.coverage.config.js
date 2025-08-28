/**
 * CRACO Coverage Configuration
 * 
 * This configuration extends CRACO with enhanced Jest coverage settings
 * for the ESO Log Aggregator project.
 */

const coverageConfig = require('./jest.coverage.config.js');

module.exports = {
  jest: {
    configure: (jestConfig) => {
      // Merge coverage configuration
      return {
        ...jestConfig,
        ...coverageConfig,
        // Ensure setupFilesAfterEnv is preserved
        setupFilesAfterEnv: jestConfig.setupFilesAfterEnv || ['<rootDir>/src/setupTests.ts'],
        // Preserve existing test environment
        testEnvironment: jestConfig.testEnvironment || 'jsdom',
        // Preserve existing module name mapping
        moduleNameMapping: {
          ...jestConfig.moduleNameMapping,
          '^@/(.*)$': '<rootDir>/src/$1',
          '^@components/(.*)$': '<rootDir>/src/components/$1',
          '^@features/(.*)$': '<rootDir>/src/features/$1',
          '^@store/(.*)$': '<rootDir>/src/store/$1',
          '^@types/(.*)$': '<rootDir>/src/types/$1',
          '^@utils/(.*)$': '<rootDir>/src/utils/$1',
          '^@graphql/(.*)$': '<rootDir>/src/graphql/$1',
        },
        // Coverage-specific test match patterns
        testMatch: [
          '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
          '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}',
          // Exclude stories from test runs
          '!<rootDir>/src/**/*.stories.*',
        ],
        // Transform ignore patterns for coverage
        transformIgnorePatterns: [
          '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$',
          '^.+\\.module\\.(css|sass|scss)$',
        ],
        // Coverage-specific settings
        coveragePathIgnorePatterns: [
          '/node_modules/',
          '/coverage/',
          '/build/',
          '/dist/',
          '\\.stories\\.',
          '/storybook-static/',
          'src/test/',
          'src/stories/',
        ],
        // Improved test timeout for coverage runs
        testTimeout: process.env.NODE_ENV === 'ci' ? 30000 : 10000,
      };
    },
  },
};
