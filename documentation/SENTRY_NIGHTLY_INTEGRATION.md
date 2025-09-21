# Sentry DSN Integration for Nightly Tests

This document describes how the nightly test failures are automatically reported to Sentry using DSN-based reporting.

## Overview

When nightly regression tests fail during scheduled runs, the workflow automatically creates a Sentry issue with detailed information about the failure. This implementation uses Sentry's Node.js SDK with DSN-based reporting, which is simpler and more reliable than API token-based approaches.

## How It Works

1. **Test Execution**: Nightly tests run against the production website (`https://bkrupa.github.io/eso-log-aggregator/`)
2. **Failure Detection**: If any tests fail during a scheduled run, the `notify-on-failure` job triggers
3. **Sentry Issue Creation**: A detailed Sentry issue is created using the `scripts/create-sentry-issue-dsn.js` script
4. **DSN Reporting**: The script uses `@sentry/node` SDK to send structured error data via DSN
5. **Notification**: The issue appears in the Sentry dashboard with rich context and automatic fingerprinting

## DSN-Based Approach Benefits

### ✅ **Simplified Configuration**
- Only requires `SENTRY_DSN` secret (no API tokens, org/project slugs)
- Uses the same DSN as the main application
- Automatic retry handling and rate limiting

### ✅ **Enhanced Reliability**
- Built on Sentry's official SDK
- Automatic error grouping and fingerprinting
- Robust network error handling

### ✅ **Richer Context**
- Automatic breadcrumb creation
- SDK-level context enrichment
- Better stack trace and environment data

## Sentry Issue Details

Each automatically created issue includes:

- **Title**: Date-stamped failure notification (e.g., "🚨 Nightly Tests Failed - 2025-09-21")
- **Environment**: `nightly-tests`
- **Release**: `{branch}-{run-number}` (e.g., `main-1234`)
- **Tags**: 
  - `test.failure: true`
  - `test.suite: nightly`
  - `ci.provider: github-actions`
  - `test.type: nightly`
  - `failure.type: test-failure`
- **Context**:
  - **testFailure**: Workflow URLs, artifacts, run ID, timestamp
  - **github**: Repository info, actor, workflow details
  - **environment**: Node.js version, platform details
- **Fingerprint**: `['nightly-test-failure', release]` for proper grouping

## Benefits of DSN Integration

### ✅ **Better Tracking**
- Issues are automatically grouped by release using fingerprinting
- Historical view of test failure patterns
- Integration with existing error monitoring workflows

### ✅ **Rich Context**
- Direct links to failed workflow runs
- Structured metadata for filtering and searching
- GitHub Actions environment correlation

### ✅ **Team Workflow**
- Integrates with existing Sentry alerting rules
- Assignable to team members
- Status tracking (open/resolved/ignored)

### ✅ **Centralized Monitoring**
- Single dashboard for all production issues
- Correlation with application errors
- Performance impact visibility

## Configuration

### Required Secrets

Set this in your GitHub repository secrets:

```
SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456
```

### Finding Your Sentry DSN

To find your Sentry DSN:

1. Go to your Sentry project dashboard
2. Navigate to **Settings > Client Keys (DSN)**
3. Copy the DSN value
4. Add it to GitHub secrets as `SENTRY_DSN`

The DSN contains all necessary information (organization, project, auth key) in a single string, making configuration much simpler than API token approaches.

### Environment Variables (Optional)

The script also supports these optional environment variables:

- `SENTRY_ENVIRONMENT`: Environment name (defaults to `'nightly-tests'`)
- `SENTRY_RELEASE`: Release version (defaults to `'{branch}-{run-number}'`)

## Testing the Integration

### Dry Run Test

```bash
# Test the DSN-based script without creating actual issues
npm run test:nightly:sentry-dsn
```

### Manual Test with Real DSN

