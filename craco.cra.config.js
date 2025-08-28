/**
 * CRACO Coverage Configuration - CRA Compatible
 * 
 * This configuration extends CRACO with Jest coverage settings
 * that are supported by Create React App.
 */

const coverageConfig = require('./jest.cra.config.js');

module.exports = {
  jest: {
    configure: (jestConfig) => {
      // Only apply coverage when explicitly requested
      if (process.env.COVERAGE || process.argv.includes('--coverage')) {
        return {
          ...jestConfig,
          ...coverageConfig,
          // Preserve existing setup
          setupFilesAfterEnv: jestConfig.setupFilesAfterEnv || ['<rootDir>/src/setupTests.ts'],
          testEnvironment: jestConfig.testEnvironment || 'jsdom',
        };
      }
      
      return jestConfig;
    },
  },
};
