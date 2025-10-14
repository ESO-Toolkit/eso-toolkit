#!/usr/bin/env node

/**
 * Production deployment script for ESO Log Aggregator
 * Handles deployment preparation, validation, and monitoring setup
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  healthCheckUrl: process.env.HEALTH_CHECK_URL || 'http://localhost:3000',
  deploymentTimeout: 300000, // 5 minutes
  healthCheckRetries: 30,
  healthCheckInterval: 2000, // 2 seconds
  requiredEnvVars: [
    'NODE_ENV',
    'VITE_BASE_URL',
    'VITE_RELEASE_VERSION'
  ],
  optionalEnvVars: [
    'SENTRY_DSN',
    'SENTRY_ENVIRONMENT',
    'REACT_APP_VERSION'
  ]
};

// Logging utilities
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`)
};

/**
 * Check if all required environment variables are set
 */
function validateEnvironment() {
  log.info('Validating environment variables...');
  
  const missing = CONFIG.requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    log.error(`Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  log.success('All required environment variables are set');
  
  // Check optional variables
  const missingOptional = CONFIG.optionalEnvVars.filter(envVar => !process.env[envVar]);
  if (missingOptional.length > 0) {
    log.warn(`Optional environment variables not set: ${missingOptional.join(', ')}`);
  }
  
  return true;
}

/**
 * Run pre-deployment checks
 */
async function preDeploymentChecks() {
  log.info('Running pre-deployment checks...');
  
  try {
    // Check if build directory exists and is not empty
    const buildPath = path.join(process.cwd(), 'build');
    try {
      const buildStats = await fs.stat(buildPath);
      if (!buildStats.isDirectory()) {
        throw new Error('Build path is not a directory');
      }
      
      const buildContents = await fs.readdir(buildPath);
      if (buildContents.length === 0) {
        throw new Error('Build directory is empty');
      }
      
      log.success(`Build directory contains ${buildContents.length} items`);
    } catch (error) {
      log.error(`Build directory check failed: ${error.message}`);
      return false;
    }
    
    // Check for critical files
    const criticalFiles = ['index.html', 'manifest.json'];
    for (const file of criticalFiles) {
      const filePath = path.join(buildPath, file);
      try {
        await fs.access(filePath);
        log.success(`Critical file found: ${file}`);
      } catch (error) {
        log.error(`Critical file missing: ${file}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log.error(`Pre-deployment checks failed: ${error.message}`);
    return false;
  }
}

/**
 * Health check for deployed application
 */
async function healthCheck(url, maxRetries = CONFIG.healthCheckRetries) {
  log.info(`Starting health check for ${url}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        timeout: 10000 // 10 second timeout
      });
      
      if (response.ok) {
        log.success(`Health check passed on attempt ${attempt}`);
        return true;
      } else {
        log.warn(`Health check attempt ${attempt}/${maxRetries} failed with status ${response.status}`);
      }
    } catch (error) {
      log.warn(`Health check attempt ${attempt}/${maxRetries} failed: ${error.message}`);
    }
    
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.healthCheckInterval));
    }
  }
  
  log.error(`Health check failed after ${maxRetries} attempts`);
  return false;
}

/**
 * Generate deployment metadata
 */
async function generateDeploymentMetadata() {
  log.info('Generating deployment metadata...');
  
  const metadata = {
    deploymentTime: new Date().toISOString(),
    version: process.env.VITE_RELEASE_VERSION || 'unknown',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    buildTimestamp: Date.now()
  };
  
  try {
    // Add git information if available
    try {
      metadata.gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      metadata.gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      log.warn('Could not retrieve git information');
    }
    
    const metadataPath = path.join(process.cwd(), 'build', 'deployment.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    log.success(`Deployment metadata written to ${metadataPath}`);
    return metadata;
  } catch (error) {
    log.error(`Failed to generate deployment metadata: ${error.message}`);
    return null;
  }
}

/**
 * Setup monitoring and alerting
 */
async function setupMonitoring() {
  log.info('Setting up monitoring configuration...');
  
  const monitoringConfig = {
    healthCheck: {
      enabled: true,
      endpoint: '/health',
      interval: 300000, // 5 minutes
      timeout: 10000
    },
    performance: {
      enabled: true,
      metricsEndpoint: '/metrics',
      alertThresholds: {
        responseTime: 2000, // 2 seconds
        errorRate: 0.05 // 5%
      }
    },
    sentry: {
      enabled: !!process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production'
    }
  };
  
  try {
    const configPath = path.join(process.cwd(), 'build', 'monitoring.json');
    await fs.writeFile(configPath, JSON.stringify(monitoringConfig, null, 2));
    
    log.success('Monitoring configuration created');
    return true;
  } catch (error) {
    log.error(`Failed to setup monitoring: ${error.message}`);
    return false;
  }
}

/**
 * Main deployment function
 */
async function deploy() {
  log.info('Starting production deployment process...');
  
  try {
    // Step 1: Validate environment
    if (!validateEnvironment()) {
      process.exit(1);
    }
    
    // Step 2: Run pre-deployment checks
    if (!(await preDeploymentChecks())) {
      process.exit(1);
    }
    
    // Step 3: Generate deployment metadata
    const metadata = await generateDeploymentMetadata();
    if (!metadata) {
      process.exit(1);
    }
    
    // Step 4: Setup monitoring
    if (!(await setupMonitoring())) {
      process.exit(1);
    }
    
    log.success('Deployment preparation completed successfully!');
    
    // If HEALTH_CHECK_URL is provided, perform post-deployment health check
    if (process.env.HEALTH_CHECK_URL) {
      log.info('Performing post-deployment health check...');
      const healthCheckPassed = await healthCheck(process.env.HEALTH_CHECK_URL);
      
      if (!healthCheckPassed) {
        log.error('Post-deployment health check failed');
        process.exit(1);
      }
    }
    
    log.success('🚀 Deployment completed successfully!');
    
    // Print summary
    console.log('\n=== Deployment Summary ===');
    console.log(`Version: ${metadata.version}`);
    console.log(`Environment: ${metadata.environment}`);
    console.log(`Deployment Time: ${metadata.deploymentTime}`);
    if (metadata.gitCommit) {
      console.log(`Git Commit: ${metadata.gitCommit}`);
      console.log(`Git Branch: ${metadata.gitBranch}`);
    }
    console.log('=========================\n');
    
  } catch (error) {
    log.error(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle command line arguments
const command = process.argv[2];

switch (command) {
  case 'validate':
    validateEnvironment();
    break;
  case 'health-check':
    const url = process.argv[3] || CONFIG.healthCheckUrl;
    healthCheck(url).then(success => {
      process.exit(success ? 0 : 1);
    });
    break;
  case 'deploy':
  default:
    deploy();
    break;
}

module.exports = {
  validateEnvironment,
  preDeploymentChecks,
  healthCheck,
  generateDeploymentMetadata,
  setupMonitoring
};