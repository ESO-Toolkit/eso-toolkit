/**
 * Jest Coverage Configuration
 * 
 * This configuration provides comprehensive coverage settings for the ESO Log Aggregator
 * with different profiles for development, CI, and detailed analysis.
 */

const path = require('path');

// Base coverage configuration
const baseCoverageConfig = {
  // Collect coverage from these files
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    // Exclude specific file types
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    // Exclude directories
    '!src/test/**/*',
    '!src/__tests__/**/*',
    '!src/__mocks__/**/*',
    // Exclude generated files
    '!src/graphql/generated.ts',
    '!src/**/generated.ts',
    '!src/**/*.generated.ts',
    // Exclude config and setup files
    '!src/setupTests.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
    // Exclude Storybook files
    '!src/**/*.stories.*',
    '!src/stories/**/*',
  ],
  
  // Coverage output directory
  coverageDirectory: 'coverage',
  
  // Coverage reporters
  coverageReporters: [
    'text',           // Console output
    'text-summary',   // Brief console summary
    'lcov',           // For CI and external tools
    'html',           // Interactive HTML report
    'json',           // Machine-readable format
    'json-summary',   // Brief machine-readable summary
    'cobertura',      // For CI integration
  ],
  
  // Files to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/coverage/',
    '/dist/',
    '\\.stories\\.',
    '/storybook-static/',
  ],
  
  // Coverage provider (v8 is faster than babel)
  coverageProvider: 'v8',
};

// Development coverage configuration (more lenient)
const developmentConfig = {
  ...baseCoverageConfig,
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70
    }
  }
};

// Production/CI coverage configuration (stricter)
const productionConfig = {
  ...baseCoverageConfig,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    // Higher standards for utility functions
    './src/utils/**/*.{ts,tsx}': {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90
    },
    // Higher standards for hooks (critical business logic)
    './src/hooks/**/*.{ts,tsx}': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85
    },
    // Store/Redux logic should be well tested
    './src/store/**/*.{ts,tsx}': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85
    }
  }
};

// Strict coverage configuration (for quality gates)
const strictConfig = {
  ...baseCoverageConfig,
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 95,
      statements: 95
    },
    './src/utils/**/*.{ts,tsx}': {
      branches: 90,
      functions: 95,
      lines: 98,
      statements: 98
    },
    './src/hooks/**/*.{ts,tsx}': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  }
};

// Export different configurations based on environment
const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const coverageMode = process.env.COVERAGE_MODE || 'standard';
  
  switch (coverageMode) {
    case 'development':
      return developmentConfig;
    case 'strict':
      return strictConfig;
    case 'ci':
    case 'production':
      return productionConfig;
    default:
      return productionConfig;
  }
};

module.exports = getConfig();