```bash
# Set your DSN
export SENTRY_DSN="https://your-key@o123456.ingest.sentry.io/123456"

# Run the script manually
node scripts/create-sentry-issue-dsn.js \
  --title "🧪 Test Issue (DSN)" \
  --description "Testing DSN-based Sentry integration" \
  --workflow-url "https://github.com/user/repo/actions/runs/123" \
  --run-id "123"

# Or run in dry-run mode first
node scripts/create-sentry-issue-dsn.js \
  --title "🧪 Test Issue (DSN)" \
  --description "Testing DSN-based Sentry integration" \
  --dry-run
```

## Fallback Behavior

If Sentry issue creation fails (e.g., missing token, API issues), the workflow:

1. Logs the error details
2. Provides troubleshooting information
3. Does not fail the overall workflow
4. Logs the failure details for manual investigation

## Monitoring and Alerts

### Sentry Dashboard

View all nightly test failures at:
https://sentry.io/organizations/[your-org]/issues/?query=tag%3Atest.type%3Anightly-regression

### Custom Alerts

You can set up Sentry alert rules to:
- Email notifications for new nightly test failures
- Slack integration for immediate team notifications
- Auto-assignment to specific team members
- Escalation after a certain number of failures

## Migration from GitHub Issues

### Previous Behavior
- Created GitHub issues with `nightly-test-failure` label
- Limited context and metadata
- Required manual cleanup

### New Behavior
- Creates Sentry issues with rich metadata
- Automatic grouping and deduplication
- Integrated with error monitoring workflow
- Better search and filtering capabilities

## Migration from API Token to DSN

### Previous API Token Approach
- Required `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` secrets
- Manual API calls with custom retry logic
- More complex error handling

### New DSN Approach
- Only requires `SENTRY_DSN` secret
- Uses official Sentry Node.js SDK
- Automatic retry, rate limiting, and error handling
- Richer context and better grouping

### Migration Steps

1. **Remove old secrets** (optional cleanup):
   - `SENTRY_AUTH_TOKEN`
   - `SENTRY_ORG` 
   - `SENTRY_PROJECT`

2. **Add new secret**:
   - `SENTRY_DSN` from your project's Client Keys settings

3. **Update workflow** (already done):
   - Uses `create-sentry-issue-dsn.js` instead of `create-sentry-issue.js`

## Troubleshooting

### Common Issues

**❌ "SENTRY_DSN environment variable is required"**
- Ensure the secret is set in GitHub repository settings
- Verify the secret name is exactly `SENTRY_DSN`
- Check DSN format: `https://key@o123456.ingest.sentry.io/123456`

**❌ "Invalid DSN" errors**
- Copy DSN directly from Sentry project settings
- Ensure no extra spaces or characters
- Verify the DSN corresponds to the correct project

**❌ "Failed to create Sentry issue"**
- Check Sentry service status
- Verify network connectivity from GitHub Actions
- Review the workflow logs for detailed error messages
- DSN-based reporting has better error handling than API calls

### Debug Mode

To debug issues locally:

```bash
# Enable debug logging
export SENTRY_DSN="your-dsn-here"
node scripts/create-sentry-issue-dsn.js \
  --title "Debug Test" \
  --description "Debug test issue" \
  --dry-run
```

### Testing Different Scenarios

```bash
# Test with minimal arguments
node scripts/create-sentry-issue-dsn.js \
  --title "Test" \
  --description "Test" \
  --dry-run

# Test with full context
node scripts/create-sentry-issue-dsn.js \
  --title "Full Test" \
  --description "Full context test" \
  --workflow-url "https://github.com/test/repo/actions/runs/123" \
  --artifacts-url "https://github.com/test/repo/actions/runs/123#artifacts" \
  --run-id "123" \
  --dry-run
```
# Enable debug logging
DEBUG=1 node scripts/create-sentry-issue.js --dry-run --title "Test" --description "Debug test"
```

## Future Enhancements

Potential improvements:
- Integration with Sentry performance monitoring
- Automatic assignment based on failure patterns
- Correlation with production deployment events
- Custom dashboards for test failure trends