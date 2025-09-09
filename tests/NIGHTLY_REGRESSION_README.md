# Nightly Regression Tests

This directory contains comprehensive end-to-end tests designed to run against real ESO Logs data to catch regressions that might not be detected by unit tests or mocked integration tests.

## Overview

The nightly regression tests are split into three main test suites:

1. **`nightly-regression.spec.ts`** - Core functionality tests
   - Report landing pages
   - Fight detail pages with all main tabs
   - Data loading and rendering
   - Visual regression screenshots

2. **`nightly-regression-auth.spec.ts`** - Authentication and report browsing
   - Login/logout flows
   - Latest reports page
   - User reports (My Reports) page
   - Calculator page
   - Navigation and search

3. **`nightly-regression-interactive.spec.ts`** - Advanced interactive features
   - Fight replay functionality
   - Live logging interface
   - Advanced visualizations (heatmaps, rotation analysis, talents)
   - Performance testing with large datasets

## Prerequisites

### 1. Running Dev Server
The tests require a running development server:
```bash
npm start
```
The dev server should be accessible at `http://localhost:3000`.

### 2. Real Data Access
These tests are designed to work with **real ESO Logs data**, not mocked responses. Ensure:
- Your dev server can reach `esologs.com` APIs
- You have valid API access (authentication may be required for some features)
- The test report IDs in the tests are still valid and accessible

### 3. Network Connection
Tests make real API calls and may take longer than regular tests. Ensure you have:
- Stable internet connection
- No corporate firewall blocking `esologs.com`
- Sufficient bandwidth for loading large datasets

## Running Tests

### Quick Start
Use the provided runner scripts for an interactive experience:

**Windows (Command Prompt):**
```cmd
run-nightly-tests.bat
```

**Windows (PowerShell) or Cross-platform:**
```powershell
.\run-nightly-tests.ps1
```

### Manual Execution

**Run all tests across all browsers:**
```bash
npm run test:nightly:all
```

**Run specific browser tests:**
```bash
npm run test:nightly:chromium    # Fastest, recommended for development
npm run test:nightly:firefox     # Firefox testing
npm run test:nightly:webkit      # Safari/WebKit testing
npm run test:nightly:mobile      # Mobile browsers
```

**Run with visible browser (debugging):**
```bash
npm run test:nightly:headed
```

**Run specific test file:**
```bash
npx playwright test tests/nightly-regression.spec.ts --config=playwright.nightly.config.ts
```

**View test report:**
```bash
npm run test:nightly:report
```

## Test Configuration

The tests use a specialized Playwright configuration (`playwright.nightly.config.ts`) with:

- **Extended timeouts** (3 minutes per test)
- **Retry logic** (2-3 retries for flaky real data)
- **Multiple browsers** (Chrome, Firefox, Safari, Mobile)
- **Comprehensive reporting** (HTML, JSON, JUnit)
- **Video/screenshot capture** on failures
- **Real API calls** (no mocking)

## Test Data

The tests use known report IDs that should contain comprehensive data:

```typescript
const REAL_REPORT_IDS = [
  '3gjVGWB2dxCL8XAw', // Primary test report
  'baJFfYC8trPhHMQp', // Secondary test report  
  'L4RQWvJkGXnfaPK6', // Tertiary test report
  'VTqBNRdzCfp36gtL', // Quaternary test report
];
```

**Note:** These report IDs may become invalid over time. Update them in the test files if tests start failing due to missing reports.

## What Gets Tested

### Core Functionality
- ✅ Report landing pages load correctly
- ✅ Fight lists display properly
- ✅ All main tabs render with real data:
  - Insights
  - Players
  - Damage Done
  - Healing Done
  - Deaths
  - Critical Damage
  - Penetration
  - Damage Reduction

### Interactive Features
- ✅ Fight replay controls and timeline
- ✅ Live logging interface
- ✅ Data grid sorting and filtering
- ✅ Target selector functionality
- ✅ Tab navigation and switching
- ✅ Player selection and drill-down

