#!/usr/bin/env node
/**
 * Script to create a Sentry issue for nightly test failures using DSN-based reporting
 * 
 * This script uses the Sentry Node.js SDK to report errors directly via DSN.
 * This approach is simpler and more robust than API calls as it:
 * - Uses the same error capture mechanism as the client app
 * - Automatically handles retries and rate limiting
 * - Provides richer context and automatic fingerprinting
 * - Requires only the SENTRY_DSN environment variable
 * 
 * Required environment variables:
 * - SENTRY_DSN: Sentry Data Source Name (DSN) for the project
 * 
 * Optional environment variables:
 * - SENTRY_ENVIRONMENT: Environment name (defaults to 'nightly-tests')
 * - SENTRY_RELEASE: Release version (defaults to 'nightly')
 * 
 * Usage:
 * node scripts/create-sentry-issue-dsn.js [options]
 * 
 * Options:
 * --title: Issue title (required)
 * --description: Issue description (required)
 * --workflow-url: URL to the failed workflow run
 * --artifacts-url: URL to the test artifacts
 * --run-id: GitHub Actions run ID
 * --dry-run: Log what would be sent without actually creating the issue
 */

const Sentry = require('@sentry/node');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  options[key] = value;
}

// Check for dry run mode
const isDryRun = args.includes('--dry-run');

// Environment variables
const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || 'nightly-tests';
const SENTRY_RELEASE = process.env.SENTRY_RELEASE || 'nightly';

// Required options
const requiredOptions = ['title', 'description'];
const missingOptions = requiredOptions.filter(opt => !options[opt]);

if (missingOptions.length > 0) {
  console.error('❌ Missing required options:', missingOptions.join(', '));
  console.error('Usage: node scripts/create-sentry-issue-dsn.js --title "Title" --description "Description" [--workflow-url URL] [--artifacts-url URL] [--run-id ID] [--dry-run]');
  process.exit(1);
}

if (!SENTRY_DSN) {
  console.error('❌ Missing required environment variable: SENTRY_DSN');
  console.error('Please set SENTRY_DSN to your Sentry project DSN');
  console.error('Example: SENTRY_DSN=https://your-dsn@o123456.ingest.sentry.io/123456');
  process.exit(1);
}

// Initialize Sentry
Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,
  release: SENTRY_RELEASE,
  debug: isDryRun, // Enable debug mode for dry runs
  
  // Configure for CI environment
  beforeSend(event) {
    // Add CI-specific tags
    event.tags = {
      ...event.tags,
      'ci.provider': 'github-actions',
      'test.type': 'nightly',
      'failure.type': 'test-failure',
    };

    // Add workflow context if available
    if (options['workflow-url']) {
      event.tags['workflow.url'] = options['workflow-url'];
    }
    if (options['run-id']) {
      event.tags['workflow.run_id'] = options['run-id'];
    }

    // Set fingerprint for issue grouping
    event.fingerprint = ['nightly-test-failure', SENTRY_RELEASE];

    if (isDryRun) {
      console.log('🔍 [DRY RUN] Would send Sentry event:');
      console.log(JSON.stringify(event, null, 2));
      return null; // Don't send in dry run mode
    }

    return event;
  },
});

/**
 * Create Sentry issue for test failure
 */
async function createSentryIssue() {
  try {
    console.log('🚀 Creating Sentry issue for nightly test failure...');
    
    if (isDryRun) {
      console.log('🔍 [DRY RUN] Mode enabled - no actual issue will be created');
    }

    // Prepare error context
    const context = {
      title: options.title,
      description: options.description,
      timestamp: new Date().toISOString(),
      source: 'nightly-tests',
    };

    // Add optional context
    if (options['workflow-url']) {
      context.workflowUrl = options['workflow-url'];
    }
    if (options['artifacts-url']) {
      context.artifactsUrl = options['artifacts-url'];
    }
    if (options['run-id']) {
      context.runId = options['run-id'];
    }

    // Add GitHub Actions environment context
    const githubContext = {
      repository: process.env.GITHUB_REPOSITORY || 'unknown',
      ref: process.env.GITHUB_REF || 'unknown',
      sha: process.env.GITHUB_SHA || 'unknown',
      actor: process.env.GITHUB_ACTOR || 'unknown',
      workflow: process.env.GITHUB_WORKFLOW || 'nightly-tests',
      job: process.env.GITHUB_JOB || 'unknown',
      runNumber: process.env.GITHUB_RUN_NUMBER || 'unknown',
      runAttempt: process.env.GITHUB_RUN_ATTEMPT || 'unknown',
    };

    // Create error with rich context
    Sentry.withScope((scope) => {
      // Set user context (GitHub actor)
      scope.setUser({
        id: githubContext.actor,
        username: githubContext.actor,
      });

      // Set additional context
      scope.setContext('testFailure', context);
      scope.setContext('github', githubContext);
      scope.setContext('environment', {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      });

      // Set tags for filtering
      scope.setTag('test.failure', true);
      scope.setTag('test.suite', 'nightly');
      scope.setTag('ci.run_id', options['run-id'] || 'unknown');
      
      // Add breadcrumbs for context
      scope.addBreadcrumb({
        message: 'Nightly tests started',
        category: 'test',
        level: 'info',
        timestamp: Date.now() / 1000,
      });

      scope.addBreadcrumb({
        message: 'Test failure detected',
        category: 'test',
        level: 'error',
        timestamp: Date.now() / 1000,
        data: {
          title: options.title,
          runId: options['run-id'],
        },
      });

      // Capture the error
      const error = new Error(`Nightly Test Failure: ${options.title}\n\n${options.description}`);
      error.name = 'NightlyTestFailure';
      
      Sentry.captureException(error);
    });

    if (!isDryRun) {
      // Ensure Sentry flushes all events
      await Sentry.flush(2000);
      console.log('✅ Sentry issue created successfully');
      console.log('🔗 Check your Sentry dashboard for the new issue');
    } else {
      console.log('✅ [DRY RUN] Sentry issue preparation completed');
    }

  } catch (error) {
    console.error('❌ Failed to create Sentry issue:', error.message);
    
    // Fallback logging
    console.error('📋 Test failure details:');
    console.error(`Title: ${options.title}`);
    console.error(`Description: ${options.description}`);
    if (options['workflow-url']) {
      console.error(`Workflow: ${options['workflow-url']}`);
    }
    if (options['artifacts-url']) {
      console.error(`Artifacts: ${options['artifacts-url']}`);
    }
    
    process.exit(1);
  }
}

// Run the script
createSentryIssue();