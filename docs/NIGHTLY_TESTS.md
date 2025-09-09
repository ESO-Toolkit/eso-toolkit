# Nightly Regression Tests

This document describes the nightly regression test suite and how to run tests manually.

## Overview

The nightly regression tests are comprehensive end-to-end tests that ensure the ESO Log Aggregator site is functioning correctly. They test:

- Authentication flows
- Report landing pages
- Fight detail navigation
- Interactive features
- Visual regression detection
- Performance monitoring
- Data consistency

## Automated Runs

### GitHub Actions Workflow

The nightly tests run automatically via GitHub Actions:

- **Scheduled**: Every night at 2 AM UTC
- **Manual**: Can be triggered manually with custom options

#### Manual Triggering

1. Go to the **Actions** tab in GitHub
2. Select **"Nightly Regression Tests"** workflow
3. Click **"Run workflow"**
4. Choose your options:
   - **Test Suite**: all, chromium, firefox, webkit, mobile, auth-only
   - **Headed Mode**: For debugging (shows browser window)
   - **Debug Mode**: Single failure, more verbose output

#### Required Secrets

Configure these secrets in your repository settings:

- `OAUTH_CLIENT_ID`: ESO Logs OAuth client ID
- `OAUTH_CLIENT_SECRET`: ESO Logs OAuth client secret
- `ESO_LOGS_TEST_EMAIL`: Test user email (optional)
- `ESO_LOGS_TEST_PASSWORD`: Test user password (optional)

## Manual Local Runs

### Prerequisites

1. Install dependencies: `npm install`
2. Set environment variables (optional but recommended):
   ```bash
   export OAUTH_CLIENT_ID="your_client_id"
   export OAUTH_CLIENT_SECRET="your_client_secret"
   export ESO_LOGS_TEST_EMAIL="test@example.com"
   export ESO_LOGS_TEST_PASSWORD="test_password"
   ```

### Using npm Scripts

```bash
# Run all tests
npm run test:nightly:all

# Run specific browser tests
npm run test:nightly:chromium
npm run test:nightly:firefox
npm run test:nightly:webkit

# Run mobile tests
npm run test:nightly:mobile

# Run authentication tests only
npm run test:nightly:auth

# Debug mode (headed, single failure)
npm run test:nightly:debug

# View test report
npm run test:nightly:report
```

### Using Helper Scripts

#### PowerShell (Windows)

```powershell
# Basic run
.\run-nightly-tests-manual.ps1

# Chromium tests in headed mode
.\run-nightly-tests-manual.ps1 -TestSuite chromium -Headed

# Debug mode with fresh build
.\run-nightly-tests-manual.ps1 -TestSuite auth-only -Debug -BuildFirst
```

#### Bash (Linux/macOS)

```bash
# Basic run
./run-nightly-tests-manual.sh

# Chromium tests in headed mode
./run-nightly-tests-manual.sh --suite chromium --headed

# Debug mode with fresh build
./run-nightly-tests-manual.sh --suite auth-only --debug --build
```

## Test Configuration

### Authentication

Tests support multiple authentication methods:

1. **OAuth Client Credentials**: For API-based tests
   - Requires: `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`
   
2. **Test User Credentials**: For browser-based login tests
   - Requires: `ESO_LOGS_TEST_EMAIL`, `ESO_LOGS_TEST_PASSWORD`

### Test Data

Tests use real ESO Logs report data from a curated set of report IDs:
- `nbKdDtT4NcZyVrvX`
- `qdxpGgyQ92A31LBr`
- `QrXtM3W2CZ1yazDq`
- `3gjVGWB2dxCL8XAw`
- `baJFfYC8trPhHMQp`

## Test Results

### Artifacts

Test runs generate several artifacts:

- **Screenshots**: Visual captures of test failures
- **Videos**: Recordings of test execution (on failure)
- **Traces**: Detailed execution traces for debugging
- **HTML Report**: Comprehensive test results report

### Locations

- Local: `./test-results-nightly/` and `./playwright-report-nightly/`
- GitHub Actions: Available as downloadable artifacts

### Viewing Results

```bash
# Open HTML report
npm run test:nightly:report

# View specific trace
npx playwright show-trace test-results-nightly/path/to/trace.zip
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify OAuth credentials are correct
   - Check if credentials have expired
   - Ensure test user account is valid

2. **Test Timeouts**
   - Tests have generous timeouts for real API calls
   - Network issues may cause failures
   - Consider running with `--debug` for more information

3. **Missing Test Data**
   - Some reports may not have fight data
   - Tests gracefully skip when data is unavailable
   - This is normal and expected behavior

### Debug Tips

- Use `--headed` mode to see browser interactions
- Enable debug mode for verbose output
- Check browser console logs in test results
- Review screenshots and videos on failures

## Contributing

When adding new tests:

1. Follow the existing resilient error handling patterns
2. Use appropriate timeouts for real data loading
3. Add graceful skipping for missing data scenarios
4. Include meaningful error messages and logging
5. Test both authenticated and unauthenticated scenarios

## Performance

- Tests run in parallel across multiple workers
- Browser caching is optimized for faster runs
- Network idle timeouts are tuned for real API responses
- Screenshots are minimized to reduce execution time
