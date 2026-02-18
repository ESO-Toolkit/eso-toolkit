const baseConfig = require('../jest.config.cjs');
const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  
  // Set root directory to project root (parent of jest/ directory)
  rootDir: path.resolve(__dirname, '..'),
  
  // Conservative CI settings
  maxWorkers: 1, // Single worker to prevent memory issues
  testTimeout: 30000, // Longer timeout for CI
  
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