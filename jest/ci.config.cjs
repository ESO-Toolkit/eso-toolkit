const baseConfig = require('../jest.config.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  
  // Conservative CI settings
  maxWorkers: 1, // Single worker to prevent memory issues
  testTimeout: 30000, // Longer timeout for CI
  
  // Disable parallel execution for stability
  runInBand: true,
  
  // Memory optimization
  logHeapUsage: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Minimal reporting for CI
  verbose: false,
  silent: false,
  
  // Coverage settings optimized for CI
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'json'],
  
  // CI-specific module resolution
  resolver: undefined, // Use default resolver
  
  // Prevent watch mode issues
  watchman: false,
};