### Advanced Visualizations
- ✅ Location heatmaps
- ✅ Rotation analysis charts
- ✅ Talents/abilities grids
- ✅ Experimental tab features

### Authentication & Navigation
- ✅ Login page and flows
- ✅ Protected route handling
- ✅ Latest reports browsing
- ✅ User reports (My Reports)
- ✅ Calculator functionality
- ✅ Search and filtering

### Performance & Reliability
- ✅ Load times under 30 seconds
- ✅ No memory leaks during tab switching
- ✅ Large dataset handling
- ✅ Network error recovery
- ✅ Cross-browser compatibility

## Test Artifacts

After running tests, you'll find:

### Screenshots
- `test-results-nightly/*.png` - Full page screenshots of each tested page/tab
- Organized by test name and report ID
- Useful for visual regression detection

### Videos
- `test-results-nightly/*.webm` - Recorded videos of failed test runs
- Only captured when tests fail
- Helpful for debugging issues

### Reports
- `playwright-report-nightly/index.html` - Interactive HTML report
- `test-results/nightly-results.json` - Machine-readable results
- `test-results/nightly-junit.xml` - JUnit format for CI/CD

### Traces
- Detailed execution traces for failed tests
- Can be opened in Playwright's trace viewer
- Contains network requests, DOM snapshots, console logs

## Troubleshooting

### Common Issues

**1. "Dev server not running" error**
```bash
# Start the dev server first
npm start
```

**2. Tests timeout waiting for data**
- Check your internet connection
- Verify the test report IDs are still valid
- Some reports may have been deleted or made private

**3. Authentication required errors**
- Some features require ESO Logs authentication
- Tests should gracefully handle this and show login prompts
- Update test expectations if auth requirements change

**4. Network request failures**
- Corporate firewalls may block `esologs.com`
- Use VPN if necessary
- Check if ESO Logs is experiencing downtime

**5. Visual differences in screenshots**
- Expected for visual regression testing
- Compare with previous runs to identify actual issues
- Screenshots may vary by browser and screen resolution

### Debugging Tests

**Run in headed mode to see browser:**
```bash
npm run test:nightly:headed
```

**Run specific test with full output:**
```bash
npx playwright test tests/nightly-regression.spec.ts --config=playwright.nightly.config.ts --headed --project=chromium-desktop --reporter=line
```

**Use Playwright's debug mode:**
```bash
npx playwright test tests/nightly-regression.spec.ts --config=playwright.nightly.config.ts --debug
```

## Maintenance

### Updating Test Data
If report IDs become invalid:

1. Find new valid report IDs from esologs.com
2. Update the `REAL_REPORT_IDS` arrays in test files
3. Verify the new reports have the expected content (fights, players, data)

### Adding New Tests
Follow the established patterns:

1. Use the helper functions in `tests/utils/nightly-regression-helpers.ts`
2. Include proper error handling and timeouts
3. Take screenshots for visual regression
4. Test across multiple report IDs when possible

### Scheduled Runs
Consider setting up these tests to run:
- **Nightly** - Full test suite across all browsers
- **Weekly** - Extended test with additional report IDs
- **Before releases** - Smoke test on critical paths

## Integration with CI/CD

Example GitHub Actions configuration:

```yaml
name: Nightly Regression Tests
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily
  workflow_dispatch:

jobs:
  nightly-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm start &
      - run: npm run test:nightly:all
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: nightly-test-results
          path: |
            test-results-nightly/
            playwright-report-nightly/
```

## Performance Expectations

### Typical Run Times
- **Single browser (Chromium):** 15-30 minutes
- **All browsers:** 45-90 minutes
- **Mobile tests:** 20-40 minutes
- **Interactive features only:** 10-20 minutes

### Resource Usage
- **Memory:** 2-4 GB RAM recommended
- **Storage:** 500MB-1GB for test artifacts
- **Network:** 100-500 MB data transfer
- **CPU:** Tests will use multiple cores

These tests are designed to run overnight or during off-hours due to their comprehensive nature and real data dependencies.
